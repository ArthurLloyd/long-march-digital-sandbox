import { z } from 'zod';
import { historyDatasetV1Schema } from './data';
import { topicSchema } from './topics';
import { historicalPhaseSchema } from './phases';
import { historicalPersonSchema, historicalPlaceSchema } from './entities';
import { forceTrackSchema, forceSnapshotSchema } from './forces';
import {
  experienceManifestSchema,
  experienceSegmentSchema,
  equivalentExperienceContentSchema,
} from './experiences';
import { interactionDefinitionSchema } from './interactions';
import { assetReferenceSchema } from './assets';

export const historyDatasetV2Schema = z.strictObject({
  schemaVersion: z.literal(2),
  ...historyDatasetV1Schema.shape,
  topics: z.array(topicSchema),
  phases: z.array(historicalPhaseSchema),
  people: z.array(historicalPersonSchema),
  places: z.array(historicalPlaceSchema),
  forceTracks: z.array(forceTrackSchema),
  forceSnapshots: z.array(forceSnapshotSchema),
  experiences: z.array(experienceManifestSchema),
  segments: z.array(experienceSegmentSchema),
  interactions: z.array(interactionDefinitionSchema),
  fallbackContents: z.array(equivalentExperienceContentSchema),
  assets: z.array(assetReferenceSchema),
});
export const historyDatasetSchema = z.union([
  historyDatasetV1Schema,
  historyDatasetV2Schema,
]);
export type HistoryDatasetV2 = z.infer<typeof historyDatasetV2Schema>;
export type VersionedHistoryDataset = z.infer<typeof historyDatasetSchema>;
export type HistoryDatasetV1 = z.infer<typeof historyDatasetV1Schema>;
export function normalizeDataset(
  data: VersionedHistoryDataset,
): HistoryDatasetV2 {
  if ('schemaVersion' in data) return data;
  return {
    ...data,
    schemaVersion: 2,
    topics: [],
    phases: [],
    people: [],
    places: [],
    forceTracks: [],
    forceSnapshots: [],
    experiences: [],
    segments: [],
    interactions: [],
    fallbackContents: [],
    assets: [],
  };
}
