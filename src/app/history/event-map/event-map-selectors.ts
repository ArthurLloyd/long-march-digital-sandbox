import type {
  HistoryDatasetV2,
  HistoryEvent,
  SourceReference,
} from '../../../shared/contracts';
import { getPublishedDatasetV2 } from '../../../shared/utils/validate-dataset';
import type { EventMapResources, EventPlacement } from './event-map-schema';

export interface MapEventEntry extends Omit<EventPlacement, 'precision'> {
  precision: 'exact' | 'approximate' | 'schematic';
  event: HistoryEvent;
  origin: 'exhibition' | 'historical';
  historicalSources: SourceReference[];
}
export interface EventMapModel {
  entries: MapEventEntry[];
  resources: EventMapResources;
  unlocated: HistoryEvent[];
  error: string | null;
}
/** Eligibility for the supplementary exhibition layer only. Strict consumers never call this. */
export function selectExhibitionPlacements(
  dataset: HistoryDatasetV2,
  resources: EventMapResources,
): MapEventEntry[] {
  const { positions, references } = resources;
  if (positions.availability !== 'available') return [];
  const availableEvents = dataset.events.filter(
    (event) =>
      event.reviewStatus !== 'rejected' &&
      !positions.withdrawnEventIds.includes(event.id) &&
      event.sourceIds.every((id) =>
        dataset.sources.some(
          (s) => s.sourceId === id && s.reviewStatus !== 'rejected',
        ),
      ),
  );
  const qualified = new Map(availableEvents.map((e) => [e.id, e]));
  const historicalIds = new Set(
    getPublishedDatasetV2(dataset).events.map((e) => e.id),
  );
  const historical = availableEvents.filter(
    (e) =>
      historicalIds.has(e.id) &&
      e.releaseStatus === 'published' &&
      e.reviewStatus === 'reviewed' &&
      e.coordinates &&
      e.coordinatePrecision !== 'unknown',
  );
  const preferredIds = new Set(historical.map((e) => e.id));
  const entries: MapEventEntry[] = positions.placements.flatMap((p) => {
    const event = qualified.get(p.eventId);
    const node = positions.nodes.find(
      (n) => n.locationNodeId === p.locationNodeId,
    );
    if (
      !event ||
      preferredIds.has(event.id) ||
      p.availability !== 'available' ||
      node?.availability !== 'available' ||
      [...p.locationReferenceIds, ...node.locationReferenceIds].some(
        (id) =>
          !references.some(
            (r) => r.referenceId === id && r.availability === 'available',
          ),
      )
    )
      return [];
    return [
      {
        ...p,
        event,
        origin: 'exhibition' as const,
        historicalSources: dataset.sources.filter((s) =>
          p.historicalSourceIds.includes(s.sourceId),
        ),
      },
    ];
  });
  for (const event of historical) {
    const related = positions.placements.find((p) => p.eventId === event.id);
    entries.push({
      placementId: `historical:${event.id}`,
      eventId: event.id,
      locationNodeId: `historical:${event.id}`,
      regionIds: positions.regions
        .filter((r) => {
          const [x, y] = event.coordinates!;
          const [w, s, e, n] = r.bounds;
          return x >= w && x <= e && y >= s && y <= n;
        })
        .map((r) => r.regionId),
      placementKind: 'point',
      anchorCoordinates: event.coordinates!,
      bounds: null,
      precision: event.coordinatePrecision as
        'exact' | 'approximate' | 'schematic',
      anchorRole: 'historical_site_approximation',
      historicalSourceIds: event.sourceIds,
      locationReferenceIds: [],
      locationLabel: event.locationName,
      displayLabel: related?.displayLabel ?? null,
      rationale: '使用原始数据中已满足发布规则的历史坐标，优先于展陈概略位置。',
      limitations: '精度沿用原始历史记录。',
      availability: 'available',
      version: positions.version,
      event,
      origin: 'historical',
      historicalSources: dataset.sources.filter((s) =>
        event.sourceIds.includes(s.sourceId),
      ),
    });
  }
  const order = new Map(
    dataset.events.map((event, index) => [event.id, index]),
  );
  return entries.sort(
    (a, b) => (order.get(a.eventId) ?? 0) - (order.get(b.eventId) ?? 0),
  );
}
export function eventMapCoverage(
  dataset: HistoryDatasetV2,
  model: EventMapModel,
) {
  return dataset.events.map((e) => {
    const entries = model.entries.filter((p) => p.eventId === e.id);
    return {
      eventId: e.id,
      title: e.title,
      dateText: e.dateText,
      locationText: e.locationName,
      topicIds: dataset.topics
        .filter((t) => t.eventIds.includes(e.id))
        .map((t) => t.topicId),
      phaseIds: dataset.phases
        .filter((p) => p.eventIds.includes(e.id))
        .map((p) => p.phaseId),
      placementIds: entries.map((p) => p.placementId),
      regionIds: [...new Set(entries.flatMap((p) => p.regionIds))],
      placementKind: [...new Set(entries.map((p) => p.placementKind))],
      precision: [...new Set(entries.map((p) => p.precision))],
      historicalSourceIds: e.sourceIds,
      locationReferenceIds: [
        ...new Set(entries.flatMap((p) => p.locationReferenceIds)),
      ],
      implementationStatus: entries.length
        ? 'mapped'
        : 'unlocated_or_unavailable',
      unresolvedNotes: entries.length
        ? [...new Set(entries.map((p) => p.limitations))]
        : ['没有合格展陈位置；正文入口继续保留，补充地点关系及现代定位资料。'],
    };
  });
}
export function eventLocationInventory(model: EventMapModel) {
  return model.resources.positions.nodes.map((node) => ({
    ...node,
    eventIds: [
      ...new Set(
        model.entries
          .filter((p) => p.locationNodeId === node.locationNodeId)
          .map((p) => p.eventId),
      ),
    ],
    isViewAnchorOnly: node.anchorRole === 'regional_view_anchor',
  }));
}
