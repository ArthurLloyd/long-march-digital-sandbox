import { z } from 'zod';
import {
  auditedFields,
  contentTypeSchema,
  idListSchema,
  nonempty,
  positiveVersionSchema,
  sameIds,
} from './primitives';
import {
  experienceIdSchema,
  interactionIdSchema,
  requiredInteractionsFor,
} from './experience-catalog';

export const experienceManifestSchema = z
  .strictObject({
    experienceId: experienceIdSchema,
    topicId: nonempty,
    linkedEventIds: idListSchema.refine((ids) => ids.length > 0),
    scriptVersion: nonempty,
    completionPolicyVersion: positiveVersionSchema,
    segmentIds: idListSchema.refine((ids) => ids.length >= 5),
    requiredInteractionIds: z.array(interactionIdSchema).length(2),
    terminalSegmentId: nonempty,
    fallbackContentId: nonempty,
    assetIds: idListSchema,
    ...auditedFields,
  })
  .superRefine((manifest, ctx) => {
    if (
      !sameIds(
        manifest.requiredInteractionIds,
        requiredInteractionsFor(manifest.experienceId),
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: '体验必须恰有产品契约指定的两个必要互动',
      });
    if (manifest.segmentIds.at(-1) !== manifest.terminalSegmentId)
      ctx.addIssue({ code: 'custom', message: '终点必须是最后一个段落' });
  });
export const experienceSegmentSchema = z.strictObject({
  segmentId: nonempty,
  experienceId: experienceIdSchema,
  kind: z.enum([
    'context',
    'observation',
    'process',
    'interaction',
    'conclusion',
  ]),
  title: nonempty,
  text: nonempty,
  contentType: contentTypeSchema,
  presentation: z.enum(['3d', 'video', 'mixed', 'text']),
  durationSeconds: z.number().finite().positive().nullable(),
  interactionIds: z
    .array(interactionIdSchema)
    .refine((ids) => new Set(ids).size === ids.length),
  assetIds: idListSchema,
  ...auditedFields,
});
export const equivalentExperienceContentSchema = z
  .strictObject({
    fallbackContentId: nonempty,
    experienceId: experienceIdSchema,
    steps: z
      .array(
        z.strictObject({
          stepId: nonempty,
          segmentId: nonempty,
          text: nonempty,
          interactionIds: z
            .array(interactionIdSchema)
            .refine((ids) => new Set(ids).size === ids.length),
          assetIds: idListSchema,
        }),
      )
      .min(5),
    ...auditedFields,
  })
  .refine(
    (content) =>
      new Set(content.steps.map((s) => s.stepId)).size === content.steps.length,
    '等价体验步骤 ID 重复',
  );
export type ExperienceManifest = z.infer<typeof experienceManifestSchema>;
export type ExperienceSegment = z.infer<typeof experienceSegmentSchema>;
export type EquivalentExperienceContent = z.infer<
  typeof equivalentExperienceContentSchema
>;
