import * as THREE from 'three';
import {
  sampleJourney,
  sampleTrack,
  type JourneyTransport,
  type JourneyTrack,
} from '../../features/timeline';
import { projectGeo } from './geography';

/** Bounded, persistent geometry on C's existing map. No RAF and no historical inference. */
export function createMarchLayer(
  scene: THREE.Scene,
  heightAt: (x: number, z: number) => number,
) {
  const root = new THREE.Group();
  scene.add(root);
  let transport: JourneyTransport | null = null;
  let key = '';
  let selected: {
    track: JourneyTrack;
    point: THREE.Vector3;
    direction: THREE.Vector3;
  } | null = null;
  const compiled = new Map<
    string,
    {
      track: JourneyTrack;
      line: THREE.Line;
      arrow: THREE.Mesh;
      samples: [number, number][];
      fractions: number[];
      tipIndex: number;
      point: THREE.Vector3;
      direction: THREE.Vector3;
    }
  >();
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.055);
  shape.lineTo(0.036, -0.006);
  shape.lineTo(0.015, -0.006);
  shape.lineTo(0.015, 0.045);
  shape.lineTo(-0.015, 0.045);
  shape.lineTo(-0.015, -0.006);
  shape.lineTo(-0.036, -0.006);
  shape.closePath();
  const arrowGeometry = new THREE.ShapeGeometry(shape);
  arrowGeometry.rotateX(-Math.PI / 2);
  const clear = () => {
    for (const item of compiled.values()) {
      item.line.geometry.dispose();
      (item.line.material as THREE.Material).dispose();
      (item.arrow.material as THREE.Material).dispose();
    }
    compiled.clear();
    root.clear();
    selected = null;
  };
  const drape = () => {
    for (const item of compiled.values()) {
      const positions = item.line.geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      item.samples.forEach(([x, z], i) =>
        positions.setXYZ(i, x, heightAt(x, z) + 0.014, z),
      );
      positions.needsUpdate = true;
      item.line.computeLineDistances();
    }
  };
  return {
    setTransport(next: JourneyTransport | null) {
      transport = next;
      if (key === (next?.plan.key ?? '')) return;
      clear();
      key = next?.plan.key ?? '';
      for (const track of next?.plan.tracks ?? []) {
        const samples: [number, number][] = [];
        // Subdivide each supplied straight strategic segment only to drape it.
        // Never smooth, join separate routes, or invent an intermediate place.
        track.points.slice(1).forEach((b, i) => {
          const a = track.points[i]!;
          for (let n = 0; n < 32; n++)
            samples.push(
              projectGeo([
                a[0] + ((b[0] - a[0]) * n) / 32,
                a[1] + ((b[1] - a[1]) * n) / 32,
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
            { length: 32 },
            (_, n) => (previous + (length * n) / 32) / total,
          );
          previous += length;
          return result;
        });
        fractions.push(1);
        const color = track.camp === 'red_army' ? 0xdc4c48 : 0x669ad4;
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
          arrowGeometry,
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.24,
            roughness: 0.58,
            metalness: 0.18,
            side: THREE.DoubleSide,
          }),
        );
        line.visible = arrow.visible = false;
        root.add(line, arrow);
        compiled.set(track.id, {
          track,
          line,
          arrow,
          samples,
          fractions,
          tipIndex: -1,
          point: new THREE.Vector3(),
          direction: new THREE.Vector3(0, 0, -1),
        });
      }
      drape();
    },
    drape,
    update(distance: number) {
      selected = null;
      const state = transport?.read();
      const sample =
        transport && state
          ? sampleJourney(transport.plan, state.sequenceId, state.time)
          : null;
      for (const item of compiled.values()) {
        const moving = sample?.chapter?.id === item.track.chapterId;
        const visible =
          moving ||
          (item.track.holdChapterIds ?? []).includes(sample?.chapter?.id ?? '');
        item.line.visible = moving;
        item.arrow.visible = visible;
        if (!visible || !sample || !state) continue;
        const pose = sampleTrack(item.track, moving ? sample.progress : 1);
        if (!pose) continue;
        const [x, z] = projectGeo(pose.coordinates);
        item.point.set(x, heightAt(x, z) + 0.035, z);
        item.direction
          .set(pose.direction[0], 0, -pose.direction[1])
          .normalize();
        item.arrow.position.copy(item.point);
        item.arrow.rotation.y = Math.atan2(item.direction.x, item.direction.z);
        const size = THREE.MathUtils.clamp(distance * 0.75, 0.65, 3.6);
        item.arrow.scale.setScalar(
          size * (state.unitId === item.track.unitId ? 1.18 : 1),
        );
        const positions = item.line.geometry.getAttribute(
          'position',
        ) as THREE.BufferAttribute;
        if (item.tipIndex >= 0) {
          const [px, pz] = item.samples[item.tipIndex]!;
          positions.setXYZ(item.tipIndex, px, heightAt(px, pz) + 0.014, pz);
        }
        let tip = item.fractions.findIndex((f) => f > sample.progress);
        if (tip < 0) tip = item.samples.length - 1;
        item.tipIndex = tip;
        positions.setXYZ(tip, x, heightAt(x, z) + 0.014, z);
        positions.needsUpdate = true;
        item.line.geometry.setDrawRange(0, tip + 1);
        if (state.unitId === item.track.unitId) selected = item;
      }
      return selected;
    },
    projections(camera: THREE.Camera, width: number, height: number) {
      return [...compiled.values()].map((item) => {
        const p = item.point.clone().project(camera);
        return {
          id: `march:${item.track.id}`,
          x: ((p.x + 1) * width) / 2,
          y: ((1 - p.y) * height) / 2,
          visible:
            item.arrow.visible &&
            p.z > -1 &&
            p.z < 1 &&
            Math.abs(p.x) < 0.95 &&
            Math.abs(p.y) < 0.92,
        };
      });
    },
    get transport() {
      return transport;
    },
    dispose() {
      clear();
      arrowGeometry.dispose();
      scene.remove(root);
    },
  };
}
