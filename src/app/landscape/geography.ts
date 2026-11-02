import raw from './data/modern-geography.json';

export type GeoPoint = readonly [number, number];
export type GeoBounds = readonly [number, number, number, number];
export const geography = raw;
export const COVERAGE = raw.bounds as unknown as GeoBounds;
export const METRES_PER_WORLD_UNIT = 100_000;
export const VERTICAL_EXAGGERATION = raw.verticalExaggeration;
const radius = 6_378_137;
export function mercator([longitude, latitude]: GeoPoint): [number, number] {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    Math.abs(longitude) > 180 ||
    Math.abs(latitude) > 85
  )
    throw new Error('现代地理坐标超出支持范围');
  return [
    (radius * longitude * Math.PI) / 180,
    radius * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)),
  ];
}
const upperLeft = mercator([COVERAGE[0], COVERAGE[3]]);
const lowerRight = mercator([COVERAGE[2], COVERAGE[1]]);
export const MAP_WIDTH = (lowerRight[0] - upperLeft[0]) / METRES_PER_WORLD_UNIT;
export const MAP_DEPTH = (upperLeft[1] - lowerRight[1]) / METRES_PER_WORLD_UNIT;
export function projectGeo(point: GeoPoint): [number, number] {
  const [x, y] = mercator(point);
  return [
    (x - (upperLeft[0] + lowerRight[0]) / 2) / METRES_PER_WORLD_UNIT,
    ((upperLeft[1] + lowerRight[1]) / 2 - y) / METRES_PER_WORLD_UNIT,
  ];
}
export function unprojectGeo([x, z]: GeoPoint): [number, number] {
  const east = x * METRES_PER_WORLD_UNIT + (upperLeft[0] + lowerRight[0]) / 2;
  const north = (upperLeft[1] + lowerRight[1]) / 2 - z * METRES_PER_WORLD_UNIT;
  return [
    ((east / radius) * 180) / Math.PI,
    ((2 * Math.atan(Math.exp(north / radius)) - Math.PI / 2) * 180) / Math.PI,
  ];
}
export function inCoverage(point: GeoPoint) {
  return (
    point[0] >= COVERAGE[0] &&
    point[0] <= COVERAGE[2] &&
    point[1] >= COVERAGE[1] &&
    point[1] <= COVERAGE[3]
  );
}
export function heightAt(
  x: number,
  z: number,
  exaggeration = VERTICAL_EXAGGERATION,
) {
  const col = Math.max(
    0,
    Math.min(raw.cols - 1, (x / MAP_WIDTH + 0.5) * (raw.cols - 1)),
  );
  const row = Math.max(
    0,
    Math.min(raw.rows - 1, (z / MAP_DEPTH + 0.5) * (raw.rows - 1)),
  );
  const c = Math.floor(col),
    r = Math.floor(row),
    dx = col - c,
    dy = row - r;
  const at = (i: number, j: number) =>
    raw.heights[
      Math.min(raw.rows - 1, j) * raw.cols + Math.min(raw.cols - 1, i)
    ] ?? 0;
  const metres =
    (at(c, r) * (1 - dx) + at(c + 1, r) * dx) * (1 - dy) +
    (at(c, r + 1) * (1 - dx) + at(c + 1, r + 1) * dx) * dy;
  const latitude = (unprojectGeo([x, z])[1] * Math.PI) / 180;
  return (
    (Math.max(0, metres) / METRES_PER_WORLD_UNIT / Math.cos(latitude)) *
    exaggeration
  );
}
export function regionCenter(bounds: GeoBounds): GeoPoint {
  return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
}
