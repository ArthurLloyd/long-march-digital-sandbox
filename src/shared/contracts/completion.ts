import { z } from 'zod';
import {
  experienceIdSchema,
  interactionIdSchema,
  requiredInteractionsFor,
} from './experience-catalog';
import type { ExperienceManifest } from './experiences';
import { positiveVersionSchema, sameIds } from './primitives';

export const completionRecordSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    experienceId: experienceIdSchema,
    completionPolicyVersion: positiveVersionSchema,
    completedAt: z.iso.datetime({ offset: true }),
    completedInteractionIds: z.array(interactionIdSchema).length(2),
    completionMode: z.enum(['3d', 'video', 'equivalent']),
  })
  .refine(
    (record) =>
      sameIds(
        record.completedInteractionIds,
        requiredInteractionsFor(record.experienceId),
      ),
    '完成记录的必要互动不匹配',
  );
export type CompletionRecord = z.infer<typeof completionRecordSchema>;
export const completionEvidenceSchema = z.strictObject({
  experienceId: experienceIdSchema,
  completionPolicyVersion: positiveVersionSchema,
  terminalReached: z.boolean(),
  completedInteractionIds: z.array(interactionIdSchema),
  acknowledgedExplanationIds: z.array(interactionIdSchema),
  completionRequested: z.boolean(),
});
export type CompletionEvidence = z.infer<typeof completionEvidenceSchema>;
export function isCompletionRecordForExperience(
  input: unknown,
  manifest: ExperienceManifest,
): input is CompletionRecord {
  const result = completionRecordSchema.safeParse(input);
  return (
    result.success &&
    result.data.experienceId === manifest.experienceId &&
    result.data.completionPolicyVersion === manifest.completionPolicyVersion &&
    sameIds(
      result.data.completedInteractionIds,
      manifest.requiredInteractionIds,
    )
  );
}
/** Pure contract predicate; C1 must supply evidence from its own trusted runtime state. */
export function canCompleteExperience(
  manifest: ExperienceManifest,
  input: unknown,
): boolean {
  const result = completionEvidenceSchema.safeParse(input);
  if (!result.success) return false;
  const evidence = result.data;
  return (
    evidence.experienceId === manifest.experienceId &&
    evidence.completionPolicyVersion === manifest.completionPolicyVersion &&
    evidence.terminalReached &&
    evidence.completionRequested &&
    sameIds(
      evidence.completedInteractionIds,
      manifest.requiredInteractionIds,
    ) &&
    sameIds(
      evidence.acknowledgedExplanationIds,
      manifest.requiredInteractionIds,
    )
  );
}
