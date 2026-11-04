import { useCallback, useEffect, useReducer } from 'react';
import type { PhaseClockModel } from './phase-clock-model';
import type { JourneyPlan } from './journey/journey-model';
import { journeyChapters, sampleJourney } from './journey/journey-model';
import { useJourneyTransport } from './journey/use-journey-transport';
import {
  historicalPhaseReducer,
  initialPhaseState,
  reconcilePhaseState,
  type HistoricalPhaseAction,
} from './historical-phase-reducer';

/** Presentation cadence only. Never derives historical time or movement. */
export const PHASE_DISPLAY_INTERVAL_MS = 4000;

/** Shared C2 engine. Published history and isolated navigation use the same logic. */
export function usePhaseClock(
  model: PhaseClockModel,
  enabled = true,
  journeyPlan?: JourneyPlan,
) {
  const journey = useJourneyTransport(journeyPlan, enabled);
  const [raw, dispatch] = useReducer(
    (
      state: ReturnType<typeof initialPhaseState>,
      action: HistoricalPhaseAction,
    ) => historicalPhaseReducer(state, action, model),
    model,
    initialPhaseState,
  );
  const state = reconcilePhaseState(raw, model);
  const playing = enabled && !journeyPlan && state.playing && !model.error;
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
  const legacy = {
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
  if (!journeyPlan) return { ...legacy, journey: null };
  const { transport, state: continuous } = journey;
  const current = sampleJourney(
    journeyPlan,
    continuous.sequenceId,
    continuous.time,
  ).chapter;
  const go = (id: string, kind: 'phaseId' | 'topicId') => {
    const chapter = journeyChapters(journeyPlan, continuous.sequenceId).find(
      (c) => c[kind] === id,
    );
    if (chapter) transport.seek(chapter.start);
  };
  const next = (direction: number) => {
    const chapters = journeyChapters(journeyPlan, continuous.sequenceId);
    const index = chapters.findIndex((c) => c.id === current?.id);
    const target = chapters[index + direction];
    if (target) transport.seek(target.start);
  };
  return {
    ...legacy,
    journey,
    selectedTopicId: current?.topicId ?? null,
    activePhaseId: current?.phaseId ?? null,
    playing: enabled && continuous.playing,
    pause: transport.pause,
    play: transport.play,
    selectTopic: (id: string) => go(id, 'topicId'),
    selectPhase: (id: string) => go(id, 'phaseId'),
    restore: (_topicId: string | null, id: string | null) => {
      if (id) go(id, 'phaseId');
      else transport.pause();
    },
    nextPhase: () => next(1),
    previousPhase: () => next(-1),
    restartTopic: transport.restart,
    reset: transport.reset,
  };
}
