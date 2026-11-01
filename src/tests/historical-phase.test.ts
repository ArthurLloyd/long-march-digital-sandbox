import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPhaseModel,
  phaseTimeText,
} from '../features/timeline/historical-phase-selectors';
import {
  historicalPhaseReducer as reduce,
  initialPhaseState,
  reconcilePhaseState,
} from '../features/timeline/historical-phase-reducer';
import {
  useHistoricalPhase,
  PHASE_DISPLAY_INTERVAL_MS,
} from '../features/timeline';
import { getPublishedDatasetV2 } from '../shared/utils/validate-dataset';
import { simulatePublishedC2 } from './fixtures/c2-sample';
import { emptyV2 } from './fixtures/v2-dataset';

afterEach(() => vi.useRealTimers());
const data = () => getPublishedDatasetV2(simulatePublishedC2());
describe('C2 唯一专题内阶段时钟', () => {
  it('空图与单阶段安全，所有边界操作不越界', () => {
    const empty = createPhaseModel(emptyV2());
    for (const type of ['play', 'next', 'previous', 'restart'] as const)
      expect(
        reduce(initialPhaseState(empty), { type }, empty).activePhaseId,
      ).toBeNull();
    const single = data();
    single.topics = [single.topics[0]!];
    single.topics[0]!.phaseIds = ['c2-a1'];
    single.phases = [single.phases[0]!];
    const model = createPhaseModel(single);
    const state = initialPhaseState(model);
    for (const type of ['play', 'next', 'previous', 'restart'] as const) {
      const next = reduce(state, { type }, model);
      expect(next.activePhaseId).toBe('c2-a1');
      expect(next.playing).toBe(false);
    }
  });
  it('专题内部顺序来自 phaseIds/sequence，乙的 sequence=0 不排到甲前', () => {
    const model = createPhaseModel(data());
    const state = initialPhaseState(model);
    expect(state.activePhaseId).toBe('c2-a1');
    const next = reduce(state, { type: 'topic', topicId: 'c2-topic-b' }, model);
    expect(next.activePhaseId).toBe('c2-b1');
    expect(next.playing).toBe(false);
    expect(reduce(next, { type: 'phase', phaseId: 'c2-a2' }, model)).toBe(next);
    expect(reduce(next, { type: 'topic', topicId: 'missing' }, model)).toBe(
      next,
    );
  });
  it('不一致顺序报告错误而不排序修复', () => {
    const candidate = data();
    candidate.topics[0]!.phaseIds.reverse();
    const model = createPhaseModel(candidate);
    expect(model.error).toContain('顺序');
    expect(model.orders.get('fixture-topic')).toEqual([]);
    expect(
      reduce(initialPhaseState(model), { type: 'play' }, model).playing,
    ).toBe(false);
  });
  it('前后及重播留在当前专题，恢复也校验专题归属', () => {
    const model = createPhaseModel(data());
    let state = initialPhaseState(model);
    state = reduce(state, { type: 'next' }, model);
    expect(state.activePhaseId).toBe('c2-a2');
    state = reduce(state, { type: 'previous' }, model);
    expect(state.activePhaseId).toBe('c2-a1');
    state = reduce(
      state,
      { type: 'restore', topicId: 'c2-topic-b', phaseId: 'c2-b2' },
      model,
    );
    expect(state.activePhaseId).toBe('c2-b2');
    expect(state.playing).toBe(false);
    state = reduce(state, { type: 'restart' }, model);
    expect(state.activePhaseId).toBe('c2-b1');
    expect(state.playing).toBe(true);
    expect(
      reduce(
        state,
        { type: 'restore', topicId: 'fixture-topic', phaseId: 'c2-b2' },
        model,
      ).activePhaseId,
    ).toBe('c2-b1');
  });
  it('按展示节奏推进，在最后一阶段立即停止，不自动换专题', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useHistoricalPhase(data()));
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(PHASE_DISPLAY_INTERVAL_MS));
    expect(result.current.activePhaseId).toBe('c2-a2');
    act(() => vi.advanceTimersByTime(PHASE_DISPLAY_INTERVAL_MS));
    expect(result.current.activePhaseId).toBe('c2-a3');
    expect(result.current.playing).toBe(false);
    act(() => vi.advanceTimersByTime(60000));
    expect(result.current.activePhaseId).toBe('c2-a3');
  });
  it('暂停、禁用以及旧 tick 不推进，新播放重新计时', () => {
    vi.useFakeTimers();
    const published = data();
    const { result, rerender } = renderHook(
      ({ enabled }) => useHistoricalPhase(published, enabled),
      { initialProps: { enabled: true } },
    );
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(20000));
    expect(result.current.activePhaseId).toBe('c2-a1');
    act(() => result.current.play());
    rerender({ enabled: false });
    act(() => vi.advanceTimersByTime(20000));
    rerender({ enabled: true });
    expect(result.current.playing).toBe(false);
    const model = createPhaseModel(published);
    let state = reduce(initialPhaseState(model), { type: 'play' }, model);
    const old = state;
    state = reduce(state, { type: 'pause' }, model);
    state = reduce(state, { type: 'play' }, model);
    expect(
      reduce(
        state,
        { type: 'tick', revision: old.revision, modelKey: model.key },
        model,
      ),
    ).toBe(state);
  });
  it('数据撤回在呈现时同步收紧并停止，不跳到另一个专题', () => {
    const published = data(),
      model = createPhaseModel(published);
    const running = reduce(initialPhaseState(model), { type: 'play' }, model);
    published.topics = published.topics.filter(
      (t) => t.topicId !== 'fixture-topic',
    );
    const next = reconcilePhaseState(running, createPhaseModel(published));
    expect(next.selectedTopicId).toBeNull();
    expect(next.activePhaseId).toBeNull();
    expect(next.playing).toBe(false);
  });
  it('原始月份/年份/范围/未知精度不补日，播放不改原数据', () => {
    const published = data(),
      snapshot = JSON.stringify(published);
    expect(phaseTimeText(published.phases[0]!)).toContain('2090-01 · 月份范围');
    expect(phaseTimeText(published.phases[1]!)).toContain('2090-01 至 2090-02');
    expect(phaseTimeText(published.phases[3]!)).toContain('2080 · 年份范围');
    expect(phaseTimeText(published.phases[2]!)).toContain('时间未知');
    const model = createPhaseModel(published);
    reduce(initialPhaseState(model), { type: 'restart' }, model);
    expect(JSON.stringify(published)).toBe(snapshot);
  });
});
