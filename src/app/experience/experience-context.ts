import {
  cameraBookmarkSchema,
  type CameraBookmark,
} from '../../shared/contracts';
export function restoreCameraBookmark(
  input: unknown,
  expected: { sceneId: string | null; phaseId: string | null },
): CameraBookmark | null {
  const result = cameraBookmarkSchema.safeParse(input);
  return result.success &&
    expected.sceneId !== null &&
    result.data.sceneId === expected.sceneId &&
    result.data.phaseId === expected.phaseId
    ? result.data
    : null;
}
