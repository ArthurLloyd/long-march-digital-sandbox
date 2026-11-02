import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import original from '../data/verified/dataset.json';
import { normalizeDataset } from '../shared/contracts';
import { validateDataset } from '../shared/utils/validate-dataset';
import {
  createPanoramaNavigation,
  PANORAMA_NODES,
  REGIONS,
} from '../app/panorama/navigation';
import {
  geography,
  inCoverage,
  projectGeo,
  unprojectGeo,
  regionCenter,
  heightAt,
  MAP_WIDTH,
  MAP_DEPTH,
} from '../app/panorama/geography';
import {
  ENGINEERING_CROSSINGS,
  selectPublishedMapRoutes,
} from '../app/panorama/route-layers';
import { usePhaseClock, PHASE_DISPLAY_INTERVAL_MS } from '../features/timeline';
import { simulatePublishedC2 } from './fixtures/c2-sample';

const candidate = () => normalizeDataset(validateDataset(original));
afterEach(() => vi.useRealTimers());
describe('全景地理、导航和真实性边界', () => {
  it('地形来自完整声明网格，投影可逆，观察框都在覆盖范围中', () => {
    expect(geography.heights).toHaveLength(geography.cols * geography.rows);
    expect(geography.heights.some((value) => value > 5000)).toBe(true);
    for (const node of PANORAMA_NODES) {
      const point = regionCenter(REGIONS[node.id]);
      expect(inCoverage(point)).toBe(true);
      const roundtrip = unprojectGeo(projectGeo(point));
      expect(roundtrip[0]).toBeCloseTo(point[0], 8);
      expect(roundtrip[1]).toBeCloseTo(point[1], 8);
    }
    for (const point of [
      [-MAP_WIDTH / 2, -MAP_DEPTH / 2],
      [MAP_WIDTH / 2, MAP_DEPTH / 2],
      [0, 0],
    ])
      expect(Number.isFinite(heightAt(point[0]!, point[1]!))).toBe(true);
    expect(() => projectGeo([115, 90])).toThrow();
    expect(heightAt(0, 0, 24) / heightAt(0, 0, 1)).toBeCloseTo(24, 6);
  });
  it('只读 B 候选阶段，所有事件坐标保持 null，不制造审核记录', () => {
    const data = candidate(),
      before = JSON.stringify(data);
    const nav = createPanoramaNavigation(data);
    expect(nav.steps).toHaveLength(11);
    expect(nav.steps[0]!.region).toBe('ruijin');
    expect(
      nav.steps
        .filter((step) => step.region === 'chishui')
        .map((step) => step.phaseId),
    ).toEqual(ENGINEERING_CROSSINGS.map((item) => item.phaseId));
    expect(nav.steps.every((step) => step.coordinates === null)).toBe(true);
    expect(
      nav.steps
        .filter((step) => step.region === 'chishui')
        .map((step) => step.eventId),
    ).toEqual(['event-sd-1', 'event-sd-2', 'event-sd-3', 'event-sd-4']);
    expect(
      nav.steps.filter((step) => step.immersive).map((step) => step.immersive),
    ).toEqual(['zunyi', 'luding', 'snow']);
    expect(JSON.stringify(nav.clockModel)).not.toMatch(
      /reviewed|published|approved/,
    );
    expect(JSON.stringify(data)).toBe(before);
  });
  it('草稿与未知几何不进入真实地图，撤回来源使已有路线失效', () => {
    const data = candidate();
    for (const step of createPanoramaNavigation(data).steps)
      expect(selectPublishedMapRoutes(data, step.phaseId)).toEqual([]);
    const sample = simulatePublishedC2();
    const phase = sample.forceSnapshots.find(
      (snapshot) => snapshot.displayMode === 'route',
    )!.phaseId;
    expect(selectPublishedMapRoutes(sample, phase).length).toBeGreaterThan(0);
    expect(selectPublishedMapRoutes(sample, 'missing')).toEqual([]);
    sample.sources[0]!.releaseStatus = 'unpublished';
    sample.sources[0]!.reviewStatus = 'in_review';
    expect(selectPublishedMapRoutes(sample, phase)).toEqual([]);
  });
  it('四渡示意板只用归一化图内坐标，不提供任何地理路线字段', () => {
    for (const crossing of ENGINEERING_CROSSINGS) {
      expect(crossing).not.toHaveProperty('coordinates');
      for (const line of [crossing.red, crossing.blue])
        for (const point of line)
          expect(point.every((value) => value >= 0 && value <= 100)).toBe(true);
    }
  });
  it('开发导航使用 C2 同一时钟；暂停、回退、终点和取消定时器有效', () => {
    vi.useFakeTimers();
    const nav = createPanoramaNavigation(candidate());
    const { result, unmount } = renderHook(() => usePhaseClock(nav.clockModel));
    expect(result.current.activePhaseId).toBe('slot-ruijin');
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(PHASE_DISPLAY_INTERVAL_MS));
    expect(result.current.activePhaseId).toBe('zy-phase');
    act(() => result.current.selectPhase('sd-phase-3'));
    act(() => vi.advanceTimersByTime(PHASE_DISPLAY_INTERVAL_MS * 2));
    expect(result.current.activePhaseId).toBe('sd-phase-3');
    expect(result.current.playing).toBe(false);
    act(() => result.current.previousPhase());
    expect(result.current.activePhaseId).toBe('sd-phase-2');
    act(() => result.current.selectPhase('slot-reunion'));
    act(() => result.current.play());
    expect(result.current.playing).toBe(false);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
