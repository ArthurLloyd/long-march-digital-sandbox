import { assetPathSchema, type AssetReference } from '../../shared/contracts';

export function assetsForPerson(
  assets: readonly AssetReference[],
  personId: string,
  review = false,
) {
  const candidates = assets.filter(
    (a) =>
      a.relatedPersonIds.includes(personId) &&
      assetPathSchema.safeParse(a.filePath).success &&
      (review ||
        (a.reviewStatus === 'reviewed' &&
          a.releaseStatus === 'published' &&
          a.rightsStatus === 'cleared')),
  );
  const photo = candidates.some((a) => a.assetType === 'historical_photo');
  return candidates.filter(
    (a) => photo || !['illustration', 'ai_recreation'].includes(a.assetType),
  );
}
