import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Layers, ArrowUpRight } from 'lucide-react';
import { publishedDataset } from '../data/verified';
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
import { useReducedMotion } from '../hooks/use-reduced-motion';
import type { SceneError } from '../shared/contracts';

const titles: Record<Overlay, string> = {
  chapters: '历史专题',
  history: '事件资料',
  sources: '资料来源与史料原则',
  guide: '使用说明',
  about: '关于展馆',
};
export function App() {
  const { events, routes, sources } = publishedDataset;
  const [experience, dispatch] = useExperience();
  const playback = usePlayback(events);
  const { close: closePlayback } = playback;
  const reduced = useReducedMotion();
  const fullscreen = useFullscreen();
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState<SceneError | null>(null);
  const [sceneKey, setSceneKey] = useState(0);
  const enterRef = useRef<HTMLButtonElement>(null);
  const exploreRef = useRef<HTMLElement>(null);
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
    if (experience.overlay === 'history') closePlayback();
    dispatch({ type: 'close' });
  }, [experience.overlay, closePlayback, dispatch]);
  useEffect(() => {
    if (experience.phase === 'exploring') exploreRef.current?.focus();
  }, [experience.phase]);
  function home() {
    playback.close();
    dispatch({ type: 'home' });
    window.requestAnimationFrame(() =>
      enterRef.current?.focus({ preventScroll: true }),
    );
  }
  function open(overlay: Overlay) {
    if (playback.playing) playback.toggle();
    dispatch({ type: 'open', overlay });
  }
  function selectEvent(id: string) {
    playback.select(id);
    dispatch({ type: 'open', overlay: 'history' });
  }
  return (
    <div className="museum-app" data-phase={experience.phase}>
      <div
        inert={experience.overlay !== null || experience.phase === 'entering'}
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
        {experience.phase !== 'exploring' && (
          <ExhibitionLanding
            entering={experience.phase === 'entering'}
            onEnter={() => {
              setReady(false);
              setSceneError(null);
              dispatch({ type: 'enter', reduced });
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
                setSceneKey((key) => key + 1);
              }}
            />
            <div className="exploration-topic">
              <span className="status-dot" />
              <span>{playback.activeEvent?.title ?? '长征历史总览'}</span>
              <span className="preview-label">开发预览</span>
            </div>
            <div className="exploration-tools">
              <button className="scene-tool" onClick={() => open('chapters')}>
                <Layers size={20} />
                <span>
                  历史专题
                  <small>
                    {events.length
                      ? `${events.length} 个核验节点`
                      : '专题核验中'}
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </button>
              <button className="scene-tool" onClick={() => open('history')}>
                <BookOpen size={20} />
                <span>
                  事件资料
                  <small>
                    {playback.activeEvent ? '阅读当前事件' : '了解核验进度'}
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </button>
            </div>
            <Timeline
              events={events}
              activeEventId={playback.activeEvent?.id ?? null}
              playing={playback.playing}
              progress={playback.progress}
              onToggle={playback.toggle}
              onPrevious={playback.previous}
              onNext={playback.next}
              onSelect={selectEvent}
            />
          </main>
        )}
      </div>
      {experience.phase === 'entering' && (
        <ExperienceTransition onComplete={completeEntry} />
      )}
      {experience.overlay && (
        <ExhibitionDrawer
          key={experience.overlay}
          title={titles[experience.overlay]}
          onClose={closeOverlay}
        >
          {experience.overlay === 'chapters' && (
            <ChapterContent
              events={events}
              activeId={playback.activeEvent?.id ?? null}
              onSelect={selectEvent}
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
          {experience.overlay === 'about' && <AboutContent />}
        </ExhibitionDrawer>
      )}
    </div>
  );
}
