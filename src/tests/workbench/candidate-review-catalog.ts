import type { ExperienceCatalog } from '../../app/experience/historical-experience-routing';
import { normalizeDataset } from '../../shared/contracts';
import { validateDataset } from '../../shared/utils/validate-dataset';

/** Local review view, never a publication view. Original audit fields stay intact. */
export function createCandidateReviewCatalog(
  input: unknown,
): ExperienceCatalog {
  if (!import.meta.env.DEV) throw new Error('候选资料只允许本地开发审阅');
  const candidate = normalizeDataset(validateDataset(input));
  const gates = new Map<string, string>();
  for (const manifest of candidate.experiences) {
    for (const id of manifest.linkedEventIds)
      gates.set(`event:${id}`, manifest.experienceId);
    gates.set(`topic:${manifest.topicId}`, manifest.experienceId);
  }
  return {
    published: candidate,
    gates,
    phaseSystem: candidate.phases.length > 0,
    error: null,
  };
}
