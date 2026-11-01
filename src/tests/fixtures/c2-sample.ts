import type {
  HistoricalPhase,
  HistoryDatasetV2,
  ForceSnapshot,
} from '../../shared/contracts';
import { simulatePublishedSample } from './c1-sample';

/** Engineering-only graph. Dates/coordinates/units do NOT describe Long March history. */
export function simulatePublishedC2(): HistoryDatasetV2 {
  const data = simulatePublishedSample();
  const original = data.events[0]!;
  const {
    reviewStatus,
    releaseStatus,
    reviewedBy,
    reviewedAt,
    reviews,
    sourceIds,
  } = original;
  const audit = {
    reviewStatus,
    releaseStatus,
    reviewedBy,
    reviewedAt,
    reviews,
    sourceIds,
  };
  const event = (id: string, title: string) => ({
    ...structuredClone(original),
    id,
    title,
    summary: 'C2 工程摘要，非史实',
    detail: 'C2 工程正文，非真实历史；只验证导航和阶段调度。',
  });
  data.events.push(
    event('c2-observe', '工程观察节点'),
    event('c2-future', '工程后续节点'),
    event('c2-other', '工程乙节点'),
    event('c2-empty', '工程无态势节点'),
  );
  const phase = (
    phaseId: string,
    topicId: string,
    title: string,
    sequence: number,
    eventIds: string[],
  ): HistoricalPhase => ({
    ...audit,
    phaseId,
    topicId,
    title,
    sequence,
    eventIds,
    timeRange: { start: null, end: null, label: '工程未知时间（非历史）' },
    timePrecision: 'unknown',
  });
  data.topics[0] = {
    ...data.topics[0]!,
    title: '工程专题甲（非史实）',
    summary: '三个工程阶段；不表示真实历史顺序。',
    phaseIds: ['c2-a1', 'c2-a2', 'c2-a3'],
    eventIds: ['c2-observe', 'fixture-event', 'c2-future'],
  };
  data.topics.push({
    ...audit,
    topicId: 'c2-topic-b',
    title: '工程专题乙（非史实）',
    summary: '独立专题；内部 sequence 不与甲比较。',
    phaseIds: ['c2-b1', 'c2-b2'],
    eventIds: ['c2-other', 'c2-empty'],
    displayOrder: 1,
  });
  data.phases = [
    phase('c2-a1', 'fixture-topic', '工程甲·观察', 10, ['c2-observe']),
    phase('c2-a2', 'fixture-topic', '工程甲·重点入口', 20, ['fixture-event']),
    phase('c2-a3', 'fixture-topic', '工程甲·收束', 30, ['c2-future']),
    phase('c2-b1', 'c2-topic-b', '工程乙·独立开始', 0, ['c2-other']),
    phase('c2-b2', 'c2-topic-b', '工程乙·资料待补', 1, ['c2-empty']),
  ];
  data.phases[0]!.timeRange = {
    start: '2090-01',
    end: '2090-01',
    label: '工程月份（非历史时间）',
  };
  data.phases[0]!.timePrecision = 'month';
  data.phases[1]!.timeRange = {
    start: '2090-01',
    end: '2090-02',
    label: '工程范围（非历史时间）',
  };
  data.phases[1]!.timePrecision = 'range';
  data.phases[3]!.timeRange = {
    start: '2080',
    end: '2080',
    label: '工程年份（非历史时间）',
  };
  data.phases[3]!.timePrecision = 'year';
  data.routes = [
    {
      ...audit,
      id: 'c2-route',
      name: '工程示意线（非历史路线）',
      coordinates: [
        [1, 2],
        [3, 4],
      ],
      evidenceLevel: 'schematic',
      displayMode: 'dashed',
      spatialPrecision: 'schematic',
    },
  ];
  const snapshot = (
    snapshotId: string,
    trackId: string,
    phaseId: string,
  ): ForceSnapshot => ({
    ...audit,
    snapshotId,
    trackId,
    phaseId,
    coordinates: [1, 2],
    coordinatePrecision: 'schematic',
    region: null,
    routeId: null,
    displayMode: 'point',
  });
  data.forceSnapshots = [
    snapshot('c2-red-a1', 'c2-red', 'c2-a1'),
    {
      ...snapshot('c2-red-a2', 'c2-red', 'c2-a2'),
      coordinates: null,
      coordinatePrecision: 'unknown',
      displayMode: 'region',
      region: {
        coordinates: [
          [1, 2],
          [2, 3],
          [3, 2],
        ],
        precision: 'schematic',
      },
    },
    {
      ...snapshot('c2-red-a3', 'c2-red', 'c2-a3'),
      coordinates: null,
      coordinatePrecision: 'unknown',
      displayMode: 'route',
      routeId: 'c2-route',
    },
    snapshot('c2-national-a1', 'c2-national', 'c2-a1'),
    snapshot('c2-other-b1', 'c2-other-track', 'c2-b1'),
    {
      ...snapshot('c2-unknown-b2', 'c2-unknown', 'c2-b2'),
      coordinates: null,
      coordinatePrecision: 'unknown',
      displayMode: 'hidden',
    },
  ];
  data.forceTracks = (
    [
      ['c2-red', '工程红方单位', 'red_army'],
      ['c2-national', '工程国民党军单位', 'nationalist_army'],
      ['c2-other-track', '工程其他单位', 'other'],
      ['c2-unknown', '工程未知位置单位', 'other'],
    ] as const
  ).map(([trackId, name, camp]) => ({
    ...audit,
    trackId,
    name,
    camp,
    unitId: trackId,
    snapshotIds: data.forceSnapshots
      .filter((s) => s.trackId === trackId)
      .map((s) => s.snapshotId),
  }));
  return data;
}
