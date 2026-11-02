import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createEnvironmentDetails } from '../features/scene';
import { createTerrainField } from '../app/landscape/terrain-field';
import { createRiverChannel } from '../app/landscape/river-mesh';

describe('A 环境模块接入 C 同一现代地表', () => {
  it('真实实例使用 C 的地表高程，避开同一水槽，替换与退出由原 A 模块释放', () => {
    // Isolated modern engineering sample; never historical production data.
    const field = createTerrainField({
      id: 'ruijin',
      bounds: [114.5, 24.5, 117, 27.3],
      cols: 3,
      rows: 3,
      heights: [100, 150, 200, 150, 200, 250, 200, 250, 300],
    });
    const b = field.worldBounds,
      center = { x: (b[0] + b[2]) / 2, z: (b[1] + b[3]) / 2 };
    const channel = createRiverChannel(
      [
        [
          { x: center.x, z: center.z - 1 },
          { x: center.x, z: center.z + 1 },
        ],
      ],
      (x, z) => field.height(x, z, 12),
      0.025,
      0.0035,
    );
    const environment = createEnvironmentDetails();
    environment.populate('ruijin', center, channel.surface, (x, z) => {
      const water = channel.at(x, z);
      return (
        field.contains(x, z) && (!water || water.distance > water.width * 1.8)
      );
    });
    expect(environment.root.children.length).toBeGreaterThan(0);
    const matrix = new THREE.Matrix4(),
      p = new THREE.Vector3();
    for (const mesh of environment.root.children as THREE.InstancedMesh[])
      for (
        let i = 0;
        i < mesh.count;
        i += Math.max(1, Math.floor(mesh.count / 16))
      ) {
        mesh.getMatrixAt(i, matrix);
        p.setFromMatrixPosition(matrix);
        expect(field.contains(p.x, p.z)).toBe(true);
        const water = channel.at(p.x, p.z);
        expect(!water || water.distance > water.width * 1.79).toBe(true);
        expect(Math.abs(p.y - channel.surface(p.x, p.z))).toBeLessThan(0.006);
      }
    environment.dispose();
    expect(environment.root.children).toHaveLength(0);
  });
});
