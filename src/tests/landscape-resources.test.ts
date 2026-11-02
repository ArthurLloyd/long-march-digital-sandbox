// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { disposeLandscapeRoot } from '../app/landscape/resource-lifecycle';
import { createExhibitionAtmosphere } from '../app/landscape/exhibition-atmosphere';
import { waterMaterial } from '../app/landscape/terrain-materials';

describe('现代地形资源所有权', () => {
  it('水体显式绑定共享环境，保留独立反射强度且不抢占贴图释放权', () => {
    const scene = new THREE.Scene(),
      environment = new THREE.Texture();
    scene.environment = environment;
    scene.environmentIntensity = 0.5;
    const textureDisposed = vi.spyOn(environment, 'dispose');
    const { material } = waterMaterial(
      createExhibitionAtmosphere([-1, -1, 1, 1]),
      environment,
    );
    // Three uses scene intensity for a null envMap. Keep the water's binding
    // explicit without allocating or disposing a second environment texture.
    expect(material.envMap).toBe(scene.environment);
    expect(material.envMapIntensity).toBeGreaterThan(
      scene.environmentIntensity,
    );
    material.dispose();
    expect(textureDisposed).not.toHaveBeenCalled();
    environment.dispose();
    expect(textureDisposed).toHaveBeenCalledTimes(1);
  });
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
