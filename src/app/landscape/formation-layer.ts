import * as THREE from 'three';
import type { JourneyFormation, JourneyPlan } from '../../features/timeline';
import { projectGeo } from './geography';
import { createMarchInk } from './march-ink';

/** Event-relative battle arrows, not geographic unit positions or route vertices. */
export function createFormationLayer(
  parent: THREE.Group,
  heightAt: (x: number, z: number) => number,
) {
  const root = new THREE.Group();
  root.name = 'battle-relationships';
  parent.add(root);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.018, 0.05);
  shape.lineTo(0.004, 0.04);
  shape.lineTo(0, 0.21);
  shape.lineTo(-0.004, 0.04);
  shape.lineTo(-0.018, 0.05);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  const pennant = new THREE.Shape();
  pennant.moveTo(0, 0);
  pennant.lineTo(0, 0.05);
  pennant.lineTo(0.043, 0.05);
  pennant.lineTo(0.032, 0.038);
  pennant.lineTo(0.043, 0.027);
  pennant.lineTo(0.004, 0.027);
  pennant.lineTo(0.004, 0);
  pennant.closePath();
  const stationGeometry = new THREE.ShapeGeometry(pennant);
  stationGeometry.rotateX(-Math.PI / 4);
  const items = new Map<
    string,
    {
      unit: JourneyFormation;
      mesh: THREE.Mesh;
      active: boolean;
      ink: ReturnType<typeof createMarchInk> | null;
      start: THREE.Vector3;
      end: THREE.Vector3;
      draped: boolean;
      point: THREE.Vector3;
      direction: THREE.Vector3;
    }
  >();
  const clear = () => {
    for (const item of items.values()) {
      (item.mesh.material as THREE.Material).dispose();
      item.ink?.dispose();
    }
    items.clear();
    root.clear();
  };
  return {
    root,
    setPlan(plan: JourneyPlan | null) {
      clear();
      for (const unit of plan?.formations ?? []) {
        const mesh = new THREE.Mesh(
          unit.action === 'hold' ? stationGeometry : geometry,
          new THREE.MeshBasicMaterial({
            color: unit.camp === 'red_army' ? 0xf26357 : 0x71baff,
            side: THREE.DoubleSide,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
          }),
        );
        mesh.name = unit.id;
        mesh.visible = false;
        mesh.renderOrder = 14;
        root.add(mesh);
        // This short fan is the explicitly schematic Yudu assembly. The
        // other formations have just a meeting/departure site, not a path.
        const ink =
          unit.action === 'hold'
            ? null
            : createMarchInk(
                Array.from({ length: 17 }, (_, i) => i / 16),
                unit.camp === 'red_army' ? 'red' : 'blue',
                true,
              );
        if (ink) {
          ink.trail.name = unit.id + ':formation-trail';
          ink.front.name = unit.id + ':formation-front';
          root.add(ink.trail, ink.front);
        }
        const [x, z] = projectGeo(unit.anchor);
        const site = new THREE.Vector3(x, 0, z);
        const angle =
          unit.lanes === 1 ? 0 : (unit.lane / (unit.lanes - 1) - 0.5) * 2.5;
        const outward = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle));
        const start = ink ? site.clone().addScaledVector(outward, 0.7) : site;
        const end = ink ? site.clone().addScaledVector(outward, 0.22) : site;
        items.set(unit.id, {
          unit,
          mesh,
          ink,
          start,
          end,
          draped: false,
          active: false,
          point: end.clone(),
          direction: outward.negate(),
        });
      }
    },
    update(
      chapterId: string | undefined,
      progress: number,
      arrival: number,
      camps: readonly string[],
      film: boolean,
      viewDistance: number,
      sequenceId?: string,
    ) {
      for (const item of items.values()) {
        const u = item.unit;
        const departing =
          !!u.departChapterId && chapterId === u.departChapterId;
        // Keep the same object, label ID and assembled position through the cut.
        // Released columns clear in batches while the registered main route departs.
        const release = 0.08 + (0.48 * u.lane) / Math.max(1, u.lanes - 1);
        const opacity = departing
          ? 1 - THREE.MathUtils.smoothstep(progress, release, release + 0.16)
          : 1;
        item.active =
          (u.chapterId === chapterId || departing) &&
          (!u.sequenceId || u.sequenceId === sequenceId) &&
          camps.includes(u.camp) &&
          opacity > 0.01;
        const ink = film ? item.ink : null;
        item.ink?.hide();
        item.mesh.visible = item.active && !ink;
        if (!item.active) continue;
        const lag = film ? Math.min(0.14, u.lane * 0.024) : 0;
        const phase = departing
          ? 1
          : THREE.MathUtils.clamp(
              (progress / Math.max(0.01, arrival) - lag) / (1 - lag),
              0,
              1,
            );
        const f = film ? THREE.MathUtils.smoothstep(phase, 0, 1) : phase;
        item.point.lerpVectors(item.start, item.end, f);
        item.point.y = heightAt(item.point.x, item.point.z) + 0.009;
        item.mesh.position.copy(item.point);
        (item.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
        // Fixed flags share the event's actual anchor. Label stacking is a
        // screen-space concern and must not displace the flag on the ground.
        if (!item.ink) {
          item.mesh.scale.setScalar(
            THREE.MathUtils.clamp(viewDistance * 0.42, 0.45, 1.8),
          );
          continue;
        }
        item.mesh.rotation.y = Math.atan2(item.direction.x, item.direction.z);
        item.mesh.scale.setScalar(0.7);
        if (!ink) continue;
        if (!item.draped) {
          const samples = Array.from(
            { length: 17 },
            (_, i): [number, number] => [
              THREE.MathUtils.lerp(item.start.x, item.end.x, i / 16),
              THREE.MathUtils.lerp(item.start.z, item.end.z, i / 16),
            ],
          );
          ink.drape(
            samples,
            samples.map(([x, z]) => heightAt(x, z) + 0.009),
          );
          item.draped = true;
        }
        ink.opacity.value = opacity;
        ink.draw(f, Math.min(16, Math.ceil(f * 16)), false, viewDistance);
        ink.tip(item.point, item.direction, 0.84);
      }
    },
    redrape() {
      for (const item of items.values()) item.draped = false;
    },
    project(camera: THREE.Camera, width: number, height: number) {
      return [...items.values()].map(({ unit, active, ink, point }) => {
        ink?.resolution(width, height);
        const p = point.clone().project(camera);
        return {
          id: `march:${unit.id}`,
          x: ((p.x + 1) * width) / 2,
          y: ((1 - p.y) * height) / 2,
          visible:
            parent.visible &&
            active &&
            p.z > -1 &&
            p.z < 1 &&
            Math.abs(p.x) < 0.95 &&
            Math.abs(p.y) < 0.92,
        };
      });
    },
    selection(unitId: string) {
      const active = [...items.values()].filter((i) => i.active);
      const unit =
        active.find((i) => i.unit.unitId === unitId) ??
        active.find(
          (i) =>
            i.unit.camp ===
            (unitId === 'nationalist-blockade'
              ? 'nationalist_army'
              : 'red_army'),
        );
      return unit
        ? {
            point: unit.point,
            direction: unit.direction,
            transferring: false,
            track: unit.unit,
          }
        : null;
    },
    dispose() {
      clear();
      geometry.dispose();
      stationGeometry.dispose();
      root.removeFromParent();
    },
  };
}
