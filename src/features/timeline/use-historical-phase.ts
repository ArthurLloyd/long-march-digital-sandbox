import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { HistoryDatasetV2 } from '../../shared/contracts';
import { createPhaseModel } from './historical-phase-selectors';
import {
  historicalPhaseReducer,
  initialPhaseState,
  reconcilePhaseState,
  type HistoricalPhaseAction,
} from './historical-phase-reducer';

/** Presentation cadence only; it never calculates historical dates or movement. */
export const PHASE_DISPLAY_INTERVAL_MS = 4000;

export function useHistoricalPhase(
  published: HistoryDatasetV2,
  enabled = true,
) {
  const model = useMemo(() => createPhaseModel(published), [published]);
  const [raw, dispatch] = useReducer(
    (
      state: ReturnType<typeof initialPhaseState>,
      action: HistoricalPhaseAction,
    ) => historicalPhaseReducer(state, action, model),
    model,
    initialPhaseState,
  );
  const state = reconcilePhaseState(raw, model);
  const phases = model.orders.get(state.selectedTopicId ?? '') ?? [];
  const index = phases.findIndex((p) => p.phaseId === state.activePhaseId);
  const playing = enabled && state.playing && !model.error;
  useEffect(() => dispatch({ type: 'sync' }), [model]);
  useEffect(() => {
    if (!enabled) dispatch({ type: 'pause' });
  }, [enabled]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () =>
        dispatch({
          type: 'tick',
          revision: state.revision,
          modelKey: model.key,
        }),
      PHASE_DISPLAY_INTERVAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, state.revision, model.key]);
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  const selectTopic = useCallback(
    (topicId: string) => dispatch({ type: 'topic', topicId }),
    [],
  );
  const selectPhase = useCallback(
    (phaseId: string) => dispatch({ type: 'phase', phaseId }),
    [],
  );
  const restore = useCallback(
    (topicId: string | null, phaseId: string | null) =>
      dispatch({ type: 'restore', topicId, phaseId }),
    [],
  );
  return {
    ...state,
    playing,
    model,
    phases,
    index,
    topic:
      model.topics.find((t) => t.topicId === state.selectedTopicId) ?? null,
    phase: phases[index] ?? null,
    progress: phases.length > 1 ? Math.max(0, index) / (phases.length - 1) : 0,
    selectTopic,
    selectPhase,
    pause,
    restore,
    play: () => dispatch({ type: 'play' }),
    nextPhase: () => dispatch({ type: 'next' }),
    previousPhase: () => dispatch({ type: 'previous' }),
    restartTopic: () => dispatch({ type: 'restart' }),
    reset: () => dispatch({ type: 'reset' }),
  };
}
