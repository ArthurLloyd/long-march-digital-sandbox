import * as THREE from 'three';

export const MARCH_PRESENTATION = {
  overviewDistance: 0.62,
  followDistance: 0.15,
  sideAngle: Math.PI * 0.23,
  groundLift: 0.0012,
  floatingLift: 0.065,
} as const;

/** Central half is the quiet zone: start panning in the outer quarter. */
export function marchPanNeeded(x: number, y: number) {
  return Math.abs(x) > 0.5 || Math.abs(y) > 0.5;
}

/** Lift the near side camera over intervening ridges without zooming away. */
export function clearMarchSightline(
  position: THREE.Vector3,
  target: THREE.Vector3,
  floor: (x: number, z: number) => number,
) {
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    const surface = floor(
      target.x + (position.x - target.x) * t,
      target.z + (position.z - target.z) * t,
    );
    position.y = Math.max(
      position.y,
      (surface + MARCH_PRESENTATION.groundLift - target.y * (1 - t)) / t,
    );
  }
  return position;
}

/** A subdivided display glyph, not a new historical path. */
export function createGroundArrow() {
  const profile = [
    [-0.1, 0],
    [-0.045, 0.006],
    [0.025, 0.009],
    [0.035, 0.026],
    [0.09, 0],
  ] as const;
  const offsets: number[] = [],
    indices: number[] = [];
  for (let section = 0; section < profile.length - 1; section++) {
    const a = profile[section]!,
      b = profile[section + 1]!;
    for (let n = 0; n < 12; n++) {
      const f = n / 12,
        z = a[0] + (b[0] - a[0]) * f,
        halfWidth = a[1] + (b[1] - a[1]) * f;
      offsets.push(-halfWidth, z, halfWidth, z);
    }
  }
  offsets.push(0, 0.09, 0, 0.09);
  for (let row = 0; row < offsets.length / 4 - 1; row++) {
    const l = row * 2;
    indices.push(l, l + 2, l + 1, l + 1, l + 2, l + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array((offsets.length / 2) * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setIndex(indices);
  return { geometry, offsets };
}

export function drapeGroundArrow(
  arrow: ReturnType<typeof createGroundArrow>,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  scale: number,
  heightAt: (x: number, z: number) => number,
) {
  const positions = arrow.geometry.getAttribute(
    'position',
  ) as THREE.BufferAttribute;
  for (let i = 0; i < arrow.offsets.length / 2; i++) {
    const side = arrow.offsets[i * 2]! * scale,
      along = arrow.offsets[i * 2 + 1]! * scale;
    const x = origin.x + direction.x * along + direction.z * side,
      z = origin.z + direction.z * along - direction.x * side;
    positions.setXYZ(i, x, heightAt(x, z) + MARCH_PRESENTATION.groundLift, z);
  }
  positions.needsUpdate = true;
  arrow.geometry.computeVertexNormals();
  arrow.geometry.computeBoundingSphere();
}
