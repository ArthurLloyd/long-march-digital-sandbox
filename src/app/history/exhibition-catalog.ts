import { normalizeDataset } from '../../shared/contracts';
import { validateDataset } from '../../shared/utils/validate-dataset';
import {
  createExperienceCatalog,
  selectionKey,
  type ExperienceCatalog,
} from '../experience/historical-experience-routing';

/** Exhibition visibility is a product choice, never an invented audit decision. */
export function createExhibitionCatalog(input: unknown): ExperienceCatalog {
  try {
    const dataset = normalizeDataset(validateDataset(input));
    const gates = new Map<string, string>();
    for (const manifest of dataset.experiences) {
      for (const id of manifest.linkedEventIds)
        gates.set(selectionKey({ kind: 'event', id }), manifest.experienceId);
      gates.set(
        selectionKey({ kind: 'topic', id: manifest.topicId }),
        manifest.experienceId,
      );
    }
    return {
      published: dataset,
      gates,
      error: null,
      phaseSystem: dataset.phases.length > 0,
      audience: 'exhibition',
    };
  } catch {
    return createExperienceCatalog(input);
  }
}

// These are directory associations, not historical coordinates or route geometry.
export const REGION_HISTORY: Readonly<Record<string, string>> = {
  zunyi: 'topic-zy',
  chishui: 'topic-sd',
  jinsha: 'topic-js',
  luding: 'topic-ld',
  snow: 'topic-sn',
  grass: 'topic-gr',
};
