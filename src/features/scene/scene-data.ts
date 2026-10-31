import { routeFeatureSchema } from '../../shared/contracts';
import type {
  GeoCoordinate,
  HistoryEvent,
  RouteFeature,
} from '../../shared/contracts';

export type Point3 = readonly [number, number, number];
export type SceneProjection = {
  project: (coordinate: GeoCoordinate) => Point3;
  center: GeoCoordinate;
  scale: number;
};

export function visibleEvents(events: readonly HistoryEvent[]) {
  return events.filter(
    (event) =>
      event.releaseStatus === 'published' &&
      event.reviewStatus === 'reviewed' &&
      event.sourceIds.length > 0 &&
      event.coordinates !== null &&
      event.coordinatePrecision !== 'unknown' &&
      validCoordinate(event.coordinates),
  );
}

function validCoordinate(coordinate: GeoCoordinate) {
  return (
    Number.isFinite(coordinate[0]) &&
    Number.isFinite(coordinate[1]) &&
    Math.abs(coordinate[0]) <= 180 &&
    Math.abs(coordinate[1]) <= 90
  );
}

/** The caller's published dataset remains the authority for human/source review. */
export function visibleRoutes(routes: readonly RouteFeature[]) {
  return routes.filter(
    (route) =>
      route.releaseStatus === 'published' &&
      route.reviewStatus === 'reviewed' &&
      route.sourceIds.length > 0 &&
      route.displayMode !== 'hidden' &&
      routeFeatureSchema.safeParse(route).success,
  );
}

/** Local equirectangular display projection. No terrain, elevation or route geometry is inferred. */
export function createProjection(
  coordinates: readonly GeoCoordinate[],
): SceneProjection {
  if (!coordinates.length)
    return { center: [0, 0], scale: 1, project: () => [0, 0.22, 0] };
  const anchor = coordinates[0]![0];
  const unwrap = (longitude: number) =>
    anchor + ((((longitude - anchor) % 360) + 540) % 360) - 180;
  const longitudes = coordinates.map((coordinate) => unwrap(coordinate[0]));
  const latitudes = coordinates.map((coordinate) => coordinate[1]);
  const center: GeoCoordinate = [
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  ];
  const latitudeFactor = Math.max(0.01, Math.cos((center[1] * Math.PI) / 180));
  const width =
    (Math.max(...longitudes) - Math.min(...longitudes)) * latitudeFactor;
  const depth = Math.max(...latitudes) - Math.min(...latitudes);
  const scale = 13 / Math.max(width, depth, 0.1);
  return {
    center,
    scale,
    project: ([longitude, latitude]) => [
      (unwrap(longitude) - center[0]) * latitudeFactor * scale,
      0.22,
      -(latitude - center[1]) * scale,
    ],
  };
}

/** Reveal only complete source segments, never a fabricated intermediate coordinate. */
export function completeSegmentCount(pointCount: number, progress: number) {
  const safeProgress = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;
  return Math.floor(Math.max(0, pointCount - 1) * safeProgress);
}
