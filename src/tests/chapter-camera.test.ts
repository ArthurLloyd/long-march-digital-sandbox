import { expect, it } from 'vitest';
import {
  sampleChapterCameraFlight,
  sampleCameraFlight,
  type CameraPose,
} from '../app/landscape/camera-flight';
const a: CameraPose = { position: [0, 0.8, 1], target: [0, 0, 0] },
  b: CameraPose = { position: [5, 0.8, 5], target: [5, 0, 4] },
  overview: CameraPose = { position: [2.5, 5, 2.2], target: [2.5, 0, 2] };
it('uses a strategic overhead handoff for every regional transition and then approaches its destination', () => {
  expect(sampleChapterCameraFlight(a, b, 0, overview)).toEqual(a);
  expect(sampleChapterCameraFlight(a, b, 0.48, overview)).toEqual(overview);
  expect(sampleChapterCameraFlight(a, b, 1, overview)).toEqual(b);
  const approach = sampleChapterCameraFlight(a, b, 0.9, overview);
  expect(approach.position[1]).toBeLessThan(overview.position[1]);
});
it('keeps local event approaches smooth and deterministic without inventing geographic movement', () => {
  expect(sampleChapterCameraFlight(a, b, 0.7)).toEqual(
    sampleCameraFlight(a, b, 0.7),
  );
  const first = sampleChapterCameraFlight(a, b, 0.7, overview);
  sampleChapterCameraFlight(a, b, 0.3, overview);
  expect(sampleChapterCameraFlight(a, b, 0.7, overview)).toEqual(first);
});
