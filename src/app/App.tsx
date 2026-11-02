import {
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import releaseSnapshot from 'virtual:history-release';
import type { RegionId } from './landscape/map-regions';
import { isPanoramaSceneId } from './landscape/panorama-bookmark';
import {
  HistoryEventPanel,
  HistoricalDetailPanel,
  TeachingInteraction,
  EquivalentExperience,
  HistoryDisplayContext,
} from '../features/history';
import {
  createExhibitionCatalog,
  REGION_HISTORY,
} from './history/exhibition-catalog';
import {
  Timeline,
  PhaseTimeline,
  usePlayback,
  useHistoricalPhase,
  phaseTimeText,
} from '../features/timeline';
import { SceneViewport } from '../components/layout/SceneViewport';
import { ExhibitionLanding } from '../components/exhibition/ExhibitionLanding';
import { ExhibitionHeader } from '../components/navigation/ExhibitionHeader';
import { ExhibitionDrawer } from '../components/overlay/ExhibitionDrawer';
import {
  AboutContent,
  ChapterContent,
  GuideContent,
  SourceContent,
} from '../components/overlay/ExhibitionContent';
import { ExperienceTransition } from '../components/transition/ExperienceTransition';
import { useExperience, type Overlay } from './experience/use-experience';
import { useFullscreen } from '../hooks/use-fullscreen';
import {
  ForwardOrnament,
  OrnamentFrame,
  ToolEmblem,
} from '../components/exhibition/ExhibitionOrnaments';
import {
  cameraBookmarkSchema,
  type CameraBookmark,
  type HistoricalObjectSelection,
  type SceneError,
} from '../shared/contracts';
import { createExperienceCatalog } from './experience/historical-experience-routing';
import { useHistoricalExperience } from './experience/use-historical-experience';
import {
  loadExperienceModules,
  type ExperienceModules,
} from './experience/experience-modules';
import type { CompletionStore } from './experience/experience-completion-service';
import type { ExplorationContext } from './experience/historical-experience-reducer';
import { restoreCameraBookmark } from './experience/experience-context';
import { ExperienceHost } from '../components/experience/ExperienceHost';
import { CompletionSettings } from '../components/experience/CompletionSettings';
import { useReducedMotion } from '../hooks/use-reduced-motion';
import { useVisibilityPause } from '../hooks/use-visibility-pause';
import { HistoricalNavigation } from '../components/overlay/HistoricalNavigation';
import { ForceLegend } from '../components/layout/ForceLegend';
import {
  selectScenePhaseView,
  sceneSelection,
} from './history/scene-phase-view';
import '../styles/historical-orchestration.css';

const ExhibitionPanorama = lazy(() =>
  import('./landscape/ExhibitionPanorama').then((module) => ({
    default: module.ExhibitionPanorama,
  })),
);

const titles: Record<Overlay, string> = {
  chapters: '历史专题',
  history: '事件资料',
  sources: '资料来源与史料原则',
  guide: '使用说明',
  about: '关于展馆',
};
export function App({
  input,
  modules: injectedModules,
  completionStore,
}: {
  input?: unknown;
  modules?: ExperienceModules;
  completionStore?: CompletionStore;
} = {}) {
  const catalog = useMemo(
    () =>
      input === undefined
        ? createExhibitionCatalog(releaseSnapshot.dataset)
        : createExperienceCatalog(input),
    [input],
  );
  const { events, routes, sources } = catalog.published;
  const fullExhibition = catalog.audience === 'exhibition';
  const [experience, dispatch] = useExperience();
  const phaseMode = catalog.phaseSystem;
  const clock = useHistoricalPhase(
    catalog.published,
    experience.phase === 'exploring',
  );
  const phaseId = phaseMode ? clock.activePhaseId : null;
  const playback = usePlayback(
    events,
    !phaseMode && experience.phase === 'exploring',
  );
  const { pause: pausePlayback } = playback;
  const { pause: pausePhase, restore: restorePhase } = clock;
  const pauseMacro = useCallback(() => {
    pausePlayback();
    pausePhase();
  }, [pausePlayback, pausePhase]);
  useVisibilityPause(pauseMacro);
  const reducedMotion = useReducedMotion();
  const [modules, setModules] = useState<ExperienceModules>({
    LegacyDetails: HistoryEventPanel,
    Details: fullExhibition ? HistoricalDetailPanel : undefined,
    Teaching: fullExhibition ? TeachingInteraction : undefined,
    Equivalent: fullExhibition ? EquivalentExperience : undefined,
  });
  const panoramic = !injectedModules;
  const [observationRequest, setObservationRequest] = useState<RegionId | null>(
    null,
  );
  const observationReturnSelection = useRef<HistoricalObjectSelection | null>(
    null,
  );
  const [bookmark, setBookmark] = useState<CameraBookmark | null>(null);
  const bookmarkRef = useRef<CameraBookmark | null>(null);
  useLayoutEffect(() => {
    bookmarkRef.current = bookmark;
  }, [bookmark]);
  const phaseRef = useRef(phaseId);
  useLayoutEffect(() => {
    phaseRef.current = phaseId;
  }, [phaseId]);
  const visibleBookmark = bookmark?.phaseId === phaseId ? bookmark : null;
  const sceneView = useMemo(
    () => selectScenePhaseView(catalog.published, phaseId),
    [catalog.published, phaseId],
  );
  const sceneData = phaseMode ? sceneView.dataset : catalog.published;
  const sceneDataRef = useRef(sceneData);
  useLayoutEffect(() => {
    sceneDataRef.current = sceneData;
  }, [sceneData]);
  const context = useMemo<ExplorationContext>(
    () => ({
      topicId: phaseMode ? clock.selectedTopicId : null,
      selection: playback.activeEvent
        ? { kind: 'event', id: playback.activeEvent.id }
        : null,
      phaseId,
      bookmark: visibleBookmark,
    }),
    [
      playback.activeEvent,
      phaseId,
      visibleBookmark,
      phaseMode,
      clock.selectedTopicId,
    ],
  );
  const restoreContext = useCallback(
    (saved: ExplorationContext) => {
      pauseMacro();
      const topicId =
        saved.topicId ??
        catalog.published.phases.find((p) => p.phaseId === saved.phaseId)
          ?.topicId ??
        null;
      const valid =
        !phaseMode ||
        catalog.published.topics.some(
          (t) =>
            t.topicId === topicId &&
            (saved.phaseId === null || t.phaseIds.includes(saved.phaseId)),
        );
      if (phaseMode && valid) restorePhase(topicId, saved.phaseId);
      setBookmark(
        valid
          ? restoreCameraBookmark(saved.bookmark, {
              sceneId: bookmark?.sceneId ?? null,
              phaseId: saved.phaseId,
            })
          : null,
      );
    },
    [bookmark?.sceneId, pauseMacro, catalog.published, phaseMode, restorePhase],
  );
  const historical = useHistoricalExperience({
    catalog,
    modules: injectedModules ?? modules,
    store: completionStore,
    context,
    pauseMacro,
    restoreContext,
    reducedMotion,
    onSelect: (selection) => {
      rememberOverlayTrigger();
      if (selection.kind === 'event') playback.select(selection.id);
      dispatch({ type: 'close' });
    },
  });
  const { resetMacroSelection } = historical;
  const previousPhase = useRef(phaseId);
  useEffect(() => {
    if (previousPhase.current !== phaseId) {
      previousPhase.current = phaseId;
      if (historical.state.status === 'idle') resetMacroSelection();
      setBookmark((current) => (current?.phaseId === phaseId ? current : null));
    }
  }, [phaseId, historical.state.status, resetMacroSelection]);
  const activeEvent = phaseMode
    ? (events.find(
        (e) =>
          historical.state.selection?.kind === 'event' &&
          e.id === historical.state.selection.id &&
          clock.phase?.eventIds.includes(e.id),
      ) ?? null)
    : playback.activeEvent;
  useEffect(() => {
    if (injectedModules || experience.phase !== 'exploring') return;
    let active = true;
    void loadExperienceModules()
      .then((value) => {
        if (active) setModules(value);
      })
      .catch(() => {
        if (active)
          setModules((previous) => ({
            ...previous,
            LegacyDetails: HistoryEventPanel,
          }));
      });
    return () => {
      active = false;
    };
  }, [injectedModules, experience.phase]);
  const fullscreen = useFullscreen();
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState<SceneError | null>(null);
  const [sceneKey, setSceneKey] = useState(0);
  const enterRef = useRef<HTMLButtonElement>(null);
  const exploreRef = useRef<HTMLElement>(null);
  const overlayTriggerRef = useRef<HTMLElement | null>(null);
  const onSceneReady = useCallback(() => setReady(true), []);
  const onSceneError = useCallback(
    (error: SceneError) => setSceneError(error),
    [],
  );
  const completeEntry = useCallback(
    () => dispatch({ type: 'entered' }),
    [dispatch],
  );
  const closeOverlay = useCallback(() => {
    pauseMacro();
    dispatch({ type: 'close' });
  }, [pauseMacro, dispatch]);
  useEffect(() => {
    if (experience.phase === 'exploring') exploreRef.current?.focus();
  }, [experience.phase]);
  function home() {
    historical.clearSelection();
    setBookmark(null);
    clock.reset();
    playback.close();
    dispatch({ type: 'home' });
    window.requestAnimationFrame(() =>
      enterRef.current?.focus({ preventScroll: true }),
    );
  }
  function rememberOverlayTrigger() {
    // Native inert blurs the opener before the drawer's effect can read it.
    // Keep the original opener when a chapter opens an event in a new drawer.
    if (experience.overlay === null && historical.state.status === 'idle')
      overlayTriggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
  }
  function open(overlay: Overlay) {
    rememberOverlayTrigger();
    pauseMacro();
    const target = activeEvent ?? (phaseMode ? sceneData.events[0] : null);
    if (overlay === 'history' && target) {
      selectEvent(target.id);
      return;
    }
    dispatch({ type: 'open', overlay });
  }
  function selectEvent(id: string) {
    openHistoricalObject({ kind: 'event', id });
  }
  function openHistoricalObject(selection: HistoricalObjectSelection) {
    const current = bookmarkRef.current;
    historical.openHistoricalObject(selection, {
      ...context,
      bookmark: current?.phaseId === phaseRef.current ? current : null,
    });
  }
  function chooseTopic(id: string) {
    if (!clock.model.topics.some((t) => t.topicId === id)) return;
    historical.resetMacroSelection();
    setBookmark(null);
    clock.selectTopic(id);
  }
  function choosePhase(id: string) {
    const phase = catalog.published.phases.find((p) => p.phaseId === id);
    if (!phase) return;
    historical.resetMacroSelection();
    setBookmark(null);
    clock.restore(phase.topicId, id);
  }
  function openEventAtPhase(id: string, topicId: string, nextPhaseId: string) {
    const phase = catalog.published.phases.find(
      (p) =>
        p.phaseId === nextPhaseId &&
        p.topicId === topicId &&
        p.eventIds.includes(id),
    );
    if (!phase) return;
    clock.restore(topicId, nextPhaseId);
    historical.openHistoricalObject(
      { kind: 'event', id },
      {
        ...context,
        topicId,
        phaseId: nextPhaseId,
        bookmark:
          visibleBookmark?.phaseId === nextPhaseId ? visibleBookmark : null,
      },
    );
  }
  return (
    <HistoryDisplayContext.Provider value={fullExhibition}>
      <div className="museum-app" data-phase={experience.phase}>
        <div
          inert={
            experience.overlay !== null ||
            experience.phase === 'entering' ||
            historical.state.status !== 'idle'
          }
        >
          <a
            className="skip-link"
            href={
              experience.phase === 'landing'
                ? '#landing-content'
                : '#main-content'
            }
          >
            跳至展馆内容
          </a>
          <ExhibitionHeader
            exploring={experience.phase !== 'landing'}
            onHome={home}
            onOpen={open}
            fullscreen={fullscreen.active}
            onFullscreen={() => void fullscreen.toggle()}
          />
          {fullscreen.error && (
            <p className="fullscreen-message" role="status">
              {fullscreen.error}
            </p>
          )}
          {catalog.error && (
            <p className="fullscreen-message" role="alert">
              {catalog.error}
            </p>
          )}
          {experience.phase !== 'exploring' && (
            <ExhibitionLanding
              entering={experience.phase === 'entering'}
              onEnter={() => {
                setReady(false);
                setSceneError(null);
                dispatch({ type: 'enter' });
              }}
              onAbout={() => open('about')}
              enterRef={enterRef}
            />
          )}
          {experience.phase !== 'landing' && (
            <main
              id="main-content"
              className={`exploration${phaseMode ? ' phase-exploration' : ''}${panoramic ? ' panorama-exploration' : ''}${panoramic && phaseMode && !clock.phases.length ? ' panorama-history-empty' : ''}`}
              ref={exploreRef}
              tabIndex={-1}
              aria-label="长征沙盘探索空间"
            >
              <SceneViewport
                key={sceneKey}
                events={sceneData.events}
                routes={phaseMode ? sceneData.routes : routes}
                activeEventId={
                  activeEvent &&
                  sceneData.events.some((e) => e.id === activeEvent.id)
                    ? activeEvent.id
                    : null
                }
                playbackProgress={
                  phaseMode ? clock.progress : playback.progress
                }
                hasPublishedContent={
                  phaseMode ? clock.phase !== null : events.length > 0
                }
                onEventSelect={(id) => {
                  if (sceneDataRef.current.events.some((e) => e.id === id))
                    selectEvent(id);
                }}
                onSceneReady={onSceneReady}
                onSceneError={onSceneError}
                ready={ready}
                error={sceneError}
                onRetry={() => {
                  setReady(false);
                  setSceneError(null);
                  setBookmark(null);
                  setSceneKey((key) => key + 1);
                }}
                renderScene={
                  (injectedModules ?? modules).Map || panoramic
                    ? (props) => {
                        const Map = injectedModules
                          ? injectedModules.Map!
                          : ExhibitionPanorama;
                        return (
                          <Map
                            {...props}
                            {...(panoramic && fullExhibition
                              ? {
                                  observationRequest,
                                  onObservationClosed: () => {
                                    setObservationRequest(null);
                                    const selection =
                                      observationReturnSelection.current;
                                    observationReturnSelection.current = null;
                                    if (selection)
                                      window.requestAnimationFrame(() =>
                                        openHistoricalObject(selection),
                                      );
                                  },
                                  onRegionHistory: (region: string) => {
                                    const topic = catalog.published.topics.find(
                                      (t) =>
                                        t.topicId === REGION_HISTORY[region],
                                    );
                                    const phase = catalog.published.phases.find(
                                      (p) => p.phaseId === topic?.phaseIds[0],
                                    );
                                    const id = topic?.eventIds[0];
                                    if (id && phase)
                                      openEventAtPhase(
                                        id,
                                        phase.topicId,
                                        phase.phaseId,
                                      );
                                  },
                                  historyRegions: Object.keys(
                                    REGION_HISTORY,
                                  ).filter((region) =>
                                    catalog.published.topics.some(
                                      (t) =>
                                        t.topicId === REGION_HISTORY[region],
                                    ),
                                  ),
                                }
                              : {})}
                            dataset={sceneData}
                            phaseId={phaseId}
                            selection={sceneSelection(
                              sceneData,
                              historical.state.selection,
                            )}
                            cameraBookmark={visibleBookmark}
                            onObjectSelect={(selection) => {
                              if (
                                sceneSelection(sceneDataRef.current, selection)
                              )
                                openHistoricalObject(selection);
                            }}
                            onCameraBookmark={(value) => {
                              const result =
                                cameraBookmarkSchema.safeParse(value);
                              if (
                                result.success &&
                                result.data.phaseId === phaseRef.current &&
                                (!bookmark ||
                                  bookmark.sceneId === result.data.sceneId ||
                                  (panoramic &&
                                    isPanoramaSceneId(bookmark.sceneId) &&
                                    isPanoramaSceneId(result.data.sceneId)))
                              ) {
                                bookmarkRef.current = result.data;
                                setBookmark(result.data);
                              }
                            }}
                          />
                        );
                      }
                    : undefined
                }
              />
              <div
                className={`exploration-topic${phaseMode ? ' phase-overview' : ''}`}
              >
                <span className="status-dot" />
                {phaseMode ? (
                  <div>
                    <span>{clock.topic?.title ?? '历史专题正在核验'}</span>
                    <h2>{clock.phase?.title ?? '暂无可发布历史阶段'}</h2>
                    <p>
                      {clock.phase
                        ? phaseTimeText(clock.phase)
                        : '史料核验中，正式内容暂未开放。'}
                    </p>
                    {activeEvent && <p>当前事件：{activeEvent.title}</p>}
                  </div>
                ) : (
                  <span>{activeEvent?.title ?? '长征历史总览'}</span>
                )}
                {import.meta.env.DEV &&
                  import.meta.env.MODE !== 'production' && (
                    <span className="preview-label">开发预览</span>
                  )}
                {historical.state.selection && (
                  <button
                    className="clear-selection"
                    onClick={() => {
                      historical.clearSelection();
                      playback.close();
                    }}
                  >
                    取消当前选择
                  </button>
                )}
              </div>
              {phaseMode && (
                <>
                  {(!panoramic || sceneError) && (
                    <ForceLegend
                      state={sceneView.forces}
                      hasV2Renderer={
                        !!(injectedModules ?? modules).Map || panoramic
                      }
                    />
                  )}
                  {sceneView.forces.schematic && (
                    <p className="phase-schematic" role="note">
                      宏观示意，非真实行军路线。
                    </p>
                  )}
                  {clock.model.error && (
                    <p className="fullscreen-message" role="alert">
                      {clock.model.error}
                    </p>
                  )}
                </>
              )}
              <div className="exploration-tools">
                <button className="scene-tool" onClick={() => open('chapters')}>
                  <OrnamentFrame />
                  <ToolEmblem kind="chapters" />
                  <span className="scene-tool-copy">
                    <strong>历史专题</strong>
                    <small>
                      {events.length
                        ? `${catalog.published.topics.length} 个专题 · ${events.length} 个事件`
                        : '专题核验中'}
                    </small>
                  </span>
                  <ForwardOrnament />
                </button>
                <button className="scene-tool" onClick={() => open('history')}>
                  <OrnamentFrame />
                  <ToolEmblem kind="history" />
                  <span className="scene-tool-copy">
                    <strong>事件资料</strong>
                    <small>
                      {activeEvent
                        ? '阅读当前事件'
                        : phaseMode && sceneData.events.length
                          ? '阅读当前阶段事件'
                          : '了解核验进度'}
                    </small>
                  </span>
                  <ForwardOrnament />
                </button>
              </div>
              {phaseMode ? (
                <PhaseTimeline
                  clock={clock}
                  events={sceneData.events}
                  activeEventId={activeEvent?.id ?? null}
                  onSelectPhase={choosePhase}
                  onSelectEvent={selectEvent}
                />
              ) : (
                <Timeline
                  events={events}
                  activeEventId={activeEvent?.id ?? null}
                  playing={playback.playing}
                  progress={playback.progress}
                  onToggle={playback.toggle}
                  onPrevious={() => {
                    const event = events[Math.max(0, playback.index - 1)];
                    if (event) selectEvent(event.id);
                  }}
                  onNext={() => {
                    const event =
                      events[Math.min(events.length - 1, playback.index + 1)];
                    if (event) selectEvent(event.id);
                  }}
                  onSelect={selectEvent}
                />
              )}
            </main>
          )}
        </div>
        {experience.phase === 'entering' && (
          <ExperienceTransition onComplete={completeEntry} onCancel={home} />
        )}
        {experience.overlay && (
          <ExhibitionDrawer
            key={experience.overlay}
            title={titles[experience.overlay]}
            onClose={closeOverlay}
            returnFocusRef={overlayTriggerRef}
          >
            {experience.overlay === 'chapters' && phaseMode && (
              <HistoricalNavigation
                dataset={catalog.published}
                fullExhibition={fullExhibition}
                topicId={clock.selectedTopicId}
                phaseId={phaseId}
                onTopic={chooseTopic}
                onPhase={choosePhase}
                onObjectSelect={openHistoricalObject}
                onEventAtPhase={openEventAtPhase}
              />
            )}
            {experience.overlay === 'chapters' && !phaseMode && (
              <ChapterContent
                events={events}
                activeId={activeEvent?.id ?? null}
                onSelect={selectEvent}
                dataset={catalog.published}
                onObjectSelect={openHistoricalObject}
              />
            )}
            {experience.overlay === 'history' && (
              <>
                <p className="drawer-introduction">
                  {activeEvent
                    ? '阅读事件与关联史料，留意日期及地点精度。'
                    : '历史资料正在核验，正式专题即将开放。'}
                </p>
                <HistoryEventPanel
                  event={activeEvent}
                  sources={sources.filter((source) =>
                    activeEvent?.sourceIds.includes(source.sourceId),
                  )}
                  onClose={closeOverlay}
                  teachingState={{ mode: 'observe', stepId: null }}
                />
              </>
            )}
            {experience.overlay === 'sources' && (
              <SourceContent
                sources={sources}
                fullExhibition={fullExhibition}
              />
            )}
            {experience.overlay === 'guide' && (
              <GuideContent fullExhibition={fullExhibition} />
            )}
            {experience.overlay === 'about' && (
              <>
                <AboutContent fullExhibition={fullExhibition} />
                <CompletionSettings onClear={historical.clearRecords} />
                {historical.snapshot.notice && (
                  <p role="status">{historical.snapshot.notice}</p>
                )}
              </>
            )}
          </ExhibitionDrawer>
        )}
        <ExperienceHost
          controller={historical}
          returnFocusRef={overlayTriggerRef}
          onVisualExperience={
            fullExhibition
              ? (topicId: string) => {
                  const region = Object.keys(REGION_HISTORY).find(
                    (key) => REGION_HISTORY[key] === topicId,
                  );
                  if (!region) return;
                  observationReturnSelection.current =
                    historical.state.selection;
                  historical.close();
                  pauseMacro();
                  setObservationRequest(region as RegionId);
                }
              : undefined
          }
        />
      </div>
    </HistoryDisplayContext.Provider>
  );
}
