import { describe, expect, it } from 'vitest';
import { composeTerrainView } from '../app/panorama/camera-composition';

describe('现代地形电影取景', () => {
  it('沿完整视线避让前景山体，而不是只抬高相机端点', () => {
    const ground = (x: number, z: number) =>
      Math.abs(x) < 0.04 && z > 0.05 && z < 0.14 ? 0.24 : 0;
    const pose = composeTerrainView(
      { x: 0, z: 0, y: 0 },
      { x: 0, z: 1 },
      ground,
    );
    for (let i = 2; i <= 48; i++) {
      const t = i / 48,
        x = pose.target[0] + (pose.position[0] - pose.target[0]) * t,
        z = pose.target[2] + (pose.position[2] - pose.target[2]) * t;
      const y = pose.target[1] + (pose.position[1] - pose.target[1]) * t;
      expect(y).toBeGreaterThanOrEqual(ground(x, z) + 0.0079);
    }
    expect(Math.hypot(pose.position[0], pose.position[2])).toBeLessThanOrEqual(
      0.47,
    );
    expect(pose.position[1]).toBeLessThan(0.2);
  });
});
