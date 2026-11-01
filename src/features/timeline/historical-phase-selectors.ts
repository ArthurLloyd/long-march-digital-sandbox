import type {
  HistoricalPhase,
  HistoryDatasetV2,
  Topic,
} from '../../shared/contracts';

export interface PhaseModel {
  topics: Topic[];
  orders: ReadonlyMap<string, readonly HistoricalPhase[]>;
  key: string;
  error: string | null;
  hasPhases: boolean;
}

/** Input is the full published view, never candidates or a scoped scene view. */
export function createPhaseModel(published: HistoryDatasetV2): PhaseModel {
  const topics = [...published.topics].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const orders = new Map<string, HistoricalPhase[]>();
  let error: string | null = null;
  for (const topic of topics) {
    const phases = topic.phaseIds.map((id) =>
      published.phases.find((p) => p.phaseId === id),
    );
    if (
      phases.some(
        (phase, i) =>
          !phase ||
          phase.topicId !== topic.topicId ||
          (i > 0 && phase.sequence <= phases[i - 1]!.sequence),
      )
    ) {
      error = '历史阶段顺序或归属异常，暂不可播放。';
      orders.set(topic.topicId, []);
    } else orders.set(topic.topicId, phases as HistoricalPhase[]);
  }
  return {
    topics,
    orders,
    error,
    key: JSON.stringify(
      topics.map((t) => [
        t.topicId,
        orders.get(t.topicId)?.map((p) => [p.phaseId, p.sequence]),
      ]),
    ),
    hasPhases: [...orders.values()].some((phases) => phases.length > 0),
  };
}

export const TIME_PRECISION_LABELS = {
  day: '精确到日',
  month: '月份范围',
  year: '年份范围',
  range: '时间范围',
  unknown: '时间未知',
} as const;

export function phaseTimeText(phase: HistoricalPhase) {
  const { start, end, label } = phase.timeRange;
  return `${label}${start === null ? '' : ` · ${start}${end === start ? '' : ` 至 ${end}`}`} · ${TIME_PRECISION_LABELS[phase.timePrecision]}`;
}
