import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  selectForceStateForPhase,
  forcePrecision,
} from '../app/history/force-state';
import {
  selectScenePhaseView,
  sceneSelection,
} from '../app/history/scene-phase-view';
import { ForceLegend } from '../components/layout/ForceLegend';
import { getPublishedDatasetV2 } from '../shared/utils/validate-dataset';
import { simulatePublishedC2 } from './fixtures/c2-sample';

const data = () => getPublishedDatasetV2(simulatePublishedC2());
describe('C2 按发布阶段选择态势', () => {
  it('仅当前阶段，前进/回退/切专题不会残留未来或旧单位', () => {
    const p = data();
    expect(
      selectForceStateForPhase(p, 'c2-a1').snapshots.map((s) => s.snapshotId),
    ).toEqual(['c2-red-a1', 'c2-national-a1']);
    expect(
      selectForceStateForPhase(p, 'c2-a2').snapshots.map((s) => s.snapshotId),
    ).toEqual(['c2-red-a2']);
    expect(
      selectForceStateForPhase(p, 'c2-b1').tracks.map((t) => t.trackId),
    ).toEqual(['c2-other-track']);
    expect(selectForceStateForPhase(p, 'c2-a1').routes).toEqual([]);
  });
  it('未知位置隐藏、没有区域/路线输入时不生成替代几何', () => {
    const p = data();
    expect(selectForceStateForPhase(p, 'c2-b2').entries).toEqual([]);
    const region = p.forceSnapshots.find((s) => s.snapshotId === 'c2-red-a2')!;
    region.region = null;
    expect(selectForceStateForPhase(p, 'c2-a2').entries).toEqual([]);
    p.routes = [];
    expect(selectForceStateForPhase(p, 'c2-a3').entries).toEqual([]);
    expect(selectForceStateForPhase(p, null).entries).toEqual([]);
    expect(selectForceStateForPhase(p, 'missing').entries).toEqual([]);
  });
  it('点位只给已有点，不因两个阶段端点连线', () => {
    const p = data(),
      before = JSON.stringify(p),
      result = selectForceStateForPhase(p, 'c2-a1');
    expect(result.snapshots.every((s) => s.displayMode === 'point')).toBe(true);
    expect(result.routes).toEqual([]);
    expect(result.snapshots[0]!.coordinates).toEqual([1, 2]);
    expect(JSON.stringify(p)).toBe(before);
  });
  it('区域与路线使用原几何和原精度，不把未知点位置转成坐标', () => {
    const p = data(),
      region = selectForceStateForPhase(p, 'c2-a2'),
      route = selectForceStateForPhase(p, 'c2-a3');
    expect(region.snapshots[0]!.coordinates).toBeNull();
    expect(region.snapshots[0]!.region).toEqual(
      p.forceSnapshots.find((s) => s.snapshotId === 'c2-red-a2')!.region,
    );
    expect(route.routes[0]).toBe(p.routes[0]);
    expect(route.schematic).toBe(true);
    expect(forcePrecision(route.entries[0]!)).toBe('schematic');
  });
  it('发布过滤撤回路线/track 后不能继续显示', () => {
    const raw = simulatePublishedC2();
    raw.routes[0]!.releaseStatus = 'unpublished';
    const p = getPublishedDatasetV2(raw);
    expect(selectForceStateForPhase(p, 'c2-a3').entries).toEqual([]);
    raw.forceTracks.find((t) => t.trackId === 'c2-national')!.releaseStatus =
      'unpublished';
    expect(
      selectForceStateForPhase(getPublishedDatasetV2(raw), 'c2-a1').entries,
    ).toEqual([]);
  });
  it('地图空间投影不包含跨阶段事件/路线，目录中的无坐标地点仍保留', () => {
    const p = data(),
      projected = selectScenePhaseView(p, 'c2-a2');
    expect(projected.dataset.events.map((e) => e.id)).toEqual([
      'fixture-event',
    ]);
    expect(projected.dataset.routes).toEqual([]);
    expect(projected.dataset.places).toEqual([]);
    expect(p.places.some((place) => place.placeId === 'fixture-place')).toBe(
      true,
    );
    expect(
      sceneSelection(projected.dataset, { kind: 'event', id: 'c2-future' }),
    ).toBeNull();
    expect(
      sceneSelection(projected.dataset, { kind: 'event', id: 'fixture-event' }),
    ).toEqual({ kind: 'event', id: 'fixture-event' });
    expect(selectScenePhaseView(p, null).dataset.events).toEqual([]);
  });
  it('图例依据实际可用阵营和模式，不把工程数量解释为兵力', () => {
    render(
      <ForceLegend
        state={selectForceStateForPhase(data(), 'c2-a1')}
        hasV2Renderer={false}
      />,
    );
    expect(
      screen.getByText(/红军相关部队 · 点位 · 示意精度/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/国民党军相关部队 · 点位 · 示意精度/),
    ).toBeInTheDocument();
    expect(screen.getByText(/三维阶段图层正在接入/)).toBeInTheDocument();
    expect(screen.getByText(/不表示真实兵力/)).toBeInTheDocument();
    expect(screen.queryByText(/区域 ·/)).toBeNull();
  });
});
