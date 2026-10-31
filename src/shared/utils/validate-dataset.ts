import { historyDatasetSchema, type HistoryDataset } from '../contracts';

/** Checks record shape, referential integrity and human-review evidence, never historical truth. */
export function validateDataset(input: unknown): HistoryDataset {
  const data = historyDatasetSchema.parse(input);
  const errors: string[] = [];
  for (const [name, ids] of [
    ['事件', data.events.map((item) => item.id)],
    ['路线', data.routes.map((item) => item.id)],
    ['来源', data.sources.map((item) => item.sourceId)],
  ] as const) {
    if (new Set(ids).size !== ids.length) errors.push(`${name} ID 重复`);
  }
  const sourceMap = new Map(
    data.sources.map((source) => [source.sourceId, source]),
  );
  const records = [...data.events, ...data.routes, ...data.sources];
  for (const record of records) {
    const id = 'id' in record ? record.id : record.sourceId;
    if (
      record.reviewStatus === 'reviewed' ||
      record.releaseStatus === 'published'
    ) {
      const latestReviews = new Map(
        record.reviews.map((review) => [review.reviewerId, review]),
      );
      const approvals = new Set(
        [...latestReviews.values()]
          .filter((review) => review.decision === 'approved')
          .map((review) => review.reviewerId),
      );
      const declared = new Set(record.reviewedBy);
      if (
        record.reviewStatus !== 'reviewed' ||
        approvals.size < 2 ||
        [...latestReviews.values()].some(
          (review) => review.decision === 'changes_requested',
        ) ||
        declared.size !== record.reviewedBy.length ||
        declared.size !== approvals.size ||
        [...declared].some((reviewer) => !approvals.has(reviewer)) ||
        record.reviewedAt === null ||
        record.reviews.some((review) => review.reviewedAt > record.reviewedAt!)
      ) {
        errors.push(
          `${id}: 正式发布或 reviewed 记录必须有两名不同人员的同意复核，且审核字段一致`,
        );
      }
      if (
        record.reviews.some(
          (review, index) =>
            index > 0 &&
            review.reviewedAt < record.reviews[index - 1]!.reviewedAt,
        )
      ) {
        errors.push(
          `${id}: 审核记录必须按时间顺序追加，不能倒序使旧结论覆盖新结论`,
        );
      }
    }
    if ('sourceIds' in record) {
      if (record.releaseStatus === 'published' && record.sourceIds.length === 0)
        errors.push(`${id}: 正式发布内容缺失来源`);
      for (const sourceId of record.sourceIds) {
        const source = sourceMap.get(sourceId);
        if (!source) errors.push(`${id}: 来源 ${sourceId} 不存在`);
        else if (
          record.releaseStatus === 'published' &&
          (source.reviewStatus !== 'reviewed' ||
            source.releaseStatus !== 'published')
        )
          errors.push(`${id}: 来源 ${sourceId} 尚未完成发布核验`);
      }
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return data;
}

export function getPublishedDataset(input: unknown): HistoryDataset {
  const data = validateDataset(input);
  return {
    events: data.events.filter((item) => item.releaseStatus === 'published'),
    routes: data.routes.filter(
      (item) =>
        item.releaseStatus === 'published' && item.displayMode !== 'hidden',
    ),
    sources: data.sources.filter((item) => item.releaseStatus === 'published'),
  };
}
