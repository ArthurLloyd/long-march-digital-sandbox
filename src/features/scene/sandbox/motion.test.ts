import { describe, expect, it } from 'vitest';
import { clampProgress, modelDetail, samplePath } from './motion';
import type { Point3 } from './motion';
import { createTerrainSpace } from './terrain';
describe('regional sandbox movement', () => {
  const path: Point3[] = [
    [0, 0, 0],
    [3, 0, 0],
    [3, 0, 4],
  ];
  it('scrubbing backwards returns the same coordinates without accumulated simulation state', () => {
    const first = samplePath(path, 0.25);
    samplePath(path, 0.9);
    samplePath(path, 1);
    expect(samplePath(path, 0.25)).toEqual(first);
    expect(first?.position).toEqual([1.75, 0, 0]);
  });
  it('reaches exact supplied endpoints and handles empty/degenerate paths', () => {
    expect(samplePath(path, -1)?.position).toEqual([0, 0, 0]);
    expect(samplePath(path, 2)?.position).toEqual([3, 0, 4]);
    expect(samplePath([], 0)).toBeNull();
    expect(samplePath([[1, 2, 3]], 0.5)?.position).toEqual([1, 2, 3]);
    expect(
      samplePath(
        [
          [1, 2, 3],
          [1, 2, 3],
        ],
        1,
      )?.position,
    ).toEqual([1, 2, 3]);
    expect(clampProgress(NaN)).toBe(0);
  });
  it('keeps zoom detail stable between enter and exit thresholds', () => {
    expect(modelDetail(22, false)).toBe(true);
    expect(modelDetail(25, true)).toBe(true);
    expect(modelDetail(25, false)).toBe(false);
    expect(modelDetail(28, true)).toBe(false);
  });
  it('projects north toward negative z and samples the same height transform for markers and terrain', () => {
    const space = createTerrainSpace({
      meta: {
        bounds: [101, 29, 102, 30],
        size: 2,
        min: 0,
        max: 300,
        verticalExaggeration: 2,
      },
      heights: [0, 100, 200, 300],
    });
    const nw = space.project(101, 30),
      se = space.project(102, 29);
    expect(nw.x).toBe(-21);
    expect(nw.z).toBeLessThan(0);
    expect(se.x).toBe(21);
    expect(se.z).toBeGreaterThan(0);
    expect(se.y).toBeCloseTo(space.height(se.x, se.z));
    expect(nw.y).toBe(0.7);
  });
});
