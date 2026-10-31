import { z } from 'zod';
import { coordinateSchema, spatialPrecisionSchema } from './data';
import { auditedFields, idListSchema, nonempty } from './primitives';

export const historicalPersonSchema = z.strictObject({
  personId: nonempty,
  name: nonempty,
  summary: nonempty,
  detail: nonempty,
  relatedEventIds: idListSchema,
  relatedTopicIds: idListSchema,
  assetIds: idListSchema,
  ...auditedFields,
});
export const historicalPlaceSchema = z
  .strictObject({
    placeId: nonempty,
    historicalName: nonempty,
    modernName: nonempty.nullable(),
    placeType: z.enum([
      'historical_event_site',
      'historical_site',
      'modern_museum',
      'memorial',
      'modern_reference',
    ]),
    summary: nonempty,
    detail: nonempty,
    coordinates: coordinateSchema.nullable(),
    coordinatePrecision: spatialPrecisionSchema,
    relatedEventIds: idListSchema,
    assetIds: idListSchema,
    ...auditedFields,
  })
  .superRefine((place, ctx) => {
    if (
      (place.coordinates === null) !==
      (place.coordinatePrecision === 'unknown')
    )
      ctx.addIssue({
        code: 'custom',
        path: ['coordinatePrecision'],
        message: '未知坐标必须为 null；有坐标必须明确空间精度',
      });
  });
export type HistoricalPerson = z.infer<typeof historicalPersonSchema>;
export type HistoricalPlace = z.infer<typeof historicalPlaceSchema>;
