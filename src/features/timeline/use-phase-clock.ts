import { useCallback, useEffect, useReducer } from 'react';
import type { PhaseClockModel } from './phase-clock-model';
import {
  historicalPhaseReducer,
  initialPhaseState,
  reconcilePhaseState,
  type HistoricalPhaseAction,
} from './historical-phase-reducer';

/** Presentation cadence only. Never derives historical time or movement. */
export const PHASE_DISPLAY_INTERVAL_MS = 4000;

/** Shared C2 engine. Published history and isolated navigation use the same logic. */
export function usePhaseClock(model: PhaseClockModel, enabled = true) {
  const [raw, dispatch] = useReducer(
    (
      state: ReturnType<typeof initialPhaseState>,
      action: HistoricalPhaseAction,
    ) => historicalPhaseReducer(state, action, model),
    model,
    initialPhaseState,
  );
  const state = reconcilePhaseState(raw, model);
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
    pause,
    selectTopic,
    selectPhase,
    restore,
    play: () => dispatch({ type: 'play' }),
    nextPhase: () => dispatch({ type: 'next' }),
    previousPhase: () => dispatch({ type: 'previous' }),
    restartTopic: () => dispatch({ type: 'restart' }),
    reset: () => dispatch({ type: 'reset' }),
  };
}
