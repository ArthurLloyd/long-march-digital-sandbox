import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Original, untextured clay figure; no claim of historical uniform accuracy. */
export function createMarchingFigure() {
  const group = new THREE.Group();
  group.name = 'ClayMarcher';
  const cloth = new THREE.MeshStandardMaterial({
    color: '#e2decd',
    roughness: 0.98,
  });
  const pack = new THREE.MeshStandardMaterial({
    color: '#6e7868',
    roughness: 1,
  });
  const leather = new THREE.MeshStandardMaterial({
    color: '#353d36',
    roughness: 0.91,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: '#873d31',
    roughness: 0.94,
  });
  function part(
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const box = (w: number, h: number, d: number, r = 0.025) =>
    new RoundedBoxGeometry(w, h, d, 2, r);
  part('Tunic', box(0.43, 0.58, 0.26, 0.055), cloth, group, 0, 1.14, 0);
  part('Collar', box(0.2, 0.055, 0.18, 0.015), cloth, group, 0, 1.45, 0.015);
  part(
    'Head',
    new THREE.SphereGeometry(0.135, 14, 12),
    cloth,
    group,
    0,
    1.61,
    0.015,
  );
  part(
    'Cap',
    new THREE.CylinderGeometry(0.15, 0.15, 0.065, 14),
    cloth,
    group,
    0,
    1.74,
    0.005,
  );
  part('CapBrim', box(0.24, 0.025, 0.15, 0.01), cloth, group, 0, 1.715, 0.1);
  part(
    'CapBadge',
    box(0.036, 0.03, 0.009, 0.003),
    accent,
    group,
    0,
    1.74,
    0.153,
  );
  part('Belt', box(0.445, 0.055, 0.275, 0.015), leather, group, 0, 0.96, 0);
  part('Buckle', box(0.065, 0.045, 0.015, 0.004), cloth, group, 0, 0.96, 0.147);
  part('Backpack', box(0.34, 0.4, 0.16, 0.04), pack, group, 0, 1.19, -0.2);
  const roll = part(
    'Bedroll',
    new THREE.CylinderGeometry(0.075, 0.075, 0.4, 12),
    pack,
    group,
    0,
    1.44,
    -0.2,
  );
  roll.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    part(
      'ShoulderStrap',
      box(0.047, 0.43, 0.022, 0.008),
      pack,
      group,
      side * 0.13,
      1.22,
      0.137,
    );
    part(
      'Pocket',
      box(0.12, 0.13, 0.03, 0.01),
      cloth,
      group,
      side * 0.12,
      1.24,
      0.15,
    );
  }
  for (const y of [1.06, 1.19, 1.32])
    part(
      'Button',
      new THREE.SphereGeometry(0.012, 6, 4),
      leather,
      group,
      0,
      y,
      0.14,
    );
  const joints: { object: THREE.Group; sign: number }[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'LeftLeg' : 'RightLeg';
    leg.position.set(side * 0.115, 0.88, 0);
    group.add(leg);
    part(
      'TrouserLeg',
      new THREE.CapsuleGeometry(0.077, 0.57, 3, 8),
      cloth,
      leg,
      0,
      -0.31,
      0,
    );
    part(
      'Puttee',
      new THREE.CylinderGeometry(0.08, 0.075, 0.22, 8),
      pack,
      leg,
      0,
      -0.62,
      0,
    );
    part('Boot', box(0.17, 0.11, 0.29, 0.025), leather, leg, 0, -0.805, 0.055);
    joints.push({ object: leg, sign: side });
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'LeftArm' : 'RightArm';
    arm.position.set(side * 0.26, 1.38, 0);
    group.add(arm);
    part(
      'Sleeve',
      new THREE.CapsuleGeometry(0.065, 0.37, 3, 8),
      cloth,
      arm,
      0,
      -0.22,
      0,
    );
    part(
      'Hand',
      new THREE.SphereGeometry(0.062, 8, 6),
      cloth,
      arm,
      0,
      -0.49,
      0.015,
    );
    joints.push({ object: arm, sign: -side });
  }
  return {
    group,
    pose(phase: number, walking = true) {
      for (const joint of joints)
        joint.object.rotation.x = walking
          ? Math.sin(phase) * 0.32 * joint.sign
          : 0;
    },
  };
}

export function bridgeDeckHeight(x: number) {
  return Math.abs(x) <= 32 ? 41 - 1.8 * (1 - (x / 32) ** 2) + 0.145 : 41.145;
}

export function createMarchingCompany(
  height: (x: number) => number = () => 0,
  instanced = false,
) {
  const group = new THREE.Group();
  group.name = 'MarchingCompany';
  const template = createMarchingFigure();
  const figures = Array.from({ length: 18 }, (_, i) => {
    const clone = template.group.clone(true);
    const joints = ['LeftLeg', 'RightLeg', 'LeftArm', 'RightArm'].map(
      (name, j) => ({
        object: clone.getObjectByName(name)!,
        sign: [-1, 1, 1, -1][j]!,
      }),
    );
    const figure = {
      group: clone,
      pose(phase: number, walking: boolean) {
        for (const joint of joints)
          joint.object.rotation.x = walking
            ? Math.sin(phase) * 0.32 * joint.sign
            : 0;
      },
    };
    figure.group.name = `Marcher_${String(i + 1).padStart(2, '0')}`;
    figure.group.rotation.y = Math.PI / 2;
    if (!instanced) group.add(figure.group);
    return figure;
  });
  const instanceDraws: { mesh: THREE.InstancedMesh; sources: THREE.Mesh[] }[] =
    [];
  if (instanced) {
    const parts = figures.map((figure) => {
      const meshes: THREE.Mesh[] = [];
      figure.group.traverse((o) => {
        if (o instanceof THREE.Mesh) meshes.push(o);
      });
      return meshes;
    });
    for (let i = 0; i < parts[0]!.length; i++) {
      const source = parts[0]![i]!;
      const mesh = new THREE.InstancedMesh(
        source.geometry,
        source.material,
        figures.length,
      );
      mesh.name = source.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      group.add(mesh);
      instanceDraws.push({ mesh, sources: parts.map((p) => p[i]!) });
    }
  }
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 2.6, 8),
    new THREE.MeshStandardMaterial({ color: '#4c4031', roughness: 0.92 }),
  );
  pole.name = 'FlagPole';
  pole.castShadow = true;
  group.add(pole);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.7, 18, 8),
    new THREE.MeshStandardMaterial({
      color: '#97382b',
      roughness: 0.96,
      side: THREE.DoubleSide,
    }),
  );
  flag.name = 'UnmarkedFlag';
  flag.castShadow = true;
  group.add(flag);
  const positions = flag.geometry.attributes.position!;
  const rest = Float32Array.from(positions.array);
  let progress = 0.5;
  function update(value: number, walking: boolean) {
    progress = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
    const x = -25 + progress * 50;
    figures.forEach((figure, i) => {
      const px = x - Math.floor(i / 3) * 1.45;
      figure.group.position.set(px, height(px), -8 + ((i % 3) - 1) * 0.83);
      figure.pose(progress * Math.PI * 56 + i * 0.45, walking);
      if (instanced) figure.group.updateMatrixWorld(true);
    });
    for (const draw of instanceDraws) {
      draw.sources.forEach((source, i) =>
        draw.mesh.setMatrixAt(i, source.matrixWorld),
      );
      draw.mesh.instanceMatrix.needsUpdate = true;
    }
    pole.position.set(x + 0.2, height(x) + 1.3, -8);
    flag.position.set(x + 0.75, height(x) + 2.27, -8);
    for (let i = 0; i < positions.count; i++)
      positions.setZ(
        i,
        Math.sin(rest[i * 3]! * 5 + progress * 90) *
          0.07 *
          (rest[i * 3]! + 0.55),
      );
    positions.needsUpdate = true;
  }
  update(0.5, false);
  return {
    group,
    update,
    center: () =>
      new THREE.Vector3(
        -25 + progress * 50 - 3.5,
        height(-25 + progress * 50) + 1,
        -8,
      ),
    positions: () => figures.map((f) => f.group.position.toArray()),
  };
}
