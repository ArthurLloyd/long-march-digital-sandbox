import { z } from 'zod';

export const coordinateSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
export type GeoCoordinate = z.infer<typeof coordinateSchema>;

const nonempty = z.string().trim().min(1);
const calendarDate = z.iso.date();
export const reviewStatusSchema = z.enum([
  'draft',
  'in_review',
  'reviewed',
  'rejected',
]);
export const spatialPrecisionSchema = z.enum([
  'exact',
  'approximate',
  'schematic',
  'unknown',
]);

export const humanReviewSchema = z.strictObject({
  reviewerId: nonempty,
  reviewerType: z.literal('human'),
  decision: z.enum(['approved', 'changes_requested']),
  reviewedAt: calendarDate,
  evidenceNote: nonempty,
});
export type HumanReview = z.infer<typeof humanReviewSchema>;

export const reviewFields = {
  reviewStatus: reviewStatusSchema,
  releaseStatus: z.enum(['unpublished', 'published']),
  reviewedBy: z.array(nonempty),
  reviewedAt: calendarDate.nullable(),
  reviews: z.array(humanReviewSchema),
};

export const historyEventSchema = z
  .strictObject({
    id: nonempty,
    title: nonempty,
    dateText: nonempty,
    datePrecision: z.enum(['day', 'month', 'year', 'range', 'unknown']),
    locationName: nonempty,
    coordinates: coordinateSchema.nullable(),
    coordinatePrecision: spatialPrecisionSchema,
    summary: nonempty,
    detail: nonempty,
    sourceIds: z.array(nonempty),
    contentType: z.enum([
      'historical_fact',
      'editorial_summary',
      'artistic_recreation',
      'teaching_simulation',
    ]),
    ...reviewFields,
  })
  .superRefine((event, ctx) => {
    if (
      (event.coordinates === null) !==
      (event.coordinatePrecision === 'unknown')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['coordinatePrecision'],
        message: '未知坐标必须为 null；有坐标时必须明确空间精度。',
      });
    }
  });
export type HistoryEvent = z.infer<typeof historyEventSchema>;

export const routeFeatureSchema = z
  .strictObject({
    id: nonempty,
    name: nonempty,
    coordinates: z.array(coordinateSchema),
    sourceIds: z.array(nonempty),
    evidenceLevel: z.enum([
      'documented_geometry',
      'confirmed_locations',
      'schematic',
      'insufficient',
    ]),
    displayMode: z.enum(['solid', 'points', 'dashed', 'hidden']),
    spatialPrecision: spatialPrecisionSchema,
    ...reviewFields,
  })
  .superRefine((route, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (
      route.displayMode === 'solid' &&
      (route.reviewStatus !== 'reviewed' ||
        route.evidenceLevel !== 'documented_geometry' ||
        !['exact', 'approximate'].includes(route.spatialPrecision) ||
        route.coordinates.length < 2 ||
        route.sourceIds.length === 0)
    )
      fail('实线必须具有已审核的史料几何、明确来源、可用坐标和明确精度。');
    if (
      route.evidenceLevel === 'confirmed_locations' &&
      !['points', 'hidden'].includes(route.displayMode)
    )
      fail('仅确认地点时只能绘制独立地点，不能连接为路线。');
    if (
      route.evidenceLevel === 'schematic' &&
      (!['dashed', 'hidden'].includes(route.displayMode) ||
        route.spatialPrecision !== 'schematic')
    )
      fail('示意路线必须标记 schematic，且只能虚线或隐藏。');
    if (
      route.evidenceLevel === 'insufficient' &&
      route.displayMode !== 'hidden'
    )
      fail('证据不足的路线必须隐藏。');
    if (
      route.displayMode === 'dashed' &&
      (route.evidenceLevel !== 'schematic' ||
        route.spatialPrecision !== 'schematic' ||
        route.coordinates.length < 2)
    )
      fail('虚线仅用于有几何的宏观示意路线。');
    if (
      route.displayMode === 'points' &&
      (route.coordinates.length === 0 ||
        !['exact', 'approximate'].includes(route.spatialPrecision))
    )
      fail('地点模式必须有坐标并说明精度。');
  });
export type RouteFeature = z.infer<typeof routeFeatureSchema>;

export const sourceReferenceSchema = z.strictObject({
  sourceId: nonempty,
  title: nonempty,
  publisherOrAuthor: nonempty,
  sourceType: z.enum([
    'archive',
    'book',
    'journal',
    'official_website',
    'museum',
    'map',
    'other',
  ]),
  urlOrCatalogNumber: nonempty,
  publicationDate: nonempty,
  pageOrSection: nonempty,
  accessedAt: calendarDate,
  supports: z.array(nonempty).min(1),
  limitations: nonempty,
  rightsNote: nonempty,
  ...reviewFields,
});
export type SourceReference = z.infer<typeof sourceReferenceSchema>;

export const historyDatasetV1Schema = z.strictObject({
  events: z.array(historyEventSchema),
  routes: z.array(routeFeatureSchema),
  sources: z.array(sourceReferenceSchema),
});
/** Legacy v1 shape. Versioned consumers use VersionedHistoryDataset. */
export type HistoryDataset = z.infer<typeof historyDatasetV1Schema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
