// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { disposeLandscapeRoot } from '../app/landscape/resource-lifecycle';

describe('现代地形资源所有权', () => {
  it('无河流区域也释放未挂接水材质，共享几何和材质只释放一次', () => {
    const scene = new THREE.Scene(),
      root = new THREE.Group(),
      geometry = new THREE.PlaneGeometry(1, 1),
      land = new THREE.MeshStandardMaterial(),
      water = new THREE.MeshPhysicalMaterial();
    root.add(new THREE.Mesh(geometry, land), new THREE.Mesh(geometry, land));
    scene.add(root);
    const groundDisposed = vi.spyOn(geometry, 'dispose'),
      landDisposed = vi.spyOn(land, 'dispose'),
      waterDisposed = vi.spyOn(water, 'dispose');
    disposeLandscapeRoot(root, [land, water]);
    expect(groundDisposed).toHaveBeenCalledTimes(1);
    expect(landDisposed).toHaveBeenCalledTimes(1);
    expect(waterDisposed).toHaveBeenCalledTimes(1);
    expect(root.parent).toBeNull();
    expect(root.children).toHaveLength(0);
    expect(scene.children).toHaveLength(0);
  });
});
