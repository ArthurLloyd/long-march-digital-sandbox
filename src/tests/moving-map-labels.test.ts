import { expect, it } from 'vitest';
import { layoutMovingMapLabels } from '../app/landscape/event-marker-layout';
import { intersectsMapRect } from '../app/landscape/map-safe-area';
import {
  combineTerrainFields,
  type TerrainField,
} from '../app/landscape/terrain-field';

it('keeps moving labels near their own tip, clear of events and other units in the same frame', () => {
  const sizes = new Map([
    ['red', { width: 150, height: 28 }],
    ['blue', { width: 140, height: 28 }],
  ]);
  const event = { x: 520, y: 290, width: 200, height: 42 };
  const first = layoutMovingMapLabels(
    [
      { id: 'red', x: 500, y: 300, visible: true },
      { id: 'blue', x: 480, y: 330, visible: true },
    ],
    { width: 1200, height: 800 },
    sizes,
    [event],
    new Set(['red']),
  );
  const boxes = first
    .filter((p) => p.visible)
    .map((p) => ({ x: p.labelX, y: p.labelY, ...sizes.get(p.id)! }));
  expect(boxes).toHaveLength(2);
  expect(boxes.every((b) => !intersectsMapRect(b, event, 6))).toBe(true);
  expect(intersectsMapRect(boxes[0]!, boxes[1]!, 6)).toBe(false);
  for (const p of first) {
    const size = sizes.get(p.id)!;
    const edgeDistance = Math.hypot(
      Math.max(p.labelX - p.x, p.x - p.labelX - size.width, 0),
      Math.max(p.labelY - p.y, p.y - p.labelY - size.height, 0),
    );
    expect(edgeDistance).toBeLessThan(35);
  }
  const moved = layoutMovingMapLabels(
    [{ id: 'red', x: 800, y: 400, visible: true }],
    { width: 1200, height: 800 },
    sizes,
    [],
  )[0]!;
  expect(moved.labelX).toBeGreaterThan(800);
  expect(moved.labelY).toBeGreaterThanOrEqual(400);
});

it('does not leave a visible stale label for an offscreen arrow', () => {
  expect(
    layoutMovingMapLabels(
      [{ id: 'red', x: 500, y: 300, visible: false }],
      { width: 1200, height: 800 },
      new Map(),
      [],
    )[0]!.visible,
  ).toBe(false);
});

it('joins Zunyi and Chishui source surfaces without holes or extra source extrema', () => {
  const field = (
    bounds: TerrainField['worldBounds'],
    value: number,
  ): TerrainField => ({
    worldBounds: bounds,
    contains: (x, z) =>
      x >= bounds[0] && x <= bounds[2] && z >= bounds[1] && z <= bounds[3],
    metres: () => value,
    height: () => value / 1000,
  });
  const a = field([0, 0, 2, 2], 100),
    b = field([1, 0, 3, 2], 200),
    combined = combineTerrainFields([a, b]);
  expect(combined.worldBounds).toEqual([0, 0, 3, 2]);
  expect(combined.metres(0.5, 1)).toBe(100);
  expect(combined.metres(2.5, 1)).toBe(200);
  for (let x = 0; x <= 3; x += 0.05) {
    expect(combined.contains(x, 1)).toBe(true);
    expect(combined.height(x, 1, 12)).toBeGreaterThanOrEqual(0.1);
    expect(combined.height(x, 1, 12)).toBeLessThanOrEqual(0.2);
  }
  expect(a.worldBounds).toEqual([0, 0, 2, 2]);
});
