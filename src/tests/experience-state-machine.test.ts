import { describe, expect, it } from 'vitest';
import { EXPERIENCE_IDS } from '../shared/contracts';
import {
  historicalExperienceReducer as reduce,
  completionForState,
} from '../app/experience/historical-experience-reducer';
import { evaluateInteractionResponse } from '../app/experience/interaction-progress';
import {
  completeInteraction,
  introState,
  reachTerminal,
  responseFor,
  startState,
} from './fixtures/c1-driver';
import { simulatePublishedSample } from './fixtures/c1-sample';

describe('C1 运行顺序与回调防护', () => {
  it('空回调或错误形状不会让应用崩溃或改变运行状态', () => {
    const state = startState();
    expect(
      reduce(state, {
        type: 'ready',
        report: null as unknown as NonNullable<typeof state.run>,
      }),
    ).toBe(state);
    expect(
      reduce(state, {
        type: 'error',
        report: {
          ...state.run!,
          error: null as unknown as NonNullable<typeof state.error>,
        },
      }),
    ).toBe(state);
  });
  it('重新开始产生的新实例拒绝上一次实际运行的回调', () => {
    const old = startState();
    const next = reduce(introState(), {
      type: 'start',
      runId: 'new-run',
      mode: '3d',
    });
    expect(reduce(next, { type: 'ready', report: old.run! })).toBe(next);
    expect(
      reduce(next, {
        type: 'terminal',
        report: { ...old.run!, segmentId: 'fixture-s5' },
      }),
    ).toBe(next);
  });
  it('已暂停时取消退出仍能继续；确认退出期间 ready 不会丢失或自动播放', () => {
    const paused = reduce(startState(), { type: 'pause' });
    const back = reduce(reduce(paused, { type: 'request_exit' }), {
      type: 'cancel_exit',
    });
    expect(reduce(back, { type: 'resume' }).status).toBe('playing');
    const loading = reduce(introState(), {
      type: 'start',
      mode: '3d',
      runId: 'loading-test',
    });
    let confirm = reduce(loading, { type: 'request_exit' });
    confirm = reduce(confirm, { type: 'ready', report: loading.run! });
    expect(confirm.status).toBe('exit_confirm');
    const returned = reduce(confirm, { type: 'cancel_exit' });
    expect(returned.status).toBe('paused');
    expect(reduce(returned, { type: 'resume' }).status).toBe('playing');
  });
  it.each(EXPERIENCE_IDS)('通用引擎支持 %s，终点仍须主动完成', (id) => {
    const state = reachTerminal(startState('3d', simulatePublishedSample(id)));
    expect(state.status).toBe('ready_to_complete');
    expect(state.completedRecord).toBeNull();
    expect(state.run!.completed).toHaveLength(2);
    const finished = reduce(state, {
      type: 'complete',
      completedAt: '2026-11-01T01:00:00Z',
    });
    expect(finished.status).toBe('reading');
    expect(finished.completedRecord?.experienceId).toBe(id);
  });
  it('未开始、未 ready、跳段和提前终点均被忽略', () => {
    const intro = introState();
    const loading = reduce(intro, { type: 'start', mode: '3d', runId: 'x' });
    const report = { ...loading.run!, segmentId: 'fixture-s5' };
    expect(reduce(intro, { type: 'terminal', report })).toBe(intro);
    expect(
      reduce(loading, {
        type: 'cue',
        report: { ...report, interactionId: 'ld-01' },
      }),
    ).toBe(loading);
    const playing = startState();
    expect(
      reduce(playing, {
        type: 'segment',
        report: { ...playing.run!, segmentId: 'fixture-s3' },
      }),
    ).toBe(playing);
    expect(
      reduce(playing, {
        type: 'terminal',
        report: { ...playing.run!, segmentId: 'fixture-s5' },
      }),
    ).toBe(playing);
    expect(completionForState(playing, '2026-11-01T00:00:00Z')).toBeNull();
  });
  it('旧 runId、错误体验/脚本、未知段落及退出后的延迟事件无效', () => {
    const state = startState();
    for (const patch of [
      { runId: 'old' },
      { scriptVersion: 'wrong' },
      { experienceId: 'exp-sidu-chishui' as const },
      { segmentId: 'missing' },
    ]) {
      expect(
        reduce(state, {
          type: 'segment',
          report: { ...state.run!, segmentId: 'fixture-s1', ...patch },
        }),
      ).toBe(state);
    }
    const exited = reduce(state, { type: 'exit' });
    expect(
      reduce(exited, {
        type: 'segment',
        report: { ...state.run!, segmentId: 'fixture-s1' },
      }),
    ).toBe(exited);
  });
  it('当前段落之外的互动、未看全材料、未确认解释与重复回调不能推进', () => {
    let state = startState();
    expect(
      reduce(state, {
        type: 'cue',
        report: {
          ...state.run!,
          segmentId: 'fixture-s2',
          interactionId: 'ld-01',
        },
      }),
    ).toBe(state);
    state = reduce(state, {
      type: 'segment',
      report: { ...state.run!, segmentId: 'fixture-s1' },
    });
    state = reduce(state, {
      type: 'segment',
      report: { ...state.run!, segmentId: 'fixture-s2' },
    });
    state = reduce(state, {
      type: 'cue',
      report: {
        ...state.run!,
        segmentId: 'fixture-s2',
        interactionId: 'ld-01',
      },
    });
    const waiting = state;
    expect(
      reduce(waiting, {
        type: 'acknowledge',
        runId: waiting.run!.runId,
        interactionId: 'ld-01',
      }),
    ).toBe(waiting);
    state = reduce(state, {
      type: 'response',
      runId: state.run!.runId,
      interactionId: 'ld-01',
      response: {
        interactionType: 'observe_hotspots',
        visitedMaterialIds: ['fixture-material-0'],
      },
    });
    expect(
      reduce(state, { type: 'continue_interaction', runId: state.run!.runId }),
    ).toBe(state);
    state = completeInteraction(state);
    const completed = state;
    expect(state.run!.completed).toEqual(['ld-01']);
    expect(
      reduce(state, {
        type: 'cue',
        report: {
          ...state.run!,
          segmentId: 'fixture-s2',
          interactionId: 'ld-01',
        },
      }),
    ).toBe(completed);
    expect(completionForState(state, '2026-11-01T00:00:00Z')).toBeNull();
  });
  it('错误排序是有效尝试，解释确认后继续；非法 ID 和不完整配对拒绝', () => {
    const bundle = startState().run!.bundle;
    const definition = bundle.interactions[1]!;
    const correct = responseFor(definition);
    if (correct.interactionType !== 'sort_sequence')
      throw new Error('测试结构错误');
    const wrong = {
      ...correct,
      orderedChoiceIds: [...correct.orderedChoiceIds].reverse(),
    };
    expect(evaluateInteractionResponse(definition, wrong)).toMatchObject({
      complete: true,
      correct: false,
    });
    expect(
      evaluateInteractionResponse(definition, {
        ...correct,
        orderedChoiceIds: ['missing'],
      }),
    ).toBeNull();
    const matching = startState(
      '3d',
      simulatePublishedSample('exp-qiaodu-jinshajiang'),
    ).run!.bundle.interactions[1]!;
    expect(
      evaluateInteractionResponse(matching, {
        interactionType: 'material_matching',
        pairs: [],
      }),
    ).toBeNull();
  });
  it('暂停/隐藏禁止回调推进，恢复需要显式操作，退出确认不通关', () => {
    const playing = startState();
    const paused = reduce(playing, { type: 'pause' });
    expect(paused.status).toBe('paused');
    expect(
      reduce(paused, {
        type: 'segment',
        report: { ...paused.run!, segmentId: 'fixture-s1' },
      }),
    ).toBe(paused);
    expect(reduce(paused, { type: 'resume' }).status).toBe('playing');
    const confirming = reduce(playing, { type: 'request_exit' });
    expect(confirming.status).toBe('exit_confirm');
    expect(reduce(confirming, { type: 'cancel_exit' }).status).toBe('paused');
    expect(reduce(confirming, { type: 'exit' }).completedRecord).toBeNull();
  });
  it('等价主线不能跳步；同样要求互动、解释、终点和主动确认', () => {
    const state = startState('equivalent');
    expect(
      reduce(state, {
        type: 'step_viewed',
        runId: state.run!.runId,
        stepId: 'step-fixture-s5',
      }),
    ).toBe(state);
    const ready = reachTerminal(state);
    expect(ready.status).toBe('ready_to_complete');
    expect(ready.completedRecord).toBeNull();
    expect(
      completionForState(ready, '2026-11-01T00:00:00Z')?.completionMode,
    ).toBe('equivalent');
  });
});
