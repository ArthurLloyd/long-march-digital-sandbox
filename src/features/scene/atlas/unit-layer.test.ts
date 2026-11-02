import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createUnitLayer } from './unit-layer';

describe('unit detail and phase replacement', () => {
  it('changes far symbol to near model with hysteresis, retaining one identity', () => {
    const layer = createUnitLayer(() => 0.2);
    layer.set([
      {
        id: 'synthetic-unit',
        name: '工程样本',
        camp: 'other',
        point: [102, 30],
        region: null,
        precision: 'schematic',
      },
    ]);
    const unit = layer.group.getObjectByName('synthetic-unit')!;
    const camera = new THREE.PerspectiveCamera();
    const at = (distance: number) => {
      camera.position
        .copy(unit.position)
        .add(new THREE.Vector3(0, distance, 0));
      layer.update(camera);
    };
    at(2);
    expect(unit.children.map((o) => o.visible)).toEqual([true, false]);
    at(0.5);
    expect(unit.children.map((o) => o.visible)).toEqual([false, true]);
    at(0.8);
    expect(unit.children.map((o) => o.visible)).toEqual([false, true]);
    at(1.1);
    expect(unit.children.map((o) => o.visible)).toEqual([true, false]);
    const geometry = (unit.children[0]!.children[0] as THREE.Mesh).geometry;
    const dispose = vi.spyOn(geometry, 'dispose');
    layer.set([]);
    expect(layer.group.children).toHaveLength(0);
    expect(dispose).toHaveBeenCalledOnce();
    layer.dispose();
  });
});
