import { describe, expect, it } from 'vitest';
import raw from '../data/verified/dataset.json';
import { normalizeDataset } from '../shared/contracts';
import { validateDataset } from '../shared/utils/validate-dataset';
import {
  eventMapInput,
  loadExhibitionEventMap,
} from '../app/history/event-map/event-map-loader';
import { validateEventMapResources } from '../app/history/event-map/event-map-schema';
import {
  eventLocationInventory,
  eventMapCoverage,
  selectExhibitionPlacements,
} from '../app/history/event-map/event-map-selectors';
import { createExperienceCatalog } from '../app/experience/historical-experience-routing';
import { selectScenePhaseView } from '../app/history/scene-phase-view';
import { layoutEventLabels } from '../app/landscape/event-marker-layout';
import { simulatePublishedSample } from './fixtures/c1-sample';

const dataset = () => normalizeDataset(validateDataset(structuredClone(raw)));
const resources = () =>
  validateEventMapResources(
    eventMapInput.positions,
    eventMapInput.references,
    dataset(),
  );
describe('独立展陈位置与历史坐标隔离', () => {
  it('按实际事件覆盖，一对多落点不复制正文，也不改 B 的任何字段', () => {
    const data = dataset(),
      before = JSON.stringify(data);
    const model = loadExhibitionEventMap(data, 'exhibition')!;
    expect(new Set(model.entries.map((p) => p.eventId)).size).toBe(
      data.events.length,
    );
    expect(model.entries.length).toBeGreaterThan(data.events.length);
    expect(
      model.entries.every(
        (p) => p.event === data.events.find((e) => e.id === p.eventId),
      ),
    ).toBe(true);
    expect(eventMapCoverage(data, model)).toHaveLength(data.events.length);
    expect(
      data.events.every(
        (e) => e.coordinates === null && e.coordinatePrecision === 'unknown',
      ),
    ).toBe(true);
    expect(JSON.stringify(data)).toBe(before);
    expect(data.routes).toEqual([]);
  });
  it('strict 保留原规则，不从展陈位置回填任何坐标', () => {
    expect(loadExhibitionEventMap(dataset())).toBeNull();
    const strict = createExperienceCatalog(raw);
    expect(
      loadExhibitionEventMap(strict.published, strict.audience),
    ).toBeNull();
    expect(strict.published.events).toEqual([]);
  });
  it('全局位置不受当前阶段过滤；决议位于扎西而非遵义主题会址', () => {
    const data = dataset(),
      model = loadExhibitionEventMap(data, 'exhibition')!;
    const phase = selectScenePhaseView(data, 'zy-phase');
    expect(phase.dataset.events).toHaveLength(1);
    expect(model.entries.some((p) => p.eventId === 'event-ld')).toBe(true);
    const resolution = model.entries.find(
      (p) => p.eventId === 'event-zy-resolution',
    )!;
    expect(resolution.regionIds).toEqual(['zhaxi']);
    expect(resolution.anchorCoordinates[0]).toBeLessThan(105.2);
    expect(resolution.placementKind).toBe('region_reference');
  });
  it('四渡总体与第四次渡河区分；二渡和四渡能共享地点而不丢事件', () => {
    const all = loadExhibitionEventMap(dataset(), 'exhibition')!.entries;
    expect(all.find((p) => p.eventId === 'event-sd')!.placementKind).toBe(
      'area',
    );
    const atTaiping = all.filter((p) => p.locationNodeId === 'node-taiping');
    expect(atTaiping.map((p) => p.eventId).sort()).toEqual([
      'event-sd-2',
      'event-sd-4',
    ]);
    expect(atTaiping[0]!.anchorCoordinates).toEqual(
      atTaiping[1]!.anchorCoordinates,
    );
    expect(new Set(atTaiping.map((p) => p.placementId)).size).toBe(2);
    expect(
      all.find((p) => p.eventId === 'event-anshunchang')!.anchorCoordinates,
    ).not.toEqual(all.find((p) => p.eventId === 'event-ld')!.anchorCoordinates);
  });
  it('区域中心不是路线端点；机器清单保留补充资料要求', () => {
    const nodes = eventLocationInventory(
      loadExhibitionEventMap(dataset(), 'exhibition')!,
    );
    for (const n of nodes.filter((n) => n.isViewAnchorOnly)) {
      expect(n.candidateRouteEndpoint).toBe(false);
      expect(n.precision).toBe('schematic');
      expect(n.bounds).not.toBeNull();
    }
    expect(nodes.every((n) => n.missingEvidence.length > 0)).toBe(true);
  });
  it('新增加的事件自动进入覆盖表和未定位阅读入口，不固定事件总数', () => {
    const data = dataset();
    data.events.push({ ...data.events[0]!, id: 'event-new-unlocated' });
    const model = loadExhibitionEventMap(data, 'exhibition')!;
    expect(model.unlocated.map((e) => e.id)).toContain('event-new-unlocated');
    expect(eventMapCoverage(data, model)).toHaveLength(data.events.length);
  });
  it('明确撤回事件、拒绝事件和撤回的定位来源不借展出模式重现', () => {
    const data = dataset(),
      r = resources();
    r.positions.withdrawnEventIds.push('event-zy');
    data.events.find((e) => e.id === 'event-ld')!.reviewStatus = 'rejected';
    r.references.find((p) => p.referenceId === 'loc-taiping')!.availability =
      'withdrawn';
    const all = selectExhibitionPlacements(data, r);
    expect(
      all.some(
        (p) =>
          ['event-zy', 'event-ld'].includes(p.eventId) ||
          p.locationNodeId === 'node-taiping',
      ),
    ).toBe(false);
    r.positions.availability = 'withdrawn';
    expect(selectExhibitionPlacements(data, r)).toEqual([]);
  });
  it('合法历史坐标优先，独立展陈标记不会重复叠加', () => {
    // Isolated in-memory engineering input; no reviewer fields are written to the dataset.
    const data = simulatePublishedSample(),
      e = data.events[0]!;
    e.coordinates = [106.916, 27.691];
    e.coordinatePrecision = 'approximate';
    const r = resources();
    r.positions.placements = [
      {
        ...r.positions.placements[0]!,
        eventId: e.id,
        historicalSourceIds: e.sourceIds,
      },
    ];
    const all = selectExhibitionPlacements(data, r).filter(
      (p) => p.eventId === e.id,
    );
    expect(all).toHaveLength(1);
    expect(all[0]!.origin).toBe('historical');
    expect(all[0]!.placementId).toBe(`historical:${e.id}`);
  });
});
describe('结构、引用和精度门禁', () => {
  it.each([
    [
      '重复标记',
      (p: typeof eventMapInput.positions) =>
        p.placements.push(structuredClone(p.placements[0]!)),
    ],
    [
      '悬空事件',
      (p: typeof eventMapInput.positions) => {
        p.placements[0]!.eventId = 'missing';
      },
    ],
    [
      '悬空节点',
      (p: typeof eventMapInput.positions) => {
        p.placements[0]!.locationNodeId = 'missing';
      },
    ],
    [
      '错误坐标顺序',
      (p: typeof eventMapInput.positions) => {
        p.placements[0]!.anchorCoordinates = [27.69, 106.91];
      },
    ],
    [
      '无定位来源',
      (p: typeof eventMapInput.positions) => {
        p.placements[0]!.locationReferenceIds = ['missing'];
      },
    ],
    [
      '反向边界',
      (p: typeof eventMapInput.positions) => {
        p.regions[0]!.bounds = [107, 28, 106, 27];
      },
    ],
    [
      '将区域升级路线端点',
      (p: typeof eventMapInput.positions) => {
        p.nodes.find(
          (n) => n.anchorRole === 'regional_view_anchor',
        )!.candidateRouteEndpoint = true;
      },
    ],
    [
      '伪造exact精度',
      (p: typeof eventMapInput.positions) => {
        p.placements[0]!.precision = 'exact';
      },
    ],
    [
      '混用坐标系',
      (p: typeof eventMapInput.positions) => {
        p.coordinateSystem = 'GCJ-02';
      },
    ],
  ])('%s会被正常校验拒绝', (_name, mutate) => {
    const p = structuredClone(eventMapInput.positions);
    mutate(p);
    expect(() =>
      validateEventMapResources(p, eventMapInput.references, dataset()),
    ).toThrow();
  });
  it('屏幕标签避让保留原投影点，背后/屏外不挂边，拥挤可由目录选择', () => {
    const points = [
      { id: 'a', x: 700, y: 300, visible: true },
      { id: 'b', x: 700, y: 300, visible: true },
      { id: 'off', x: 5, y: 5, visible: false },
    ];
    const before = JSON.stringify(points),
      result = layoutEventLabels(points, 1440, 650, 'b');
    expect(result.filter((p) => p.visible)).toHaveLength(2);
    expect(result[0]!.id).toBe('b');
    expect(result[0]!.labelY).not.toBe(result[1]!.labelY);
    expect(result.find((p) => p.id === 'off')!.visible).toBe(false);
    expect(JSON.stringify(points)).toBe(before);
  });
});
