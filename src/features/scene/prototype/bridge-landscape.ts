import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

/** Procedural invented canyon. Art-space has no geographic or historical meaning. */
export function createCanyon(noise: ImprovedNoise, rock: THREE.Material) {
  const group = new THREE.Group();
  function zAt(value: number) {
    return (
      -35 + Math.sign(value) * (Math.abs(value) * 55 + value * value * 525)
    );
  }
  function bank(z: number) {
    return (
      23 +
      Math.sin(z * 0.012) * 5.5 +
      Math.sin(z * 0.043) * 2.4 +
      THREE.MathUtils.smoothstep(-z, 140, 470) * 12
    );
  }
  function crest(z: number, side: number) {
    const raw =
      64 +
      side * 8 +
      noise.noise(z * 0.011, side * 3.1, 2) * 43 +
      noise.noise(z * 0.04, side, 3) * 10;
    const landing = Math.exp(-Math.pow((z + 8) / 16, 4));
    return THREE.MathUtils.lerp(raw, 39.6, landing);
  }
  function faceX(t: number, z: number, side: number) {
    const fracture =
      noise.noise(z * 0.16, t * 6, side) * 2.2 +
      noise.noise(z * 0.5, t * 17, side + 4) * 0.45;
    return (
      bank(z) +
      side * (Math.sin(z * 0.006) * 7 + Math.sin(z * 0.018) * 3) +
      t * 9 +
      Math.sin(t * 18 + z * 0.035) * 0.6 +
      fracture * Math.sin(t * Math.PI)
    );
  }
  function finish(geometry: THREE.BufferGeometry, reverse: boolean) {
    if (reverse && geometry.index)
      for (let i = 0; i < geometry.index.count; i += 3) {
        const a = geometry.index.getX(i + 1);
        geometry.index.setX(i + 1, geometry.index.getX(i + 2));
        geometry.index.setX(i + 2, a);
      }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, rock);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  for (const side of [-1, 1]) {
    const face = new THREE.PlaneGeometry(1, 1, 180, 56);
    const p = face.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const z = zAt(p.getX(i) * 2);
      const t = p.getY(i) + 0.5;
      const top = crest(z, side);
      const y = 5 + t * (top - 5);
      p.setXYZ(i, side * faceX(t, z, side), y, z);
    }
    finish(face, side < 0);
    const crown = new THREE.PlaneGeometry(1, 1, 66, 180);
    const q = crown.attributes.position!;
    for (let i = 0; i < q.count; i++) {
      const u = q.getX(i) + 0.5;
      const z = zAt(q.getY(i) * 2);
      const distance = Math.pow(u, 1.6) * 185;
      const x = faceX(1, z, side) + distance;
      const ridged = 1 - Math.abs(noise.noise(x * 0.018, z * 0.012, side * 5));
      const erosion = noise.noise(
        x * 0.085 + noise.noise(z * 0.025, 4, 2) * 2,
        z * 0.06,
        side * 2,
      );
      let y =
        crest(z, side) +
        Math.pow(u, 0.75) * (65 + ridged * 65) +
        erosion * 10 * Math.min(1, u * 8);
      const terrace =
        Math.exp(-Math.pow((z + 8) / 16, 4)) *
        Math.exp(-Math.pow((x - 39) / 13, 4));
      y = THREE.MathUtils.lerp(y, 39.6, terrace);
      q.setXYZ(i, side * x, y, z);
    }
    finish(crown, side > 0);
  }

  const rubbleGeo = new THREE.IcosahedronGeometry(1, 1);
  const rp = rubbleGeo.attributes.position!;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i),
      y = rp.getY(i),
      z = rp.getZ(i);
    const k = 1 + noise.noise(x * 3, y * 3, z * 3) * 0.27;
    rp.setXYZ(i, x * k, y * k, z * k);
  }
  rubbleGeo.computeVertexNormals();
  const rubble = new THREE.InstancedMesh(rubbleGeo, rock, 130);
  rubble.castShadow = true;
  rubble.receiveShadow = true;
  const object = new THREE.Object3D();
  for (let i = 0; i < 130; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -180 + ((i * 73) % 370);
    const radius = 0.7 + ((i * 13) % 23) / 10;
    object.position.set(
      side * (bank(z) - radius * 0.35),
      6.7 + radius * 0.4,
      z,
    );
    object.rotation.set(i * 0.71, i * 1.31, i * 0.21);
    object.scale.set(radius * 1.2, radius * 0.8, radius * 1.6);
    object.updateMatrix();
    rubble.setMatrixAt(i, object.matrix);
  }
  group.add(rubble);

  const leafPositions: number[] = [];
  for (let blade = 0; blade < 24; blade++) {
    const angle = blade * 2.39996,
      radius = 0.12 + (blade % 5) * 0.08;
    const x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius;
    const dx = Math.cos(angle + 1.1) * 0.09,
      dz = Math.sin(angle + 1.1) * 0.09;
    leafPositions.push(
      x - dx,
      0,
      z - dz,
      x + dx,
      0,
      z + dz,
      x + Math.sin(blade) * 0.16,
      0.4 + (blade % 7) * 0.075,
      z + Math.cos(blade) * 0.16,
    );
  }
  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(leafPositions, 3),
  );
  leafGeometry.computeVertexNormals();
  const foliage = new THREE.InstancedMesh(
    leafGeometry,
    new THREE.MeshStandardMaterial({
      color: '#65724b',
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    220,
  );
  foliage.castShadow = true;
  for (let i = 0; i < 220; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -220 + ((i * 67) % 430);
    const radius = 0.45 + ((i * 19) % 13) / 10;
    const distance = 13 + ((i * 11) % 57);
    const u = Math.pow(distance / 185, 1 / 1.6);
    const x = faceX(1, z, side) + distance;
    const ridged = 1 - Math.abs(noise.noise(x * 0.018, z * 0.012, side * 5));
    const erosion = noise.noise(
      x * 0.085 + noise.noise(z * 0.025, 4, 2) * 2,
      z * 0.06,
      side * 2,
    );
    let ground =
      crest(z, side) +
      Math.pow(u, 0.75) * (65 + ridged * 65) +
      erosion * 10 * Math.min(1, u * 8);
    const terrace =
      Math.exp(-Math.pow((z + 8) / 16, 4)) *
      Math.exp(-Math.pow((x - 39) / 13, 4));
    ground = THREE.MathUtils.lerp(ground, 39.6, terrace);
    object.position.set(side * x, ground - 0.05, z);
    object.scale.set(radius, radius * 0.8, radius * 1.2);
    object.rotation.set(0, i, 0);
    object.updateMatrix();
    foliage.setMatrixAt(i, object.matrix);
    foliage.setColorAt(
      i,
      new THREE.Color().setHSL(
        0.22 + (i % 4) * 0.012,
        0.19,
        0.42 + (i % 5) * 0.025,
      ),
    );
  }
  group.add(foliage);

  // Five irregular overlapping ridgelines with haze separation; no cone-shaped peaks.
  for (let layer = 0; layer < 5; layer++) {
    const geo = new THREE.PlaneGeometry(1100, 1, 200, 1);
    const p = geo.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const high = p.getY(i) > 0;
      const peak =
        115 +
        layer * 12 +
        noise.noise(x * 0.006, layer * 4.3, 5) * 92 +
        noise.noise(x * 0.022, layer, 8) * 18;
      p.setXYZ(i, x, high ? peak : -25, -440 - layer * 110);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#355255').lerp(
          new THREE.Color('#b2b5a0'),
          layer / 6,
        ),
        side: THREE.DoubleSide,
      }),
    );
    group.add(mesh);
  }
  return {
    group,
    constrainCamera: (position: THREE.Vector3) => {
      const z = position.z;
      if (z > -25 && z < 10) return;
      const center = Math.sin(z * 0.006) * 7 + Math.sin(z * 0.018) * 3;
      const half = bank(z) - 5;
      position.x = THREE.MathUtils.clamp(
        position.x,
        center - half,
        center + half,
      );
    },
    setLow: (low: boolean) => {
      foliage.visible = !low;
    },
  };
}
