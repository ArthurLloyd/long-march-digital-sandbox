import type { HistoryDatasetV2, RouteFeature } from '../../shared/contracts';
import { selectForceStateForPhase } from '../history/force-state';
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
/** Input is App's already validated published phase view, not a new dataset. */
export function selectMapRoutes(
  published: Readonly<HistoryDatasetV2>,
  phaseId: string | null,
): PublishedMapRoute[] {
  return selectForceStateForPhase(published, phaseId).entries.flatMap(
    (entry) => {
      const route = entry.route;
      return !route ||
        route.displayMode === 'hidden' ||
        route.evidenceLevel === 'insufficient'
        ? []
        : [
            {
              id: route.id,
              camp: entry.track.camp,
              unitId: entry.track.unitId,
              name: entry.track.name,
              mode: route.displayMode,
              precision: route.spatialPrecision,
              coordinates: route.coordinates,
            },
          ];
    },
  );
}
