import { z } from 'zod';
import { normalizeDataset, type HistoryDatasetV2 } from '../contracts';
import { getPublishedDatasetV2, validateDataset } from './validate-dataset';

export const releaseRestrictionsSchema = z.strictObject({
  gates: z.array(
    z.tuple([z.enum(['event', 'topic']), z.string().min(1), z.string().min(1)]),
  ),
  phaseSystem: z.boolean(),
});
export type ReleaseRestrictions = z.infer<typeof releaseRestrictionsSchema>;
export interface ReleaseSnapshot {
  dataset: HistoryDatasetV2;
  restrictions: ReleaseRestrictions;
}

/** Derived at build time. Restrictions contain IDs only and can only deny access. */
export function createReleaseSnapshot(input: unknown): ReleaseSnapshot {
  const candidate = normalizeDataset(validateDataset(input));
  return {
    dataset: getPublishedDatasetV2(candidate),
    restrictions: {
      gates: candidate.experiences
        .flatMap((manifest) => [
          ...manifest.linkedEventIds.map(
            (id) => ['event', id, manifest.experienceId] as const,
          ),
          ['topic', manifest.topicId, manifest.experienceId] as const,
        ])
        .map((entry) => [...entry]),
      phaseSystem: candidate.phases.length > 0,
    },
  };
}
