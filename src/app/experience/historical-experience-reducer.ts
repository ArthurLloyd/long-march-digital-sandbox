import {
  cameraBookmarkSchema,
  canCompleteExperience,
  completionRecordSchema,
  type CameraBookmark,
  type CompletionRecord,
  type ExperienceError,
  type HistoricalObjectSelection,
  type InteractionCue,
  type InteractionId,
  type RendererRun,
  type SegmentReached,
  type HistoricalDetail,
  type SourceReference,
} from '../../shared/contracts';
import type {
  ExperienceBundle,
  HistoricalRoute,
} from './historical-experience-routing';
import {
  evaluateInteractionResponse,
  type InteractionProgress,
} from './interaction-progress';

export type ExperienceStatus =
  | 'idle'
  | 'intro'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'awaiting_interaction'
  | 'equivalent_experience'
  | 'ready_to_complete'
  | 'reading'
  | 'error'
  | 'unavailable'
  | 'exit_confirm';
export interface ExplorationContext {
  topicId?: string | null;
  selection: HistoricalObjectSelection | null;
  phaseId: string | null;
  bookmark: CameraBookmark | null;
}
export interface ExperienceRun extends RendererRun {
  bundle: ExperienceBundle;
  mode: CompletionRecord['completionMode'];
  index: number;
  reached: boolean;
  ready: boolean;
  activeInteractionId: InteractionId | null;
  responses: Partial<Record<InteractionId, InteractionProgress>>;
  acknowledged: InteractionId[];
  completed: InteractionId[];
  terminalReached: boolean;
  resumeStatus: ExperienceStatus;
  suspended: boolean;
  bookmark: CameraBookmark | null;
}
export interface HistoricalExperienceState {
  status: ExperienceStatus;
  selection: HistoricalObjectSelection | null;
  route: HistoricalRoute | null;
  run: ExperienceRun | null;
  context: ExplorationContext | null;
  error: ExperienceError | null;
  completedRecord: CompletionRecord | null;
  supplement: { detail: HistoricalDetail } | { source: SourceReference } | null;
}
export const initialHistoricalExperienceState: HistoricalExperienceState = {
  status: 'idle',
  selection: null,
  route: null,
  run: null,
  context: null,
  error: null,
  completedRecord: null,
  supplement: null,
};
export type HistoricalExperienceAction =
  | {
      type: 'supplement';
      value: NonNullable<HistoricalExperienceState['supplement']>;
    }
  | { type: 'close_supplement' }
  | { type: 'renderer_exit'; report: RendererRun }
  | {
      type: 'open';
      selection: HistoricalObjectSelection;
      route: HistoricalRoute;
      context: ExplorationContext;
    }
  | { type: 'start'; runId: string; mode: CompletionRecord['completionMode'] }
  | { type: 'ready'; report: RendererRun }
  | { type: 'segment'; report: SegmentReached }
  | { type: 'cue'; report: InteractionCue }
  | { type: 'terminal'; report: SegmentReached }
  | { type: 'error'; report: RendererRun & { error: ExperienceError } }
  | { type: 'bookmark'; report: RendererRun & { bookmark: CameraBookmark } }
  | {
      type: 'response';
      runId: string;
      interactionId: InteractionId;
      response: unknown;
    }
  | { type: 'acknowledge'; runId: string; interactionId: InteractionId }
  | { type: 'continue_interaction'; runId: string }
  | { type: 'step_viewed'; runId: string; stepId: string }
  | { type: 'next_step'; runId: string }
  | {
      type:
        | 'pause'
        | 'resume'
        | 'request_exit'
        | 'cancel_exit'
        | 'exit'
        | 'close'
        | 'clear_selection';
    }
  | { type: 'complete'; completedAt: string }
  | { type: 'unavailable'; message: string };
export function matchesRun(
  state: HistoricalExperienceState,
  report: RendererRun,
) {
  return (
    state.run !== null &&
    report !== null &&
    typeof report === 'object' &&
    state.run.runId === report.runId &&
    state.run.experienceId === report.experienceId &&
    state.run.scriptVersion === report.scriptVersion
  );
}
export function completionForState(
  state: HistoricalExperienceState,
  completedAt: string,
): CompletionRecord | null {
  const run = state.run;
  if (
    !run ||
    state.status !== 'ready_to_complete' ||
    run.suspended ||
    !canCompleteExperience(run.bundle.manifest, {
      experienceId: run.experienceId,
      completionPolicyVersion: run.bundle.manifest.completionPolicyVersion,
      terminalReached: run.terminalReached,
      completedInteractionIds: run.completed,
      acknowledgedExplanationIds: run.acknowledged,
      completionRequested: true,
    })
  )
    return null;
  return completionRecordSchema.parse({
    schemaVersion: 1,
    experienceId: run.experienceId,
    completionPolicyVersion: run.bundle.manifest.completionPolicyVersion,
    completedAt,
    completedInteractionIds: run.completed,
    completionMode: run.mode,
  });
}
function segmentDone(run: ExperienceRun) {
  return (
    run.reached &&
    run.bundle.segments[run.index]!.interactionIds.every((id) =>
      run.completed.includes(id),
    )
  );
}
function stepState(
  state: HistoricalExperienceState,
  run: ExperienceRun,
): HistoricalExperienceState {
  const pending = run.bundle.segments[run.index]!.interactionIds.find(
    (id) => !run.completed.includes(id),
  );
  if (pending)
    return {
      ...state,
      status: 'awaiting_interaction',
      run: { ...run, activeInteractionId: pending },
    };
  if (run.index === run.bundle.segments.length - 1)
    return {
      ...state,
      status: 'ready_to_complete',
      run: { ...run, terminalReached: true },
    };
  return { ...state, status: 'equivalent_experience', run };
}
export function historicalExperienceReducer(
  state: HistoricalExperienceState,
  action: HistoricalExperienceAction,
): HistoricalExperienceState {
  if (action.type === 'supplement') {
    const paused = historicalExperienceReducer(state, { type: 'pause' });
    return { ...paused, supplement: action.value };
  }
  if (action.type === 'close_supplement') return { ...state, supplement: null };
  if (action.type === 'open')
    return {
      ...initialHistoricalExperienceState,
      status: action.route.status,
      selection: action.selection,
      route: action.route,
      context: action.context,
    };
  if (action.type === 'unavailable')
    return {
      ...state,
      status: 'unavailable',
      route: { status: 'unavailable', message: action.message },
      run: null,
    };
  if (action.type === 'clear_selection')
    return { ...initialHistoricalExperienceState };
  if (action.type === 'exit' || action.type === 'close')
    return {
      ...state,
      status: 'idle',
      run: null,
      error: null,
      supplement: null,
    };
  if (action.type === 'start') {
    if (
      !['intro', 'reading', 'error'].includes(state.status) ||
      !state.route ||
      state.route.status === 'unavailable' ||
      !state.route.bundle
    )
      return state;
    const bundle = state.route.bundle;
    return {
      ...state,
      status:
        action.mode === 'equivalent' ? 'equivalent_experience' : 'loading',
      error: null,
      completedRecord: null,
      run: {
        experienceId: bundle.manifest.experienceId,
        scriptVersion: bundle.manifest.scriptVersion,
        runId: action.runId,
        bundle,
        mode: action.mode,
        index: 0,
        reached: false,
        ready: action.mode === 'equivalent',
        activeInteractionId: null,
        responses: {},
        acknowledged: [],
        completed: [],
        terminalReached: false,
        resumeStatus:
          action.mode === 'equivalent' ? 'equivalent_experience' : 'playing',
        suspended: false,
        bookmark: null,
      },
    };
  }
  const run = state.run;
  if (!run) return state;
  if ('report' in action && !matchesRun(state, action.report)) return state;
  if ('runId' in action && action.runId !== run.runId) return state;
  switch (action.type) {
    case 'ready':
      if (
        (state.status === 'exit_confirm' || state.status === 'paused') &&
        !run.ready
      )
        return {
          ...state,
          run: {
            ...run,
            ready: true,
            resumeStatus:
              run.resumeStatus === 'loading' ? 'playing' : run.resumeStatus,
          },
        };
      return state.status === 'loading'
        ? {
            ...state,
            status: run.suspended ? 'paused' : 'playing',
            run: { ...run, ready: true },
          }
        : state;
    case 'segment': {
      if (state.status !== 'playing' || !run.ready || run.mode === 'equivalent')
        return state;
      const index = run.bundle.manifest.segmentIds.indexOf(
        action.report.segmentId,
      );
      if (index === run.index && !run.reached)
        return { ...state, run: { ...run, reached: true } };
      if (index !== run.index + 1 || !segmentDone(run)) return state;
      return { ...state, run: { ...run, index, reached: true } };
    }
    case 'cue': {
      if (
        state.status !== 'playing' ||
        !run.ready ||
        !run.reached ||
        run.mode === 'equivalent' ||
        action.report.segmentId !== run.bundle.manifest.segmentIds[run.index] ||
        !run.bundle.segments[run.index]!.interactionIds.includes(
          action.report.interactionId,
        ) ||
        run.completed.includes(action.report.interactionId)
      )
        return state;
      return {
        ...state,
        status: 'awaiting_interaction',
        run: { ...run, activeInteractionId: action.report.interactionId },
      };
    }
    case 'terminal':
      return state.status === 'playing' &&
        run.ready &&
        run.mode !== 'equivalent' &&
        run.index === run.bundle.segments.length - 1 &&
        action.report.segmentId === run.bundle.manifest.terminalSegmentId &&
        segmentDone(run)
        ? {
            ...state,
            status: 'ready_to_complete',
            run: { ...run, terminalReached: true },
          }
        : state;
    case 'error':
      if (
        !action.report.error ||
        typeof action.report.error.message !== 'string' ||
        typeof action.report.error.retryable !== 'boolean' ||
        ![
          'webgl_unavailable',
          'asset_load_failed',
          'render_failed',
          'media_unavailable',
        ].includes(action.report.error.code)
      )
        return state;
      return ['idle', 'reading', 'exit_confirm'].includes(state.status)
        ? state
        : { ...state, status: 'error', error: action.report.error };
    case 'bookmark': {
      const result = cameraBookmarkSchema.safeParse(action.report.bookmark);
      if (
        result.success &&
        JSON.stringify(result.data) === JSON.stringify(run.bookmark)
      )
        return state;
      return result.success
        ? { ...state, run: { ...run, bookmark: result.data } }
        : state;
    }
    case 'response': {
      if (
        state.status !== 'awaiting_interaction' ||
        run.activeInteractionId !== action.interactionId ||
        run.acknowledged.includes(action.interactionId)
      )
        return state;
      const definition = run.bundle.interactions.find(
        (r) => r.interactionId === action.interactionId,
      )!;
      const progress = evaluateInteractionResponse(
        definition,
        action.response,
        run.responses[action.interactionId],
      );
      return progress
        ? {
            ...state,
            run: {
              ...run,
              responses: { ...run.responses, [action.interactionId]: progress },
            },
          }
        : state;
    }
    case 'acknowledge':
      return state.status === 'awaiting_interaction' &&
        run.activeInteractionId === action.interactionId &&
        run.responses[action.interactionId]?.complete &&
        !run.acknowledged.includes(action.interactionId)
        ? {
            ...state,
            run: {
              ...run,
              acknowledged: [...run.acknowledged, action.interactionId],
            },
          }
        : state;
    case 'continue_interaction': {
      const id = run.activeInteractionId;
      if (
        state.status !== 'awaiting_interaction' ||
        !id ||
        !run.responses[id]?.complete ||
        !run.acknowledged.includes(id)
      )
        return state;
      const next = {
        ...run,
        activeInteractionId: null,
        completed: run.completed.includes(id)
          ? run.completed
          : [...run.completed, id],
      };
      return run.mode === 'equivalent'
        ? stepState(state, next)
        : { ...state, status: 'playing', run: next };
    }
    case 'step_viewed':
      return state.status === 'equivalent_experience' &&
        action.stepId === run.bundle.fallback.steps[run.index]?.stepId &&
        !run.reached
        ? stepState(state, { ...run, reached: true })
        : state;
    case 'next_step':
      return state.status === 'equivalent_experience' &&
        segmentDone(run) &&
        run.index < run.bundle.segments.length - 1
        ? { ...state, run: { ...run, index: run.index + 1, reached: false } }
        : state;
    case 'pause':
      if (state.status === 'loading')
        return { ...state, run: { ...run, suspended: true } };
      return [
        'playing',
        'equivalent_experience',
        'awaiting_interaction',
        'ready_to_complete',
      ].includes(state.status)
        ? {
            ...state,
            status: 'paused',
            run: { ...run, suspended: true, resumeStatus: state.status },
          }
        : state;
    case 'resume':
      return state.status === 'paused' && run.ready
        ? {
            ...state,
            status: run.resumeStatus,
            run: { ...run, suspended: false },
          }
        : state;
    case 'request_exit':
    case 'renderer_exit':
      return state.status === 'exit_confirm'
        ? state
        : {
            ...state,
            status: 'exit_confirm',
            run: {
              ...run,
              suspended: true,
              resumeStatus:
                state.status === 'paused' ? run.resumeStatus : state.status,
            },
          };
    case 'cancel_exit':
      return state.status === 'exit_confirm'
        ? {
            ...state,
            status:
              run.resumeStatus === 'error'
                ? 'error'
                : run.ready
                  ? 'paused'
                  : 'loading',
            run: { ...run, suspended: true },
          }
        : state;
    case 'complete': {
      const record = completionForState(state, action.completedAt);
      return record
        ? { ...state, status: 'reading', run: null, completedRecord: record }
        : state;
    }
    default:
      return state;
  }
}
