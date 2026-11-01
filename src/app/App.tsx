import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import candidateDataset from '../data/verified/dataset.json';
import { HistoryEventPanel } from '../features/history';
import { Timeline, usePlayback } from '../features/timeline';
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

const titles: Record<Overlay, string> = {
  chapters: '历史专题',
  history: '事件资料',
  sources: '资料来源与史料原则',
  guide: '使用说明',
  about: '关于展馆',
};
export function App({
  input = candidateDataset,
  modules: injectedModules,
  completionStore,
}: {
  input?: unknown;
  modules?: ExperienceModules;
  completionStore?: CompletionStore;
} = {}) {
  const catalog = useMemo(() => createExperienceCatalog(input), [input]);
  const { events, routes, sources } = catalog.published;
  const [experience, dispatch] = useExperience();
  const playback = usePlayback(events);
  const { pause: pausePlayback } = playback;
  const reducedMotion = useReducedMotion();
  const [modules, setModules] = useState<ExperienceModules>({
    LegacyDetails: HistoryEventPanel,
  });
  const [phaseId, setPhaseId] = useState<string | null>(null);
  const [bookmark, setBookmark] = useState<CameraBookmark | null>(null);
  const context = useMemo<ExplorationContext>(
    () => ({
      selection: playback.activeEvent
        ? { kind: 'event', id: playback.activeEvent.id }
        : null,
      phaseId,
      bookmark,
    }),
    [playback.activeEvent, phaseId, bookmark],
  );
  const restoreContext = useCallback(
    (saved: ExplorationContext) => {
      pausePlayback();
      setPhaseId(saved.phaseId);
      setBookmark(
        restoreCameraBookmark(saved.bookmark, {
          sceneId: bookmark?.sceneId ?? null,
          phaseId: saved.phaseId,
        }),
      );
    },
    [bookmark?.sceneId, pausePlayback],
  );
  const historical = useHistoricalExperience({
    catalog,
    modules: injectedModules ?? modules,
    store: completionStore,
    context,
    pauseMacro: pausePlayback,
    restoreContext,
    reducedMotion,
    onSelect: (selection) => {
      rememberOverlayTrigger();
      if (selection.kind === 'event') playback.select(selection.id);
      dispatch({ type: 'close' });
    },
  });
  useEffect(() => {
    if (injectedModules || experience.phase !== 'exploring') return;
    let active = true;
    void loadExperienceModules()
      .then((value) => {
        if (active) setModules(value);
      })
      .catch(() => {
        if (active) setModules({ LegacyDetails: HistoryEventPanel });
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
    pausePlayback();
    dispatch({ type: 'close' });
  }, [pausePlayback, dispatch]);
  useEffect(() => {
    if (experience.phase === 'exploring') exploreRef.current?.focus();
  }, [experience.phase]);
  function home() {
    historical.clearSelection();
    setBookmark(null);
    setPhaseId(null);
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
    pausePlayback();
    if (overlay === 'history' && playback.activeEvent) {
      selectEvent(playback.activeEvent.id);
      return;
    }
    dispatch({ type: 'open', overlay });
  }
  function selectEvent(id: string) {
    openHistoricalObject({ kind: 'event', id });
  }
  function openHistoricalObject(selection: HistoricalObjectSelection) {
    historical.openHistoricalObject(selection);
  }
  return (
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
            className="exploration"
            ref={exploreRef}
            tabIndex={-1}
            aria-label="长征沙盘探索空间"
          >
            <SceneViewport
              key={sceneKey}
              events={events}
              routes={routes}
              activeEventId={playback.activeEvent?.id ?? null}
              playbackProgress={playback.progress}
              onEventSelect={selectEvent}
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
                (injectedModules ?? modules).Map
                  ? (props) => {
                      const Map = (injectedModules ?? modules).Map!;
                      return (
                        <Map
                          {...props}
                          dataset={catalog.published}
                          phaseId={phaseId}
                          selection={historical.state.selection}
                          cameraBookmark={bookmark}
                          onObjectSelect={openHistoricalObject}
                          onCameraBookmark={(value) => {
                            const result =
                              cameraBookmarkSchema.safeParse(value);
                            if (
                              result.success &&
                              result.data.phaseId === phaseId &&
                              (!bookmark ||
                                bookmark.sceneId === result.data.sceneId)
                            )
                              setBookmark(result.data);
                          }}
                        />
                      );
                    }
                  : undefined
              }
            />
            <div className="exploration-topic">
              <span className="status-dot" />
              <span>{playback.activeEvent?.title ?? '长征历史总览'}</span>
              <span className="preview-label">开发预览</span>
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
            <div className="exploration-tools">
              <button className="scene-tool" onClick={() => open('chapters')}>
                <OrnamentFrame />
                <ToolEmblem kind="chapters" />
                <span className="scene-tool-copy">
                  <strong>历史专题</strong>
                  <small>
                    {events.length
                      ? `${events.length} 个核验节点`
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
                    {playback.activeEvent ? '阅读当前事件' : '了解核验进度'}
                  </small>
                </span>
                <ForwardOrnament />
              </button>
            </div>
            <Timeline
              events={events}
              activeEventId={playback.activeEvent?.id ?? null}
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
          {experience.overlay === 'chapters' && (
            <ChapterContent
              events={events}
              activeId={playback.activeEvent?.id ?? null}
              onSelect={selectEvent}
              dataset={catalog.published}
              onObjectSelect={openHistoricalObject}
            />
          )}
          {experience.overlay === 'history' && (
            <>
              <p className="drawer-introduction">
                {playback.activeEvent
                  ? '阅读事件与关联史料，留意日期及地点精度。'
                  : '历史资料正在核验，正式专题即将开放。'}
              </p>
              <HistoryEventPanel
                event={playback.activeEvent}
                sources={sources.filter((source) =>
                  playback.activeEvent?.sourceIds.includes(source.sourceId),
                )}
                onClose={closeOverlay}
                teachingState={{ mode: 'observe', stepId: null }}
              />
            </>
          )}
          {experience.overlay === 'sources' && (
            <SourceContent sources={sources} />
          )}
          {experience.overlay === 'guide' && <GuideContent />}
          {experience.overlay === 'about' && (
            <>
              <AboutContent />
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
      />
    </div>
  );
}
