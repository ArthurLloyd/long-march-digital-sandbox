import * as THREE from 'three';
import { modelDetail, samplePath } from './motion';
import type { Point3 } from './motion';
import type { TerrainSpace } from './terrain';
export interface UnitSpec {
  id: string;
  name: string;
  color: string;
  path: readonly Point3[];
  offset?: number;
}
export function createUnit(spec: UnitSpec, space: TerrainSpace) {
  const group = new THREE.Group(),
    models = new THREE.Group(),
    symbol = new THREE.Group();
  group.add(models, symbol);
  const ivory = new THREE.MeshStandardMaterial({
    color: '#e9e5d6',
    roughness: 0.72,
  });
  const pack = new THREE.MeshStandardMaterial({
    color: '#8d9886',
    roughness: 0.92,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: 0.65,
    emissive: spec.color,
    emissiveIntensity: 0.12,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: '#4e5750',
    roughness: 0.85,
  });
  const soldiers: THREE.Group[] = [];
  const limbs: { mesh: THREE.Group; phase: number; sign: number }[] = [];
  const geometries = {
    body: new THREE.CylinderGeometry(0.085, 0.105, 0.23, 7),
    head: new THREE.SphereGeometry(0.067, 8, 6),
    cap: new THREE.CylinderGeometry(0.08, 0.074, 0.035, 8),
    leg: new THREE.CylinderGeometry(0.026, 0.03, 0.15, 6),
    boot: new THREE.BoxGeometry(0.063, 0.046, 0.09),
    bag: new THREE.BoxGeometry(0.13, 0.15, 0.065),
    arm: new THREE.CylinderGeometry(0.022, 0.028, 0.16, 6),
  };
  function part(
    g: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
  ) {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  for (let i = 0; i < 9; i++) {
    const soldier = new THREE.Group();
    soldier.position.set(((i % 3) - 1) * 0.29, 0, -Math.floor(i / 3) * 0.4);
    models.add(soldier);
    soldiers.push(soldier);
    part(geometries.body, ivory, 0, 0.35, 0, soldier);
    part(geometries.head, ivory, 0, 0.53, 0, soldier);
    part(geometries.cap, ivory, 0, 0.59, 0, soldier);
    part(geometries.bag, pack, 0, 0.38, -0.09, soldier);
    part(
      new THREE.BoxGeometry(0.045, 0.02, 0.024),
      accent,
      0,
      0.585,
      0.07,
      soldier,
    );
    for (const sign of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(sign * 0.052, 0.25, 0);
      soldier.add(leg);
      part(geometries.leg, ivory, 0, -0.075, 0, leg);
      part(geometries.boot, dark, 0, -0.16, 0.015, leg);
      limbs.push({ mesh: leg, phase: i * 0.7, sign });
      const arm = new THREE.Group();
      arm.position.set(sign * 0.12, 0.44, 0);
      soldier.add(arm);
      part(geometries.arm, ivory, 0, -0.07, 0, arm);
      limbs.push({ mesh: arm, phase: i * 0.7, sign: -sign });
    }
  }
  const pole = part(
    new THREE.CylinderGeometry(0.012, 0.012, 0.95, 5),
    dark,
    0.25,
    0.61,
    0.2,
    models,
  );
  const flag = part(
    new THREE.PlaneGeometry(0.4, 0.25, 10, 3),
    new THREE.MeshStandardMaterial({
      color: spec.color,
      side: THREE.DoubleSide,
      roughness: 0.7,
    }),
    0.46,
    1.01,
    0.2,
    models,
  );
  const flagP = flag.geometry.getAttribute('position');
  const flagOrigin = Float32Array.from(flagP.array);
  pole.castShadow = true;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.49, 0.51, 48),
    new THREE.MeshBasicMaterial({
      color: spec.color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  models.add(ring);
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.6);
  arrowShape.lineTo(-0.38, -0.3);
  arrowShape.lineTo(0, -0.12);
  arrowShape.lineTo(0.38, -0.3);
  arrowShape.closePath();
  const arrow = new THREE.Mesh(
    new THREE.ShapeGeometry(arrowShape),
    new THREE.MeshBasicMaterial({
      color: spec.color,
      side: THREE.DoubleSide,
      depthTest: false,
    }),
  );
  arrow.rotation.x = Math.PI / 2;
  arrow.position.y = 0.6;
  arrow.renderOrder = 12;
  symbol.add(arrow);
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 8),
    new THREE.MeshBasicMaterial({ color: '#fff2cf', depthTest: false }),
  );
  dot.position.set(0, 0.58, 0);
  dot.renderOrder = 13;
  symbol.add(dot);
  let near = false;
  let selected = false;
  function update(
    progress: number,
    camera: THREE.PerspectiveCamera,
    elapsed: number,
    animated: boolean,
  ) {
    const p = samplePath(spec.path, progress);
    if (!p) {
      group.visible = false;
      return;
    }
    group.visible = true;
    group.position.set(
      p.position[0],
      space.height(p.position[0], p.position[2]) + 0.07,
      p.position[2],
    );
    group.rotation.y = p.heading;
    const cos = Math.cos(p.heading),
      sin = Math.sin(p.heading);
    const terrainOffset = (x: number, z: number) =>
      space.height(
        group.position.x + x * cos + z * sin,
        group.position.z - x * sin + z * cos,
      ) - group.position.y;
    for (const soldier of soldiers)
      soldier.position.y =
        terrainOffset(soldier.position.x, soldier.position.z) - 0.065;
    pole.position.y = terrainOffset(0.25, 0.2) + 0.475;
    flag.position.y = terrainOffset(0.25, 0.2) + 0.87;
    const ringPositions = ring.geometry.getAttribute('position');
    for (let i = 0; i < ringPositions.count; i++)
      ringPositions.setZ(
        i,
        terrainOffset(ringPositions.getX(i), -ringPositions.getY(i)),
      );
    ringPositions.needsUpdate = true;
    near = modelDetail(camera.position.distanceTo(group.position), near);
    models.visible = near;
    symbol.visible = !near;
    const scale = THREE.MathUtils.clamp(
      camera.position.distanceTo(group.position) / 45,
      0.6,
      1.7,
    );
    symbol.scale.setScalar(scale);
    for (const limb of limbs)
      limb.mesh.rotation.x = animated
        ? Math.sin(progress * 110 + limb.phase) * 0.48 * limb.sign
        : 0;
    for (let i = 0; i < flagP.count; i++) {
      const x = flagOrigin[i * 3]!;
      flagP.setZ(i, (Math.sin(x * 13 - elapsed * 3) * 0.035 * (x + 0.2)) / 0.4);
    }
    flagP.needsUpdate = true;
    ring.material.opacity = selected ? 0.3 : 0.12;
  }
  return {
    group,
    update,
    select: (v: boolean) => {
      selected = v;
    },
    isDetailed: () => near,
  };
}
