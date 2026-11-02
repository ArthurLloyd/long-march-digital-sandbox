import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createEnvironmentDetails,
  scatterEnvironment,
} from './environment-details';

describe('artistic environment placement', () => {
  it('stays on valid land and remains deterministic across region revisits', () => {
    const height = (x: number, z: number) => 0.1 + x * 0.02 + z * 0.03;
    const allowed = (x: number, z: number) =>
      Math.abs(x) > 0.04 && Math.abs(z) < 0.4;
    const a = scatterEnvironment(42, 100, { x: 0, z: 0 }, 0.5, height, allowed);
    expect(a).toEqual(
      scatterEnvironment(42, 100, { x: 0, z: 0 }, 0.5, height, allowed),
    );
    expect(a).toHaveLength(100);
    expect(a.every((p) => allowed(p.x, p.z) && p.y === height(p.x, p.z))).toBe(
      true,
    );
  });
  it('rejects vertical cliffs and invalid elevation', () => {
    expect(
      scatterEnvironment(
        2,
        10,
        { x: 0, z: 0 },
        0.5,
        (x) => x * 10,
        () => true,
      ),
    ).toHaveLength(0);
    expect(
      scatterEnvironment(
        2,
        10,
        { x: 0, z: 0 },
        0.5,
        () => NaN,
        () => true,
      ),
    ).toHaveLength(0);
    expect(
      scatterEnvironment(
        2,
        10,
        { x: 0, z: 0 },
        0.5,
        () => 0,
        () => false,
      ),
    ).toHaveLength(0);
  });
  it('releases previous instance geometry and material on replacement and dispose', () => {
    const environment = createEnvironmentDetails();
    environment.populate(
      'luding',
      { x: 0, z: 0 },
      () => 0,
      () => true,
    );
    const old = [...environment.root.children] as THREE.InstancedMesh[];
    const disposed = old.map((mesh) => ({
      geometry: vi.spyOn(mesh.geometry, 'dispose'),
      material: vi.spyOn(mesh.material as THREE.Material, 'dispose'),
      instance: vi.spyOn(mesh, 'dispose'),
    }));
    environment.populate(
      'grass',
      { x: 0, z: 0 },
      () => 0,
      () => true,
    );
    expect(old.every((mesh) => !environment.root.children.includes(mesh))).toBe(
      true,
    );
    for (const spies of disposed)
      for (const spy of Object.values(spies))
        expect(spy).toHaveBeenCalledOnce();
    environment.dispose();
    expect(environment.root.children).toHaveLength(0);
    environment.dispose();
    expect(environment.root.children).toHaveLength(0);
  });
});
