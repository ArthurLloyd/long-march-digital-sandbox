import type {
  InteractionDefinition,
  InteractionResponse,
} from '../../shared/contracts';
import {
  createExperienceCatalog,
  resolveHistoricalRoute,
} from '../../app/experience/historical-experience-routing';
import {
  historicalExperienceReducer as reduce,
  initialHistoricalExperienceState,
  type HistoricalExperienceState,
} from '../../app/experience/historical-experience-reducer';
import { simulatePublishedSample } from './c1-sample';

export function responseFor(
  definition: InteractionDefinition,
): InteractionResponse {
  switch (definition.interactionType) {
    case 'observe_hotspots':
      return {
        interactionType: definition.interactionType,
        visitedMaterialIds: [...definition.requiredMaterialIds],
      };
    case 'sort_sequence':
      return {
        interactionType: definition.interactionType,
        orderedChoiceIds: [...definition.correctOrder],
      };
    case 'evidence_selection':
      return {
        interactionType: definition.interactionType,
        selectedChoiceId: definition.correctChoiceId,
      };
    case 'material_matching':
      return {
        interactionType: definition.interactionType,
        pairs: definition.correctPairs,
      };
    case 'classify_source':
      return {
        interactionType: definition.interactionType,
        classifications: definition.correctClassifications,
      };
  }
}
export function introState(
  data = simulatePublishedSample(),
): HistoricalExperienceState {
  const selection = { kind: 'event' as const, id: 'fixture-event' };
  return reduce(initialHistoricalExperienceState, {
    type: 'open',
    selection,
    route: resolveHistoricalRoute(createExperienceCatalog(data), selection, []),
    context: { selection, phaseId: 'fixture-phase', bookmark: null },
  });
}
export function startState(
  mode: '3d' | 'equivalent' = '3d',
  data = simulatePublishedSample(),
) {
  let state = reduce(introState(data), {
    type: 'start',
    mode,
    runId: 'run-test-1',
  });
  if (mode === '3d')
    state = reduce(state, { type: 'ready', report: state.run! });
  return state;
}
export function completeInteraction(
  state: HistoricalExperienceState,
  id = state.run!.activeInteractionId!,
): HistoricalExperienceState {
  const run = state.run!;
  state = reduce(state, {
    type: 'response',
    runId: run.runId,
    interactionId: id,
    response: responseFor(
      run.bundle.interactions.find((r) => r.interactionId === id)!,
    ),
  });
  state = reduce(state, {
    type: 'acknowledge',
    runId: run.runId,
    interactionId: id,
  });
  return reduce(state, { type: 'continue_interaction', runId: run.runId });
}
export function reachTerminal(state = startState()): HistoricalExperienceState {
  const bundle = state.run!.bundle;
  for (let i = 0; i < bundle.segments.length; i++) {
    const run = state.run!;
    if (run.mode === 'equivalent')
      state = reduce(state, {
        type: 'step_viewed',
        runId: run.runId,
        stepId: bundle.fallback.steps[i]!.stepId,
      });
    else
      state = reduce(state, {
        type: 'segment',
        report: { ...run, segmentId: bundle.segments[i]!.segmentId },
      });
    for (const interactionId of bundle.segments[i]!.interactionIds) {
      if (run.mode !== 'equivalent')
        state = reduce(state, {
          type: 'cue',
          report: {
            ...state.run!,
            segmentId: bundle.segments[i]!.segmentId,
            interactionId,
          },
        });
      state = completeInteraction(state, interactionId);
    }
    if (run.mode === 'equivalent' && i < bundle.segments.length - 1)
      state = reduce(state, { type: 'next_step', runId: run.runId });
  }
  if (state.run!.mode !== 'equivalent')
    state = reduce(state, {
      type: 'terminal',
      report: { ...state.run!, segmentId: bundle.manifest.terminalSegmentId },
    });
  return state;
}
