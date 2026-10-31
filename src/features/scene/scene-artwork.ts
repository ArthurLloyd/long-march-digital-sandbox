import * as THREE from 'three';

/** Original procedural exhibition sculpture: art, not geography or historical reconstruction. */
export function createEmberArtwork() {
  const group = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({
    color: 0x382d27,
    metalness: 0.72,
    roughness: 0.44,
  });
  const darkStone = new THREE.MeshStandardMaterial({
    color: 0x141d22,
    metalness: 0.36,
    roughness: 0.7,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd5a367,
    emissive: 0x513015,
    emissiveIntensity: 0.18,
    metalness: 0.82,
    roughness: 0.32,
  });
  const tiers = [
    [5, 5.4, 0.32, -0.58],
    [4.65, 5, 0.3, -0.28],
    [4.5, 4.65, 0.13, -0.06],
  ];
  for (const [top, bottom, height, y] of tiers) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(top!, bottom!, height!, 96),
      darkStone,
    );
    mesh.position.y = y!;
    group.add(mesh);
  }
  for (const radius of [2.15, 3.9, 4.52, 5.02]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, radius < 3 ? 0.014 : 0.024, 6, 120),
      gold,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = radius > 4.8 ? -0.38 : 0.04;
    group.add(ring);
  }
  const marks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.018, 0.014, 0.09),
    bronze,
    72,
  );
  const mark = new THREE.Object3D();
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2;
    mark.position.set(Math.sin(angle) * 4.2, 0.04, Math.cos(angle) * 4.2);
    mark.rotation.y = angle;
    mark.scale.z = i % 6 === 0 ? 2.67 : 1;
    mark.updateMatrix();
    marks.setMatrixAt(i, mark.matrix);
  }
  group.add(marks);
  const ribbons = new THREE.Group();
  for (let blade = 0; blade < 3; blade++) {
    const positions: number[] = [];
    const indices: number[] = [];
    const count = 80;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 1.62 + blade * 2.094;
      const radius = Math.sin(Math.PI * t) * (1.55 - 0.5 * t);
      const width = Math.sin(Math.PI * t) * (0.46 - t * 0.18) + 0.015;
      for (const side of [-1, 1]) {
        positions.push(
          Math.cos(angle) * (radius + side * width),
          0.35 + t * 5.25,
          Math.sin(angle) * (radius + side * width),
        );
      }
      if (i < count) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: blade === 1 ? 0xcf934a : 0x9f3927,
      emissive: blade === 1 ? 0xa24916 : 0x4d1006,
      emissiveIntensity: 0.38,
      metalness: 0.72,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    ribbons.add(new THREE.Mesh(geometry, material));
    const edgePositions = [];
    for (let i = 0; i <= count; i++)
      edgePositions.push(...positions.slice(i * 6, i * 6 + 3));
    const edge = new THREE.Line(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(edgePositions, 3),
      ),
      new THREE.LineBasicMaterial({
        color: 0xf4c17a,
        transparent: true,
        opacity: 0.7,
      }),
    );
    ribbons.add(edge);
  }
  group.add(ribbons);
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.35, 1),
    new THREE.MeshStandardMaterial({
      color: 0xffd894,
      emissive: 0xf4a23c,
      emissiveIntensity: 2.3,
      metalness: 0.4,
      roughness: 0.23,
    }),
  );
  core.position.y = 2.5;
  group.add(core);
  const light = new THREE.PointLight(0xff943b, 24, 10, 2);
  light.position.set(0, 2.9, 0);
  group.add(light);
  const particlePositions = new Float32Array(72 * 3);
  for (let i = 0; i < 72; i++) {
    const angle = i * 2.39996;
    const radius = 1.4 + ((i * 17) % 43) / 20;
    particlePositions[i * 3] = Math.cos(angle) * radius;
    particlePositions[i * 3 + 1] = ((i * 13) % 61) / 10;
    particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3),
    ),
    new THREE.PointsMaterial({
      color: 0xf6c98b,
      size: 0.035,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      depthWrite: false,
    }),
  );
  group.add(particles);
  return {
    group,
    animate: (time: number) => {
      ribbons.rotation.y = Math.sin(time * 0.12) * 0.08;
      core.rotation.y = time * 0.16;
      core.position.y = 2.5 + Math.sin(time * 0.5) * 0.1;
      particles.rotation.y = time * 0.018;
    },
    setLowQuality: (low: boolean) => {
      particles.visible = !low;
    },
  };
}
