import { useMemo } from 'react';
import type { HistoryDatasetV2 } from '../../shared/contracts';
import { createPhaseModel } from './historical-phase-selectors';
import { usePhaseClock } from './use-phase-clock';
export { PHASE_DISPLAY_INTERVAL_MS } from './use-phase-clock';

export function useHistoricalPhase(
  published: HistoryDatasetV2,
  enabled = true,
) {
  const model = useMemo(() => createPhaseModel(published), [published]);
  const clock = usePhaseClock(model, enabled);
  const phases = model.orders.get(clock.selectedTopicId ?? '') ?? [];
  const index = phases.findIndex((p) => p.phaseId === clock.activePhaseId);
  return {
    ...clock,
    model,
    phases,
    index,
    topic:
      model.topics.find((t) => t.topicId === clock.selectedTopicId) ?? null,
    phase: phases[index] ?? null,
    progress: phases.length > 1 ? Math.max(0, index) / (phases.length - 1) : 0,
  };
}
