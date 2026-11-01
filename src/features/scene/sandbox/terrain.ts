import * as THREE from 'three';
export interface Heightfield {
  meta: {
    bounds: number[];
    size: number;
    min: number;
    max: number;
    verticalExaggeration: number;
  };
  heights: number[];
}
export interface RiverData {
  ways: { id: number; name: string; coordinates: number[][] }[];
}
export function createTerrainSpace(data: Heightfield) {
  const { bounds, size, min, verticalExaggeration } = data.meta;
  const mercY = (lat: number) =>
    Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const west = bounds[0]!,
    east = bounds[2]!,
    north = mercY(bounds[3]!),
    south = mercY(bounds[1]!);
  const width = 42,
    depth = (width * (north - south)) / (((east - west) * Math.PI) / 180);
  const metresWidth =
    (((east - west) * Math.PI) / 180) *
    6378137 *
    Math.cos(((bounds[1]! + bounds[3]!) * Math.PI) / 360);
  const heightScale = (width / metresWidth) * verticalExaggeration;
  function height(x: number, z: number) {
    const u = THREE.MathUtils.clamp(
      (x / width + 0.5) * (size - 1),
      0,
      size - 1,
    );
    const v = THREE.MathUtils.clamp(
      (z / depth + 0.5) * (size - 1),
      0,
      size - 1,
    );
    const i = Math.min(size - 2, Math.floor(u)),
      j = Math.min(size - 2, Math.floor(v));
    const dx = u - i,
      dz = v - j;
    const a = data.heights[j * size + i]!,
      b = data.heights[j * size + i + 1]!;
    const c = data.heights[(j + 1) * size + i]!,
      d = data.heights[(j + 1) * size + i + 1]!;
    return (
      ((a * (1 - dx) + b * dx) * (1 - dz) +
        (c * (1 - dx) + d * dx) * dz -
        min) *
        heightScale +
      0.7
    );
  }
  function project(lon: number, lat: number): THREE.Vector3 {
    const x = ((lon - west) / (east - west) - 0.5) * width;
    const z = ((north - mercY(lat)) / (north - south) - 0.5) * depth;
    return new THREE.Vector3(x, height(x, z), z);
  }
  return { width, depth, height, project, heightScale, min };
}
export type TerrainSpace = ReturnType<typeof createTerrainSpace>;
export function buildTerrain(
  data: Heightfield,
  rivers: RiverData,
  low: boolean,
) {
  const space = createTerrainSpace(data),
    group = new THREE.Group();
  const segments = low ? 160 : 320;
  const geo = new THREE.PlaneGeometry(
    space.width,
    space.depth,
    segments,
    segments,
  );
  geo.rotateX(-Math.PI / 2);
  const p = geo.getAttribute('position');
  for (let i = 0; i < p.count; i++)
    p.setY(i, space.height(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const normals = geo.getAttribute('normal'),
    colors = new Float32Array(p.count * 3);
  const forest = new THREE.Color('#294b3d'),
    meadow = new THREE.Color('#617f54'),
    granite = new THREE.Color('#868e80'),
    snow = new THREE.Color('#f0ece0');
  for (let i = 0; i < p.count; i++) {
    const altitude = (p.getY(i) - 0.7) / space.heightScale + space.min;
    const steep = 1 - normals.getY(i);
    const c = forest
      .clone()
      .lerp(meadow, THREE.MathUtils.smoothstep(altitude, 1900, 3900));
    c.lerp(granite, THREE.MathUtils.smoothstep(steep, 0.12, 0.55) * 0.78);
    const snowline = 4300 + Math.sin(p.getX(i) * 0.8 + p.getZ(i) * 0.5) * 100;
    c.lerp(
      snow,
      THREE.MathUtils.smoothstep(altitude, snowline, snowline + 550) *
        (1 - steep * 0.55),
    );
    c.multiplyScalar(
      0.91 + 0.09 * Math.sin(p.getX(i) * 17.3 + p.getZ(i) * 21.7),
    );
    c.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const contours = { value: 0 };
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.03,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.contours = contours;
    shader.vertexShader =
      'varying vec3 terrainPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nterrainPosition=position;',
    );
    shader.fragmentShader =
      'varying vec3 terrainPosition; uniform float contours;\n' +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float n=sin(terrainPosition.x*74.+sin(terrainPosition.z*17.))*sin(terrainPosition.z*61.);
      diffuseColor.rgb*=.96+n*.04;
      float band=abs(fract(terrainPosition.y*2.)-.5);float edge=1.-smoothstep(.015,.015+fwidth(terrainPosition.y)*2.,band);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.77,.62,.35),edge*contours*.42);`,
    );
  };
  const land = new THREE.Mesh(geo, material);
  land.receiveShadow = true;
  land.castShadow = true;
  group.add(land);
  // Open cutaway sides retain the measured boundary height; no generated mountains.
  const rim: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++)
    rim.push(
      new THREE.Vector3(
        -space.width / 2 + (i / segments) * space.width,
        0,
        -space.depth / 2,
      ),
    );
  for (let i = 1; i <= segments; i++)
    rim.push(
      new THREE.Vector3(
        space.width / 2,
        0,
        -space.depth / 2 + (i / segments) * space.depth,
      ),
    );
  for (let i = 1; i <= segments; i++)
    rim.push(
      new THREE.Vector3(
        space.width / 2 - (i / segments) * space.width,
        0,
        space.depth / 2,
      ),
    );
  for (let i = 1; i <= segments; i++)
    rim.push(
      new THREE.Vector3(
        -space.width / 2,
        0,
        space.depth / 2 - (i / segments) * space.depth,
      ),
    );
  const sideVertices: number[] = [];
  for (let i = 0; i < rim.length - 1; i++) {
    const a = rim[i]!,
      b = rim[i + 1]!,
      ah = space.height(a.x, a.z),
      bh = space.height(b.x, b.z);
    sideVertices.push(
      a.x,
      ah,
      a.z,
      a.x,
      -0.8,
      a.z,
      b.x,
      bh,
      b.z,
      b.x,
      bh,
      b.z,
      a.x,
      -0.8,
      a.z,
      b.x,
      -0.8,
      b.z,
    );
  }
  const sideGeo = new THREE.BufferGeometry();
  sideGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(sideVertices, 3),
  );
  sideGeo.computeVertexNormals();
  const sideMat = new THREE.MeshStandardMaterial({
    color: '#283b34',
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const sides = new THREE.Mesh(sideGeo, sideMat);
  group.add(sides);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(space.width + 0.16, 0.18, space.depth + 0.16),
    new THREE.MeshStandardMaterial({
      color: '#b49452',
      metalness: 0.68,
      roughness: 0.38,
    }),
  );
  frame.position.y = -0.88;
  group.add(frame);
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(space.width + 1, 0.55, space.depth + 1),
    new THREE.MeshStandardMaterial({
      color: '#182c2c',
      metalness: 0.35,
      roughness: 0.55,
    }),
  );
  plinth.position.y = -1.23;
  plinth.receiveShadow = true;
  group.add(plinth);
  const riverGroup = new THREE.Group();
  group.add(riverGroup);
  const waterTime = { value: 0 };
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#6db5b5',
    emissive: '#16434c',
    emissiveIntensity: 0.35,
    metalness: 0.48,
    roughness: 0.22,
    side: THREE.DoubleSide,
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.riverTime = waterTime;
    shader.vertexShader = 'varying vec3 waterPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nwaterPosition=position;',
    );
    shader.fragmentShader =
      'varying vec3 waterPosition;uniform float riverTime;\n' +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float ripple=sin(waterPosition.z*28.+waterPosition.x*17.-riverTime*1.3)*sin(waterPosition.z*19.-waterPosition.x*23.+riverTime);
      diffuseColor.rgb*=.85+max(0.,ripple)*.55;`,
    );
  };
  for (const way of rivers.ways) {
    const vertices: number[] = [];
    for (let i = 1; i < way.coordinates.length; i++) {
      const aa = way.coordinates[i - 1]!,
        bb = way.coordinates[i]!;
      if (
        ![aa, bb].every(
          (v) =>
            v[0]! >= data.meta.bounds[0]! &&
            v[0]! <= data.meta.bounds[2]! &&
            v[1]! >= data.meta.bounds[1]! &&
            v[1]! <= data.meta.bounds[3]!,
        )
      )
        continue;
      const a = space.project(aa[0]!, aa[1]!),
        b = space.project(bb[0]!, bb[1]!);
      const dir = b.clone().sub(a);
      const width = way.name.includes('大渡') ? 0.1 : 0.035;
      const off = new THREE.Vector3(-dir.z, 0, dir.x)
        .normalize()
        .multiplyScalar(width);
      a.y += 0.055;
      b.y += 0.055;
      for (const v of [
        a.clone().add(off),
        a.clone().sub(off),
        b.clone().add(off),
        b.clone().add(off),
        a.clone().sub(off),
        b.clone().sub(off),
      ])
        vertices.push(...v.toArray());
    }
    if (!vertices.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    riverGroup.add(new THREE.Mesh(g, waterMat));
  }
  // Decorative tree instances describe material texture, not surveyed vegetation.
  const trees = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.065, 0.33, 5),
    new THREE.MeshStandardMaterial({ color: '#23493b', roughness: 1 }),
    low ? 1000 : 2600,
  );
  const dummy = new THREE.Object3D();
  let count = 0;
  let seed = 431;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < trees.count * 5 && count < trees.count; i++) {
    const x = (random() - 0.5) * space.width,
      z = (random() - 0.5) * space.depth,
      h = space.height(x, z),
      alt = (h - 0.7) / space.heightScale + space.min;
    if (
      alt < 1900 ||
      alt > 3700 ||
      Math.abs(space.height(x + 0.1, z) - h) > 0.12
    )
      continue;
    dummy.position.set(x, h + 0.11, z);
    dummy.scale.setScalar(0.65 + random() * 0.7);
    dummy.rotation.y = random() * Math.PI;
    dummy.updateMatrix();
    trees.setMatrixAt(count++, dummy.matrix);
  }
  trees.count = count;
  trees.castShadow = !low;
  group.add(trees);
  return { group, space, contours, waterTime, riverGroup };
}
