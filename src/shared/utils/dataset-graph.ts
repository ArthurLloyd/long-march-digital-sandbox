import type { HistoryDatasetV2 } from '../contracts/dataset';
import type { ReviewableRecord } from '../contracts/primitives';

export type DatasetCollection = Exclude<
  keyof HistoryDatasetV2,
  'schemaVersion'
>;
export type DatasetNode = {
  key: string;
  collection: DatasetCollection;
  id: string;
  record: ReviewableRecord & { sourceIds?: string[] };
  dependencies: string[];
  visible: boolean;
};
export const nodeKey = (collection: DatasetCollection, id: string) =>
  JSON.stringify([collection, id]);

/** One dependency graph is shared by validation and publication, preventing drift. */
export function createDatasetGraph(
  data: HistoryDatasetV2,
  errors: string[] = [],
) {
  const graph = new Map<string, DatasetNode>();
  const refs = (collection: DatasetCollection, ids: readonly string[]) =>
    ids.map((id) => nodeKey(collection, id));
  function add<T extends ReviewableRecord & { sourceIds?: string[] }>(
    collection: DatasetCollection,
    records: readonly T[],
    idOf: (record: T) => string,
    dependencies: (record: T) => string[] = () => [],
    visible: (record: T) => boolean = () => true,
  ) {
    for (const record of records) {
      const id = idOf(record);
      const key = nodeKey(collection, id);
      if (graph.has(key)) errors.push(`${collection}: ID 重复 ${id}`);
      graph.set(key, {
        key,
        collection,
        id,
        record,
        visible: visible(record),
        dependencies: [
          ...refs('sources', record.sourceIds ?? []),
          ...dependencies(record),
        ],
      });
    }
  }
  add('sources', data.sources, (r) => r.sourceId);
  add('events', data.events, (r) => r.id);
  add(
    'routes',
    data.routes,
    (r) => r.id,
    () => [],
    (r) => r.displayMode !== 'hidden',
  );
  add(
    'topics',
    data.topics,
    (r) => r.topicId,
    (r) => [...refs('phases', r.phaseIds), ...refs('events', r.eventIds)],
  );
  add(
    'phases',
    data.phases,
    (r) => r.phaseId,
    (r) => [nodeKey('topics', r.topicId), ...refs('events', r.eventIds)],
  );
  add(
    'people',
    data.people,
    (r) => r.personId,
    (r) => [
      ...refs('events', r.relatedEventIds),
      ...refs('topics', r.relatedTopicIds),
      ...refs('assets', r.assetIds),
    ],
  );
  add(
    'places',
    data.places,
    (r) => r.placeId,
    (r) => [
      ...refs('events', r.relatedEventIds),
      ...refs('assets', r.assetIds),
    ],
  );
  add(
    'forceTracks',
    data.forceTracks,
    (r) => r.trackId,
    (r) => refs('forceSnapshots', r.snapshotIds),
  );
  add(
    'forceSnapshots',
    data.forceSnapshots,
    (r) => r.snapshotId,
    (r) => [
      nodeKey('forceTracks', r.trackId),
      nodeKey('phases', r.phaseId),
      ...refs('routes', r.routeId === null ? [] : [r.routeId]),
    ],
    (r) => r.displayMode !== 'hidden',
  );
  add(
    'experiences',
    data.experiences,
    (r) => r.experienceId,
    (r) => [
      nodeKey('topics', r.topicId),
      ...refs('events', r.linkedEventIds),
      ...refs('segments', r.segmentIds),
      ...refs('interactions', r.requiredInteractionIds),
      nodeKey('fallbackContents', r.fallbackContentId),
      ...refs('assets', r.assetIds),
    ],
  );
  add(
    'segments',
    data.segments,
    (r) => r.segmentId,
    (r) => [
      nodeKey('experiences', r.experienceId),
      ...refs('interactions', r.interactionIds),
      ...refs('assets', r.assetIds),
    ],
  );
  add(
    'interactions',
    data.interactions,
    (r) => r.interactionId,
    (r) => [
      nodeKey('experiences', r.experienceId),
      nodeKey('segments', r.segmentId),
      ...('materials' in r
        ? r.materials.flatMap((m) => [
            ...refs('assets', m.assetIds),
            ...refs('sources', m.sourceIds),
          ])
        : []),
    ],
  );
  add(
    'fallbackContents',
    data.fallbackContents,
    (r) => r.fallbackContentId,
    (r) => [
      nodeKey('experiences', r.experienceId),
      ...r.steps.flatMap((step) => [
        nodeKey('segments', step.segmentId),
        ...refs('interactions', step.interactionIds),
        ...refs('assets', step.assetIds),
      ]),
    ],
  );
  add(
    'assets',
    data.assets,
    (r) => r.assetId,
    (r) => [
      ...refs('people', r.relatedPersonIds),
      ...refs('places', r.relatedPlaceIds),
      ...refs('events', r.relatedEventIds),
    ],
  );
  return graph;
}
