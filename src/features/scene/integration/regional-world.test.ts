import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildRegionalArtWorld, createRegionalWorld } from './regional-world';
import type { RegionId } from '../atlas/regions';
import { immersiveFieldOfView } from './camera-framing';

const regions: RegionId[] = [
  'ruijin',
  'zunyi',
  'chishui',
  'jinsha',
  'snow',
  'grass',
  'reunion',
];

describe('inhabited regional artistic spaces', () => {
  it.each(regions)(
    '%s has visible representative figures, finite viewpoints and meaningful landmarks',
    (region) => {
      const world = buildRegionalArtWorld(region);
      const company = world.group.getObjectByName('MarchingCompany')!;
      expect(company).toBeDefined();
      const bodies = company.getObjectByName('Tunic') as THREE.InstancedMesh;
      const heads = company.getObjectByName('Head') as THREE.InstancedMesh;
      expect(bodies.count).toBe(18);
      expect(heads.material).not.toBe(bodies.material);
      expect(company.getObjectByName('CapBadge')).toBeDefined();
      for (const view of Object.values(world.focus)) {
        expect(view.position.toArray().every(Number.isFinite)).toBe(true);
        expect(view.target.toArray().every(Number.isFinite)).toBe(true);
        expect(view.position.distanceTo(view.target)).toBeGreaterThan(3);
      }
      // Establish the environment first, while keeping the full company clear
      // of the reading panel in both desktop and portrait layouts.
      for (const aspect of [16 / 9, 390 / 844]) {
        const camera = new THREE.PerspectiveCamera(
          immersiveFieldOfView(aspect),
          aspect,
          0.1,
          420,
        );
        camera.position.copy(world.focus.arrival.position);
        camera.lookAt(world.focus.arrival.target);
        camera.updateMatrixWorld();
        for (let index = 0; index < heads.count; index++) {
          const matrix = new THREE.Matrix4();
          heads.getMatrixAt(index, matrix);
          const head = new THREE.Vector3().setFromMatrixPosition(matrix);
          const feet = head.clone().add(new THREE.Vector3(0, -1.61, 0));
          head.project(camera);
          feet.project(camera);
          expect(Math.abs(head.x)).toBeLessThan(0.9);
          expect((1 - head.y) / 2).toBeGreaterThan(0.2);
          expect((1 - feet.y) / 2).toBeLessThan(0.63);
          expect((head.y - feet.y) / 2).toBeLessThan(0.12);
          expect((head.y - feet.y) / 2).toBeGreaterThan(0.01);
        }
      }
      expect(world.hotspots.map((spot) => spot.id)).toEqual([
        'terrain',
        'people',
        'detail',
      ]);
      if (region === 'ruijin' || region === 'zunyi')
        expect(
          world.group.getObjectByName('ArtisticVillageHouse'),
        ).toBeDefined();
      if (region === 'chishui' || region === 'jinsha')
        expect(world.group.getObjectByName('ArtisticFerry')).toBeDefined();
      world.dispose();
    },
  );

  it('freezes people at the last pose when paused and releases shared GPU resources only once', () => {
    const world = buildRegionalArtWorld('grass');
    world.update(8, true);
    const company = world.group.getObjectByName('MarchingCompany')!;
    const sleeves = company.getObjectByName('Sleeve') as THREE.InstancedMesh;
    const snapshot = [...sleeves.instanceMatrix.array];
    world.update(8, false);
    expect([...sleeves.instanceMatrix.array]).toEqual(snapshot);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    world.group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        geometries.add(object.geometry);
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((material) => materials.add(material));
      }
    });
    const disposals = [...geometries, ...materials].map((resource) =>
      vi.spyOn(resource, 'dispose'),
    );
    const instanceDisposal = vi.spyOn(sleeves, 'dispose');
    world.dispose();
    world.dispose();
    expect(world.group.children).toHaveLength(0);
    for (const disposal of disposals) expect(disposal).toHaveBeenCalledOnce();
    expect(instanceDisposal).toHaveBeenCalledOnce();
    expect(() => world.update(10, true)).not.toThrow();
  });

  it('rejects arbitrary and inherited object keys without creating a renderer', () => {
    const host = document.createElement('div');
    expect(() => createRegionalWorld(host, 'unknown')).toThrow('未知区域');
    expect(() => createRegionalWorld(host, '__proto__')).toThrow('未知区域');
    expect(host.children).toHaveLength(0);
  });
});
