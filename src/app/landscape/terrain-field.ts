import {
  heightAt as globalHeight,
  projectGeo,
  unprojectGeo,
  type GeoBounds,
} from './geography';

export interface ModernHeightfield {
  bounds: number[];
  cols: number;
  rows: number;
  heights: number[];
  id?: string;
}
export interface TerrainField {
  worldBounds: GeoBounds;
  contains(x: number, z: number): boolean;
  metres(x: number, z: number): number;
  height(x: number, z: number, gain: number): number;
}
/** Raw source remains intact. Smoothing affects artistic display only. */
export function createTerrainField(data: ModernHeightfield): TerrainField {
  if (
    data.heights.length !== data.cols * data.rows ||
    data.cols < 2 ||
    data.rows < 2
  )
    throw new Error('现代地形网格不完整');
  const [west, south, east, north] = data.bounds as [
    number,
    number,
    number,
    number,
  ];
  const [left, top] = projectGeo([west, north]),
    [right, bottom] = projectGeo([east, south]);
  const smooth = new Float32Array(data.heights.length);
  const datum =
    data.heights.reduce((sum, value) => sum + Math.max(0, value), 0) /
    data.heights.length;
  for (let row = 0; row < data.rows; row++)
    for (let col = 0; col < data.cols; col++) {
      let total = 0,
        weight = 0;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const x = Math.min(data.cols - 1, Math.max(0, col + dx)),
            y = Math.min(data.rows - 1, Math.max(0, row + dy));
          const w = Math.exp(-(dx * dx + dy * dy) / 2.4);
          total += (data.heights[y * data.cols + x] ?? 0) * w;
          weight += w;
        }
      smooth[row * data.cols + col] = total / weight;
    }
  const sample = (values: ArrayLike<number>, x: number, z: number) => {
    const c = Math.min(
        data.cols - 1,
        Math.max(0, ((x - left) / (right - left)) * (data.cols - 1)),
      ),
      r = Math.min(
        data.rows - 1,
        Math.max(0, ((z - top) / (bottom - top)) * (data.rows - 1)),
      );
    const i = Math.floor(c),
      j = Math.floor(r),
      dx = c - i,
      dy = r - j;
    const at = (a: number, b: number) =>
      values[
        Math.max(0, Math.min(data.rows - 1, b)) * data.cols +
          Math.max(0, Math.min(data.cols - 1, a))
      ] ?? 0;
    // Bicubic display sampling avoids grid-shaped ridge corners. Clamp to the
    // source neighbourhood so the renderer cannot invent elevation extremes.
    const cubic = (a: number, b: number, c: number, d: number, t: number) =>
      b +
      0.5 *
        t *
        (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
    let a0 = 0,
      a1 = 0,
      a2 = 0,
      a3 = 0,
      low = Infinity,
      high = -Infinity;
    for (let row = -1; row <= 2; row++) {
      const a = at(i - 1, j + row),
        b = at(i, j + row),
        c = at(i + 1, j + row),
        d = at(i + 2, j + row);
      low = Math.min(low, a, b, c, d);
      high = Math.max(high, a, b, c, d);
      const value = cubic(a, b, c, d, dx);
      if (row === -1) a0 = value;
      else if (row === 0) a1 = value;
      else if (row === 1) a2 = value;
      else a3 = value;
    }
    return Math.max(low, Math.min(high, cubic(a0, a1, a2, a3, dy)));
  };
  return {
    worldBounds: [left, top, right, bottom],
    contains: (x, z) => x >= left && x <= right && z >= top && z <= bottom,
    metres: (x, z) => Math.max(0, sample(data.heights, x, z)),
    height(x, z, gain) {
      const raw = Math.max(0, sample(data.heights, x, z));
      const broad = Math.max(0, sample(smooth, x, z));
      // Continental height enhancement cannot be applied literally to every
      // local hill: it turns a valley into a vertical slot. Keep the regional
      // datum aligned, but adapt local relief to the cinematic viewing scale.
      const relief = gain;
      const visual =
        gain === 1
          ? raw
          : data.id
            ? datum * gain +
              (broad - datum) * relief +
              (raw - broad) * Math.min(relief, 4)
            : broad * gain + (raw - broad) * Math.min(gain, 2);
      return (
        Math.max(0, visual) /
        100000 /
        Math.cos((unprojectGeo([x, z])[1] * Math.PI) / 180)
      );
    },
  };
}
export function blendDetailHeight(
  field: TerrainField,
  x: number,
  z: number,
  gain: number,
  base: (x: number, z: number, gain: number) => number = globalHeight,
) {
  if (!field.contains(x, z)) return base(x, z, gain);
  const [left, top, right, bottom] = field.worldBounds;
  const edge = Math.min(
    (x - left) / (right - left),
    (right - x) / (right - left),
    (z - top) / (bottom - top),
    (bottom - z) / (bottom - top),
  );
  const t = Math.min(1, Math.max(0, edge / 0.28));
  if (t === 1) return field.height(x, z, gain);
  const mix = t * t * (3 - 2 * t);
  return base(x, z, gain) * (1 - mix) + field.height(x, z, gain) * mix;
}
