import provenance from './data/event-terrain/provenance.json';
import type { GeoBounds, GeoPoint } from './geography';
/** Modern display windows, not historical event boundaries. */
export function eventTerrainWindow(point: GeoPoint) {
  return (
    provenance.outputs
      .filter(
        (w) =>
          point[0] >= w.bounds[0]! &&
          point[0] <= w.bounds[2]! &&
          point[1] >= w.bounds[1]! &&
          point[1] <= w.bounds[3]!,
      )
      .sort(
        (a, b) =>
          (a.bounds[2]! - a.bounds[0]!) * (a.bounds[3]! - a.bounds[1]!) -
          (b.bounds[2]! - b.bounds[0]!) * (b.bounds[3]! - b.bounds[1]!),
      )[0] ?? null
  );
}
export function eventTerrainBounds(point: GeoPoint): GeoBounds | null {
  const w = eventTerrainWindow(point);
  return w ? (w.bounds as unknown as GeoBounds) : null;
}
