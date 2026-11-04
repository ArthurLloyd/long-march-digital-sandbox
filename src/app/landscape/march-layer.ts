import * as THREE from 'three';
import {
  filmMovement,
  filmTrackPass,
} from '../../shared/content/film-movement';
import {
  crossingSeals,
  referenceCues,
} from '../../shared/content/journey-screenplay';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {
  journeyChapters,
  sampleJourney,
  sampleTrack,
  journeyTrackProgress,
  type JourneyTransport,
  type JourneyTrack,
} from '../../features/timeline';
import { projectGeo } from './geography';
import { floatingArrowHeight } from './march-presentation';
import { createMarchInk } from './march-ink';
import { createFormationLayer } from './formation-layer';

/** Bounded, persistent geometry on C's existing map. No RAF and no historical inference. */
export function createMarchLayer(
  scene: THREE.Scene,
  heightAt: (x: number, z: number) => number,
) {
  const root = new THREE.Group();
  scene.add(root);
  const formations = createFormationLayer(root, heightAt);
  let transport: JourneyTransport | null = null;
  let key = '';
  let terrainRevision = 0;
  let camps: readonly string[] = ['red_army', 'nationalist_army'];
  let selected: {
    track: JourneyTrack;
    point: THREE.Vector3;
    direction: THREE.Vector3;
    transferring: boolean;
  } | null = null;
  const compiled = new Map<
    string,
    {
      track: JourneyTrack;
      line: THREE.Line;
      preview: THREE.Line;
      blue: Line2 | null;
      bluePreview: Line2 | null;
      active: boolean;
      ink: ReturnType<typeof createMarchInk> | null;
      arrow: THREE.Mesh;
      groundPose: [number, number, number, number, number];
      samples: [number, number][];
      fractions: number[];
      tipIndex: number;
      point: THREE.Vector3;
      direction: THREE.Vector3;
      transferring: boolean;
    }
  >();
  const shape = new THREE.Shape();
  // The sampled geographic point is the tip, not the glyph's centre.
  shape.moveTo(0, 0);
  shape.lineTo(0.017, 0.05);
  shape.lineTo(0.005, 0.042);
  shape.lineTo(0.003, 0.15);
  shape.lineTo(0, 0.24);
  shape.lineTo(-0.003, 0.15);
  shape.lineTo(-0.005, 0.042);
  shape.lineTo(-0.017, 0.05);
  shape.closePath();
  const arrowGeometry = new THREE.ShapeGeometry(shape);
  arrowGeometry.rotateX(-Math.PI / 2);
  const shield = new THREE.Shape();
  shield.moveTo(-0.035, 0.04);
  shield.lineTo(0.035, 0.04);
  shield.lineTo(0.03, -0.015);
  shield.lineTo(0, -0.05);
  shield.lineTo(-0.03, -0.015);
  shield.closePath();
  const garrisonGeometry = new THREE.ExtrudeGeometry(shield, {
    depth: 0.014,
    bevelEnabled: true,
    bevelSize: 0.003,
    bevelThickness: 0.003,
    bevelSegments: 1,
    steps: 1,
  });
  const pressureGeometry = new THREE.OctahedronGeometry(0.045);
  const clear = () => {
    for (const item of compiled.values()) {
      item.ink?.dispose();
      item.bluePreview?.geometry.dispose();
      item.bluePreview?.material.dispose();
      item.blue?.geometry.dispose();
      item.blue?.material.dispose();
      item.line.geometry.dispose();
      (item.line.material as THREE.Material).dispose();
      item.preview.geometry.dispose();
      (item.preview.material as THREE.Material).dispose();
      (item.arrow.material as THREE.Material).dispose();
    }
    compiled.clear();
    root.clear();
    root.add(formations.root);
    selected = null;
  };
  const drape = () => {
    terrainRevision++;
    formations.redrape();
    const lift = 0.09;
    for (const item of compiled.values()) {
      const positions = item.line.geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      const preview = item.preview.geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      const heights = item.samples.map(([x, z]) => heightAt(x, z));
      item.samples.forEach(([x, z], i) => {
        positions.setXYZ(i, x, heights[i]! + lift, z);
        preview.setXYZ(i, x, heights[i]! + lift, z);
      });
      item.ink?.drape(
        item.samples,
        heights.map((y) => y + 0.009),
      );
      item.tipIndex = -1;
      if (item.blue) delete item.blue.userData.tip;
      positions.needsUpdate = true;
      preview.needsUpdate = true;
      if (item.blue) {
        item.blue.geometry.setPositions(Array.from(positions.array));
        item.blue.computeLineDistances();
      }
      if (item.bluePreview) {
        item.bluePreview.geometry.setPositions(Array.from(positions.array));
        item.bluePreview.computeLineDistances();
      }
      item.line.computeLineDistances();
      item.preview.computeLineDistances();
    }
  };
  return {
    setVisible: (visible: boolean) => {
      root.visible = visible;
    },
    setCamps(next: readonly string[]) {
      camps = [...next];
    },
    setTransport(next: JourneyTransport | null) {
      transport = next;
      if (key === (next?.plan.key ?? '')) return;
      clear();
      key = next?.plan.key ?? '';
      formations.setPlan(next?.plan ?? null);
      const tracks = [...(next?.plan.tracks ?? [])];
      const west = tracks.find((t) => t.id === 'march-sd3');
      if (west && west.points.length === 4)
        tracks.push({
          ...west,
          id: 'film-feint',
          unitId: 'diversion',
          unitName: '佯动部队 · 古蔺方向',
          points: west.points.slice(2),
          holdChapterIds: ['chapter-event-sd-4'],
        });
      for (const track of tracks) {
        const deployment = track.evidenceType === 'sourced_deployment';
        const samples: [number, number][] = [];
        // Subdivide each supplied straight strategic segment only to drape it.
        // Never smooth, join separate routes, or invent an intermediate place.
        track.points.slice(1).forEach((b, i) => {
          const a = track.points[i]!;
          for (let n = 0; n < 128; n++)
            samples.push(
              projectGeo([
                a[0] + ((b[0] - a[0]) * n) / 128,
                a[1] + ((b[1] - a[1]) * n) / 128,
              ]),
            );
        });
        const last = track.points.at(-1);
        if (last) samples.push(projectGeo(last));
        const segmentLengths = track.points.slice(1).map((b, i) => {
          const a = track.points[i]!;
          return Math.hypot(
            (b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180),
            b[1] - a[1],
          );
        });
        const total = segmentLengths.reduce((a, b) => a + b, 0);
        let previous = 0;
        const fractions = segmentLengths.flatMap((length) => {
          const result = Array.from(
            { length: 128 },
            (_, n) => (previous + (length * n) / 128) / total,
          );
          previous += length;
          return result;
        });
        fractions.push(1);
        const color =
          track.id === 'film-feint'
            ? 0xffda70
            : track.camp === 'red_army'
              ? 0xdc4c48
              : 0x669ad4;
        const line = new THREE.Line(
          new THREE.BufferGeometry().setAttribute(
            'position',
            new THREE.Float32BufferAttribute(
              new Float32Array(samples.length * 3),
              3,
            ),
          ),
          new THREE.LineDashedMaterial({
            color,
            dashSize: 0.035,
            gapSize: 0.025,
            transparent: true,
            opacity: 0.85,
            depthTest: true,
          }),
        );
        const arrow = new THREE.Mesh(
          deployment
            ? track.role === 'pressure'
              ? pressureGeometry
              : garrisonGeometry
            : arrowGeometry,
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.24,
            roughness: 0.58,
            metalness: 0.18,
            side: THREE.DoubleSide,
            ...(deployment
              ? { depthTest: false, depthWrite: false, toneMapped: false }
              : {}),
          }),
        );
        arrow.name = `${track.id}:${deployment ? 'deployment' : 'arrow'}`;
        arrow.renderOrder = deployment ? 13 : 0;
        const preview = new THREE.Line(
          line.geometry.clone(),
          new THREE.LineDashedMaterial({
            color,
            dashSize: 0.045,
            gapSize: 0.032,
            transparent: true,
            opacity: 0.55,
            depthTest: true,
          }),
        );
        line.visible = arrow.visible = preview.visible = false;
        const redTrack = track.camp === 'red_army';
        const blue = !deployment
          ? new Line2(
              new LineGeometry(),
              new LineMaterial({
                color:
                  track.id === 'film-feint'
                    ? 0xffda70
                    : redTrack
                      ? 0xff9959
                      : 0x71baff,
                linewidth: redTrack ? 3.4 : track.role === 'blockade' ? 5 : 3.5,
                transparent: true,
                opacity: track.role === 'reported' ? 0.7 : 0.95,
                depthTest: false,
                depthWrite: false,
                toneMapped: false,
                dashed: redTrack
                  ? track.evidenceType !== 'documented_geometry'
                  : track.role === 'reported' || !!track.motionWindow,
                dashSize: 0.045,
                gapSize: 0.025,
              }),
            )
          : null;
        if (blue) {
          blue.material.resolution.set(window.innerWidth, window.innerHeight);
          blue.name = `${track.id}:active-${redTrack ? 'red' : 'blue'}`;
          blue.renderOrder = 12;
          blue.visible = false;
        }
        const bluePreview =
          blue &&
          !redTrack &&
          track.role !== 'reported' &&
          track.role !== 'blockade'
            ? new Line2(
                new LineGeometry(),
                new LineMaterial({
                  color: 0x71baff,
                  linewidth: 2.2,
                  transparent: true,
                  opacity: 0.3,
                  depthTest: false,
                  depthWrite: false,
                  toneMapped: false,
                }),
              )
            : null;
        if (bluePreview) {
          bluePreview.material.resolution.set(
            window.innerWidth,
            window.innerHeight,
          );
          bluePreview.name = `${track.id}:context-blue`;
          bluePreview.renderOrder = 11;
          bluePreview.visible = false;
        }
        root.add(line, preview, arrow);
        if (blue) root.add(blue);
        if (bluePreview) root.add(bluePreview);
        const ink =
          !deployment && samples.length > 1
            ? createMarchInk(
                fractions,
                track.id === 'film-feint' ? 'feint' : redTrack ? 'red' : 'blue',
                track.evidenceType !== 'documented_geometry',
                track.role === 'blockade' || track.role === 'reported'
                  ? track.role
                  : undefined,
                track.id === 'march-blue-sd1-flank' ||
                  track.id === 'march-blue-sd2-qian'
                  ? 12
                  : 0,
              )
            : null;
        if (ink) {
          ink.trail.name = track.id + ':film-trail';
          ink.front.name = track.id + ':film-front';
          root.add(ink.trail, ink.front);
        }
        compiled.set(track.id, {
          ink,
          track,
          line,
          preview,
          blue,
          bluePreview,
          active: false,
          arrow,
          groundPose: [NaN, NaN, NaN, NaN, -1],
          samples,
          fractions,
          tipIndex: -1,
          point: new THREE.Vector3(),
          direction: new THREE.Vector3(0, 0, -1),
          transferring: false,
        });
      }
      drape();
    },
    drape,
    update(distance: number) {
      selected = null;
      let selectedRank = -1;
      let leadPass: string | undefined;
      const state = transport?.read();
      const sample =
        transport && state
          ? sampleJourney(transport.plan, state.sequenceId, state.time)
          : null;
      for (const item of compiled.values()) {
        // Reported orders and intelligence are explained in the narration
        // card. They do not locate a moving or stationary formation.
        const allowed =
          !(state?.cinematic && item.track.role === 'reported') &&
          (item.track.id !== 'film-feint' ||
            (!!state?.cinematic &&
              (sample?.chapter?.id === 'chapter-event-sd-3' ||
                (sample?.chapter?.id === 'chapter-event-sd-4' &&
                  sample.progress < (sample.chapter.cues?.[2]?.[0] ?? 1))))) &&
          camps.includes(item.track.camp) &&
          (!item.track.sequenceIds ||
            item.track.sequenceIds.includes(state?.sequenceId ?? ''));
        const chapter = sample?.chapter;
        const pass =
          state?.cinematic && chapter
            ? filmTrackPass(item.track.id, chapter.id)
            : undefined;
        const inShot =
          !!chapter && (!!pass || chapter.id === item.track.chapterId);
        const action =
          state?.cinematic && inShot && chapter?.cues && sample
            ? filmMovement(
                pass || item.track.id,
                chapter.cues,
                sample.progress,
                item.fractions,
              )
            : null;
        const moving =
          allowed &&
          inShot &&
          (action
            ? action.visible
            : (sample?.progress ?? 0) >= (item.track.visibleFrom ?? 0) &&
              ((sample?.progress ?? 0) < (item.track.visibleUntil ?? 1) ||
                ((item.track.visibleUntil ?? 1) === 1 &&
                  sample?.progress === 1)));
        const visible =
          allowed &&
          (moving ||
            (!action &&
              (item.track.holdChapterIds ?? []).includes(chapter?.id ?? '')));
        item.active = visible;
        const staticPressure =
          item.track.role === 'blockade' || item.track.role === 'reported';
        const deployment = item.track.evidenceType === 'sourced_deployment';
        const film = !!state?.cinematic;
        const redTrack = item.track.camp === 'red_army';
        const oldChapter =
          film && allowed && redTrack && state && transport
            ? journeyChapters(transport.plan, state.sequenceId).find(
                (c) => c.id === item.track.chapterId,
              )
            : undefined;
        const past =
          !!oldChapter && !!state && oldChapter.end <= state.time && !moving;
        const ink = film ? item.ink : null;
        item.ink?.hide();
        const thin = !item.blue || redTrack;
        item.line.visible = moving && thin && !deployment && !ink;
        item.preview.visible = !deployment && moving && thin && !film;
        if (item.blue) item.blue.visible = visible && !thin && !ink;
        if (item.bluePreview)
          item.bluePreview.visible = visible && moving && !film;
        item.arrow.visible = visible && !staticPressure && !ink;
        if (!visible || !sample || !state) {
          if (ink && past && item.track.id !== 'film-feint')
            ink.draw(1, item.samples.length - 1, true, distance);
          continue;
        }
        const progress =
          action?.progress ??
          (moving ? journeyTrackProgress(item.track, sample) : 1);
        const cues = sample.chapter?.cues;
        const generalRed =
          film &&
          moving &&
          redTrack &&
          !action &&
          !deployment &&
          cues?.length === 3 &&
          !referenceCues(sample.chapter!.id);
        let travel = progress;
        if (generalRed) {
          const actionAt = cues[1]![0],
            endAt = cues[2]![0];
          const startsInMotion =
            /出发|出征|开拔|启程|渡过|突围|行进|转兵|翻越|向.{1,8}(?:转移|推进|集结)|长征开始/u.test(
              cues[0]![3],
            );
          const lead = startsInMotion
            ? Math.min(0.28, actionAt / Math.max(0.0001, endAt))
            : 0;
          travel =
            sample.progress < actionAt
              ? lead *
                THREE.MathUtils.clamp(
                  sample.progress / Math.max(0.0001, actionAt),
                  0,
                  1,
                )
              : lead +
                (1 - lead) *
                  THREE.MathUtils.clamp(
                    (sample.progress - actionAt) /
                      Math.max(0.0001, endAt - actionAt),
                    0,
                    1,
                  );
        }
        const pose = sampleTrack(item.track, travel);
        if (!pose) continue;
        const [x, z] = projectGeo(pose.coordinates);
        const lineLift = 0.09;
        item.transferring =
          moving &&
          item.track.presentation === 'regional_transfer' &&
          sample.stage !== 'local';
        const [dx, dz] = projectGeo([
          pose.coordinates[0] + pose.direction[0],
          pose.coordinates[1] + pose.direction[1],
        ]);
        item.direction.set(dx - x, 0, dz - z).normalize();
        // Anticipate the *heading* through a corner without rounding or moving
        // the strategic waypoint. A seek yields exactly the same orientation.
        if (ink && !staticPressure && item.track.points.length > 2) {
          const before = sampleTrack(item.track, Math.max(0, travel - 0.008))!;
          const after = sampleTrack(item.track, Math.min(1, travel + 0.008))!;
          const a = projectGeo(before.coordinates),
            b = projectGeo(after.coordinates);
          if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-7)
            item.direction.set(b[0] - a[0], 0, b[1] - a[1]).normalize();
        }
        const heading = Math.atan2(item.direction.x, item.direction.z);
        const scale =
          THREE.MathUtils.clamp(distance * 0.34, 0.4, 2.8) *
          (state.unitId === item.track.unitId ? 1.1 : 1);
        const old = item.groundPose;
        if (
          old[0] !== x ||
          old[1] !== z ||
          old[2] !== heading ||
          old[3] !== scale ||
          old[4] !== (ink ? -terrainRevision : terrainRevision)
        ) {
          item.point.set(x, 0, z);
          item.point.y = ink
            ? heightAt(x, z) + 0.009
            : deployment
              ? heightAt(x, z) + 0.16
              : floatingArrowHeight(
                  item.point,
                  item.direction,
                  scale,
                  heightAt,
                );
          item.groundPose = [
            x,
            z,
            heading,
            scale,
            ink ? -terrainRevision : terrainRevision,
          ];
        }
        item.arrow.position.copy(item.point);
        item.arrow.rotation.set(0, heading, 0);
        item.arrow.scale.setScalar(scale);
        let tip = item.fractions.findIndex((f) => f > travel);
        if (tip < 0) tip = item.samples.length - 1;
        if (ink) {
          const exhausted = past || (!moving && item.track.id !== 'film-feint');
          ink.draw(
            staticPressure ? 1 : travel,
            staticPressure ? item.samples.length - 1 : tip,
            exhausted,
            distance,
          );
          const decay =
            item.track.camp === 'nationalist_army' ? (action?.decay ?? 0) : 0;
          if (decay) ink.settle(decay);
          if (!staticPressure && !past)
            ink.tip(
              item.point,
              item.direction,
              state.unitId === item.track.unitId ? 1.18 : 0.96,
              decay,
            );
        } else if (!deployment) {
          const positions = item.line.geometry.getAttribute(
            'position',
          ) as THREE.BufferAttribute;
          if (item.tipIndex >= 0) {
            const [px, pz] = item.samples[item.tipIndex]!;
            positions.setXYZ(
              item.tipIndex,
              px,
              heightAt(px, pz) + lineLift,
              pz,
            );
          }
          item.tipIndex = tip;
          positions.setXYZ(tip, x, heightAt(x, z) + lineLift, z);
          positions.needsUpdate = true;
          item.line.geometry.setDrawRange(0, tip + 1);
          if (item.blue) {
            const ends = item.blue.geometry.getAttribute(
              'instanceEnd',
            ) as THREE.InterleavedBufferAttribute;
            // Only the previous tip can have changed. Restore it before replacing
            // the new tip; seeking backwards must not retain a stretched segment.
            const oldTip = item.blue.userData.tip as number | undefined;
            if (oldTip !== undefined && oldTip >= 1) {
              const original = item.samples[oldTip]!;
              ends.setXYZ(
                oldTip - 1,
                original[0],
                heightAt(original[0], original[1]) + lineLift,
                original[1],
              );
            }
            if (!staticPressure && moving && tip >= 1)
              ends.setXYZ(tip - 1, x, heightAt(x, z) + lineLift, z);
            ends.needsUpdate = true;
            item.blue.userData.tip = tip;
            item.blue.geometry.instanceCount =
              staticPressure || !moving
                ? item.samples.length - 1
                : Math.max(0, tip);
          }
        }
        const rank =
          (moving ? 2 : 0) +
          (pass ? 4 : 0) +
          (!deployment && !staticPressure ? 1 : 0);
        if (moving && pass && redTrack && item.track.unitId === 'central-red')
          leadPass = item.track.id;
        if (state.unitId === item.track.unitId && rank >= selectedRank) {
          selected = item;
          selectedRank = rank;
        }
      }
      if (leadPass) {
        for (const i of compiled.values()) {
          if (
            i.track.unitId !== 'central-red' ||
            i.track.id === leadPass ||
            !i.active ||
            !i.ink
          )
            continue;
          i.active = false;
          i.ink.dim();
        }
      }
      const red = [...compiled.values()].find(
        (i) => i.track.camp === 'red_army' && i.active,
      );
      if (!selected && state?.unitId === 'central-red' && red) selected = red;
      const replacement = transport?.plan.formations?.some(
        (f) =>
          f.replacesPrimary &&
          (f.chapterId === sample?.chapter?.id ||
            (state?.cinematic &&
              !leadPass &&
              f.departChapterId &&
              f.departChapterId === sample?.chapter?.id)),
      );
      if (replacement)
        for (const item of compiled.values())
          if (item.track.camp === 'red_army' && item.active) {
            item.active = false;
            item.ink?.hide();
            if (item.blue) item.blue.visible = false;
            item.arrow.visible =
              item.line.visible =
              item.preview.visible =
                false;
          }
      formations.update(
        sample?.chapter?.id,
        sample?.progress ?? 0,
        sample?.chapter?.arrival ?? 1,
        camps,
        !!state?.cinematic,
        distance,
        state?.sequenceId,
      );
      return selected ?? formations.selection(state?.unitId ?? 'central-red');
    },
    projections(camera: THREE.Camera, width: number, height: number) {
      return [...compiled.values()]
        .map((item) => {
          const p = item.point.clone().project(camera);
          if (item.ink?.trail.visible || item.ink?.front.visible)
            item.ink.alignLabel(
              p,
              item.point,
              item.direction,
              camera,
              width,
              height,
            );
          item.ink?.resolution(width, height);
          item.blue?.material.resolution.set(width, height);
          item.bluePreview?.material.resolution.set(width, height);
          return {
            id: `march:${item.track.id}`,
            x: ((p.x + 1) * width) / 2,
            y: ((1 - p.y) * height) / 2,
            visible:
              root.visible &&
              item.active &&
              p.z > -1 &&
              p.z < 1 &&
              Math.abs(p.x) < 0.95 &&
              Math.abs(p.y) < 0.92,
          };
        })
        .concat(
          formations.project(camera, width, height),
          crossingSeals.map((seal) => {
            const item = compiled.get(seal.track);
            const state = transport?.read();
            const chapter =
              state && transport && item
                ? journeyChapters(transport.plan, state.sequenceId).find(
                    (c) => c.id === item.track.chapterId,
                  )
                : null;
            const anchor = item?.samples[seal.point * 128];
            const show =
              root.visible &&
              state?.cinematic &&
              camps.includes('red_army') &&
              chapter &&
              anchor &&
              state.time >= chapter.start + chapter.duration * seal.at - 1e-8;
            const p = show
              ? new THREE.Vector3(
                  anchor[0],
                  heightAt(...anchor) + 0.02,
                  anchor[1],
                ).project(camera)
              : null;
            return {
              id: 'march:seal:' + seal.track,
              x: p ? ((p.x + 1) * width) / 2 : 0,
              y: p ? ((1 - p.y) * height) / 2 : 0,
              visible:
                !!p &&
                Math.abs(p.x) < 0.96 &&
                Math.abs(p.y) < 0.93 &&
                Math.abs(p.z) < 1,
            };
          }),
        );
    },
    get transport() {
      return transport;
    },
    dispose() {
      clear();
      formations.dispose();
      arrowGeometry.dispose();
      garrisonGeometry.dispose();
      pressureGeometry.dispose();
      scene.remove(root);
    },
  };
}
