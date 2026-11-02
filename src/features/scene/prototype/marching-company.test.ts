import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { bridgeDeckHeight, createMarchingCompany } from './marching-company';

describe('bridge company timeline', () => {
  it('renders instanced figures at the same transforms as the editable model', () => {
    const editable = createMarchingCompany(bridgeDeckHeight);
    const instanced = createMarchingCompany(bridgeDeckHeight, true);
    editable.update(0.65, true);
    instanced.update(0.65, true);
    editable.group.updateMatrixWorld(true);
    const expected = editable.group
      .getObjectByName('Marcher_01')!
      .getObjectByName('Tunic')!.matrixWorld;
    const matrix = new THREE.Matrix4();
    (
      instanced.group.getObjectByName('Tunic') as THREE.InstancedMesh
    ).getMatrixAt(0, matrix);
    matrix.elements.forEach((value, i) =>
      expect(value).toBeCloseTo(expected.elements[i]!, 5),
    );
  });
  it('returns every figure to the same position after forward and reverse scrubbing', () => {
    const company = createMarchingCompany(bridgeDeckHeight);
    company.update(0.5, true);
    const midpoint = company.positions();
    company.update(1, true);
    company.update(0, true);
    company.update(0.5, false);
    expect(company.positions()).toEqual(midpoint);
    expect(midpoint).toHaveLength(18);
    for (const [x, y, z] of midpoint) {
      expect(y).toBeCloseTo(bridgeDeckHeight(x!), 8);
      expect(z!).toBeGreaterThan(-10.15);
      expect(z!).toBeLessThan(-5.85);
    }
  });
  it('keeps invalid progress finite and clamps to bridge approach endpoints', () => {
    const company = createMarchingCompany(bridgeDeckHeight);
    company.update(NaN, true);
    expect(company.positions()[0]?.[0]).toBe(-25);
    company.update(9, true);
    expect(company.positions()[0]?.[0]).toBe(25);
    expect(company.positions().flat().every(Number.isFinite)).toBe(true);
  });
});
