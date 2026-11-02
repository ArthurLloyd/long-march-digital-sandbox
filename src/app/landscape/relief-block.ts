import * as THREE from 'three';
import type { GeoBounds } from './geography';
import type { CameraPose } from './camera-flight';

export function reliefBlockMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: '#7a7463',
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 blockWorld;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nblockWorld=(modelMatrix*vec4(transformed,1.)).xyz;',
    );
    shader.fragmentShader =
      'varying vec3 blockWorld;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float cutRough=sin(blockWorld.x*124.)*sin(blockWorld.z*143.)*.5+.5;
      float seam=sin(blockWorld.y*72.+sin(blockWorld.x*8.+blockWorld.z*12.)*.6);
      float fine=sin(blockWorld.y*510.+blockWorld.x*43.+blockWorld.z*58.)*.5+.5;
      vec3 slate=mix(vec3(.10,.15,.15),vec3(.33,.31,.24),smoothstep(-.44,.1,blockWorld.y));
      vec3 sediment=mix(slate,vec3(.43,.35,.23),smoothstep(.2,.85,seam)*.55);
      diffuseColor.rgb=sediment*(.8+.22*cutRough+.13*fine);
    `,
    );
  };
  material.customProgramCacheKey = () => 'exhibition-cutaway-v1';
  return material;
}

/** Exhibition cutaway, not a reconstruction of underground geology. */
export function reliefBlockGeometry(
  bounds: GeoBounds,
  height: (x: number, z: number) => number,
  base: number,
  segments = 192,
) {
  const [left, top, right, bottom] = bounds;
  const rim: [number, number][] = [];
  for (let side = 0; side < 4; side++)
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      rim.push(
        side === 0
          ? [left + (right - left) * t, top]
          : side === 1
            ? [right, top + (bottom - top) * t]
            : side === 2
              ? [right - (right - left) * t, bottom]
              : [left, bottom - (bottom - top) * t],
      );
    }
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  // Decorative sediment-like bands: these do not assert real geological layers.
  const tones = [
    '#293b3b',
    '#5b6254',
    '#a18d68',
    '#66543e',
    '#b39c73',
    '#344544',
  ];
  const layers = tones.length - 1;
  for (const [x, z] of rim) {
    const y = Math.max(base + 0.001, height(x, z));
    for (let layer = 0; layer <= layers; layer++) {
      const t = layer / layers;
      positions.push(x, base + (y - base) * t, z);
      const color = new THREE.Color(tones[layer]!);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let i = 0; i < rim.length; i++) {
    const a = i * (layers + 1),
      b = ((i + 1) % rim.length) * (layers + 1);
    for (let j = 0; j < layers; j++)
      indices.push(a + j, b + j, a + j + 1, b + j, b + j + 1, a + j + 1);
  }
  const center = positions.length / 3;
  positions.push((left + right) / 2, base, (top + bottom) / 2);
  const color = new THREE.Color(tones[0]!);
  colors.push(color.r, color.g, color.b);
  for (let i = 0; i < rim.length; i++)
    indices.push(
      center,
      ((i + 1) % rim.length) * (layers + 1),
      i * (layers + 1),
    );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Frame a real modern region as a right-hand exhibit, independent of history. */
export function composeReliefEntry(
  bounds: GeoBounds,
  height: (x: number, z: number) => number,
  aspect: number,
): CameraPose {
  const [left, top, right, bottom] = bounds;
  const x = (left + right) / 2,
    z = (top + bottom) / 2;
  const span = Math.max(right - left, bottom - top);
  let summit = 0;
  for (let r = 0; r <= 16; r++)
    for (let c = 0; c <= 16; c++)
      summit = Math.max(
        summit,
        height(
          left + ((right - left) * c) / 16,
          top + ((bottom - top) * r) / 16,
        ),
      );
  const distance = span * (aspect < 1.5 ? 2.05 : 1.78);
  const bearing = 0.22,
    rise = distance * 0.43;
  const rightVector = [Math.cos(bearing), -Math.sin(bearing)];
  const shift = distance * Math.tan((43 * Math.PI) / 360) * aspect * 0.35;
  const target: [number, number, number] = [
    x - rightVector[0]! * shift,
    summit * 0.25,
    z - rightVector[1]! * shift,
  ];
  return {
    target,
    position: [
      target[0] + Math.sin(bearing) * distance,
      target[1] + rise,
      target[2] + Math.cos(bearing) * distance,
    ],
  };
}
