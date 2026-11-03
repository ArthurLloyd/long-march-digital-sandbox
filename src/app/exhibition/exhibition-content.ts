import { z } from 'zod';
import raw from './data/exhibition-supplement.json';
import {
  historyEventSchema,
  historicalPersonSchema,
  sourceReferenceSchema,
  normalizeDataset,
  type HistoryDatasetV2,
} from '../../shared/contracts';
import { validateDataset } from '../../shared/utils/validate-dataset';
import { createExhibitionCatalog } from '../history/exhibition-catalog';
import {
  eventMapInput,
  loadExhibitionEventMap,
} from '../history/event-map/event-map-loader';
import { validateEventMapResources } from '../history/event-map/event-map-schema';
import { REGIONS, type RegionId } from '../landscape/map-regions';
import type { JourneyPlan } from '../../features/timeline/journey';
import { validateCampaignSituations } from './campaign-situations';
const id = z.string().min(1);
const point = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-85).max(85),
]);
const chapterSchema = z.strictObject({
  id,
  title: id,
  dateText: id,
  regionId: id,
  topicId: id.nullable(),
  phaseId: id.nullable(),
  eventIds: z.array(id).min(1),
  duration: z.number().positive(),
  arrival: z.number().min(0.01).max(1),
});
const trackSchema = z.strictObject({
  id,
  chapterId: id,
  holdChapterIds: z.array(id).optional(),
  sequenceIds: z.array(id).min(1).optional(),
  presentation: z.enum(['regional_transfer', 'local_transfer']).optional(),
  unitId: id,
  unitName: id,
  camp: z.enum(['red_army', 'nationalist_army']),
  points: z.array(point).min(2),
  sourceIds: z.array(id).min(1),
  evidenceType: z.enum(['documented_geometry', 'sourced_strategic_direction']),
  precision: z.enum(['approximate', 'schematic']),
  limitations: id,
  locationReferenceIds: z.array(id).min(2),
  waypointNames: z.array(id).min(2),
  dateText: id,
  evidenceNote: id,
  availability: z.enum(['available', 'withdrawn']),
});
const supplementSchema = z.strictObject({
  schemaVersion: z.literal(1),
  version: id,
  events: z.array(historyEventSchema),
  people: z.array(historicalPersonSchema),
  sources: z.array(sourceReferenceSchema),
  storyExtensions: z.record(
    id,
    z.strictObject({
      paragraphs: z.array(id).min(2),
      sourceIds: z.array(id).min(1),
    }),
  ),
  eventLinks: z.record(
    id,
    z.strictObject({
      place: id.nullable(),
      regionId: id,
      personIds: z.array(id),
      kind: z.enum(['area', 'point']),
    }),
  ),
  modernReferences: z.array(z.unknown()),
  mapRegions: z.array(z.unknown()),
  mapNodes: z.array(z.unknown()),
  mapPlacements: z.array(z.unknown()),
  chapters: z.array(chapterSchema),
  sequences: z
    .array(z.strictObject({ id, title: id, chapterIds: z.array(id).min(1) }))
    .min(1),
  tracks: z.array(trackSchema),
});
export function createJourneyContent(input: unknown, audience: 'exhibition') {
  if (audience !== 'exhibition')
    throw new Error('补充展陈内容不供 strict 消费者使用');
  const supplement = supplementSchema.parse(raw);
  const original = normalizeDataset(validateDataset(input));
  const unique = <T>(items: T[], key: (item: T) => string) => {
    if (new Set(items.map(key)).size !== items.length)
      throw new Error('补充资源ID重复');
    return items;
  };
  const dataset: HistoryDatasetV2 = {
    ...original,
    events: unique([...original.events, ...supplement.events], (e) => e.id),
    sources: unique(
      [...original.sources, ...supplement.sources],
      (s) => s.sourceId,
    ),
    people: unique(
      [...original.people, ...supplement.people],
      (p) => p.personId,
    ),
  };
  validateDataset(dataset);
  const catalog = createExhibitionCatalog(dataset);
  const spatialInput = {
    positions: {
      ...eventMapInput.positions,
      regions: [...eventMapInput.positions.regions, ...supplement.mapRegions],
      nodes: [...eventMapInput.positions.nodes, ...supplement.mapNodes],
      placements: [
        ...eventMapInput.positions.placements,
        ...supplement.mapPlacements,
      ],
    },
    references: {
      ...eventMapInput.references,
      references: [
        ...eventMapInput.references.references,
        ...supplement.modernReferences,
      ],
    },
  };
  validateEventMapResources(
    spatialInput.positions,
    spatialInput.references,
    dataset,
  );
  const map = loadExhibitionEventMap(dataset, 'exhibition', spatialInput);
  if (!map || map.error) throw new Error(map?.error ?? '展陈位置无法加载');
  const chapters = unique(supplement.chapters, (c) => c.id);
  const sequences = unique(supplement.sequences, (s) => s.id);
  const tracks = unique(supplement.tracks, (t) => t.id);
  const referenceIds = new Set(
    map.resources.references.map((r) => r.referenceId),
  );
  for (const c of chapters) {
    if (c.eventIds.some((id) => !dataset.events.some((e) => e.id === id)))
      throw new Error(`章节事件不存在：${c.id}`);
    if (
      c.phaseId &&
      !dataset.phases.some(
        (p) =>
          p.phaseId === c.phaseId &&
          p.topicId === c.topicId &&
          c.eventIds.every((id) => p.eventIds.includes(id)),
      )
    )
      throw new Error(`章节阶段引用不匹配：${c.id}`);
  }
  for (const s of sequences)
    if (s.chapterIds.some((id) => !chapters.some((c) => c.id === id)))
      throw new Error(`序列章节不存在：${s.id}`);
  for (const t of tracks) {
    if (
      !chapters.some((c) => c.id === t.chapterId) ||
      (t.sequenceIds ?? []).some(
        (id) =>
          !sequences.some(
            (s) => s.id === id && s.chapterIds.includes(t.chapterId),
          ),
      ) ||
      (t.holdChapterIds ?? []).some(
        (id) => !chapters.some((c) => c.id === id),
      ) ||
      t.sourceIds.some(
        (id) => !dataset.sources.some((s) => s.sourceId === id),
      ) ||
      t.locationReferenceIds.some((id) => !referenceIds.has(id))
    )
      throw new Error(`路线引用失效：${t.id}`);
    if (
      t.evidenceType === 'sourced_strategic_direction' &&
      t.precision !== 'schematic'
    )
      throw new Error('战略方向不能升级为道路几何');
    if (
      t.points.length !== t.locationReferenceIds.length ||
      t.points.length !== t.waypointNames.length
    )
      throw new Error('路线地名和定位来源必须逐点对应');
    t.points.forEach((p, i) => {
      const r = map.resources.references.find(
        (r) => r.referenceId === t.locationReferenceIds[i],
      );
      if (
        !r?.coordinates ||
        Math.hypot(p[0] - r.coordinates[0], p[1] - r.coordinates[1]) > 0.003
      )
        throw new Error(`路线参照偏离来源：${t.id}`);
    });
  }
  for (const [eventId, link] of Object.entries(supplement.eventLinks))
    if (
      !dataset.events.some((e) => e.id === eventId) ||
      link.personIds.some(
        (id) => !dataset.people.some((p) => p.personId === id),
      )
    )
      throw new Error('故事人物关联失效');
  for (const [eid, extra] of Object.entries(supplement.storyExtensions))
    if (
      !dataset.events.some((e) => e.id === eid) ||
      extra.sourceIds.some(
        (id) => !dataset.sources.some((s) => s.sourceId === id),
      )
    )
      throw new Error('补充叙事引用失效');
  const plan: JourneyPlan = {
    key: `exhibition-${supplement.version}`,
    chapters,
    sequences,
    tracks: tracks.filter(
      (t) =>
        t.availability === 'available' &&
        t.sourceIds.every(
          (id) =>
            dataset.sources.find((s) => s.sourceId === id)?.reviewStatus !==
            'rejected',
        ),
    ),
  };
  const campaign = validateCampaignSituations(chapters.map((c) => c.id));
  return { catalog, dataset, map, plan, supplement, campaign };
}
export type JourneyContent = ReturnType<typeof createJourneyContent>;
const regionModels = new WeakMap<
  JourneyContent,
  Map<string | null, JourneyContent['map']>
>();
/** Region membership changes rarely; transport ticks must not recreate map areas. */
export function journeyRegionMap(
  content: JourneyContent,
  region: string | null,
) {
  const models = regionModels.get(content) ?? new Map();
  regionModels.set(content, models);
  if (!models.has(region))
    models.set(region, {
      ...content.map,
      entries:
        region === null
          ? []
          : content.map.entries.filter(
              (p) => eventGeographicRegion(content, p.eventId) === region,
            ),
      unlocated:
        region === null
          ? []
          : content.map.unlocated.filter(
              (e) => eventGeographicRegion(content, e.id) === region,
            ),
    });
  return models.get(region)!;
}
export function isGeographicRegion(id: string | null): id is RegionId {
  return id !== null && id in REGIONS;
}
export function eventGeographicRegion(
  content: JourneyContent,
  eventId: string,
): string | null {
  const extra = content.supplement.eventLinks[eventId];
  if (extra) return extra.regionId;
  const entry = content.map.entries.find((p) => p.eventId === eventId);
  return entry?.regionIds[0] === 'zhaxi'
    ? 'chishui'
    : (entry?.regionIds[0] ?? null);
}
