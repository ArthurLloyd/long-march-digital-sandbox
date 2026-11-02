import * as THREE from 'three';
import type { Surface } from './terrain-tile';
import type { GeoBounds } from './geography';

export const TERRAIN_NAVIGATION = {
  minDistance: 0.004,
  maxDistance: 58,
} as const;

/** Shared by wheel/OrbitControls, buttons, keyboard, flights and restored bookmarks. */
export function constrainTerrainCamera(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  floor: Surface,
  bounds: GeoBounds,
) {
  target.x = THREE.MathUtils.clamp(target.x, bounds[0], bounds[2]);
  target.z = THREE.MathUtils.clamp(target.z, bounds[1], bounds[3]);
  const offset = camera.position.clone().sub(target);
  if (offset.lengthSq() < 1e-12) offset.set(0, 1, 1);
  offset.clampLength(
    TERRAIN_NAVIGATION.minDistance,
    TERRAIN_NAVIGATION.maxDistance,
  );
  const distance = offset.length();
  const clearance = THREE.MathUtils.clamp(distance * 0.012, 0.00012, 0.008);
  if (distance < 1.2) {
    const base = floor(target.x, target.z);
    const t = THREE.MathUtils.smoothstep(distance, 0.18, 1.2);
    // Ease the old regional bookmark's large air gap away when approaching.
    const ceiling = base + 0.09 * t + Math.max(0.00012, distance * 0.03);
    target.y = THREE.MathUtils.clamp(target.y, base + clearance * 0.3, ceiling);
  }
  camera.position.copy(target).add(offset);
  // Only the camera's physical near volume is protected. Natural mountain
  // occlusion is allowed; do not clear the entire sightline back to the region.
  const near = THREE.MathUtils.clamp(distance * 0.012, 0.00005, 0.02);
  const forward = target.clone().sub(camera.position).normalize();
  const right = new THREE.Vector3()
    .crossVectors(forward, camera.up)
    .normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  const halfH = near * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  let raise = Math.max(
    0,
    floor(camera.position.x, camera.position.z) + clearance - camera.position.y,
  );
  for (const u of [-1, 0, 1])
    for (const v of [-1, 0, 1]) {
      const p = camera.position
        .clone()
        .addScaledVector(forward, near)
        .addScaledVector(right, u * halfH * camera.aspect)
        .addScaledVector(up, v * halfH);
      raise = Math.max(raise, floor(p.x, p.z) + clearance * 0.6 - p.y);
    }
  camera.position.y += Math.max(0, raise);
  camera.lookAt(target);
  const far = THREE.MathUtils.clamp(Math.max(12, distance * 4 + 4), 12, 160);
  if (camera.near !== near || camera.far !== far) {
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
  }
}

export function localTerrainPose(
  position: THREE.Vector3,
  target: THREE.Vector3,
  point: THREE.Vector3,
) {
  if (!point.toArray().every(Number.isFinite)) return null;
  const offset = position.clone().sub(target);
  const distance = THREE.MathUtils.clamp(offset.length() * 0.28, 0.018, 0.22);
  offset.normalize();
  offset.y = Math.max(0.45, offset.y);
  offset.normalize().multiplyScalar(distance);
  const next = point.clone().add(new THREE.Vector3(0, distance * 0.012, 0));
  return { position: next.clone().add(offset), target: next };
}

/** Canvas-only gesture gate, so UI clicks and drags cannot select terrain. */
export function createSurfaceGesture(canvas: HTMLCanvasElement) {
  let down: { x: number; y: number } | null = null,
    dragged = false,
    blockedUntil = 0;
  return {
    down(event: Pick<PointerEvent, 'clientX' | 'clientY' | 'button'>) {
      if (event.button !== 0) return;
      down = { x: event.clientX, y: event.clientY };
      dragged = false;
    },
    move(event: Pick<PointerEvent, 'clientX' | 'clientY'>) {
      if (
        down &&
        Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6
      ) {
        dragged = true;
        blockedUntil = performance.now() + 350;
      }
    },
    up() {
      down = null;
    },
    accept(
      event: Pick<MouseEvent, 'target' | 'clientX' | 'clientY' | 'button'>,
    ) {
      return (
        event.target === canvas &&
        event.button === 0 &&
        !dragged &&
        performance.now() >= blockedUntil &&
        Number.isFinite(event.clientX) &&
        Number.isFinite(event.clientY)
      );
    },
  };
}
