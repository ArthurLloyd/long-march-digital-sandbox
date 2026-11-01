import {
  normalizeDataset,
  isCompletionRecordForExperience,
  type CompletionRecord,
  type EquivalentExperienceContent,
  type ExperienceManifest,
  type ExperienceSegment,
  type HistoricalDetail,
  type HistoricalObjectSelection,
  type HistoryDatasetV2,
  type InteractionDefinition,
} from '../../shared/contracts';
import {
  getPublishedDatasetV2,
  validateDataset,
} from '../../shared/utils/validate-dataset';

export interface ExperienceBundle {
  manifest: ExperienceManifest;
  segments: ExperienceSegment[];
  interactions: InteractionDefinition[];
  fallback: EquivalentExperienceContent;
}
export interface ExperienceCatalog {
  published: HistoryDatasetV2;
  /** Restriction metadata only. Never read content or grant access from this index. */
  gates: ReadonlyMap<string, string>;
  error: string | null;
  /** Restriction metadata only: withdrawal must not reactivate the legacy clock. */
  phaseSystem: boolean;
}
export function selectionKey(selection: HistoricalObjectSelection) {
  return `${selection.kind}:${selection.id}`;
}
export function createExperienceCatalog(input: unknown): ExperienceCatalog {
  try {
    const published = getPublishedDatasetV2(input);
    // A withdrawn manifest must not turn a previously gated event into ordinary reading.
    const candidate = normalizeDataset(validateDataset(input));
    const gates = new Map<string, string>();
    for (const manifest of candidate.experiences) {
      for (const id of manifest.linkedEventIds)
        gates.set(selectionKey({ kind: 'event', id }), manifest.experienceId);
      gates.set(
        selectionKey({ kind: 'topic', id: manifest.topicId }),
        manifest.experienceId,
      );
    }
    return {
      published,
      gates,
      error: null,
      phaseSystem: candidate.phases.length > 0,
    };
  } catch {
    return {
      published: normalizeDataset({ events: [], routes: [], sources: [] }),
      gates: new Map(),
      phaseSystem: false,
      error: '历史资料暂不可用，请稍后重试。',
    };
  }
}
export function findPublishedDetail(
  catalog: ExperienceCatalog,
  selection: HistoricalObjectSelection,
): HistoricalDetail | null {
  const data = catalog.published;
  switch (selection.kind) {
    case 'event': {
      const record = data.events.find((r) => r.id === selection.id);
      return record ? { kind: 'event', record } : null;
    }
    case 'person': {
      const record = data.people.find((r) => r.personId === selection.id);
      return record ? { kind: 'person', record } : null;
    }
    case 'place': {
      const record = data.places.find((r) => r.placeId === selection.id);
      return record ? { kind: 'place', record } : null;
    }
    case 'topic': {
      const record = data.topics.find((r) => r.topicId === selection.id);
      return record ? { kind: 'topic', record } : null;
    }
  }
}
export function getExperienceBundle(
  catalog: ExperienceCatalog,
  id: string,
): ExperienceBundle | null {
  const data = catalog.published;
  const manifest = data.experiences.find((r) => r.experienceId === id);
  if (!manifest) return null;
  const segments = manifest.segmentIds.map((segmentId) =>
    data.segments.find((r) => r.segmentId === segmentId),
  );
  const interactions = manifest.requiredInteractionIds.map((interactionId) =>
    data.interactions.find((r) => r.interactionId === interactionId),
  );
  const fallback = data.fallbackContents.find(
    (r) => r.fallbackContentId === manifest.fallbackContentId,
  );
  if (!fallback || segments.some((r) => !r) || interactions.some((r) => !r))
    return null;
  return {
    manifest,
    segments: segments as ExperienceSegment[],
    interactions: interactions as InteractionDefinition[],
    fallback,
  };
}
export type HistoricalRoute =
  | { status: 'unavailable'; message: string }
  | {
      status: 'intro' | 'reading';
      detail: HistoricalDetail;
      bundle: ExperienceBundle | null;
    };
export function resolveHistoricalRoute(
  catalog: ExperienceCatalog,
  selection: HistoricalObjectSelection,
  records: readonly CompletionRecord[],
): HistoricalRoute {
  const detail = findPublishedDetail(catalog, selection);
  if (!detail)
    return {
      status: 'unavailable',
      message: catalog.error ?? '该资料尚未开放或已撤回。',
    };
  const gate = catalog.gates.get(selectionKey(selection));
  if (!gate) return { status: 'reading', detail, bundle: null };
  const bundle = getExperienceBundle(catalog, gate);
  if (!bundle)
    return { status: 'unavailable', message: '该历史体验正在完善，暂未开放。' };
  return {
    status: records.some((record) =>
      isCompletionRecordForExperience(record, bundle.manifest),
    )
      ? 'reading'
      : 'intro',
    detail,
    bundle,
  };
}
