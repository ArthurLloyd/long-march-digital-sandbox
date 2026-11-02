import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createJourneyTorch } from '../app/landscape/journey-torch';
import { projectGeo } from '../app/landscape/geography';

describe('地图火炬的显示边界与资源', () => {
  it('使用给定位置和同一地表，入场大、行进小；未知和越界位置隐藏', () => {
    const torch = createJourneyTorch();
    expect(torch.root.visible).toBe(false);
    torch.setMarker({
      coordinates: [115.75, 25.9],
      kind: 'origin',
      prominent: true,
    });
    torch.update(0, 4, () => 0.35, true);
    const [x, z] = projectGeo([115.75, 25.9]);
    expect(torch.root.position.x).toBeCloseTo(x);
    expect(torch.root.position.z).toBeCloseTo(z);
    expect(torch.root.position.y).toBeCloseTo(0.365);
    const entrySize = torch.root.scale.x;
    torch.setMarker({
      coordinates: [115.75, 25.9],
      kind: 'force',
      prominent: false,
    });
    torch.update(0, 4, () => 0.35, true);
    expect(torch.root.scale.x).toBeLessThan(entrySize);
    torch.setMarker({ coordinates: [0, 0], kind: 'force', prominent: false });
    expect(torch.root.visible).toBe(false);
    torch.setMarker(null);
    expect(torch.root.visible).toBe(false);
    torch.dispose();
  });
  it('减少动态时悬浮保持静止，退出仅释放每个共享几何一次', () => {
    const torch = createJourneyTorch();
    torch.setMarker({
      coordinates: [115.75, 25.9],
      kind: 'origin',
      prominent: true,
    });
    torch.update(1, 4, () => 0, true);
    const sculpture = torch.root.children[0]!;
    const y = sculpture.position.y;
    torch.update(5, 4, () => 0, true);
    expect(sculpture.position.y).toBe(y);
    torch.update(2, 4, () => 0, false);
    expect(sculpture.position.y).not.toBe(y);
    const geometries = new Set<THREE.BufferGeometry>();
    torch.root.traverse((object) => {
      if (object instanceof THREE.Mesh) geometries.add(object.geometry);
    });
    const spies = [...geometries].map((geometry) =>
      vi.spyOn(geometry, 'dispose'),
    );
    torch.dispose();
    torch.dispose();
    spies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
    expect(torch.root.children).toHaveLength(0);
    expect(torch.root.visible).toBe(false);
  });
});
