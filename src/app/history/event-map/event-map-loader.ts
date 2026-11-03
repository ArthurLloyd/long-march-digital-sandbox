import positions from './data/event-placements.json';
import references from './data/location-references.json';
import type { HistoryDatasetV2 } from '../../../shared/contracts';
import { validateEventMapResources } from './event-map-schema';
import {
  selectExhibitionPlacements,
  type EventMapModel,
} from './event-map-selectors';

export const eventMapInput = { positions, references };
export function loadExhibitionEventMap(
  dataset: HistoryDatasetV2,
  audience?: 'exhibition',
): EventMapModel | null {
  if (audience !== 'exhibition') return null;
  try {
    const resources = validateEventMapResources(positions, references, dataset);
    const entries = selectExhibitionPlacements(dataset, resources);
    return {
      entries,
      resources,
      unlocated: dataset.events.filter(
        (e) =>
          e.reviewStatus !== 'rejected' &&
          !resources.positions.withdrawnEventIds.includes(e.id) &&
          !entries.some((p) => p.eventId === e.id),
      ),
      error: null,
    };
  } catch {
    return {
      entries: [],
      resources: {
        positions: {
          schemaVersion: 1,
          version: 'unavailable',
          coordinateSystem: 'WGS84',
          availability: 'withdrawn',
          withdrawnEventIds: [],
          regions: [],
          nodes: [],
          placements: [],
        },
        references: [],
      },
      unlocated: dataset.events.filter((e) => e.reviewStatus !== 'rejected'),
      error: '事件概略位置暂不可用，仍可从历史专题阅读正文。',
    };
  }
}
