import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createMarchingCompany } from '../prototype/marching-company';
import { createBridgeMaterials } from '../prototype/bridge-materials';
import type { RegionId } from '../atlas/regions';
import { immersiveFieldOfView } from './camera-framing';

export type RegionalView = 'arrival' | 'company' | 'landscape' | 'detail';
export interface RegionalHotspot {
  id: 'terrain' | 'people' | 'detail';
  x: number;
  y: number;
  visible: boolean;
}
export interface RegionalWorldOptions {
  reducedMotion?: boolean;
  onReady?: () => void;
  onRendered?: () => void;
  onError?: (error: Error) => void;
  onHotspots?: (items: RegionalHotspot[]) => void;
}
type Vec3 = [number, number, number];
type WorldMood = {
  earth: string;
  ground: string;
  leaves: string;
  sky: string;
  horizon: string;
  light: string;
  fog: string;
  peaks: number;
};

export const REGIONAL_WORLD_MOODS: Record<RegionId, WorldMood> = {
  ruijin: {
    earth: '#74634b',
    ground: '#5f6d43',
    leaves: '#354d32',
    sky: '#4c8198',
    horizon: '#cadad6',
    light: '#ffdab0',
    fog: '#9fa99a',
    peaks: 15,
  },
  zunyi: {
    earth: '#73716a',
    ground: '#57634a',
    leaves: '#314d3c',
    sky: '#4c7488',
    horizon: '#d2ddd6',
    light: '#f8d5a0',
    fog: '#93aaa0',
    peaks: 21,
  },
  chishui: {
    earth: '#796548',
    ground: '#4e6944',
    leaves: '#294e38',
    sky: '#497d90',
    horizon: '#c3d6cb',
    light: '#ffe0a5',
    fog: '#89aaa0',
    peaks: 27,
  },
  jinsha: {
    earth: '#8f7656',
    ground: '#8c8462',
    leaves: '#506441',
    sky: '#59869c',
    horizon: '#e3dac6',
    light: '#ffe1b2',
    fog: '#a1b4ad',
    peaks: 42,
  },
  luding: {
    earth: '#706b5b',
    ground: '#636d53',
    leaves: '#315344',
    sky: '#466775',
    horizon: '#cad2bc',
    light: '#ffdbab',
    fog: '#9bb1ac',
    peaks: 36,
  },
  snow: {
    earth: '#8d9ba1',
    ground: '#d7e0dd',
    leaves: '#334f4e',
    sky: '#314e69',
    horizon: '#f4d5ad',
    light: '#ffe1b5',
    fog: '#b9cccf',
    peaks: 52,
  },
  grass: {
    earth: '#77704b',
    ground: '#7a8550',
    leaves: '#737b43',
    sky: '#385e6c',
    horizon: '#e1c68e',
    light: '#ffdfac',
    fog: '#adb9a1',
    peaks: 12,
  },
  reunion: {
    earth: '#a8895a',
    ground: '#a28d59',
    leaves: '#766f3f',
    sky: '#5d8190',
    horizon: '#e5d7bb',
    light: '#ffe2ab',
    fog: '#c0b28e',
    peaks: 24,
  },
};

const clamp = THREE.MathUtils.clamp;
const smooth = (a: number, b: number, x: number) =>
  THREE.MathUtils.smoothstep(x, a, b);
function seeded(seed: number) {
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed);
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entirely invented local art space. It never supplies historic geography or army coordinates. */
export function buildRegionalArtWorld(region: RegionId) {
  const mood = REGIONAL_WORLD_MOODS[region];
  const random = seeded(
    4813 + Object.keys(REGIONAL_WORLD_MOODS).indexOf(region) * 157,
  );
  const noise = new ImprovedNoise();
  const group = new THREE.Group();
  group.name = `RegionalArtWorld:${region}`;
  const materials = createBridgeMaterials();
  const disposable = new Set<
    THREE.BufferGeometry | THREE.Material | THREE.Texture
  >();
  const riverRegion = region === 'chishui' || region === 'jinsha';
  const snow = region === 'snow';
  const grass = region === 'grass';
  const village = region === 'ruijin' || region === 'zunyi';
  const dry = region === 'jinsha' || region === 'reunion';
  const clock = { value: 0 };
  const standard = (color: string, roughness = 0.94) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness });
    disposable.add(material);
    return material;
  };
  for (const material of [
    materials.rock,
    materials.stone,
    materials.wood,
    materials.iron,
  ])
    disposable.add(material);
  const plaster = standard(region === 'zunyi' ? '#c7c5b6' : '#c2b792');
  const roofMaterial = standard('#3d4a47');
  const timber = materials.wood;
  const brick = standard(region === 'reunion' ? '#b69a70' : '#77766c');
  const canvas = standard('#8d9272');
  const linen = standard('#bcb593');
  const red = standard('#96382c');
  const black = standard('#242d28');
  const surfaceNoise = `float artHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float artN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(artHash(i),artHash(i+vec2(1.,0.)),f.x),mix(artHash(i+vec2(0.,1.)),artHash(i+1.),f.x),f.y);}float artF(vec2 p){return artN(p)*.55+artN(p*2.1)*.28+artN(p*4.3)*.17;}`;
  function weather(
    material: THREE.MeshStandardMaterial,
    kind: 'plaster' | 'roof',
  ) {
    material.customProgramCacheKey = () => `regional-weather-${kind}`;
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `varying vec3 weatherP;\n${shader.vertexShader}`.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nweatherP=position;',
        );
      shader.fragmentShader =
        `varying vec3 weatherP;${surfaceNoise}\n${shader.fragmentShader}`.replace(
          '#include <color_fragment>',
          kind === 'plaster'
            ? `#include <color_fragment>\nfloat patches=artF(weatherP.xy*.9);float fine=artN(weatherP.xy*35.);float damp=1.-smoothstep(.1,1.3,weatherP.y);float streak=smoothstep(.52,.72,artF(weatherP.xy*vec2(2.4,.17)));diffuseColor.rgb*=.59+patches*.65+fine*.07;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.48,.56,.44),damp*.5+streak*.24);`
            : `#include <color_fragment>\nfloat slate=artF(weatherP.xz*3.);diffuseColor.rgb*=.7+slate*.6;`,
        );
    };
  }
  weather(plaster, 'plaster');
  weather(roofMaterial, 'roof');
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: Vec3,
    parent: THREE.Object3D = group,
  ) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function box(
    w: number,
    h: number,
    d: number,
    position: Vec3,
    material: THREE.Material,
    parent: THREE.Object3D = group,
  ) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, position, parent);
  }
  function rod(
    a: Vec3,
    b: Vec3,
    radius: number,
    material: THREE.Material,
    parent: THREE.Object3D = group,
  ) {
    const va = new THREE.Vector3(...a),
      vb = new THREE.Vector3(...b);
    const item = mesh(
      new THREE.CylinderGeometry(radius, radius, va.distanceTo(vb), 7),
      material,
      va.clone().lerp(vb, 0.5).toArray(),
      parent,
    );
    item.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      vb.sub(va).normalize(),
    );
    return item;
  }
  function height(x: number, z: number) {
    const distant = smooth(16, 67, -z);
    const ridge =
      (Math.abs(noise.noise(x * 0.022, z * 0.02, 31.7)) * 0.6 + 0.4) *
      distant *
      mood.peaks *
      (snow || grass || riverRegion ? 0.27 : 1);
    const small = noise.noise(x * 0.09, z * 0.09, 1.3) * (snow ? 2.2 : 0.8);
    const hills = noise.noise(x * 0.035, z * 0.035, 12.8) * (grass ? 0.6 : 2.7);
    let value = ridge + (small + hills) * smooth(2, 10, Math.abs(z + 8));
    if (riverRegion) {
      const river = 1 - smooth(11, 22, Math.abs(z + 32));
      value = value * (1 - river) - 2.2 * river;
    }
    if (grass)
      value -=
        smooth(2, 5, Math.abs(z + 8)) *
        (0.3 + Math.sin(x * 0.1 + z * 0.08) * 0.35);
    if (region === 'reunion')
      value += distant * (Math.floor((x + 130) / 11) % 3) * 1.4;
    if (region === 'zunyi') {
      const courtyard =
        (1 - smooth(11, 14, Math.abs(x))) *
        smooth(-18, -16, z) *
        (1 - smooth(-6, -4, z));
      value *= 1 - courtyard;
    }
    return value;
  }
  const groundGeometry = new THREE.PlaneGeometry(210, 210, 170, 170);
  groundGeometry.rotateX(-Math.PI / 2);
  const pos = groundGeometry.attributes.position!;
  const groundColors = new Float32Array(pos.count * 3);
  const green = new THREE.Color(mood.ground),
    brown = new THREE.Color(mood.earth),
    tint = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i) - 42;
    const y = height(x, z);
    pos.setXYZ(i, x, y, z);
    const grain = noise.noise(x * 0.28, z * 0.28, 5.7) * 0.12;
    const path =
      (1 - smooth(1.8, 3.5, Math.abs(z + 8 + Math.sin(x * 0.05) * 0.5))) *
      (1 - smooth(28, 45, Math.abs(x)));
    tint
      .copy(green)
      .lerp(
        brown,
        snow ? 0.08 : clamp(path * 0.83 + grain + (dry ? 0.15 : 0), 0, 1),
      );
    if (snow) tint.lerp(new THREE.Color('#637780'), smooth(10, 36, y) * 0.28);
    tint.multiplyScalar(0.89 + noise.noise(x * 0.7, z * 0.7, 15) * 0.12);
    tint.toArray(groundColors, i * 3);
  }
  groundGeometry.setAttribute(
    'color',
    new THREE.BufferAttribute(groundColors, 3),
  );
  groundGeometry.computeVertexNormals();
  const normals = groundGeometry.attributes.normal!;
  const rockTint = new THREE.Color(snow ? '#8d9da1' : '#7c8070');
  for (let i = 0; i < pos.count; i++) {
    const steep = smooth(0.2, 0.65, 1 - Math.abs(normals.getY(i)));
    tint
      .fromArray(groundColors, i * 3)
      .lerp(rockTint, steep * 0.85)
      .toArray(groundColors, i * 3);
  }
  const groundMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
  });
  groundMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader =
      `varying vec3 groundLocal;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ngroundLocal=position;',
      );
    shader.fragmentShader =
      `varying vec3 groundLocal;${surfaceNoise}\n${shader.fragmentShader}`.replace(
        '#include <color_fragment>',
        `#include <color_fragment>\nfloat g=artF(groundLocal.xz*2.5);float broad=artF(groundLocal.xz*.18);float fine=artN(groundLocal.xz*34.);diffuseColor.rgb*=.69+g*.36+broad*.18+fine*.1;`,
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>\nfloat soilBump=artF(groundLocal.xz*11.)*.055;vec3 soilX=dFdx(-vViewPosition),soilY=dFdy(-vViewPosition);vec3 soilR1=cross(soilY,normal),soilR2=cross(normal,soilX);float soilDet=dot(soilX,soilR1);normal=normalize(abs(soilDet)*normal-sign(soilDet)*(dFdx(soilBump)*soilR1+dFdy(soilBump)*soilR2));`,
    );
  };
  mesh(groundGeometry, groundMaterial, [0, 0, 0]);

  // Continuous far ridges keep the local scene enclosed when orbiting, without pretending to be a DEM.
  for (let i = 0; i < (snow || grass || riverRegion ? 0 : 14); i++) {
    const theta = (i / 14) * Math.PI * 2;
    const x = Math.cos(theta) * 105,
      z = Math.sin(theta) * 105 - 18;
    const geometry = new THREE.PlaneGeometry(1, 1, 28, 28);
    geometry.rotateX(-Math.PI / 2);
    const ridgeWidth = 65 + random() * 25;
    const ridgeHeight = 24 + random() * mood.peaks;
    const p = geometry.attributes.position!;
    for (let j = 0; j < p.count; j++) {
      const u = p.getX(j) * 2,
        v = p.getZ(j) * 2;
      const edge = 1 - smooth(0.55, 1, Math.max(Math.abs(u), Math.abs(v)));
      const mass =
        Math.exp(-((u + 0.24) ** 2 * 0.7 + v * v * 1.4) * 3) * 0.67 +
        Math.exp(-((u - 0.42) ** 2 * 1.2 + (v + 0.2) ** 2) * 5) * 0.43;
      const rough =
        noise.noise(u * 4.3, v * 3.7, i) * 0.16 +
        noise.noise(u * 11, v * 9, i) * 0.045;
      p.setXYZ(
        j,
        (u * ridgeWidth) / 2,
        Math.max(0, mass + rough) * ridgeHeight * edge,
        (v * ridgeWidth) / 2,
      );
    }
    geometry.computeVertexNormals();
    const ridgeMaterial = standard(
      snow ? '#a1b7bc' : dry ? '#96876b' : '#617b6a',
    );
    const mountain = mesh(geometry, ridgeMaterial, [x, 2, z]);
    mountain.rotation.y = theta + 0.4;
    mountain.castShadow = false;
  }

  const object = new THREE.Object3D();
  const rockGeometry = new THREE.IcosahedronGeometry(1, 1);
  const rocks = new THREE.InstancedMesh(
    rockGeometry,
    snow ? standard('#7d929b') : materials.rock,
    95,
  );
  for (let i = 0; i < rocks.count; i++) {
    let x = (random() - 0.5) * 100;
    const z = (random() - 0.65) * 105;
    if (Math.abs(x) < 25 && z > -32 && z < 8) x += x < 0 ? -28 : 28;
    const s = 0.18 + random() ** 3 * (snow ? 2.8 : 1.3);
    object.position.set(x, height(x, z) + s * 0.2, z);
    object.scale.set(s * 1.2, s * 0.7, s);
    object.rotation.set(random(), random() * 6, random());
    object.updateMatrix();
    rocks.setMatrixAt(i, object.matrix);
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  group.add(rocks);

  // Instanced trees are intentionally arranged away from the walking surface and architecture.
  const treeCount = grass ? 0 : snow ? 18 : region === 'reunion' ? 12 : 180;
  const pine = snow || region === 'jinsha';
  const crowns: THREE.BufferGeometry[] = [];
  if (pine) {
    for (let level = 0; level < 8; level++)
      for (let branch = 0; branch < 5; branch++) {
        const angle = branch * Math.PI * 0.4 + level * 0.53;
        const radius = (1 - level / 9) * 1.2;
        crowns.push(
          new THREE.IcosahedronGeometry(0.52, 1)
            .scale(1.7 - level * 0.12, 0.34, 0.7)
            .rotateY(-angle)
            .translate(
              Math.cos(angle) * radius,
              2.2 + level * 0.42,
              Math.sin(angle) * radius,
            ),
        );
      }
  } else {
    for (let i = 0; i < 22; i++)
      crowns.push(
        new THREE.IcosahedronGeometry(0.73 + (i % 3) * 0.17, 1)
          .scale(1.15, 0.7, 1.1)
          .translate(
            Math.sin(i * 2.4) * (0.7 + (i % 3) * 0.4),
            3.4 + (i % 5) * 0.38,
            Math.cos(i * 2.4) * (0.7 + (i % 3) * 0.4),
          ),
      );
  }
  const crownGeometry = mergeGeometries(crowns)!;
  crowns.forEach((geometry) => geometry.dispose());
  const treeMaterial = standard(mood.leaves);
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.09, 0.2, 4, 8),
    standard('#5b5140'),
    treeCount,
  );
  const leaves = new THREE.InstancedMesh(
    crownGeometry,
    treeMaterial,
    treeCount,
  );
  for (let i = 0; i < treeCount; i++) {
    let x = (random() - 0.5) * 115,
      z = (random() - 0.6) * 110;
    if (Math.abs(z + 8) < 7) z -= 14;
    if (Math.abs(x) < 30 && z > -42 && z < 12) x += x < 0 ? -33 : 33;
    if (village && Math.abs(x) < 29 && z > -40 && z < 6) x += x < 0 ? -31 : 31;
    if (riverRegion && z < -18 && z > -47) z -= 34;
    if ((grass || snow) && Math.abs(x) < 27) x += x < 0 ? -33 : 33;
    const scale = 0.65 + random() * 1.1;
    object.position.set(x, height(x, z), z);
    object.scale.setScalar(scale);
    object.rotation.set(0, random() * 6.2, 0);
    object.updateMatrix();
    leaves.setMatrixAt(i, object.matrix);
    object.position.y += 2 * scale;
    object.updateMatrix();
    trunks.setMatrixAt(i, object.matrix);
    leaves.setColorAt(
      i,
      new THREE.Color().setHSL(
        0.22 + random() * 0.08,
        0.12,
        0.75 + random() * 0.22,
      ),
    );
  }
  trunks.castShadow = leaves.castShadow = true;
  trunks.receiveShadow = leaves.receiveShadow = true;
  group.add(trunks, leaves);

  const grassGeometry = new THREE.BufferGeometry();
  const blades: number[] = [];
  for (let b = 0; b < 9; b++) {
    const a = b * 2.4,
      x = Math.cos(a) * 0.15,
      z = Math.sin(a) * 0.15;
    blades.push(
      x - 0.025,
      0,
      z,
      x + 0.025,
      0,
      z,
      x + Math.cos(a) * 0.1,
      0.28 + (b % 3) * 0.1,
      z + Math.sin(a) * 0.1,
    );
  }
  grassGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(blades, 3),
  );
  grassGeometry.computeVertexNormals();
  const grassMaterial = standard(
    snow ? '#99a7a0' : dry ? '#a69b69' : '#75834d',
  );
  grassMaterial.side = THREE.DoubleSide;
  const tufts = new THREE.InstancedMesh(
    grassGeometry,
    grassMaterial,
    snow ? 180 : 2100,
  );
  for (let i = 0; i < tufts.count; i++) {
    const x = (random() - 0.5) * 95,
      z = (random() - 0.55) * 75;
    let scale = 0.3 + random() * (grass ? 1.15 : 0.55);
    if (
      Math.abs(z + 8) < 2.3 ||
      (riverRegion && z < -19 && z > -45) ||
      (village && Math.abs(x) < 25 && z < -13 && z > -33)
    )
      scale = 0;
    object.position.set(x, height(x, z), z);
    object.scale.setScalar(scale);
    object.rotation.set(0, random() * Math.PI, 0);
    object.updateMatrix();
    tufts.setMatrixAt(i, object.matrix);
  }
  group.add(tufts);

  // Each composition has a recognizable architectural or terrain focal point.
  const detailPosition = new THREE.Vector3(9, 1.4, -13);
  const detailTarget = new THREE.Vector3(10, 1.4, -14);
  function house(x: number, z: number, scale: number, twoStorey = false) {
    const h = twoStorey ? 7 : 3.8;
    const y = height(x, z);
    const home = new THREE.Group();
    home.name = 'ArtisticVillageHouse';
    home.position.set(x, y, z);
    home.scale.setScalar(scale);
    group.add(home);
    box(9, 0.35, 7, [0, 0.12, 0], brick, home);
    box(8, h, 6, [0, h / 2, 0], plaster, home);
    for (const side of [-1, 1]) {
      const gable = new THREE.BufferGeometry();
      const x = side * 4.01;
      gable.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [x, h - 0.05, -3, x, h + 2.05, 0, x, h - 0.05, 3],
          3,
        ),
      );
      gable.computeVertexNormals();
      const sideWall = mesh(gable, plaster, [0, 0, 0], home);
      sideWall.material = plaster;
      if (side < 0) {
        gable.setIndex([2, 1, 0]);
        gable.computeVertexNormals();
      }
      box(0.15, 0.15, 6.1, [x, h - 0.05, 0], timber, home);
    }
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 10; col++) {
        const stone = box(
          0.76,
          0.28,
          0.16,
          [-3.65 + col * 0.81 + (row % 2) * 0.07, 0.18 + row * 0.3, 3.1],
          brick,
          home,
        );
        stone.rotation.z = Math.sin(col * 2.5 + row) * 0.009;
      }
    for (let step = 0; step < 3; step++)
      box(
        2.1,
        0.16,
        0.45,
        [0, 0.08 + step * 0.14, 4.1 - step * 0.43],
        brick,
        home,
      );
    for (const sx of [-4, -2, 0, 2, 4])
      box(0.14, h + 0.15, 0.16, [sx, h / 2, 3.08], timber, home);
    for (const yy of [0.35, h * 0.5, h - 0.12])
      box(8.3, 0.14, 0.17, [0, yy, 3.08], timber, home);
    box(1.65, 2.55, 0.12, [0, 1.27, 3.14], black, home);
    for (const sx of [-2.6, 2.6])
      for (const yy of twoStorey ? [2.0, 5.2] : [2.05]) {
        box(1.6, 1.45, 0.14, [sx, yy, 3.14], black, home);
        for (const dx of [-0.5, 0, 0.5])
          box(0.05, 1.4, 0.16, [sx + dx, yy, 3.22], timber, home);
        box(1.6, 0.05, 0.16, [sx, yy, 3.22], timber, home);
      }
    for (const side of [-1, 1]) {
      const roof = box(
        9.4,
        0.22,
        4.3,
        [0, h + 1.15, side * 1.7],
        roofMaterial,
        home,
      );
      roof.rotation.x = side * 0.48;
      for (let line = 0; line < 27; line++) {
        const tile = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075, 0.075, 4.2, 5, 1, true, 0, Math.PI),
          roofMaterial,
        );
        tile.rotation.set(Math.PI / 2 + side * 0.48, 0, 0);
        tile.position.set(-4.45 + line * 0.34, h + 1.25, side * 1.7);
        home.add(tile);
      }
    }
    box(9.3, 0.2, 0.3, [0, h + 2.1, 0], roofMaterial, home);
    return home;
  }
  function crate(x: number, z: number, s = 1) {
    const y = height(x, z);
    box(s, s * 0.7, s * 0.7, [x, y + s * 0.35, z], timber);
    for (const dx of [-0.35, 0.35])
      box(s * 0.08, s * 0.76, s * 0.76, [x + dx * s, y + s * 0.35, z], black);
  }
  function tent(x: number, z: number, scale = 1) {
    const y = height(x, z),
      tentGroup = new THREE.Group();
    tentGroup.position.set(x, y, z);
    tentGroup.scale.setScalar(scale);
    group.add(tentGroup);
    for (const side of [-1, 1]) {
      const panel = box(
        3.5,
        0.03,
        4.5,
        [side * 1.3, 1.45, 0],
        canvas,
        tentGroup,
      );
      panel.rotation.z = side * 0.85;
      rod([side * 2.5, 0, -2.2], [0, 2.9, -2.2], 0.045, timber, tentGroup);
      rod([side * 2.5, 0, 2.2], [0, 2.9, 2.2], 0.045, timber, tentGroup);
      rod([side * 4.0, 0, 3], [side * 1.5, 1.3, 2.2], 0.012, linen, tentGroup);
    }
    rod([0, 0, 2.2], [0, 2.9, 2.2], 0.05, timber, tentGroup);
    rod([0, 2.9, -2.2], [0, 2.9, 2.2], 0.05, timber, tentGroup);
  }
  function campfire(x: number, z: number) {
    const y = height(x, z);
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const stone = mesh(
        new THREE.IcosahedronGeometry(0.28, 1),
        materials.rock,
        [x + Math.cos(angle) * 0.7, y + 0.15, z + Math.sin(angle) * 0.7],
      );
      stone.scale.y = 0.6;
    }
    for (let i = 0; i < 4; i++) {
      const log = mesh(new THREE.CylinderGeometry(0.12, 0.13, 1.1, 6), timber, [
        x,
        y + 0.22,
        z,
      ]);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = i * 0.8;
    }
    const coalMaterial = new THREE.MeshStandardMaterial({
      color: '#c66b2f',
      emissive: '#d45f22',
      emissiveIntensity: 1.5,
      roughness: 1,
    });
    mesh(new THREE.IcosahedronGeometry(0.32, 1), coalMaterial, [
      x,
      y + 0.22,
      z,
    ]);
    const fire = new THREE.PointLight('#ffb763', 8, 7, 2);
    fire.position.set(x, y + 0.6, z);
    group.add(fire);
  }
  if (village) {
    if (region === 'zunyi') {
      house(0, -24, 1.65, true);
      house(-22, -21, 1.1);
      house(24, -29, 1.1);
      for (let i = 0; i < 18; i++)
        for (let j = 0; j < 9; j++) {
          const paver = box(
            1.1,
            0.08,
            0.9,
            [-10 + i * 1.17, 0.045, -15.8 + j * 1.0],
            brick,
          );
          paver.rotation.y = random() * 0.015;
        }
      const table = box(2.8, 0.12, 1.35, [10, 1.2, -9.8], timber);
      table.name = 'FieldStudyTable';
      for (const dx of [-1.1, 1.1])
        for (const dz of [-0.45, 0.45])
          box(0.1, 1.15, 0.1, [10 + dx, 0.6, -9.8 + dz], timber);
      box(1.4, 0.01, 0.8, [10, 1.27, -9.8], linen);
      mesh(
        new THREE.CylinderGeometry(0.16, 0.13, 0.26, 12),
        black,
        [10.8, 1.4, -9.7],
      );
      detailPosition.set(10, 1.3, -9.8);
      detailTarget.copy(detailPosition);
    } else {
      house(-16, -23, 1.05);
      house(0, -31, 1.15);
      house(20, -27, 0.95);
      crate(9, -12, 1.4);
      crate(10.6, -12.4, 1.0);
      crate(9.2, -10.7, 0.8);
      const wheel = mesh(
        new THREE.TorusGeometry(0.7, 0.085, 8, 20),
        timber,
        [12.3, 0.7, -12],
      );
      wheel.rotation.y = Math.PI / 2;
      box(2.6, 0.2, 1.5, [11.8, 1.0, -12], timber);
      rod([10.5, 1, -12.5], [8.5, 0.7, -12.5], 0.06, timber);
      detailPosition.set(10.5, 1.0, -12);
      detailTarget.copy(detailPosition);
    }
    for (const x of [-27, 27]) {
      for (let i = 0; i < 10; i++)
        rod([x + i * 0.7, 0, -11], [x + i * 0.7, 1.2, -11], 0.06, timber);
      rod([x, 0.8, -11], [x + 6.3, 0.8, -11], 0.045, timber);
    }
  }

  if (riverRegion || grass) {
    const waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: clock,
        tint: { value: new THREE.Color(grass ? '#647e7a' : '#3d7779') },
      },
      vertexShader:
        'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 world;uniform float time;uniform vec3 tint;
      void main(){vec2 p=world.xz;float a=sin(p.x*2.2+p.y*.5-time*.9);float b=sin(p.y*4.1-p.x*.4+time*.7);
      vec3 normal=normalize(vec3(a*.1,1.,b*.13));vec3 view=normalize(cameraPosition-world);float fresnel=pow(1.-max(0.,dot(view,normal)),3.);
      float sparkle=pow(max(0.,dot(reflect(-view,normal),normalize(vec3(-.5,.7,-.4)))),80.);
      vec3 color=mix(tint*.45,vec3(.15,.26,.29),fresnel*.18)+vec3(1.,.8,.5)*sparkle*.06;
      float ripple=sin(p.y*3.+sin(p.x*1.7)*1.4-time*1.2)*sin(p.x*2.9+p.y*.7+time*.5);color+=ripple*.008;gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    });
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(riverRegion ? 210 : 130, riverRegion ? 28 : 90),
      waterMaterial,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, riverRegion ? -1.32 : -0.18, riverRegion ? -32 : -24);
    group.add(water);
  }
  if (riverRegion) {
    const dockY = 0.15;
    for (let i = 0; i < 20; i++)
      box(4, 0.15, 0.42, [9, dockY, -15 - i * 0.45], timber);
    for (const x of [7.1, 10.9])
      for (const z of [-16, -19, -22])
        rod([x, -2.1, z], [x, 0.6, z], 0.1, timber);
    const boat = new THREE.Group();
    boat.name = 'ArtisticFerry';
    boat.position.set(9, -1.12, -27);
    group.add(boat);
    const hull = box(3.5, 0.48, 6.4, [0, 0.2, 0], timber, boat);
    hull.scale.z = 1;
    for (const side of [-1, 1]) {
      const board = box(0.18, 0.65, 6.1, [side * 1.65, 0.6, 0], timber, boat);
      board.rotation.z = side * -0.12;
      box(3.3, 0.5, 0.2, [0, 0.6, side * 3.05], timber, boat);
    }
    for (const z of [-2.1, 0, 2.1])
      box(3.4, 0.12, 0.55, [0, 0.75, z], timber, boat);
    rod([-1.6, 0.8, -1], [2.5, 0.05, -3.8], 0.055, timber, boat);
    const oar = box(0.35, 0.06, 1.3, [2.5, 0.05, -3.8], timber, boat);
    oar.rotation.y = -0.75;
    crate(12.8, -14, 0.9);
    crate(12.6, -12.8, 0.7);
    detailPosition.set(9, 0.2, -25);
    detailTarget.copy(detailPosition);
    if (region === 'chishui') house(-24, -57, 1.2);
  }
  if (snow) {
    tent(11, -14, 0.85);
    crate(8, -13, 0.8);
    const rope = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-22, 0.6, -11),
      new THREE.Vector3(-10, 0.5, -11.3),
      new THREE.Vector3(5, 0.65, -11.1),
      new THREE.Vector3(18, 1.1, -11.4),
    ]);
    mesh(new THREE.TubeGeometry(rope, 32, 0.025, 4, false), timber, [0, 0, 0]);
    for (const x of [-22, -10, 5, 18])
      rod(
        [x, height(x, -11), -11],
        [x, height(x, -11) + 1.15, -11],
        0.055,
        timber,
      );
    const shelter = mesh(
      new THREE.IcosahedronGeometry(3.3, 1),
      materials.rock,
      [16, height(16, -18) + 1, -18],
    );
    shelter.scale.set(1.6, 0.85, 1);
    detailPosition.set(11, 1.7, -14);
    detailTarget.copy(detailPosition);
  }
  if (grass) {
    tent(12, -13, 1);
    tent(18, -18, 0.8);
    campfire(9, -10.5);
    crate(7, -13, 0.8);
    for (let i = 0; i < 14; i++) {
      const plank = box(
        2.0,
        0.12,
        0.45,
        [10 + Math.sin(i * 0.2), 0.12, -18 - i * 0.5],
        timber,
      );
      plank.rotation.y = Math.sin(i * 0.6) * 0.03;
    }
    detailPosition.set(9, 1.1, -10.5);
    detailTarget.copy(detailPosition);
  }
  if (region === 'reunion') {
    const caveBase = height(-13, -25);
    const loess = standard('#bfa273');
    weather(loess, 'plaster');
    box(21, 5.6, 8, [-13, caveBase + 2.8, -27], loess);
    box(18, 1.6, 6, [-13.5, caveBase + 5.5, -28], loess);
    for (const x of [-19, -13, -7]) {
      const arch = new THREE.Shape();
      arch.moveTo(-1.1, 0);
      arch.lineTo(1.1, 0);
      arch.lineTo(1.1, 2.2);
      arch.absarc(0, 2.2, 1.1, 0, Math.PI, false);
      arch.closePath();
      mesh(new THREE.ShapeGeometry(arch, 18), black, [
        x,
        caveBase + 0.05,
        -22.96,
      ]);
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= 24; j++) {
        const angle = (j / 24) * Math.PI;
        points.push(
          new THREE.Vector3(
            x + Math.cos(angle) * 1.28,
            caveBase + 2.2 + Math.sin(angle) * 1.28,
            -22.85,
          ),
        );
      }
      mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          24,
          0.14,
          6,
          false,
        ),
        brick,
        [0, 0, 0],
      );
      for (const side of [-1, 1])
        box(0.24, 2.2, 0.2, [x + side * 1.25, caveBase + 1.1, -22.85], brick);
      for (const dx of [-0.7, -0.35, 0, 0.35, 0.7])
        box(0.045, 1.2, 0.03, [x + dx, caveBase + 2.35, -22.75], timber);
      box(2.2, 0.07, 0.03, [x, caveBase + 1.8, -22.75], timber);
    }
    tent(13, -18, 1.1);
    campfire(9, -12.5);
    for (const side of [-1, 1]) {
      box(1.0, 5.2, 1.1, [side * 5, 2.6, -20], timber);
      for (let j = 0; j < 7; j++)
        box(
          0.8,
          0.9,
          3.4,
          [side * (6 + j * 0.75), 0.45 + j * 0.025, -19],
          brick,
        );
    }
    box(12, 0.4, 1.0, [0, 5.0, -20], timber);
    const banner = box(9, 0.85, 0.03, [0, 4.45, -19.7], red);
    banner.rotation.z = -0.02;
    detailPosition.set(9, 1.1, -12.5);
    detailTarget.copy(detailPosition);
  }

  const company = createMarchingCompany((x) => height(x, -8) + 0.075, true);
  const cloth = standard(
    snow ? '#9fa99f' : region === 'reunion' ? '#879082' : '#839088',
  );
  const skin = standard('#c5aa86');
  const pack = standard('#6b7052');
  const accent = standard('#b24838');
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.012 : 0.029;
    const x = Math.cos(angle) * r,
      y = Math.sin(angle) * r;
    if (i === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
  }
  star.closePath();
  const starGeometry = new THREE.ShapeGeometry(star);
  company.group.traverse((item) => {
    if (!(item instanceof THREE.Mesh)) return;
    const originalMaterials = Array.isArray(item.material)
      ? item.material
      : [item.material];
    originalMaterials.forEach((material) => disposable.add(material));
    if (/Head|Hand/.test(item.name)) item.material = skin;
    else if (/Tunic|Collar|Cap$|Brim|Trouser|Sleeve|Pocket/.test(item.name))
      item.material = cloth;
    else if (/Backpack|Bedroll|Puttee|Shoulder/.test(item.name))
      item.material = pack;
    if (item.name === 'CapBadge') {
      disposable.add(item.geometry);
      item.geometry = starGeometry;
      item.material = accent;
    }
  });
  group.add(company.group);
  company.update(0.53, false);
  const headDraw = company.group.getObjectByName('Head') as THREE.InstancedMesh;
  const eyes = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.012, 6, 4),
    standard('#514b3d'),
    36,
  );
  const noses = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.026, 8, 6),
    skin,
    18,
  );
  const ears = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.032, 6, 5),
    skin,
    36,
  );
  eyes.name = 'AnonymousEyes';
  noses.name = 'AnonymousNoses';
  ears.name = 'AnonymousEars';
  eyes.frustumCulled = noses.frustumCulled = ears.frustumCulled = false;
  group.add(eyes, noses, ears);
  const headMatrix = new THREE.Matrix4(),
    faceMatrix = new THREE.Matrix4(),
    faceOffset = new THREE.Matrix4();
  function updateFaces() {
    for (let i = 0; i < 18; i++) {
      headDraw.getMatrixAt(i, headMatrix);
      faceOffset.makeTranslation(0, -0.01, 0.13);
      faceMatrix.multiplyMatrices(headMatrix, faceOffset);
      noses.setMatrixAt(i, faceMatrix);
      for (let side = 0; side < 2; side++) {
        const sign = side ? 1 : -1;
        faceOffset.makeTranslation(sign * 0.047, 0.027, 0.12);
        faceMatrix.multiplyMatrices(headMatrix, faceOffset);
        eyes.setMatrixAt(i * 2 + side, faceMatrix);
        faceOffset.makeTranslation(sign * 0.133, -0.005, 0);
        faceMatrix.multiplyMatrices(headMatrix, faceOffset);
        ears.setMatrixAt(i * 2 + side, faceMatrix);
      }
    }
    eyes.instanceMatrix.needsUpdate =
      noses.instanceMatrix.needsUpdate =
      ears.instanceMatrix.needsUpdate =
        true;
  }
  updateFaces();

  const particlesGeometry = new THREE.BufferGeometry();
  const particles = new Float32Array((snow ? 480 : 95) * 3);
  for (let i = 0; i < particles.length; i += 3) {
    particles[i] = (random() - 0.5) * 70;
    particles[i + 1] = random() * 24 + 1;
    particles[i + 2] = (random() - 0.7) * 70;
  }
  particlesGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(particles, 3),
  );
  const motes = new THREE.Points(
    particlesGeometry,
    new THREE.PointsMaterial({
      color: snow ? '#f3f5ec' : '#e5ce97',
      size: snow ? 0.075 : 0.035,
      transparent: true,
      opacity: snow ? 0.6 : 0.4,
      depthWrite: false,
    }),
  );
  group.add(motes);
  // Consolidate repeated architecture into one draw per material. Characters remain instanced and animated.
  group.updateMatrixWorld(true);
  const staticGroups = new Map<THREE.Material, THREE.Mesh[]>();
  group.traverse((item) => {
    if (
      !(item instanceof THREE.Mesh) ||
      item instanceof THREE.InstancedMesh ||
      Array.isArray(item.material)
    )
      return;
    const batch = staticGroups.get(item.material) ?? [];
    batch.push(item);
    staticGroups.set(item.material, batch);
  });
  for (const [material, meshes] of staticGroups) {
    if (meshes.length < 3) continue;
    const geometries = meshes.map((item) => {
      const clone = item.geometry.clone().applyMatrix4(item.matrixWorld);
      const geometry = clone.index ? clone.toNonIndexed() : clone;
      if (geometry !== clone) clone.dispose();
      if (!geometry.attributes.uv)
        geometry.setAttribute(
          'uv',
          new THREE.BufferAttribute(
            new Float32Array(geometry.attributes.position!.count * 2),
            2,
          ),
        );
      return geometry;
    });
    const combined = mergeGeometries(geometries);
    geometries.forEach((geometry) => geometry.dispose());
    if (!combined) continue;
    const merged = new THREE.Mesh(combined, material);
    merged.name = 'BatchedRegionalArchitecture';
    merged.castShadow = meshes.some((item) => item.castShadow);
    merged.receiveShadow = true;
    group.add(merged);
    for (const item of meshes) {
      disposable.add(item.geometry);
      item.removeFromParent();
    }
  }
  const focus = {
    arrival: {
      position: new THREE.Vector3(17, village ? 10.5 : 10, 21),
      target: new THREE.Vector3(-3, -2, -17),
    },
    company: {
      position: new THREE.Vector3(7, 3.5, -0.5),
      target: new THREE.Vector3(-3.1, 1.2, -8),
    },
    landscape: {
      position: new THREE.Vector3(30, 22, 29),
      target: new THREE.Vector3(0, 4, -28),
    },
    detail: {
      position: detailPosition.clone().add(new THREE.Vector3(5, 3.8, 7)),
      target: detailTarget,
    },
  };
  const hotspots = [
    {
      id: 'terrain' as const,
      point: new THREE.Vector3(-14, height(-14, -26) + 2, -26),
    },
    { id: 'people' as const, point: new THREE.Vector3(-2, 2.4, -8) },
    {
      id: 'detail' as const,
      point: detailPosition.clone().add(new THREE.Vector3(0, 1.3, 0)),
    },
  ];
  let disposed = false;
  return {
    group,
    mood,
    height,
    focus,
    hotspots,
    update(seconds: number, animate: boolean) {
      if (disposed) return;
      clock.value = seconds;
      if (animate) {
        company.update(0.53 + Math.sin(seconds * 0.13) * 0.017, true);
        updateFaces();
        motes.position.x = Math.sin(seconds * 0.08) * 1.5;
        motes.position.y = snow
          ? -((seconds * 0.18) % 6)
          : Math.sin(seconds * 0.11) * 0.5;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.traverse((item) => {
        if (item instanceof THREE.Mesh || item instanceof THREE.Points) {
          disposable.add(item.geometry);
          const list = Array.isArray(item.material)
            ? item.material
            : [item.material];
          list.forEach((material) => disposable.add(material));
          if (item instanceof THREE.InstancedMesh) item.dispose();
        }
      });
      disposable.forEach((resource) => resource.dispose());
      materials.dispose();
      group.clear();
    },
  };
}

export function createRegionalWorld(
  host: HTMLElement,
  regionId: string,
  options: RegionalWorldOptions = {},
) {
  if (!Object.hasOwn(REGIONAL_WORLD_MOODS, regionId))
    throw new Error('未知区域，无法打开场景。');
  const region = regionId as RegionId;
  const world = buildRegionalArtWorld(region);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    world.dispose();
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = region === 'snow' ? 1.0 : 1.3;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute(
    'aria-label',
    '可探索的艺术场景，包含代表性红军人物。拖动环顾，滚轮缩放，方向键转动，Home 返回初景。',
  );
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(world.mood.sky);
  scene.fog = new THREE.FogExp2(world.mood.fog, 0.0042);
  scene.add(world.group);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 420);
  const controls = new OrbitControls(camera, renderer.domElement);
  let reducedMotion = options.reducedMotion ?? false;
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.rotateSpeed = 0.45;
  controls.zoomSpeed = 0.7;
  controls.minDistance = 3;
  controls.maxDistance = 85;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = Math.PI * 0.49;
  camera.position.copy(world.focus.arrival.position);
  controls.target.copy(world.focus.arrival.target);
  controls.update();
  scene.add(new THREE.HemisphereLight('#d7e9f1', '#646652', 1.7));
  const sun = new THREE.DirectionalLight(world.mood.light, 2.4);
  sun.position.set(-28, 42, -18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -45,
    right: 45,
    top: 42,
    bottom: -35,
    near: 1,
    far: 130,
  });
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#bed5e1', 1.05);
  fill.position.set(18, 12, 32);
  scene.add(fill);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      zenith: { value: new THREE.Color(world.mood.sky) },
      horizon: { value: new THREE.Color(world.mood.horizon) },
    },
    vertexShader:
      'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 p;uniform vec3 zenith;uniform vec3 horizon;
    float skyHash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}float skyNoise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(skyHash(i),skyHash(i+vec2(1.,0.)),f.x),mix(skyHash(i+vec2(0.,1.)),skyHash(i+1.),f.x),f.y);}
    void main(){vec3 d=normalize(p);float h=smoothstep(-.08,.8,d.y);vec3 color=mix(horizon,zenith,h);
    float sun=max(0.,dot(d,normalize(vec3(-.46,.32,-.65))));color+=vec3(1.,.62,.23)*pow(sun,19.)*.4;
    vec2 uv=d.xz/max(.16,d.y+.18)*1.4;float clouds=skyNoise(uv)*.57+skyNoise(uv*2.05)*.28+skyNoise(uv*4.1)*.15;float layer=smoothstep(.02,.18,d.y)*(1.-smoothstep(.5,.88,d.y));color=mix(color,vec3(.82,.88,.87),smoothstep(.45,.69,clouds)*layer*.7);
    gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`,
  });
  const skyGeometry = new THREE.SphereGeometry(300, 32, 18);
  const proceduralSky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(proceduralSky);
  let panorama: THREE.Mesh<
    THREE.SphereGeometry,
    THREE.MeshBasicMaterial
  > | null = null;
  let panoramaReleased = false;
  if (
    region === 'snow' ||
    region === 'grass' ||
    region === 'chishui' ||
    region === 'jinsha'
  ) {
    const panoramaGeometry = new THREE.SphereGeometry(290, 64, 40);
    panoramaGeometry.scale(-1, 1, 1);
    const panoramaMaterial = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    panorama = new THREE.Mesh(panoramaGeometry, panoramaMaterial);
    panorama.rotation.y = -0.9;
    panorama.position.y =
      region === 'snow' ? -62 : region === 'grass' ? -20 : -35;
    panoramaMaterial.color.setScalar(region === 'snow' ? 1.25 : 1.08);
    panorama.visible = false;
    scene.add(panorama);
    new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}assets/textures/immersive-landscapes/${region === 'snow' ? 'snow-pass' : region === 'grass' ? 'grassland' : 'river-valley'}.webp`,
      (texture) => {
        if (panoramaReleased) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(
          4,
          renderer.capabilities.getMaxAnisotropy(),
        );
        panoramaMaterial.map = texture;
        panoramaMaterial.needsUpdate = true;
        panorama!.visible = true;
        proceduralSky.visible = false;
      },
      undefined,
      () => {
        /* Procedural sky remains a complete local fallback. */
      },
    );
  }
  let width = 1,
    height = 1,
    resizePending = true,
    paused = false,
    disposed = false,
    ready = false;
  let frame = 0,
    last = 0,
    elapsed = 0,
    anchorElapsed = 0;
  let transition: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    time: number;
  } | null = null;
  function setView(view: RegionalView) {
    if (disposed) return;
    const target = world.focus[view];
    if (reducedMotion) {
      camera.position.copy(target.position);
      controls.target.copy(target.target);
      controls.update();
      transition = null;
    } else
      transition = {
        from: camera.position.clone(),
        to: target.position.clone(),
        fromTarget: controls.target.clone(),
        toTarget: target.target.clone(),
        time: 0,
      };
  }
  const manual = () => {
    transition = null;
  };
  controls.addEventListener('start', manual);
  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = immersiveFieldOfView(camera.aspect);
    camera.updateProjectionMatrix();
    resizePending = false;
  }
  const observer = new ResizeObserver(() => {
    resizePending = true;
  });
  observer.observe(host);
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Home') {
      event.preventDefault();
      setView('arrival');
      return;
    }
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') spherical.theta -= 0.08;
    else if (event.key === 'ArrowRight') spherical.theta += 0.08;
    else if (event.key === 'ArrowUp') spherical.phi -= 0.06;
    else if (event.key === 'ArrowDown') spherical.phi += 0.06;
    else if (event.key === '+' || event.key === '=') spherical.radius *= 0.88;
    else if (event.key === '-') spherical.radius *= 1.12;
    else return;
    event.preventDefault();
    transition = null;
    spherical.phi = clamp(
      spherical.phi,
      controls.minPolarAngle,
      controls.maxPolarAngle,
    );
    spherical.radius = clamp(
      spherical.radius,
      controls.minDistance,
      controls.maxDistance,
    );
    camera.position
      .copy(controls.target)
      .add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
  }
  renderer.domElement.addEventListener('keydown', keydown);
  const contextLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    options.onError?.(new Error('三维画面暂时中断，请返回后重试。'));
  };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const visibility = () => {
    last = 0;
  };
  document.addEventListener('visibilitychange', visibility);
  function draw(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(draw);
    if (document.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (resizePending) resize();
    if (transition) {
      transition.time += delta;
      const t = Math.min(1, transition.time / 1.25),
        ease = t * t * (3 - 2 * t);
      camera.position.lerpVectors(transition.from, transition.to, ease);
      controls.target.lerpVectors(
        transition.fromTarget,
        transition.toTarget,
        ease,
      );
      if (t === 1) transition = null;
    }
    if (!paused && !reducedMotion) elapsed += delta;
    world.update(elapsed, !paused && !reducedMotion);
    controls.update();
    const terrainFloor =
      world.height(camera.position.x, camera.position.z) + 1.2;
    if (camera.position.y < terrainFloor) {
      camera.position.y = terrainFloor;
      camera.lookAt(controls.target);
    }
    try {
      renderer.render(scene, camera);
      if (!transition) options.onRendered?.();
      if (!ready) {
        ready = true;
        options.onReady?.();
      }
      anchorElapsed += delta;
      if (options.onHotspots && (anchorElapsed > 0.07 || !last)) {
        anchorElapsed = 0;
        options.onHotspots(
          world.hotspots.map((spot) => {
            const p = spot.point.clone().project(camera);
            return {
              id: spot.id,
              x: (p.x * 0.5 + 0.5) * width,
              y: (-p.y * 0.5 + 0.5) * height,
              visible:
                p.z > -1 &&
                p.z < 1 &&
                Math.abs(p.x) < 0.96 &&
                Math.abs(p.y) < 0.92,
            };
          }),
        );
      }
    } catch (error) {
      cancelAnimationFrame(frame);
      options.onError?.(
        error instanceof Error ? error : new Error('场景渲染失败'),
      );
    }
  }
  frame = requestAnimationFrame(draw);
  return {
    setView,
    bookmark() {
      return {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        zoom: camera.zoom,
      };
    },
    restore(value: {
      position: readonly number[];
      target: readonly number[];
      zoom: number;
    }) {
      if (
        disposed ||
        value.position.length !== 3 ||
        value.target.length !== 3 ||
        !value.position.every(Number.isFinite) ||
        !value.target.every(Number.isFinite) ||
        !Number.isFinite(value.zoom) ||
        value.zoom <= 0
      )
        return;
      transition = null;
      camera.position.fromArray(value.position);
      controls.target.fromArray(value.target);
      camera.zoom = clamp(value.zoom, 0.4, 3);
      camera.updateProjectionMatrix();
      controls.update();
    },
    quality(low: boolean) {
      if (disposed) return;
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5),
      );
      renderer.shadowMap.enabled = !low;
      resizePending = true;
    },
    setPaused(value: boolean) {
      paused = value;
      last = 0;
    },
    setReducedMotion(value: boolean) {
      if (disposed) return;
      reducedMotion = value;
      controls.enableDamping = !value;
      if (value && transition) {
        camera.position.copy(transition.to);
        controls.target.copy(transition.toTarget);
        transition = null;
        controls.update();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('keydown', keydown);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      controls.removeEventListener('start', manual);
      controls.dispose();
      world.dispose();
      panoramaReleased = true;
      if (panorama) {
        panorama.material.map?.dispose();
        panorama.material.dispose();
        panorama.geometry.dispose();
      }
      skyGeometry.dispose();
      skyMaterial.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      scene.clear();
    },
  };
}
