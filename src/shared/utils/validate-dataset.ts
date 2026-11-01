import {
  historyDatasetSchema,
  normalizeDataset,
  type HistoryDatasetV2,
  type VersionedHistoryDataset,
} from '../contracts/dataset';
import type { ReviewableRecord } from '../contracts/primitives';
import { createDatasetGraph, nodeKey } from './dataset-graph';
import { validateV2Relations } from './validate-v2-relations';

function validateReview(
  record: ReviewableRecord,
  id: string,
  errors: string[],
) {
  if (
    record.reviewStatus !== 'reviewed' &&
    record.releaseStatus !== 'published'
  )
    return;
  // reviewerId is a stable GitHub login; casing cannot create a second person.
  const identity = (value: string) => value.toLowerCase();
  const latest = new Map(
    record.reviews.map((review) => [identity(review.reviewerId), review]),
  );
  const approvals = new Set(
    [...latest.values()]
      .filter((review) => review.decision === 'approved')
      .map((review) => identity(review.reviewerId)),
  );
  const declared = new Set(record.reviewedBy.map(identity));
  if (
    record.reviewStatus !== 'reviewed' ||
    approvals.size < 2 ||
    [...latest.values()].some(
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
        index > 0 && review.reviewedAt < record.reviews[index - 1]!.reviewedAt,
    )
  ) {
    errors.push(
      `${id}: 审核记录必须按时间顺序追加，不能倒序使旧结论覆盖新结论`,
    );
  }
}

/** Validates shape, references and declared human-review evidence; never historical truth. */
export function validateDataset(input: unknown): VersionedHistoryDataset {
  const data = historyDatasetSchema.parse(input);
  const normalized = normalizeDataset(data);
  const errors: string[] = [];
  const graph = createDatasetGraph(normalized, errors);
  for (const node of graph.values()) {
    validateReview(node.record, node.id, errors);
    if (
      node.record.releaseStatus === 'published' &&
      node.record.sourceIds?.length === 0
    )
      errors.push(`${node.id}: 正式发布内容缺失来源`);
    for (const dependency of node.dependencies) {
      if (!graph.has(dependency))
        errors.push(`${node.id}: 引用 ${dependency} 不存在`);
    }
    // Preserve v1's strict publication-intent check. V2 uses transitive withdrawal filtering.
    if (
      !('schemaVersion' in data) &&
      node.record.releaseStatus === 'published'
    ) {
      for (const sourceId of node.record.sourceIds ?? []) {
        const source = graph.get(nodeKey('sources', sourceId));
        if (
          source &&
          (source.record.releaseStatus !== 'published' ||
            source.record.reviewStatus !== 'reviewed')
        )
          errors.push(`${node.id}: 来源 ${sourceId} 尚未完成发布核验`);
      }
    }
  }
  if ('schemaVersion' in data) validateV2Relations(data, errors);
  if (errors.length) throw new Error(errors.join('\n'));
  return data;
}

function filterPublished(data: HistoryDatasetV2): HistoryDatasetV2 {
  const graph = createDatasetGraph(data);
  const eligible = new Set(
    [...graph.values()]
      .filter(
        (node) =>
          node.visible &&
          node.record.reviewStatus === 'reviewed' &&
          node.record.releaseStatus === 'published',
      )
      .map((node) => node.key),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const key of eligible) {
      if (
        graph
          .get(key)!
          .dependencies.some((dependency) => !eligible.has(dependency))
      ) {
        eligible.delete(key);
        changed = true;
      }
    }
  }
  const contains = (collection: Parameters<typeof nodeKey>[0], id: string) =>
    eligible.has(nodeKey(collection, id));
  return {
    schemaVersion: 2,
    events: data.events.filter((r) => contains('events', r.id)),
    routes: data.routes.filter((r) => contains('routes', r.id)),
    sources: data.sources.filter((r) => contains('sources', r.sourceId)),
    topics: data.topics.filter((r) => contains('topics', r.topicId)),
    phases: data.phases.filter((r) => contains('phases', r.phaseId)),
    people: data.people.filter((r) => contains('people', r.personId)),
    places: data.places.filter((r) => contains('places', r.placeId)),
    forceTracks: data.forceTracks.filter((r) =>
      contains('forceTracks', r.trackId),
    ),
    forceSnapshots: data.forceSnapshots.filter((r) =>
      contains('forceSnapshots', r.snapshotId),
    ),
    experiences: data.experiences.filter((r) =>
      contains('experiences', r.experienceId),
    ),
    segments: data.segments.filter((r) => contains('segments', r.segmentId)),
    interactions: data.interactions.filter((r) =>
      contains('interactions', r.interactionId),
    ),
    fallbackContents: data.fallbackContents.filter((r) =>
      contains('fallbackContents', r.fallbackContentId),
    ),
    assets: data.assets.filter((r) => contains('assets', r.assetId)),
  };
}
export function getPublishedDataset(input: unknown): VersionedHistoryDataset {
  const data = validateDataset(input);
  const published = filterPublished(normalizeDataset(data));
  return 'schemaVersion' in data
    ? published
    : {
        events: published.events,
        routes: published.routes,
        sources: published.sources,
      };
}
export function getPublishedDatasetV2(input: unknown): HistoryDatasetV2 {
  return normalizeDataset(getPublishedDataset(input));
}
