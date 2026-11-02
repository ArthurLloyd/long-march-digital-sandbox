import type {
  HistoryDatasetV2,
  HistoricalObjectSelection,
  RouteFeature,
} from '../../../shared/contracts';
import type { GeoPoint } from './geography';

export interface PublishedMapRoute {
  id: string;
  camp: string;
  unitId: string;
  name: string;
  mode: RouteFeature['displayMode'];
  precision: RouteFeature['spatialPrecision'];
  coordinates: readonly GeoPoint[];
}
export interface SpatialUnit {
  id: string;
  name: string;
  camp: string;
  point: GeoPoint | null;
  region: readonly GeoPoint[] | null;
  precision: string;
}
export interface SpatialObject {
  selection: HistoricalObjectSelection;
  title: string;
  point: GeoPoint;
}
export interface SpatialView {
  routes: PublishedMapRoute[];
  units: SpatialUnit[];
  objects: SpatialObject[];
}
export const validPoint = (point: unknown): point is GeoPoint =>
  Array.isArray(point) &&
  point.length === 2 &&
  point.every(Number.isFinite) &&
  Math.abs(point[0]) <= 180 &&
  Math.abs(point[1]) <= 85;

/** Consume C's phase projection. Never infer positions from progress or connect isolated points. */
export function buildSpatialView(
  dataset: Readonly<HistoryDatasetV2>,
  phaseId: string | null,
): SpatialView {
  const routes = new Map<string, PublishedMapRoute>();
  const routeById = new Map(dataset.routes.map((route) => [route.id, route]));
  const addRoute = (
    route: RouteFeature,
    camp = 'other',
    unitId = '',
    name = route.name,
  ) => {
    if (
      route.displayMode === 'hidden' ||
      route.evidenceLevel === 'insufficient' ||
      route.spatialPrecision === 'unknown'
    )
      return;
    routes.set(`${route.id}:${unitId}`, {
      id: route.id,
      camp,
      unitId,
      name,
      mode: route.displayMode,
      precision: route.spatialPrecision,
      coordinates: route.coordinates,
    });
  };
  const units: SpatialUnit[] = [];
  if (phaseId)
    for (const track of dataset.forceTracks) {
      const snapshots = dataset.forceSnapshots.filter(
        (snapshot) =>
          snapshot.phaseId === phaseId &&
          snapshot.trackId === track.trackId &&
          track.snapshotIds.includes(snapshot.snapshotId),
      );
      if (snapshots.length !== 1) continue;
      const snapshot = snapshots[0]!;
      if (snapshot.displayMode === 'hidden') continue;
      if (snapshot.displayMode === 'route') {
        const route = snapshot.routeId ? routeById.get(snapshot.routeId) : null;
        if (route) addRoute(route, track.camp, track.unitId, track.name);
        // A route with no dated point does not identify a current unit position.
      } else if (
        snapshot.displayMode === 'point' &&
        snapshot.coordinatePrecision !== 'unknown' &&
        validPoint(snapshot.coordinates)
      ) {
        units.push({
          id: track.unitId,
          name: track.name,
          camp: track.camp,
          point: snapshot.coordinates,
          region: null,
          precision: snapshot.coordinatePrecision,
        });
      } else if (
        snapshot.displayMode === 'region' &&
        snapshot.region &&
        snapshot.region.coordinates.length >= 3 &&
        snapshot.region.coordinates.every(validPoint)
      ) {
        units.push({
          id: track.unitId,
          name: track.name,
          camp: track.camp,
          point: null,
          region: snapshot.region.coordinates,
          precision: snapshot.region.precision,
        });
      }
    }
  const claimed = new Set([...routes.values()].map((route) => route.id));
  for (const route of dataset.routes)
    if (!claimed.has(route.id)) addRoute(route);
  const objects: SpatialObject[] = [];
  for (const event of dataset.events)
    if (
      event.coordinatePrecision !== 'unknown' &&
      validPoint(event.coordinates)
    )
      objects.push({
        selection: { kind: 'event', id: event.id },
        title: event.title,
        point: event.coordinates,
      });
  for (const place of dataset.places)
    if (
      place.coordinatePrecision !== 'unknown' &&
      validPoint(place.coordinates)
    )
      objects.push({
        selection: { kind: 'place', id: place.placeId },
        title: place.historicalName,
        point: place.coordinates,
      });
  return { routes: [...routes.values()], units, objects };
}
