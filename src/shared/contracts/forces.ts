import { z } from 'zod';
import { coordinateSchema, spatialPrecisionSchema } from './data';
import { auditedFields, idListSchema, nonempty } from './primitives';

export const forceTrackSchema = z.strictObject({
  trackId: nonempty,
  unitId: nonempty,
  name: nonempty,
  camp: z.enum(['red_army', 'nationalist_army', 'other']),
  snapshotIds: idListSchema,
  ...auditedFields,
});
export const forceSnapshotSchema = z
  .strictObject({
    snapshotId: nonempty,
    trackId: nonempty,
    phaseId: nonempty,
    coordinates: coordinateSchema.nullable(),
    coordinatePrecision: spatialPrecisionSchema,
    region: z
      .strictObject({
        coordinates: z.array(coordinateSchema).min(3),
        precision: z.enum(['exact', 'approximate', 'schematic']),
      })
      .nullable(),
    routeId: nonempty.nullable(),
    displayMode: z.enum(['point', 'region', 'route', 'hidden']),
    ...auditedFields,
  })
  .superRefine((snapshot, ctx) => {
    if (
      (snapshot.coordinates === null) !==
      (snapshot.coordinatePrecision === 'unknown')
    )
      ctx.addIssue({
        code: 'custom',
        message: '部队未知坐标必须为 null；有坐标必须声明精度',
      });
    if (
      (snapshot.displayMode === 'point' && snapshot.coordinates === null) ||
      (snapshot.displayMode === 'region' && snapshot.region === null) ||
      (snapshot.displayMode === 'route' && snapshot.routeId === null)
    )
      ctx.addIssue({
        code: 'custom',
        message: '部队显示模式缺少对应位置、区域或路线；未知可隐藏，不得推算',
      });
  });
export type ForceTrack = z.infer<typeof forceTrackSchema>;
export type ForceSnapshot = z.infer<typeof forceSnapshotSchema>;
