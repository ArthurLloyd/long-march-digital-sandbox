import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {
  createMarchingCompany,
  createMarchingFigure,
} from '../../prototype/marching-company';

// GLTFExporter uses the browser FileReader API for binary Blob assembly only.
class BinaryFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((value) => {
      this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;
      this.onloadend?.();
    });
  }
}
Object.defineProperty(globalThis, 'FileReader', {
  value: BinaryFileReader,
  configurable: true,
});
const out = resolve('public/assets/terrain/scene-kit');
await mkdir(out, { recursive: true });
const figure = createMarchingFigure();
const times = Array.from({ length: 17 }, (_, i) => i / 16);
const tracks = ['LeftLeg', 'RightLeg', 'LeftArm', 'RightArm'].map((name, i) => {
  const sign = [-1, 1, 1, -1][i]!;
  const values = times.flatMap((t) =>
    new THREE.Quaternion()
      .setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.sin(t * Math.PI * 2) * 0.32 * sign,
      )
      .toArray(),
  );
  return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values);
});
const clip = new THREE.AnimationClip('March', 1, tracks);
const company = createMarchingCompany();
company.update(0.5, false);
const exporter = new GLTFExporter();
const entries = [];
for (const [file, object, animations] of [
  ['clay-marcher.glb', figure.group, [clip]],
  ['marching-company.glb', company.group, []],
] as const) {
  const data = await exporter.parseAsync(object, {
    binary: true,
    animations: [...animations],
  });
  if (!(data instanceof ArrayBuffer))
    throw new Error('Binary model export failed');
  const bytes = Buffer.from(data);
  await writeFile(resolve(out, file), bytes);
  entries.push({
    file,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    animationClips: animations.map((a) => a.name),
  });
}
await writeFile(
  resolve(out, 'manifest.json'),
  JSON.stringify(
    {
      title: 'Original clay marching kit',
      date: '2026-11-02',
      authoring: 'Original Three.js procedural geometry',
      style:
        'Ivory clay figure, backpack, cap, gaiters, boots and unmarked red flag',
      scope:
        'Artistic demonstration. 18 visible figures do not represent historical strength or verified uniform detail.',
      source: 'src/features/scene/prototype/marching-company.ts',
      entries,
    },
    null,
    2,
  ) + '\n',
);
console.log(entries);
