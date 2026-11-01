import { describe, expect, it } from 'vitest';
import {
  riverRibbon,
  channelCarver,
  createRiverChannel,
} from '../app/panorama/river-mesh';
import {
  createTerrainField,
  blendDetailHeight,
} from '../app/panorama/terrain-field';

describe('现代地形显示与有体积水体', () => {
  it('水面有横向宽度和三角网格，河床具有独立深度剖面', () => {
    const points = [
      { x: 0, z: 0 },
      { x: 0, z: 1 },
      { x: 0.2, z: 2 },
    ];
    const before = JSON.stringify(points),
      water = riverRibbon(points, () => 1, 0.01),
      bed = riverRibbon(points, () => 1, 0.01, true);
    const p = water.getAttribute('position'),
      b = bed.getAttribute('position');
    expect(water.index!.count).toBe(48);
    expect(
      Math.hypot(p.getX(0) - p.getX(4), p.getZ(0) - p.getZ(4)),
    ).toBeCloseTo(0.02, 5);
    expect(b.getY(2)).toBeLessThan(p.getY(2));
    expect(b.getY(0)).toBeGreaterThan(b.getY(2));
    expect(JSON.stringify(points)).toBe(before);
    water.dispose();
    bed.dispose();
  });
  it('岸线只影响附近显示网格，远处不产生凭空河槽', () => {
    const carve = channelCarver(
      [
        [
          { x: 0, z: 0 },
          { x: 0, z: 1 },
        ],
      ],
      0.01,
      0.004,
    );
    expect(carve(0, 0.5)).toBeCloseTo(0.004, 6);
    expect(carve(0.009, 0.5)).toBeLessThan(carve(0, 0.5));
    expect(carve(0.1, 0.5)).toBe(0);
  });
  it('现代水面与河槽共享连续剖面，两岸外不改写地形或原中心线', () => {
    const source = [
        [
          { x: 0, z: 0 },
          { x: 0, z: 0.4 },
          { x: 0.02, z: 0.8 },
        ],
      ],
      before = JSON.stringify(source);
    const channel = createRiverChannel(
      source,
      (x, z) => 1 + Math.abs(x) * 0.8 + z * 0.01,
      0.01,
      0.004,
    );
    expect(channel.paths[0]!.length).toBeGreaterThan(source[0]!.length);
    for (const p of channel.paths[0]!) {
      expect(channel.surface(p.x, p.z)).toBeLessThan(p.level);
      expect(p.width).toBeGreaterThan(0.008);
      expect(p.width).toBeLessThan(0.013);
    }
    expect(channel.surface(0.3, 0.4)).toBeCloseTo(1.244, 5);
    expect(JSON.stringify(source)).toBe(before);
  });
  it('原始高程不变，1× 没有额外夸张，艺术增强降低孤立尖峰而不补造历史位置', () => {
    const source = {
      bounds: [105, 27, 106, 28],
      cols: 3,
      rows: 3,
      heights: [100, 100, 100, 100, 500, 100, 100, 100, 100],
    };
    const before = JSON.stringify(source),
      field = createTerrainField(source);
    const [left, top, right, bottom] = field.worldBounds,
      x = (left + right) / 2,
      z = (top + bottom) / 2;
    expect(field.metres(x, z)).toBeCloseTo(500, 5);
    expect(field.height(x, z, 12)).toBeLessThan(field.height(x, z, 1) * 12);
    expect(field.height(x, z, 12)).toBeGreaterThan(field.height(x, z, 1));
    expect(JSON.stringify(source)).toBe(before);
    expect(blendDetailHeight(field, left, top, 12, () => 0.2)).toBeCloseTo(
      0.2,
      6,
    );
    expect(blendDetailHeight(field, left - 1, top, 12, () => 0.2)).toBe(0.2);
  });
});
