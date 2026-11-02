import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  reliefBlockGeometry,
  composeReliefEntry,
  composeRegionalView,
} from '../app/landscape/relief-block';

describe('现代总图外缘与区域构图', () => {
  it('瑞金区域内定位比区域中景近一级，仍保留周边地表', () => {
    const region = composeRegionalView(
      [-1.5, -1.7, 1.5, 1.7],
      { x: 0, z: 0 },
      () => 0.1,
    );
    const place = composeRegionalView(
      [-1.5, -1.7, 1.5, 1.7],
      { x: 0, z: 0 },
      () => 0.1,
      0.68,
    );
    const distance = (pose: typeof region) =>
      Math.hypot(
        pose.position[0] - pose.target[0],
        pose.position[2] - pose.target[2],
      );
    expect(distance(place)).toBeLessThan(distance(region));
    expect(distance(place)).toBeGreaterThan(1.3);
  });
  it('点击区域使用中景，沿整条视线避障而非贴近山峰', () => {
    const height = (x: number, z: number) =>
      x > 0.1 && x < 0.3 && z > 0.3 && z < 0.6 ? 0.7 : 0.1;
    const pose = composeRegionalView(
      [-1.5, -1.7, 1.5, 1.7],
      { x: 0, z: 0 },
      height,
    );
    const distance = Math.hypot(
      pose.position[0] - pose.target[0],
      pose.position[2] - pose.target[2],
    );
    expect(distance).toBeGreaterThan(2);
    expect(distance).toBeLessThan(3);
    for (let i = 1; i <= 48; i++) {
      const t = i / 48;
      expect(
        pose.target[1] + (pose.position[1] - pose.target[1]) * t,
      ).toBeGreaterThanOrEqual(
        height(
          pose.target[0] + (pose.position[0] - pose.target[0]) * t,
          pose.target[2] + (pose.position[2] - pose.target[2]) * t,
        ) + 0.0249,
      );
    }
  });
  it('侧壁上缘与实际地表相连、下缘同底，转角与封底没有缺段', () => {
    const height = (x: number, z: number) => 0.3 + x * 0.1 + z * 0.2;
    const geometry = reliefBlockGeometry([0, 0, 2, 3], height, -0.4, 8);
    const p = geometry.getAttribute('position');
    const edges = new Map<string, number>();
    for (let i = 0; i < 32; i++) {
      const base = i * 6,
        rim = base + 5;
      expect(p.getY(base)).toBeCloseTo(-0.4);
      expect(p.getY(rim)).toBeCloseTo(height(p.getX(rim), p.getZ(rim)));
    }
    const index = geometry.index!;
    for (let i = 0; i < index.count; i += 3) {
      const triangle = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      expect(Math.max(...triangle)).toBeLessThan(p.count);
      for (let e = 0; e < 3; e++) {
        const key = [triangle[e]!, triangle[(e + 1) % 3]!]
          .sort((a, b) => a - b)
          .join(':');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    // Only the open top rim remains: the real terrain supplies its cap.
    expect([...edges.values()].filter((n) => n === 1)).toHaveLength(32);
    expect([...edges.values()].every((n) => n === 1 || n === 2)).toBe(true);
    geometry.dispose();
  });
  it.each([1920 / 936, 1440 / 756, 1366 / 624])(
    '横向构图保持区域在右侧且视角低于30度，aspect=%s',
    (aspect) => {
      const bounds = [-1.5, -1.7, 1.5, 1.7] as const;
      const pose = composeReliefEntry(bounds, () => 0.5, aspect);
      const camera = new THREE.PerspectiveCamera(43, aspect, 0.02, 160);
      camera.position.fromArray(pose.position);
      camera.lookAt(new THREE.Vector3(...pose.target));
      camera.updateMatrixWorld();
      const center = new THREE.Vector3(0, 0.2, 0).project(camera);
      expect((center.x + 1) / 2).toBeGreaterThan(0.64);
      expect((center.x + 1) / 2).toBeLessThan(0.77);
      const offset = new THREE.Vector3(...pose.position).sub(
        new THREE.Vector3(...pose.target),
      );
      expect(
        (Math.atan2(offset.y, Math.hypot(offset.x, offset.z)) * 180) / Math.PI,
      ).toBeLessThan(30);
      // This is a zoom INTO a continuous map. The regional window need not fit
      // inside the frame as a standalone block; the focus remains to the right.
    },
  );
});
