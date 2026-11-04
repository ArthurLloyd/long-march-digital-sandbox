import * as THREE from 'three';
import {
  cueIndex,
  type Cue,
  type Shot,
} from '../../shared/content/journey-screenplay';
import { sampleTrack, type JourneyTrack } from '../../features/timeline';
import { projectGeo } from './geography';

const views: Record<Shot, readonly [number, number, number, number]> = {
  // Range, elevation, azimuth, share of the regional centre in the composition.
  wide: [1.2, 0.98, 0.12, 0.78],
  advance: [0.66, 0.65, -0.16, 0.06],
  detail: [0.34, 0.49, 0.22, 0],
  resolve: [1.65, 1.16, 0.04, 0.89],
};
export function filmExtent(tracks: readonly JourneyTrack[]) {
  const box = new THREE.Box2();
  for (const track of tracks)
    for (const coordinates of track.points) {
      const [x, z] = projectGeo(coordinates);
      box.expandByPoint(new THREE.Vector2(x, z));
    }
  return box;
}
/** A single world-space datum for this whole route, including its surrounding
 * ridges. Terrain samples influence framing once, never the moving arrow. */
export function routeCameraLevel(
  bounds: THREE.Box2,
  anchor: THREE.Vector3,
  height: (x: number, z: number) => number,
) {
  const area = bounds.isEmpty()
    ? new THREE.Box2(
        new THREE.Vector2(anchor.x, anchor.z),
        new THREE.Vector2(anchor.x, anchor.z),
      )
    : bounds.clone();
  area.expandByScalar(0.3);
  let level = -Infinity;
  for (let j = 0; j <= 12; j++)
    for (let i = 0; i <= 12; i++)
      level = Math.max(
        level,
        height(
          THREE.MathUtils.lerp(area.min.x, area.max.x, i / 12),
          THREE.MathUtils.lerp(area.min.y, area.max.y, j / 12),
        ),
      );
  return level;
}
const subjectChapters = new Set([
  'chapter-event-ld',
  'chapter-event-sn',
  'chapter-ex-event-dawei',
  'chapter-ex-event-huining',
  'chapter-ex-event-jiangtai',
]);

/** Frame the valley floor independently of the clearance above nearby ridges.
 * The plane between the two end stations varies only over the length of the
 * journey. Small rises under the arrow never move or tilt the camera. */
export function marchFraming(
  chapterId: string,
  track: JourneyTrack | undefined,
  height: (x: number, z: number) => number,
  anchor?: THREE.Vector3,
) {
  if (
    anchor &&
    (chapterId === 'chapter-ex-event-ganzi' ||
      chapterId === 'chapter-ex-event-red2-formed')
  ) {
    const level = height(anchor.x, anchor.z);
    return { levelAt: () => level, deviation: 0, cameraLevel: level };
  }
  if (!subjectChapters.has(chapterId) || !track || track.points.length < 2)
    return null;
  const station = (fraction: number) => {
    const [x, z] = projectGeo(sampleTrack(track, fraction)!.coordinates);
    return new THREE.Vector3(x, height(x, z), z);
  };
  const start = station(0);
  const end = station(1);
  const axis = new THREE.Vector2(end.x - start.x, end.z - start.z);
  axis.divideScalar(Math.max(1e-8, axis.lengthSq()));
  const levelAt = (point: THREE.Vector3) =>
    THREE.MathUtils.lerp(
      start.y,
      end.y,
      THREE.MathUtils.smoothstep(
        (point.x - start.x) * axis.x + (point.z - start.z) * axis.y,
        0,
        1,
      ),
    );
  let deviation = 0;
  for (let i = 1; i < 32; i++) {
    const sample = station(i / 32);
    deviation = Math.max(deviation, Math.abs(sample.y - levelAt(sample)));
  }
  return { levelAt, deviation };
}

/** Sample both ends of a shot transition from playback time, including on seek. */
export function sampleFilmCamera(
  cues: readonly Cue[],
  progress: number,
  point: THREE.Vector3,
  bounds: THREE.Box2,
  zoom: number,
  groundLevel: number,
  reduced: boolean,
  conclusionBounds = bounds,
  overhead = false,
  framing: ReturnType<typeof marchFraming> = null,
): { target: THREE.Vector3; position: THREE.Vector3 } {
  const i = cueIndex(cues, progress);
  // A sidebar-only breath inherits the preceding composition at the chapter cut.
  if (i > 0 && cues[i]![6] === 'annotation')
    return sampleFilmCamera(
      cues,
      cues[i]![0] - 1e-6,
      point,
      bounds,
      zoom,
      groundLevel,
      reduced,
      conclusionBounds,
      overhead,
      framing,
    );
  const cue = cues[i]!;
  const previous = views[cues[Math.max(0, i - 1)]![1]],
    next = views[cue[1]];
  const local = (progress - cue[0]) / ((cues[i + 1]?.[0] ?? 1) - cue[0]);
  const t = reduced ? 1 : THREE.MathUtils.smoothstep(local, 0, 0.34);
  const mix = (n: number) => THREE.MathUtils.lerp(previous[n]!, next[n]!, t);
  const centre = bounds.isEmpty()
    ? new THREE.Vector2(point.x, point.z)
    : bounds.getCenter(new THREE.Vector2());
  const size = bounds.getSize(new THREE.Vector2());
  if (
    i === cues.length - 1 &&
    !conclusionBounds.isEmpty() &&
    conclusionBounds !== bounds
  ) {
    centre.lerp(conclusionBounds.getCenter(new THREE.Vector2()), t);
    size.lerp(conclusionBounds.getSize(new THREE.Vector2()), t);
  }
  const span = THREE.MathUtils.clamp(Math.max(size.x, size.y), 1.6, 13);
  const caps: Record<Shot, number> = {
    wide: 19,
    advance: 2.6,
    detail: 1.15,
    resolve: 22,
  };
  const lastShot = cues[Math.max(0, i - 1)]![1];
  const range = THREE.MathUtils.clamp(
    THREE.MathUtils.lerp(
      Math.min(caps[lastShot], span * previous[0]),
      Math.min(caps[cue[1]], span * next[0]),
      t,
    ) * zoom,
    framing ? Math.max(0.56, framing.deviation * 4) : 0.56,
    22,
  );
  const target = point.clone();
  target.x = THREE.MathUtils.lerp(point.x, centre.x, mix(3));
  target.z = THREE.MathUtils.lerp(point.z, centre.y, mix(3));
  target.y = groundLevel + 0.09;
  if (overhead) {
    // Fixed north-up axis. Keep the neighbouring crossings in view while a
    // smaller push toward the narrated subject shows the current river bank.
    const share = 0.38 + 0.48 * mix(3);
    target.x = THREE.MathUtils.lerp(point.x, centre.x, share);
    target.z = THREE.MathUtils.lerp(point.z, centre.y, share);
    target.y = groundLevel + 0.08;
    const altitude = Math.max(0.95, span * (0.64 + 0.6 * mix(0))) * zoom;
    return {
      target,
      position: target
        .clone()
        .add(new THREE.Vector3(0, altitude, 0.27 * altitude)),
    };
  }
  if (framing) {
    // A continent-scale route midpoint can lie far off-screen in a close
    // shot. Limit anticipation so the advancing unit stays in the frame.
    const lead = new THREE.Vector2(
      target.x - point.x,
      target.z - point.z,
    ).clampLength(0, range * 0.04);
    target.x = point.x + lead.x;
    target.z = point.z + lead.y;
  }
  const angle = mix(2);
  const position = target
    .clone()
    .add(
      new THREE.Vector3(
        range * Math.sin(angle),
        range * mix(1),
        range * Math.cos(angle),
      ),
    );
  if (framing) {
    // Eye elevation stays on the chapter's stable clearance datum. Lower
    // only the gaze to the route, leaving some terrain ahead of the arrow.
    target.y = framing.levelAt(point) + range * 0.055;
    if (framing.cameraLevel !== undefined)
      position.y = framing.cameraLevel + 0.09 + range * mix(1);
  }
  return { position, target };
}
