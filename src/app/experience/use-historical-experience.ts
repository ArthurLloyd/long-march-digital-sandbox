import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  type CompletionRecord,
  type ExperienceNavigationRequest,
  type HistoricalObjectSelection,
  type ImmersiveRendererCallbacks,
  type ImmersiveExperienceProps,
  type InteractionId,
} from '../../shared/contracts';
import { useVisibilityPause } from '../../hooks/use-visibility-pause';
import {
  createBrowserCompletionStore,
  type CompletionStore,
} from './experience-completion-service';
import {
  getExperienceBundle,
  resolveHistoricalRoute,
  type ExperienceCatalog,
} from './historical-experience-routing';
import {
  historicalExperienceReducer,
  initialHistoricalExperienceState,
  completionForState,
  type ExplorationContext,
} from './historical-experience-reducer';
import type { ExperienceModules } from './experience-modules';

interface Options {
  catalog: ExperienceCatalog;
  modules: ExperienceModules;
  store?: CompletionStore;
  context: ExplorationContext;
  pauseMacro: () => void;
  restoreContext: (context: ExplorationContext) => void;
  reducedMotion?: boolean;
  onSelect?: (selection: HistoricalObjectSelection) => void;
}
export function useHistoricalExperience({
  catalog,
  modules,
  store: injected,
  context,
  pauseMacro,
  restoreContext,
  reducedMotion = false,
  onSelect,
}: Options) {
  const [ownStore] = useState(createBrowserCompletionStore);
  const store = injected ?? ownStore;
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const [state, dispatch] = useReducer(
    historicalExperienceReducer,
    initialHistoricalExperienceState,
  );
  const [muted, setMuted] = useState(true);
  const [subtitles, setSubtitles] = useState(true);
  const currentRoute = state.selection
    ? resolveHistoricalRoute(catalog, state.selection, snapshot.records)
    : null;
  const currentBundle = state.run
    ? getExperienceBundle(catalog, state.run.experienceId)
    : null;
  const invalidRun =
    state.run !== null &&
    (!currentBundle ||
      currentBundle.manifest.scriptVersion !== state.run.scriptVersion ||
      currentBundle.manifest.completionPolicyVersion !==
        state.run.bundle.manifest.completionPolicyVersion);
  // Publication/record changes must hide revoked content in this render, before effects run.
  let view =
    invalidRun ||
    (state.status !== 'idle' && currentRoute?.status === 'unavailable')
      ? {
          ...state,
          status: 'unavailable' as const,
          route: {
            status: 'unavailable' as const,
            message: '该历史体验已更新或撤回，请返回沙盘。',
          },
          run: null,
          supplement: null,
        }
      : state.status === 'reading' && currentRoute?.status === 'intro'
        ? {
            ...state,
            status: 'intro' as const,
            route: currentRoute,
            run: null,
            supplement: null,
          }
        : state;
  if (view.status === 'reading' && currentRoute?.status === 'reading')
    view = { ...view, route: currentRoute };
  const supplement = view.supplement;
  if (supplement && 'source' in supplement) {
    const source = catalog.published.sources.find(
      (item) => item.sourceId === supplement.source.sourceId,
    );
    view = { ...view, supplement: source ? { source } : null };
  } else if (supplement && 'detail' in supplement) {
    const detail = supplement.detail;
    const selection: HistoricalObjectSelection =
      detail.kind === 'event'
        ? { kind: 'event', id: detail.record.id }
        : detail.kind === 'person'
          ? { kind: 'person', id: detail.record.personId }
          : detail.kind === 'place'
            ? { kind: 'place', id: detail.record.placeId }
            : { kind: 'topic', id: detail.record.topicId };
    const available = resolveHistoricalRoute(
      catalog,
      selection,
      snapshot.records,
    );
    view = {
      ...view,
      supplement:
        available.status === 'reading' ? { detail: available.detail } : null,
    };
  }
  useEffect(() => {
    if (invalidRun)
      dispatch({
        type: 'unavailable',
        message: '该历史体验已更新或撤回，请返回沙盘。',
      });
  }, [invalidRun]);
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  useVisibilityPause(pause);
  const openHistoricalObject = useCallback(
    (
      selection: HistoricalObjectSelection,
      entryContext?: ExplorationContext,
    ) => {
      pauseMacro();
      onSelect?.(selection);
      store.refresh();
      dispatch({
        type: 'open',
        selection,
        route: resolveHistoricalRoute(
          catalog,
          selection,
          store.getSnapshot().records,
        ),
        context: { ...(entryContext ?? context), selection },
      });
    },
    [catalog, context, pauseMacro, store, onSelect],
  );
  const start = (requested?: CompletionRecord['completionMode']) => {
    if (!state.selection) return;
    const route = resolveHistoricalRoute(
      catalog,
      state.selection,
      store.getSnapshot().records,
    );
    if (route.status === 'unavailable' || !route.bundle) {
      dispatch({
        type: 'unavailable',
        message: '该历史体验正在完善，暂未开放。',
      });
      return;
    }
    const mode =
      requested ??
      (reducedMotion
        ? 'equivalent'
        : route.bundle.segments.some((r) => r.presentation === 'video') &&
            route.bundle.segments.every(
              (r) => r.presentation === 'video' || r.presentation === 'text',
            )
          ? 'video'
          : '3d');
    if (
      !modules.Teaching ||
      (mode === 'equivalent' ? !modules.Equivalent : !modules.Renderer)
    ) {
      dispatch({
        type: 'unavailable',
        message: '该体验的呈现或互动模块正在接入，请稍后重试。',
      });
      return;
    }
    // Refresh bundle after data/record changes, without altering the public module interfaces.
    dispatch({
      type: 'open',
      selection: state.selection,
      route: { ...route, status: 'intro' },
      context: state.context ?? context,
    });
    dispatch({
      type: 'start',
      runId:
        globalThis.crypto?.randomUUID?.() ??
        `run-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      mode,
    });
  };
  const run = view.run;
  const callbacks = useMemo<ImmersiveRendererCallbacks>(
    () => ({
      onReady: (report) => dispatch({ type: 'ready', report }),
      onError: (report) => dispatch({ type: 'error', report }),
      onSegmentReached: (report) => dispatch({ type: 'segment', report }),
      onInteractionCue: (report) => dispatch({ type: 'cue', report }),
      onTerminalReached: (report) => dispatch({ type: 'terminal', report }),
      onExitRequested: (report) => dispatch({ type: 'renderer_exit', report }),
      onCameraBookmark: (report) => dispatch({ type: 'bookmark', report }),
    }),
    [],
  );
  useEffect(() => {
    if (state.status !== 'loading' || !state.run) return;
    const report = state.run;
    const timeout = window.setTimeout(
      () =>
        dispatch({
          type: 'error',
          report: {
            ...report,
            error: {
              code: 'asset_load_failed',
              message: '体验加载时间较长，可以重试、选择等价图文或返回。',
              retryable: true,
            },
          },
        }),
      15000,
    );
    return () => window.clearTimeout(timeout);
  }, [state.status, state.run]);
  const close = () => {
    if (state.context) restoreContext(state.context);
    pauseMacro();
    dispatch({ type: 'close' });
  };
  const requestExit = () => {
    if (view.supplement) dispatch({ type: 'close_supplement' });
    else if (view.run) dispatch({ type: 'request_exit' });
    else close();
  };
  const complete = () => {
    if (invalidRun || currentRoute?.status === 'unavailable') return;
    const completedAt = new Date().toISOString();
    const record = completionForState(view, completedAt);
    if (!record) return;
    store.save(record);
    dispatch({ type: 'complete', completedAt });
    if (state.context) restoreContext(state.context);
    pauseMacro();
  };
  const navigate = (request: ExperienceNavigationRequest) => {
    if (request.type === 'replay_experience') {
      if (
        view.route?.status !== 'unavailable' &&
        view.route?.bundle?.manifest.experienceId === request.experienceId
      )
        start();
      return;
    }
    if (request.type === 'open_source') {
      const source = catalog.published.sources.find(
        (r) => r.sourceId === request.sourceId,
      );
      if (source) dispatch({ type: 'supplement', value: { source } });
      return;
    }
    if (run) {
      const route = resolveHistoricalRoute(
        catalog,
        request.selection,
        snapshot.records,
      );
      if (route.status === 'reading')
        dispatch({ type: 'supplement', value: { detail: route.detail } });
    } else openHistoricalObject(request.selection);
  };
  const rendererProps: ImmersiveExperienceProps | null = run
    ? {
        ...callbacks,
        manifest: run.bundle.manifest,
        segments: run.bundle.segments,
        assets: catalog.published.assets,
        command: {
          runId: run.runId,
          segmentId: run.bundle.manifest.segmentIds[run.index]!,
          playback:
            view.status === 'playing' && !run.suspended && !view.supplement
              ? 'playing'
              : 'paused',
          muted,
          quality: 'medium',
          reducedMotion,
        },
        cameraBookmark: run.bookmark,
      }
    : null;
  return {
    state: view,
    catalog,
    snapshot,
    modules,
    reducedMotion,
    rendererProps,
    muted,
    subtitles,
    setMuted,
    setSubtitles,
    openHistoricalObject,
    navigate,
    start,
    close,
    requestExit,
    complete,
    pause,
    resume: () => dispatch({ type: 'resume' }),
    exit: close,
    cancelExit: () => dispatch({ type: 'cancel_exit' }),
    closeSupplement: () => dispatch({ type: 'close_supplement' }),
    clearSelection: () => {
      close();
      dispatch({ type: 'clear_selection' });
    },
    // Macro navigation already owns its next phase; do not restore an old context or pause a tick.
    resetMacroSelection: useCallback(
      () => dispatch({ type: 'clear_selection' }),
      [],
    ),
    clearRecords: () => store.clear(),
    response: (id: InteractionId, value: unknown) => {
      if (run)
        dispatch({
          type: 'response',
          runId: run.runId,
          interactionId: id,
          response: value,
        });
    },
    acknowledge: (id: InteractionId) => {
      if (run)
        dispatch({ type: 'acknowledge', runId: run.runId, interactionId: id });
    },
    continueInteraction: () => {
      if (run) dispatch({ type: 'continue_interaction', runId: run.runId });
    },
    stepViewed: (stepId: string) => {
      if (run) dispatch({ type: 'step_viewed', runId: run.runId, stepId });
    },
    nextStep: () => {
      if (run) dispatch({ type: 'next_step', runId: run.runId });
    },
  };
}
export type HistoricalExperienceController = ReturnType<
  typeof useHistoricalExperience
>;
