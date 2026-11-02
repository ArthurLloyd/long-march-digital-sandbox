import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RegionId } from './regions';

export const REGION_MOOD: Record<
  RegionId,
  {
    subtitle: string;
    description: string;
    forest: string;
    ground: string;
    rock: string;
    snow: number;
    density: number;
    conifer: boolean;
  }
> = {
  ruijin: {
    subtitle: '青山起伏 · 水脉绵延',
    description: '沿山脊俯瞰，寻找丘陵间的河谷。',
    forest: '#365f42',
    ground: '#66835b',
    rock: '#7c806a',
    snow: 5200,
    density: 4000,
    conifer: false,
  },
  zunyi: {
    subtitle: '群山环抱 · 层峦深处',
    description: '转动视角，观察山地与谷地的关系。',
    forest: '#31594b',
    ground: '#708271',
    rock: '#939889',
    snow: 5200,
    density: 4500,
    conifer: false,
  },
  chishui: {
    subtitle: '赤水回环 · 重峦相接',
    description: '贴近水面，看河流如何穿行于群山之间。',
    forest: '#295f47',
    ground: '#658064',
    rock: '#9a8064',
    snow: 5200,
    density: 6000,
    conifer: false,
  },
  jinsha: {
    subtitle: '深谷长风 · 江水向前',
    description: '沿谷地展开视野，辨认两岸的高差。',
    forest: '#626745',
    ground: '#928463',
    rock: '#b19a79',
    snow: 5100,
    density: 420,
    conifer: false,
  },
  luding: {
    subtitle: '峭壁临江 · 一桥凌空',
    description: '从河谷走近桥索与石壁，观察空间结构。',
    forest: '#2c5548',
    ground: '#6f8070',
    rock: '#9b9e8d',
    snow: 4400,
    density: 4000,
    conifer: true,
  },
  snow: {
    subtitle: '雪岭入云 · 天地寥廓',
    description: '沿山脊移动视角，感受高山的起伏与尺度。',
    forest: '#3a5552',
    ground: '#929e97',
    rock: '#b3bdbc',
    snow: 3500,
    density: 650,
    conifer: true,
  },
  grass: {
    subtitle: '旷野无垠 · 水泽交错',
    description: '放低视角，观察草地与水系的空间关系。',
    forest: '#777b4b',
    ground: '#909557',
    rock: '#a7a389',
    snow: 4900,
    density: 0,
    conifer: false,
  },
  reunion: {
    subtitle: '黄土层叠 · 山河辽远',
    description: '俯瞰沟壑，观察塬面与谷地的层次。',
    forest: '#6d7149',
    ground: '#b09a70',
    rock: '#bc9b72',
    snow: 5800,
    density: 240,
    conifer: false,
  },
};

type Sample = { x: number; y: number; z: number; size: number; angle: number };
/** Deterministic artistic dressing. These samples are never historical objects. */
export function scatterEnvironment(
  seed: number,
  count: number,
  center: { x: number; z: number },
  radius: number,
  height: (x: number, z: number) => number,
  allow: (x: number, z: number) => boolean,
): Sample[] {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const samples: Sample[] = [];
  for (let i = 0; i < count * 5 && samples.length < count; i++) {
    const x = center.x + (random() * 2 - 1) * radius,
      z = center.z + (random() * 2 - 1) * radius;
    const y = height(x, z),
      size = 0.0008 + random() * 0.002,
      angle = random() * Math.PI * 2;
    if (!Number.isFinite(y) || !allow(x, z)) continue;
    // Reject near vertical cliffs; measured in exaggerated scene space.
    const slope =
      Math.hypot(
        height(x + 0.002, z) - height(x - 0.002, z),
        height(x, z + 0.002) - height(x, z - 0.002),
      ) / 0.004;
    if (!Number.isFinite(slope) || slope > 1.8) continue;
    samples.push({ x, y, z, size, angle });
  }
  return samples;
}

export function createEnvironmentDetails() {
  const root = new THREE.Group();
  const wind = { value: 0 };
  const canopy = (conifer: boolean) => {
    const parts: THREE.BufferGeometry[] = [];
    if (conifer) {
      for (let i = 0; i < 5; i++) {
        const g = new THREE.ConeGeometry(
          0.66 - i * 0.105,
          0.85 - i * 0.07,
          9,
          1,
        );
        g.translate(
          Math.sin(i * 2) * 0.05,
          i * 0.3 - 0.55,
          Math.cos(i * 2) * 0.05,
        );
        parts.push(g);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const g = new THREE.IcosahedronGeometry(0.48, 1);
        g.scale(1, 1.25, 1);
        g.translate(
          Math.sin(i * 2.4) * 0.34,
          (i % 3) * 0.18,
          Math.cos(i * 2.4) * 0.34,
        );
        parts.push(g);
      }
    }
    const combined = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    return combined;
  };
  root.name = 'artistic-environment-details';
  const clear = () => {
    for (const child of [...root.children]) {
      if (child instanceof THREE.InstancedMesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
        child.dispose();
      }
      root.remove(child);
    }
  };
  const populate = (
    id: RegionId,
    center: { x: number; z: number },
    height: (x: number, z: number) => number,
    allow: (x: number, z: number) => boolean,
  ) => {
    clear();
    const mood = REGION_MOOD[id],
      seed = id.split('').reduce((s, c) => s * 31 + c.charCodeAt(0), 7);
    const instances = (
      geometry: THREE.BufferGeometry,
      color: string,
      samples: Sample[],
      shape: (s: Sample) => THREE.Vector3,
      offset: number,
    ) => {
      if (!samples.length) {
        geometry.dispose();
        return;
      }
      const mesh = new THREE.InstancedMesh(
        geometry,
        new THREE.MeshStandardMaterial({ color, roughness: 0.95 }),
        samples.length,
      );
      (mesh.material as THREE.MeshStandardMaterial).onBeforeCompile = (
        shader,
      ) => {
        shader.uniforms.environmentWind = wind;
        shader.vertexShader =
          'uniform float environmentWind;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.x += sin(environmentWind*.65+instanceMatrix[3].x*70.+instanceMatrix[3].z*35.)*.035*max(0.,position.y);\n#endif',
        );
      };
      const object = new THREE.Object3D();
      samples.forEach((s, i) => {
        object.position.set(s.x, s.y + offset * s.size, s.z);
        object.rotation.set(0, s.angle, 0);
        object.scale.copy(shape(s));
        object.updateMatrix();
        mesh.setMatrixAt(i, object.matrix);
        mesh.setColorAt(
          i,
          new THREE.Color('#ffffff').multiplyScalar(0.78 + (i % 9) * 0.045),
        );
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.computeBoundingSphere();
      root.add(mesh);
    };
    const trees = scatterEnvironment(
      seed,
      mood.density,
      center,
      0.62,
      height,
      allow,
    ).filter(
      (s) =>
        (id !== 'snow' || s.y < 0.19) &&
        Math.sin(s.x * 32 + Math.sin(s.z * 24) * 2) + Math.cos(s.z * 28) >
          -0.65,
    );
    instances(
      new THREE.CylinderGeometry(0.11, 0.17, 1, 5),
      '#645d46',
      trees,
      (s) => new THREE.Vector3(s.size, s.size, s.size),
      0.45,
    );
    instances(
      canopy(mood.conifer),
      mood.forest,
      trees,
      (s) =>
        new THREE.Vector3(s.size, s.size * (mood.conifer ? 1 : 1.35), s.size),
      mood.conifer ? 1.35 : 1.15,
    );
    const rocks = scatterEnvironment(
      seed + 123,
      350,
      center,
      0.6,
      height,
      allow,
    );
    instances(
      new THREE.IcosahedronGeometry(1, 1),
      mood.rock,
      rocks,
      (s) => new THREE.Vector3(s.size * 0.8, s.size * 0.3, s.size * 0.65),
      0.2,
    );
    if (id === 'grass' || id === 'jinsha' || id === 'reunion') {
      const tufts = scatterEnvironment(
        seed + 456,
        id === 'grass' ? 2400 : 650,
        center,
        0.5,
        height,
        allow,
      );
      instances(
        new THREE.ConeGeometry(0.45, 1, 4),
        mood.ground,
        tufts,
        (s) => new THREE.Vector3(s.size * 0.65, s.size * 0.45, s.size * 0.65),
        0.16,
      );
    }
  };
  return {
    root,
    populate,
    clear,
    update: (seconds: number) => {
      wind.value = seconds;
    },
    dispose: clear,
  };
}
