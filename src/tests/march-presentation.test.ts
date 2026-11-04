import * as THREE from 'three';
import { expect, it } from 'vitest';
import {
  createGroundArrow,
  drapeGroundArrow,
  marchPanNeeded,
  MARCH_PRESENTATION,
  clearMarchSightline,
} from '../app/landscape/march-presentation';

it('lets the arrow travel within the central half before starting an overview pan', () => {
  expect(marchPanNeeded(0.49, -0.49)).toBe(false);
  expect(marchPanNeeded(0.51, 0)).toBe(true);
  expect(marchPanNeeded(0, -0.51)).toBe(true);
  expect(marchPanNeeded(-0.51, 0)).toBe(true);
});

it('bends the complete long arrow over a nonplanar hillside with the same clearance at every vertex', () => {
  const arrow = createGroundArrow();
  const hill = (x: number, z: number) =>
    0.15 + 2 * x * x + Math.sin(z * 35) * 0.03;
  drapeGroundArrow(
    arrow,
    new THREE.Vector3(0.02, 0, 0.03),
    new THREE.Vector3(0.6, 0, 0.8),
    0.12,
    hill,
  );
  const p = arrow.geometry.getAttribute('position');
  expect(p.count).toBeGreaterThan(80);
  const heights = [];
  for (let i = 0; i < p.count; i++) {
    heights.push(p.getY(i));
    expect(p.getY(i) - hill(p.getX(i), p.getZ(i))).toBeCloseTo(
      MARCH_PRESENTATION.groundLift,
      6,
    );
  }
  expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.003);
  expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
  arrow.geometry.dispose();
});

it('clears the near side camera sightline over a ridge without pulling its horizontal position away', () => {
  const ground = (x: number) => Math.max(0, 0.06 - Math.abs(x - 0.06));
  const target = new THREE.Vector3(0, 0.0012, 0),
    eye = new THREE.Vector3(0.15, 0.06, 0.03);
  clearMarchSightline(eye, target, ground);
  expect(eye.x).toBe(0.15);
  expect(eye.z).toBe(0.03);
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    expect(target.y + (eye.y - target.y) * t + 1e-9).toBeGreaterThanOrEqual(
      ground(eye.x * t) + MARCH_PRESENTATION.groundLift,
    );
  }
});
