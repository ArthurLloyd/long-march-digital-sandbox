import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ArrowUpRight, Mountain, Compass, Play } from 'lucide-react';
import {
  HistoricalDetailPanel,
  HistoryEventPanel,
  TeachingInteraction,
  EquivalentExperience,
  HistoryDisplayContext,
} from '../../features/history';
import {
  useHistoricalPhase,
  journeyChapters,
  journeyDuration,
  sampleJourney,
  sampleTrack,
  journeyTrackProgress,
  sameJourneyRegion,
  type JourneyState,
} from '../../features/timeline';
import { ExhibitionLanding } from '../../components/exhibition/ExhibitionLanding';
import { ExhibitionHeader } from '../../components/navigation/ExhibitionHeader';
import { ExperienceTransition } from '../../components/transition/ExperienceTransition';
import { SceneViewport } from '../../components/layout/SceneViewport';
import { ExhibitionDrawer } from '../../components/overlay/ExhibitionDrawer';
import {
  AboutContent,
  SourceContent,
} from '../../components/overlay/ExhibitionContent';
import { ExperienceHost } from '../../components/experience/ExperienceHost';
import { CompletionSettings } from '../../components/experience/CompletionSettings';
import { useExperience, type Overlay } from '../experience/use-experience';
import { useHistoricalExperience } from '../experience/use-historical-experience';
import {
  loadExperienceModules,
  type ExperienceModules,
} from '../experience/experience-modules';
import type { CompletionStore } from '../experience/experience-completion-service';
import { useFullscreen } from '../../hooks/use-fullscreen';
import { useVisibilityPause } from '../../hooks/use-visibility-pause';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import type {
  CameraBookmark,
  HistoricalObjectSelection,
  SceneError,
} from '../../shared/contracts';
import type {
  PanoramaBookmark,
  PanoramaMapAdapter,
} from '../landscape/map-renderer';
import {
  GEOGRAPHIC_VIEWS,
  REGIONS,
  type RegionId,
} from '../landscape/map-regions';
import { selectScenePhaseView } from '../history/scene-phase-view';
import {
  createJourneyContent,
  journeyRegionMap,
  eventGeographicRegion,
  isGeographicRegion,
} from './exhibition-content';
import { StoryDialog } from './StoryDialog';
import { JourneyArrival } from './JourneyArrival';
import { OrnamentFrame } from '../../components/exhibition/ExhibitionOrnaments';
import { JourneyControls } from './JourneyControls';
import { CampaignSituation } from './CampaignSituation';
import { CampaignNarration } from './CampaignNarration';
import { JourneyFilm } from './JourneyFilm';
import { JourneyEpilogue } from './JourneyEpilogue';
import { eventTerrainBounds } from '../landscape/event-terrain';
import { campaignBeat } from '../../shared/content/chishui-campaign';
import '../../styles/exhibition-journey.css';
const Panorama = lazy(() =>
  import('../landscape/ExhibitionPanorama').then((m) => ({
    default: m.ExhibitionPanorama,
  })),
);
interface SavedMap {
  journey: JourneyState;
  region: RegionId | null;
  storyId: string | null;
  camera: PanoramaBookmark | null;
  source: 'full' | 'region' | 'story' | 'teaching';
}

/** Normal exhibition composition. Reuses the original home, map, A module and C1 controller. */
export function ExhibitionJourney({
  input,
  completionStore,
}: {
  input: unknown;
  completionStore?: CompletionStore;
}) {
  const content = useMemo(
    () => createJourneyContent(input, 'exhibition'),
    [input],
  );
  const [screen, dispatch] = useExperience();
  const clock = useHistoricalPhase(
    content.dataset,
    screen.phase === 'exploring',
    content.plan,
  );
  const { transport, state } = clock.journey!;
  const sample = sampleJourney(content.plan, state.sequenceId, state.time);
  const [browsedRegion, setRegion] = useState<RegionId | null | undefined>(
    'ruijin',
  );
  const [wantOpening, setOpening] = useState(true);
  const opening =
    wantOpening && state.time === 0 && state.sequenceId === 'central';
  const activeCampaign = campaignBeat(sample.chapter?.id, sample.progress);
  const journeyStage = sample.stage;
  const campaignFilm = Boolean(
    state.cinematic &&
    state.camera === 'follow' &&
    !opening &&
    (sample.chapter?.id.startsWith('chapter-event-sd') ||
      sample.chapter?.id === 'chapter-event-js' ||
      sample.chapter?.id === 'chapter-event-zy-resolution'),
  );
  const transferring =
    !opening &&
    journeyStage !== 'local' &&
    browsedRegion === undefined &&
    state.camera !== 'free';
  const region = opening
    ? 'ruijin'
    : transferring
      ? null
      : browsedRegion !== undefined
        ? browsedRegion
        : isGeographicRegion(sample.chapter?.regionId ?? null)
          ? (sample.chapter!.regionId as RegionId)
          : null;
  const [storyId, setStoryId] = useState<string | null>(null);
  const activeStoryId = storyId;
  const [directoryScope, setDirectoryScope] = useState<'region' | 'sequence'>(
    'region',
  );
  const [sourcesFilter, setSourcesFilter] = useState<string[] | null>(null);
  const [sourceReturn, setSourceReturn] = useState<string | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState<SceneError | null>(null),
    [sceneKey, setSceneKey] = useState(0);
  const [observationRequest, setObservationRequest] = useState<RegionId | null>(
    null,
  );
  const [scope, setScope] = useState<'single' | 'continuous'>('single');
  const api = useRef<PanoramaMapAdapter | null>(null),
    bookmark = useRef<CameraBookmark | null>(null);
  const savedMap = useRef<SavedMap | null>(null),
    storyCamera = useRef<PanoramaBookmark | null>(null);
  const trigger = useRef<HTMLElement | null>(null),
    enterRef = useRef<HTMLButtonElement>(null),
    exploreRef = useRef<HTMLElement>(null);
  const full = useFullscreen(),
    reducedMotion = useReducedMotion();
  const [modules, setModules] = useState<ExperienceModules>({
    LegacyDetails: HistoryEventPanel,
    Details: HistoricalDetailPanel,
    Teaching: TeachingInteraction,
    Equivalent: EquivalentExperience,
  });
  useEffect(() => {
    if (screen.phase !== 'exploring') return;
    let live = true;
    void loadExperienceModules()
      .then((m) => {
        if (live) setModules(m);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [screen.phase]);
  useVisibilityPause(transport.pause);
  const remember = () => {
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };
  const snapshot = (source: SavedMap['source']): SavedMap => ({
    journey: { ...transport.read(), seen: [...transport.read().seen] },
    region,
    storyId: activeStoryId ?? transport.read().pendingEventId,
    camera: api.current?.bookmark() ?? null,
    source,
  });
  const restoreSaved = useCallback(() => {
    const saved = savedMap.current;
    if (!saved) return;
    transport.restore(saved.journey);
    setRegion(saved.region);
    if (saved.camera) api.current?.restore(saved.camera);
    if (saved.source === 'story') setStoryId(saved.storyId);
    savedMap.current = null;
  }, [transport, setRegion, setStoryId]);
  const historical = useHistoricalExperience({
    catalog: content.catalog,
    modules,
    store: completionStore,
    context: {
      topicId: clock.selectedTopicId,
      phaseId: clock.activePhaseId,
      selection: activeStoryId ? { kind: 'event', id: activeStoryId } : null,
      bookmark: null,
    },
    pauseMacro: transport.pause,
    restoreContext: restoreSaved,
    reducedMotion,
  });
  const openStory = useCallback(
    (id: string) => {
      const event = content.dataset.events.find(
        (e) => e.id === id && e.reviewStatus !== 'rejected',
      );
      if (!event) return;
      trigger.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      storyCamera.current = api.current?.bookmark() ?? null;
      transport.visit(id);
      setStoryId(id);
      dispatch({ type: 'close' });
    },
    [content.dataset.events, transport, dispatch, setStoryId],
  );
  useEffect(() => {
    if (state.pendingEventId)
      storyCamera.current = api.current?.bookmark() ?? null;
  }, [state.pendingEventId]);
  const closeStory = () => {
    setStoryId(null);
    transport.acknowledge();
    if (storyCamera.current) api.current?.restore(storyCamera.current);
    requestAnimationFrame(() => {
      const target = trigger.current?.isConnected
        ? trigger.current
        : document.querySelector<HTMLElement>('.journey-chapter-entry');
      target?.focus({ preventScroll: true });
    });
  };
  const chapterId = sample.chapter?.id;
  const previousChapter = useRef<{
    id: string;
    region: string;
    camera: string;
    stage: string;
    arrival: string | null;
  } | null>(null);
  useEffect(() => {
    if (!ready || opening) return;
    const chapter = content.plan.chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    const previous = previousChapter.current;
    if (
      previous?.id === chapter.id &&
      previous.camera === state.camera &&
      previous.stage === journeyStage &&
      (!state.pendingEventId || previous.arrival === state.pendingEventId)
    )
      return;
    const transition =
      previous && !sameJourneyRegion(previous.region, chapter.regionId)
        ? 'regional'
        : 'local';
    previousChapter.current = {
      id: chapter.id,
      region: chapter.regionId,
      camera: state.camera,
      stage: journeyStage,
      arrival: state.pendingEventId,
    };
    const p = content.map.entries.find((p) =>
      chapter.eventIds.includes(p.eventId),
    );
    api.current?.setChapterLandmark?.(p?.anchorCoordinates ?? null);
    // Terrain readiness is independent of camera mode and of the reading
    // pause. Otherwise the very arrival that should reveal a region skips it.
    if (previous?.id !== chapter.id || journeyStage === 'local') {
      const localBounds = p ? eventTerrainBounds(p.anchorCoordinates) : null;
      if (localBounds) api.current?.prepareRegion?.(null, localBounds);
      else if (isGeographicRegion(chapter.regionId))
        api.current?.prepareRegion?.(chapter.regionId);
      else if (p?.bounds) api.current?.prepareRegion?.(null, p.bounds);
    }
    if (state.camera === 'free') {
      api.current?.holdCamera?.();
      return;
    }
    const currentSample = sampleJourney(
      content.plan,
      transport.read().sequenceId,
      transport.read().time,
    );
    const tracks = currentSample.tracks;
    const held = content.plan.tracks.some(
      (t) =>
        (t.holdChapterIds ?? []).includes(chapter.id) &&
        (!t.sequenceIds || t.sequenceIds.includes(transport.read().sequenceId)),
    );
    if (journeyStage !== 'local' && tracks.length) {
      // One broad moving shot through the whole corridor, no second stage snap.
      if (previous?.id !== chapter.id || previous.camera !== state.camera)
        api.current?.frameMarch?.(tracks.flatMap((t) => t.points));
      return;
    }
    const continuous =
      previous &&
      previous.id !== chapter.id &&
      previous.region !== chapter.regionId &&
      sameJourneyRegion(previous.region, chapter.regionId);
    if (continuous) return;
    if ((tracks.length || held) && api.current?.focusMarch) {
      api.current.focusMarch('follow');
      return;
    }
    const point = tracks[0]?.points.at(-1) ?? p?.anchorCoordinates;
    if (point)
      api.current?.focusGeo(
        point,
        p?.bounds ?? undefined,
        transition,
        isGeographicRegion(chapter.regionId) ? chapter.regionId : undefined,
      );
    else if (isGeographicRegion(chapter.regionId))
      api.current?.focus(REGIONS[chapter.regionId]);
    else api.current?.overview();
  }, [
    chapterId,
    state.camera,
    state.pendingEventId,
    ready,
    content,
    opening,
    journeyStage,
    transport,
  ]);
  useEffect(() => {
    if (screen.phase === 'exploring') exploreRef.current?.focus();
  }, [screen.phase]);
  const view = useMemo(
    () => selectScenePhaseView(content.dataset, clock.activePhaseId),
    [content.dataset, clock.activePhaseId],
  );
  const regionalMap = journeyRegionMap(
    content,
    region ??
      (browsedRegion === undefined && journeyStage === 'local'
        ? (sample.chapter?.regionId ?? null)
        : null),
  );
  const onReady = useCallback(() => setReady(true), []),
    onError = useCallback((e: SceneError) => setError(e), []);
  const onBookmark = useCallback((value: CameraBookmark) => {
    bookmark.current = value;
  }, []);
  const onAdapter = useCallback((value: PanoramaMapAdapter | null) => {
    api.current = value;
  }, []);
  const beginObservation = (
    id: RegionId,
    mode: 'single' | 'continuous',
    source: SavedMap['source'],
  ) => {
    remember();
    savedMap.current = snapshot(source);
    transport.acknowledge();
    transport.pause();
    setScope(mode);
    setStoryId(null);
    setObservationRequest(id);
  };
  const open = (overlay: Overlay) => {
    remember();
    transport.acknowledge();
    transport.pause();
    setSourcesFilter(null);
    setSourceReturn(null);
    dispatch({ type: 'open', overlay });
  };
  const origin = () => {
    transport.pause();
    transport.cinematic(false);
    transport.sequence('central');
    transport.restart();
    transport.camera('follow');
    transport.distance(1);
    setOpening(true);
    setRegion('ruijin');
    api.current?.entry();
  };
  const home = () => {
    transport.reset();
    setStoryId(null);
    setOpening(true);
    setRegion('ruijin');
    dispatch({ type: 'home' });
    requestAnimationFrame(() => enterRef.current?.focus());
  };
  const story = content.dataset.events.find((e) => e.id === activeStoryId);
  const [completedTour, setCompletedTour] = useState(false);
  const endingOpen =
    (completedTour ||
      state.pendingEventId === 'ex-event-jiangtai' ||
      (state.cinematic &&
        !!state.pendingEventId &&
        state.time === journeyDuration(content.plan, state.sequenceId))) &&
    !story &&
    !screen.overlay &&
    !observationRequest;
  const modal = Boolean(
    story || screen.overlay || historical.state.status !== 'idle' || endingOpen,
  );
  const chapterItems = journeyChapters(content.plan, state.sequenceId);
  const jump = (id: string, read = false) => {
    let c = chapterItems.find((c) => c.id === id);
    if (!c) {
      const sequence = content.plan.sequences.find((s) =>
        s.chapterIds.includes(id),
      );
      if (sequence) {
        transport.sequence(sequence.id);
        c = journeyChapters(content.plan, sequence.id).find((c) => c.id === id);
      }
    }
    if (!c) return;
    setOpening(false);
    setRegion(undefined);
    const current = sampleJourney(
      content.plan,
      transport.read().sequenceId,
      transport.read().time,
    ).chapter;
    if (!current || !sameJourneyRegion(current.regionId, c.regionId))
      transport.camera('follow');
    transport.seek(c.start);
    dispatch({ type: 'close' });
    if (read && c.eventIds[0]) openStory(c.eventIds[0]);
  };
  const overlayClose = () => {
    dispatch({ type: 'close' });
    if (sourceReturn) {
      setStoryId(sourceReturn);
      setSourceReturn(null);
    }
  };
  return (
    <HistoryDisplayContext.Provider value>
      <div className="museum-app journey-exhibition" data-phase={screen.phase}>
        <div inert={modal || screen.phase === 'entering'}>
          <ExhibitionHeader
            exploring={screen.phase !== 'landing'}
            onHome={home}
            onOpen={open}
            fullscreen={full.active}
            onFullscreen={() => void full.toggle()}
          />
          {screen.phase !== 'exploring' && (
            <ExhibitionLanding
              entering={screen.phase === 'entering'}
              onEnter={() => {
                setReady(false);
                setError(null);
                dispatch({ type: 'enter' });
              }}
              onAbout={() => open('about')}
              enterRef={enterRef}
            />
          )}
          {screen.phase !== 'landing' && (
            <main
              id="main-content"
              className="exploration panorama-exploration journey-exploration"
              data-film={Boolean(state.cinematic && !opening)}
              data-campaign-film={campaignFilm}
              ref={exploreRef}
              tabIndex={-1}
              aria-label="长征沙盘探索空间"
            >
              <SceneViewport
                key={sceneKey}
                events={view.dataset.events}
                routes={view.dataset.routes}
                activeEventId={storyId}
                playbackProgress={
                  state.time /
                  Math.max(1, journeyDuration(content.plan, state.sequenceId))
                }
                hasPublishedContent
                onEventSelect={openStory}
                onSceneReady={onReady}
                onSceneError={onError}
                ready={ready}
                error={error}
                onRetry={() => {
                  setReady(false);
                  setError(null);
                  setSceneKey((k) => k + 1);
                }}
                renderScene={(sceneProps) => (
                  <Panorama
                    {...sceneProps}
                    dataset={view.dataset}
                    phaseId={clock.activePhaseId}
                    selection={storyId ? { kind: 'event', id: storyId } : null}
                    cameraBookmark={null}
                    onObjectSelect={(s: HistoricalObjectSelection) => {
                      if (s.kind === 'event') openStory(s.id);
                    }}
                    onCameraBookmark={onBookmark}
                    eventMap={regionalMap}
                    eventMapReading={Boolean(story)}
                    arrivalEventId={state.pendingEventId}
                    arrivalCoordinates={
                      state.pendingEventId
                        ? (() => {
                            const track = sample.tracks.find(
                              (t) => t.unitId === state.unitId,
                            );
                            return track
                              ? sampleTrack(
                                  track,
                                  journeyTrackProgress(track, sample),
                                )?.coordinates
                              : null;
                          })()
                        : null
                    }
                    journey={transport}
                    showMarch={
                      !opening &&
                      (state.playing ||
                        state.time > 0 ||
                        region !== null ||
                        state.sequenceId === 'red25')
                    }

                    opening={opening}
                    geographicRegion={region}
                    campaignFilm={campaignFilm ? sample.chapter?.id : undefined}
                    marchRegion={
                      state.camera === 'follow' && !opening
                        ? sample.chapter?.regionId
                        : undefined
                    }
                    onBrowseRegion={(id) => {
                      transport.pause();
                      transport.camera('free');
                      setOpening(false);
                      setRegion(id);
                    }}
                    onMapAdapter={onAdapter}
                    onGeographicBrowse={(id) => {
                      setOpening(false);
                      setRegion(id);
                    }}
                    onExhibitionPreview={transport.pause}
                    onExhibitionRead={openStory}
                    observationRequest={observationRequest}
                    observationScope={scope}
                    onObservationOpened={transport.pause}
                    onTourComplete={() => setCompletedTour(true)}
                    onObservationClosed={() => {
                      setObservationRequest(null);
                      restoreSaved();
                    }}
                  />
                )}
              />
              {opening && (
                <div className="journey-opening-copy" data-map-obstacle="true">
                  <h2>
                    山河之间，
                    <br />
                    等待历史的回响。
                  </h2>
                  <p>从瑞金启程，走近不同部队汇聚的长征之路。</p>
                  <button
                    className="journey-start-button"
                    onClick={() => {
                      remember();
                      setOpening(false);
                      setRegion(undefined);
                      transport.camera('follow');
                      transport.distance(1);
                      transport.cinematic(true);
                      transport.play();
                    }}
                  >
                    <OrnamentFrame />
                    <Play size={18} />
                    <span>开始行军</span>
                    <ArrowUpRight size={19} />
                  </button>
                  <button
                    className="journey-explore-button"
                    onClick={() => {
                      setOpening(false);
                      transport.camera('free');
                    }}
                  >
                    <Compass size={19} />
                    <span>自由探索山河</span>
                  </button>
                </div>
              )}
              {!opening &&
                sample.chapter &&
                !state.cinematic &&
                !activeCampaign && (
                  <CampaignSituation
                    research={content.campaign}
                    chapterId={sample.chapter.id}
                    progress={Math.min(
                      1,
                      sample.progress / sample.chapter.arrival,
                    )}
                  />
                )}
              {region && !opening && (
                <button
                  className="journey-experience-entry"
                  data-map-obstacle="true"
                  onClick={() => beginObservation(region, 'single', 'region')}
                >
                  <Mountain size={18} />
                  {GEOGRAPHIC_VIEWS.find((v) => v.id === region)?.title} ·
                  区域体验
                  <ArrowUpRight size={16} />
                </button>
              )}
              {!region &&
                !opening &&
                sample.chapter &&
                !isGeographicRegion(sample.chapter.regionId) && (
                  <button
                    className="journey-experience-entry"
                    data-map-obstacle="true"
                    onClick={() => {
                      const id = sample.chapter?.eventIds[0];
                      if (id) openStory(id);
                    }}
                  >
                    <BookOpen size={18} aria-hidden="true" />
                    阅读本章故事
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                )}
              {!opening &&
                !story &&
                !screen.overlay &&
                !observationRequest &&
                !state.cinematic &&
                activeCampaign &&
                sample.chapter &&
                (region === null ||
                  region === 'chishui' ||
                  browsedRegion === undefined) && (
                  <CampaignNarration
                    chapterId={sample.chapter.id}
                    progress={sample.progress}
                    onRead={() => {
                      const id = sample.chapter?.eventIds[0];
                      if (id) openStory(id);
                    }}
                    onBeat={(index) => {
                      const timed = journeyChapters(
                        content.plan,
                        state.sequenceId,
                      ).find((c) => c.id === sample.chapter?.id);
                      if (timed)
                        transport.seek(
                          timed.start + timed.duration * [0, 0.28, 0.6][index]!,
                        );
                    }}
                    onSources={(ids) => {
                      open('sources');
                      setSourcesFilter(ids);
                    }}
                  />
                )}
              {!opening &&
                state.cinematic &&
                sample.chapter?.cues &&
                !modal &&
                !observationRequest && (
                  <JourneyFilm
                    id={sample.chapter.id}
                    title={sample.chapter.title}
                    date={sample.chapter.dateText}
                    cues={sample.chapter.cues}
                    situation={content.campaign.stages.find((s) =>
                      s.chapterIds.includes(sample.chapter!.id),
                    )}
                    progress={sample.progress}
                    onRead={() => {
                      const id = sample.chapter?.eventIds[0];
                      if (id) openStory(id);
                    }}
                    onSeek={(at) => {
                      if (sample.chapter)
                        transport.seek(
                          sample.chapter.start + sample.chapter.duration * at,
                        );
                    }}
                  />
                )}
              {state.pendingEventId &&
                !endingOpen &&
                !story &&
                !screen.overlay &&
                !observationRequest &&
                historical.state.status === 'idle' && (
                  <JourneyArrival
                    eventId={state.pendingEventId}
                    title={
                      content.dataset.events.find(
                        (e) => e.id === state.pendingEventId,
                      )?.title ?? '历史事件'
                    }
                    onOpen={openStory}
                    autoOpen={!activeCampaign}
                  />
                )}
              <JourneyControls
                onDefaultView={() => api.current?.focusMarch?.('follow')}
                onNavigate={() => {
                  setOpening(false);
                  setRegion(undefined);
                }}
                onInteraction={remember}
                transport={transport}
                state={state}
                onBrowse={() => {
                  transport.cinematic(false);
                  transport.pause();
                  transport.camera('free');
                  setOpening(false);
                  setRegion(null);
                  api.current?.overview();
                }}
                onFullExperience={() =>
                  beginObservation('ruijin', 'continuous', 'full')
                }
                onOrigin={origin}
              />
              <button
                className="journey-chapter-entry"
                data-map-obstacle="true"
                onClick={() => open('chapters')}
              >
                <BookOpen size={17} />
                历史章节
              </button>
            </main>
          )}
        </div>
        {screen.phase === 'entering' && (
          <ExperienceTransition
            onComplete={() => dispatch({ type: 'entered' })}
            onCancel={home}
          />
        )}
        {story && (
          <StoryDialog
            key={story.id}
            event={story}
            dataset={content.dataset}
            extension={content.supplement.storyExtensions[story.id]}
            onRelated={openStory}
            returnFocusRef={trigger}
            onClose={closeStory}
            onContinue={() => {
              closeStory();
              transport.play();
            }}
            onSources={(ids) => {
              transport.acknowledge();
              setSourcesFilter(ids);
              setSourceReturn(story.id);
              setStoryId(null);
              dispatch({ type: 'open', overlay: 'sources' });
            }}
          />
        )}
        {endingOpen && (
          <JourneyEpilogue
            returnFocusRef={trigger}
            onClose={() => {
              setCompletedTour(false);
              transport.acknowledge();
            }}
            onRestart={() => {
              setCompletedTour(false);
              transport.acknowledge();
              origin();
            }}
            onStory={() => {
              setCompletedTour(false);
              transport.acknowledge();
              openStory(state.pendingEventId ?? 'ex-event-jiangtai');
            }}
          />
        )}
        {screen.overlay && (
          <ExhibitionDrawer
            title={
              {
                chapters: '历史章节',
                history: '历史故事',
                sources: '资料来源',
                guide: '使用说明',
                about: '关于展馆',
              }[screen.overlay]
            }
            onClose={overlayClose}
            returnFocusRef={trigger}
            className="journey-directory-dialog"
          >
            {screen.overlay === 'chapters' && (
              <div className="journey-chapter-directory">
                <p>
                  章节先后用于叙事；示意路线与道路几何分别记录。没有区间依据时使用章节转场。
                </p>
                {region && (
                  <nav
                    className="journey-directory-scope"
                    aria-label="章节范围"
                  >
                    <button
                      aria-pressed={directoryScope === 'region'}
                      onClick={() => setDirectoryScope('region')}
                    >
                      {GEOGRAPHIC_VIEWS.find((v) => v.id === region)?.title}故事
                    </button>
                    <button
                      aria-pressed={directoryScope === 'sequence'}
                      onClick={() => setDirectoryScope('sequence')}
                    >
                      本序列全部章节
                    </button>
                  </nav>
                )}
                {(region && directoryScope === 'region'
                  ? content.plan.chapters.filter((c) =>
                      c.eventIds.some(
                        (id) => eventGeographicRegion(content, id) === region,
                      ),
                    )
                  : chapterItems
                ).map((c) => (
                  <article key={c.id}>
                    <div>
                      <h3>{c.title}</h3>
                      <time>{c.dateText}</time>
                    </div>
                    <button onClick={() => jump(c.id)}>前往章节</button>
                    <button onClick={() => jump(c.id, true)}>阅读故事</button>
                  </article>
                ))}
                <details className="journey-reference-index">
                  <summary>人物与地点</summary>
                  {content.dataset.people.map((p) => (
                    <section key={p.personId}>
                      <h3>{p.name}</h3>
                      <p>{p.summary}</p>
                      {p.relatedEventIds.map((id) => {
                        const e = content.dataset.events.find(
                          (e) => e.id === id,
                        );
                        return e ? (
                          <button key={id} onClick={() => openStory(id)}>
                            {e.title}
                          </button>
                        ) : null;
                      })}
                    </section>
                  ))}
                  {content.dataset.places.map((p) => (
                    <section key={p.placeId}>
                      <h3>{p.historicalName}</h3>
                      <p>{p.summary}</p>
                      {p.relatedEventIds.map((id) => {
                        const e = content.dataset.events.find(
                          (e) => e.id === id,
                        );
                        return e ? (
                          <button key={id} onClick={() => openStory(id)}>
                            {e.title}
                          </button>
                        ) : null;
                      })}
                    </section>
                  ))}
                </details>
                <details className="journey-reference-index">
                  <summary>双方部队与阶段资料</summary>
                  {content.dataset.forceTracks.map((t) => (
                    <section key={t.trackId}>
                      <h3>{t.name}</h3>
                      <p>
                        {t.snapshotIds
                          .map((id) => {
                            const snapshot =
                              content.dataset.forceSnapshots.find(
                                (s) => s.snapshotId === id,
                              );
                            return content.dataset.phases.find(
                              (p) => p.phaseId === snapshot?.phaseId,
                            )?.title;
                          })
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <small>{t.sourceIds.join(' · ')}</small>
                    </section>
                  ))}
                </details>
              </div>
            )}
            {screen.overlay === 'sources' && (
              <div className="journey-source-directory">
                <h3>历史事件与人物</h3>
                <details>
                  <summary>来源关联的故事</summary>
                  {content.dataset.events
                    .filter(
                      (e) =>
                        !sourcesFilter ||
                        [
                          ...e.sourceIds,
                          ...(content.supplement.storyExtensions[e.id]
                            ?.sourceIds ?? []),
                        ].some((id) => sourcesFilter.includes(id)),
                    )
                    .map((e) => (
                      <article key={e.id}>
                        <button onClick={() => openStory(e.id)}>
                          {e.title}
                        </button>
                        <small>
                          {[
                            ...new Set([
                              ...e.sourceIds,
                              ...(content.supplement.storyExtensions[e.id]
                                ?.sourceIds ?? []),
                            ]),
                          ].join(' · ')}
                        </small>
                      </article>
                    ))}
                </details>
                <details>
                  <summary>原始资料与编审注记</summary>
                  {content.dataset.events
                    .filter(
                      (e) =>
                        !sourcesFilter ||
                        e.sourceIds.some((id) => sourcesFilter.includes(id)),
                    )
                    .map((e) => (
                      <section key={e.id}>
                        <h4>{e.title}</h4>
                        <p>{e.detail}</p>
                      </section>
                    ))}
                  {content.dataset.people
                    .filter(
                      (p) =>
                        !sourcesFilter ||
                        p.sourceIds.some((id) => sourcesFilter.includes(id)),
                    )
                    .map((p) => (
                      <section key={p.personId}>
                        <h4>{p.name}</h4>
                        <p>{p.detail}</p>
                      </section>
                    ))}
                </details>
                <SourceContent
                  sources={content.dataset.sources.filter(
                    (s) => !sourcesFilter || sourcesFilter.includes(s.sourceId),
                  )}
                  fullExhibition
                />
                <details>
                  <summary>地点定位、地形与水系</summary>
                  <p>
                    事件概略位置不回填历史坐标；战略方向不等于真实道路。地图继续使用原高程、水系与素材登记。
                  </p>
                  {content.map.resources.references.map((r) => (
                    <article key={r.referenceId}>
                      <h4>
                        <a href={r.url} target="_blank" rel="noreferrer">
                          {r.title}
                        </a>
                      </h4>
                      <p>{r.notes}</p>
                      <small>
                        {r.referenceId} · {r.revision} · {r.license}
                      </small>
                    </article>
                  ))}
                </details>
                <details>
                  <summary>行军路线依据与适用范围</summary>
                  {content.plan.tracks.map((t) => (
                    <article key={t.id}>
                      <h4>
                        {t.unitName} · {t.dateText}
                      </h4>
                      <p>{t.limitations}</p>
                      <p>{t.sourceIds.join('、')}</p>
                    </article>
                  ))}
                  <p>
                    主地图中的战局关系箭头采用事件锚定的显示布局，说明各部行动、策应与会合关系，不将布局偏移作为部队经纬度或历史道路。
                  </p>
                  {content.plan.formations?.map((f) => (
                    <article key={f.id}>
                      <h4>{f.unitName}</h4>
                      {f.sourceUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          史料依据
                        </a>
                      ))}
                    </article>
                  ))}
                </details>
                <details>
                  <summary>人物照片与艺术素材</summary>
                  {content.dataset.assets.map((a) => (
                    <article key={a.assetId}>
                      <h4>{a.title}</h4>
                      <p>{a.disclosure}</p>
                      <p>
                        素材条件：{a.rightsStatus} · {a.rightsNote}
                      </p>
                      <a href={a.origin} target="_blank" rel="noreferrer">
                        原始出处
                      </a>
                    </article>
                  ))}
                </details>
              </div>
            )}
            {screen.overlay === 'guide' && (
              <div className="journey-guide">
                <h3>行军与自由探索</h3>
                <p>
                  从瑞金开始，或通过章节导航前往任意章节。底栏控制播放、暂停、倍速与演示进度；历史日期和演示秒数分别呈现。
                </p>
                <h3>随行与自由取景</h3>
                <p>
                  随行提供区域尺度的默认镜头。旋转、平移或缩放后，播放会保留你选择的角度和距离，随箭头一起移动。点击随行可重新采用默认构图；滚轮缩小恢复区域名称，放大展开区域内事件。全景与缩放按钮位于地图工具下方。
                </p>
                <h3>区域、故事与人物</h3>
                <p>
                  全局显示地理分区；点击分区后展开区域故事。到达事件后先突出浮标并暂停，点击可立即阅读，三秒后自动打开中央故事；悬停或聚焦姓名可查看人物，点击姓名可固定卡片。Esc先关闭人物卡，再关闭故事；返回后主动继续行军。
                </p>
                <h3>深入区域体验</h3>
                <p>
                  右下角直接进入本区域，场景底部可自行前往下一地块。独立完整体验从瑞金开始。可以随时返回地图，行军保持原进度并暂停。艺术内容播放与C1教学完成记录分开。
                </p>
                <h3>地图与资料</h3>
                <p>
                  滚轮以鼠标位置缩放，拖动环顾。来源页集中列出历史、人物、位置、路线和素材依据。空缺区间不绘制推测道路。
                </p>
              </div>
            )}
            {screen.overlay === 'about' && (
              <>
                <AboutContent fullExhibition />
                <CompletionSettings onClear={historical.clearRecords} />
              </>
            )}
          </ExhibitionDrawer>
        )}
        <ExperienceHost controller={historical} returnFocusRef={trigger} />
      </div>
    </HistoryDisplayContext.Provider>
  );
}
