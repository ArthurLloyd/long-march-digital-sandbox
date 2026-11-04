import * as THREE from 'three';
import { projectGeo, unprojectGeo, type GeoPoint } from './geography';
import { REGIONS, type RegionId } from './map-regions';

/** Resolve overlapping modern view windows explicitly, never by object order. */
export function geographicRegionAt(
  point: GeoPoint,
  preferred?: RegionId | null,
) {
  const inside = (id: RegionId) => {
    const b = REGIONS[id];
    return (
      point[0] >= b[0] &&
      point[0] <= b[2] &&
      point[1] >= b[1] &&
      point[1] <= b[3]
    );
  };
  if (preferred && inside(preferred)) return preferred;
  return (
    (Object.keys(REGIONS) as RegionId[]).filter(inside).sort((a, b) => {
      const area = (id: RegionId) => {
        const r = REGIONS[id];
        return (r[2] - r[0]) * (r[3] - r[1]);
      };
      return area(a) - area(b);
    })[0] ?? null
  );
}

/** Geographic browsing has hysteresis; it never seeks the historical clock. */
export function browseRegionAt(
  target: THREE.Vector3,
  distance: number,
  previous: RegionId | null,
) {
  if (distance >= 7) return null;
  if (distance > 5.5) return previous;
  return geographicRegionAt(unprojectGeo([target.x, target.z]), previous);
}

/** Pan in the horizontal plane, preserving the viewer’s established altitude. */
export function translateMarchView(
  position: THREE.Vector3,
  target: THREE.Vector3,
  previous: THREE.Vector3,
  current: THREE.Vector3,
) {
  const shift = current.clone().sub(previous);
  shift.y = 0;
  position.add(shift);
  target.add(shift);
}

export function regionalMarchDistance(id: string | null) {
  if (!id || !(id in REGIONS)) return 1.1;
  const b = REGIONS[id as RegionId],
    a = projectGeo([b[0], b[3]]),
    c = projectGeo([b[2], b[1]]);
  return THREE.MathUtils.clamp(
    Math.max(c[0] - a[0], c[1] - a[1]) * 0.35,
    1,
    1.25,
  );
}
