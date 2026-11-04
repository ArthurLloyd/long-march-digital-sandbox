import * as THREE from 'three';
import type { JourneyTrack } from '../../features/timeline';
import { cueIndex, type Cue } from '../../shared/content/journey-screenplay';
import { projectGeo } from './geography';

// Editorial camera landmarks refer to registered waypoints. These boxes
// determine what the viewer can see; they never add a vertex to a march.
const sites = {
  遵义: ['march-sd3', 1],
  土城: ['march-sd1', 0],
  元厚: ['march-sd1-right', 0],
  古蔺: ['march-sd1', 1],
  叙永: ['march-sd1', 2],
  扎西: ['march-sd1', 3],
  茅台: ['march-sd3', 2],
  桐梓: ['march-sd2', 2],
  太平渡: ['march-sd2', 1],
  二郎滩: ['march-sd4', 1],
  贵阳: ['march-jinsha', 1],
  曲靖: ['march-jinsha', 3],
  昆明: ['enemy-map-jinsha-kunming', 0],
  皎平渡: ['march-jinsha', 4],
} as const;
type Site = keyof typeof sites;
export const campaignPlaceNames = Object.keys(sites) as Site[];
type ShotFrame = readonly [minWidth: number, ...places: Site[]];
const shots: Record<string, ShotFrame> = {
  '川黔边 · 合围': [3.4, '遵义', '古蔺', '扎西'],
  赤水河: [1.15, '元厚', '茅台', '太平渡'],
  北渡长江: [2, '遵义', '土城'],
  四次渡河: [1.4, '土城', '太平渡', '茅台', '二郎滩'],
  进抵土城: [1.25, '遵义', '土城'],
  '尾追川军 · 初判四个团': [0.72, '土城', '元厚', '古蔺'],
  '川军增援 · 战斗陷入僵持': [0.72, '土城', '元厚', '古蔺'],
  撤出战斗: [0.7, '元厚', '土城', '古蔺'],
  一渡赤水: [0.78, '土城', '元厚', '古蔺'],
  长江沿岸布防: [1.8, '土城', '叙永', '扎西'],
  向扎西集中: [1.35, '叙永', '扎西'],
  扎西集结: [1.35, '扎西', '叙永'],
  决议与整编: [0.85, '扎西'],
  回师黔北: [1.5, '扎西', '太平渡'],
  追兵西移: [1.9, '扎西', '古蔺', '土城'],
  掉头向东: [1.6, '扎西', '太平渡'],
  二渡赤水: [0.95, '太平渡', '二郎滩', '古蔺'],
  '桐梓 · 娄山关': [1.5, '太平渡', '桐梓', '遵义'],
  重占遵义: [1.05, '桐梓', '遵义'],
  围堵遵义: [1.6, '遵义', '茅台', '桐梓'],
  鲁班场: [1, '遵义', '茅台'],
  三渡赤水: [0.95, '茅台', '古蔺'],
  古蔺方向: [1.7, '叙永', '古蔺', '茅台'],
  追兵压向河西: [1.65, '叙永', '古蔺', '茅台'],
  河西追堵: [1.7, '叙永', '古蔺', '二郎滩'],
  佯动与折返: [1.6, '叙永', '古蔺', '太平渡', '二郎滩'],
  四渡赤水: [0.92, '古蔺', '太平渡', '二郎滩'],
  挥师南下: [1.6, '茅台', '二郎滩', '遵义'],
  乌江以南: [2.2, '二郎滩', '遵义', '贵阳'],
  贵阳方向: [1.3, '贵阳'],
  转向云南: [2.6, '贵阳', '曲靖'],
  调动滇军: [2.2, '曲靖', '昆明', '皎平渡'],
  抢占渡口: [1.7, '曲靖', '皎平渡'],
  皎平渡: [0.85, '皎平渡'],
  渡过金沙江: [4, '皎平渡', '曲靖', '贵阳', '遵义', '土城'],
};
export function campaignFrames(
  chapterId: string,
  cues: readonly Cue[],
  tracks: readonly JourneyTrack[],
) {
  if (
    !/^chapter-(event-sd(?:-[1-4])?|event-zy-resolution|event-js)$/.test(
      chapterId,
    )
  )
    return null;
  const points = new Map<Site, THREE.Vector2>();
  for (const name of campaignPlaceNames) {
    const [id, i] = sites[name];
    const geo = tracks.find((t) => t.id === id)?.points[i];
    if (geo) points.set(name, new THREE.Vector2(...projectGeo(geo)));
  }
  return cues.map(([, , heading]) => {
    const frame = shots[heading];
    if (!frame) return null;
    const [minWidth, ...names] = frame;
    const labels = names.flatMap((name) => {
      const position = points.get(name);
      return position ? [{ name, position }] : [];
    });
    if (!labels.length) return null;
    return {
      minWidth,
      labels,
      box: new THREE.Box2().setFromPoints(labels.map((p) => p.position)),
    };
  });
}

export function campaignView(
  frames: ReturnType<typeof campaignFrames>,
  cues: readonly Cue[],
  progress: number,
  subject: THREE.Vector3,
  aspect: number,
  zoom: number,
  level: number,
  reduced: boolean,
) {
  if (!frames) return null;
  const i = cueIndex(cues, progress),
    frame = frames[i];
  if (!frame) return null;
  const compose = (f: NonNullable<typeof frame>) => {
    // Keep the playing army in the composition between the named places,
    // even where the available route ends short of a narrated river bank.
    const box = f.box;
    const size = box.getSize(new THREE.Vector2()),
      centre = box.getCenter(new THREE.Vector2());
    centre.lerp(
      box.clampPoint(
        new THREE.Vector2(subject.x, subject.z),
        new THREE.Vector2(),
      ),
      0.12,
    );
    const width = Math.max(f.minWidth, size.x * 1.35);
    const groundHeight = Math.max(
      f.minWidth * 0.55,
      size.y * 1.48,
      width / Math.max(0.5, aspect),
    );
    const altitude =
      (groundHeight / (2 * Math.tan(THREE.MathUtils.degToRad(43) / 2)) + 0.14) *
      zoom;
    return { centre, altitude };
  };
  const view = compose(frame),
    next = frames[i + 1];
  if (next && !reduced) {
    const local = (progress - cues[i]![0]) / (cues[i + 1]![0] - cues[i]![0]);
    const blend = THREE.MathUtils.smoothstep(local, 0.7, 1);
    if (blend > 0) {
      const upcoming = compose(next);
      view.centre.lerp(upcoming.centre, blend);
      view.altitude = THREE.MathUtils.lerp(
        view.altitude,
        upcoming.altitude,
        blend,
      );
    }
  }
  const target = new THREE.Vector3(view.centre.x, level + 0.04, view.centre.y);
  const position = target
    .clone()
    .add(new THREE.Vector3(0, view.altitude, 0.29 * view.altitude));
  return { target, position, labels: frame.labels };
}
