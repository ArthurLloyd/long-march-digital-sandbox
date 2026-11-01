import type {
  HistoricalObjectSelection,
  HistoryDatasetV2,
} from '../../shared/contracts';
import { selectForceStateForPhase } from './force-state';

/** Read-only spatial projection for A; not a new persisted or revalidated dataset. */
export function selectScenePhaseView(
  published: HistoryDatasetV2,
  phaseId: string | null,
) {
  const forces = selectForceStateForPhase(published, phaseId);
  const phase = published.phases.find((p) => p.phaseId === forces.phaseId);
  const eventIds = new Set(phase?.eventIds ?? []);
  const dataset: HistoryDatasetV2 = {
    ...published,
    events: published.events.filter((e) => eventIds.has(e.id)),
    places: published.places.filter(
      (p) =>
        p.coordinates !== null &&
        p.relatedEventIds.some((id) => eventIds.has(id)),
    ),
    forceTracks: forces.tracks,
    forceSnapshots: forces.snapshots,
    routes: forces.routes,
  };
  return { dataset, forces };
}
export function sceneSelection(
  dataset: HistoryDatasetV2,
  selection: HistoricalObjectSelection | null,
) {
  if (!selection) return null;
  const exists =
    selection.kind === 'event'
      ? dataset.events.some((e) => e.id === selection.id)
      : selection.kind === 'place'
        ? dataset.places.some((p) => p.placeId === selection.id)
        : selection.kind === 'person'
          ? dataset.people.some((p) => p.personId === selection.id)
          : dataset.topics.some((t) => t.topicId === selection.id);
  return exists ? selection : null;
}
