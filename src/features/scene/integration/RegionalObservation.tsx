import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  Film,
  Flag,
  HelpCircle,
  Mountain,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { ATLAS_REGIONS, type RegionId } from '../atlas/regions';
import { createBridgeStudy } from '../prototype/bridge-renderer';
import { createRegionalWorld } from './regional-world';
import { REGION_STORIES } from './region-stories';
import { CinematicIntro } from './CinematicIntro';
import { SCENE_CINEMATICS } from './cinematic-config';
import './regional-observation.css';
import { ChishuiSandbox } from './chishui/ChishuiSandbox';

type ViewId = 'arrival' | 'company' | 'landscape' | 'detail';
type SpotId = 'terrain' | 'people' | 'detail';
interface WorldHandle {
  setView(view: ViewId): void;
  setPaused(value: boolean): void;
  dispose(): void;
}
interface HotspotPosition {
  id: SpotId;
  x: number;
  y: number;
  visible: boolean;
}
export interface RegionalObservationProps {
  regionId: RegionId;
  onExit: () => void;
  onRegionChange?: (regionId: RegionId) => void;
}
const SPOT_VIEWS: Record<SpotId, ViewId> = {
  terrain: 'landscape',
  people: 'company',
  detail: 'detail',
};
const SPOT_ICONS = { terrain: Mountain, people: Flag, detail: Eye };

/** Local visual observation; it never writes historical completion evidence. */
export function RegionalObservation(props: RegionalObservationProps) {
  const [riverWalk, setRiverWalk] = useState(false);
  if (props.regionId === 'chishui' && !riverWalk)
    return (
      <ChishuiSandbox
        onExit={props.onExit}
        onLandscape={() => setRiverWalk(true)}
      />
    );
  return (
    <RegionalObservationScene
      key={props.regionId}
      {...props}
      onBattle={
        props.regionId === 'chishui' ? () => setRiverWalk(false) : undefined
      }
    />
  );
}

function RegionalObservationScene({
  regionId,
  onExit,
  onRegionChange,
  onBattle,
}: RegionalObservationProps & { onBattle?: () => void }) {
  const story = REGION_STORIES[regionId];
  const cinematic = SCENE_CINEMATICS[regionId];
  const [introActive, setIntroActive] = useState(Boolean(cinematic?.enabled));
  const [introSession, setIntroSession] = useState(0);
  const introShowing = useRef(introActive);
  const backButton = useRef<HTMLButtonElement>(null);
  const hadIntro = useRef(introActive);
  const hasAiBackdrop = ['snow', 'grass', 'chishui', 'jinsha'].includes(
    regionId,
  );
  const chapterIndex = ATLAS_REGIONS.findIndex((item) => item.id === regionId);
  const dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<WorldHandle | null>(null);
  const manuallyPaused = useRef(false);
  const hotspotElements = useRef(new Map<SpotId, HTMLButtonElement>());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState<SpotId | null>(null);
  const [visited, setVisited] = useState<SpotId[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cleanView, setCleanView] = useState(false);
  const thinkingButton = useRef<HTMLButtonElement>(null);
  const firstAnswer = useRef<HTMLButtonElement>(null);
  const cleanButton = useRef<HTMLButtonElement>(null);
  const cleanReturnButton = useRef<HTMLButtonElement>(null);
  const aboutButton = useRef<HTMLButtonElement>(null);
  const aboutCloseButton = useRef<HTMLButtonElement>(null);
  const errorReturnButton = useRef<HTMLButtonElement>(null);
  const previousPanels = useRef({
    question: false,
    clean: false,
    about: false,
  });

  useEffect(() => {
    if (questionOpen) firstAnswer.current?.focus();
    else if (previousPanels.current.question) thinkingButton.current?.focus();
    previousPanels.current.question = questionOpen;
  }, [questionOpen]);
  useEffect(() => {
    if (cleanView) cleanReturnButton.current?.focus();
    else if (previousPanels.current.clean) cleanButton.current?.focus();
    previousPanels.current.clean = cleanView;
  }, [cleanView]);
  useEffect(() => {
    if (aboutOpen) aboutCloseButton.current?.focus();
    else if (previousPanels.current.about) aboutButton.current?.focus();
    previousPanels.current.about = aboutOpen;
  }, [aboutOpen]);
  useEffect(() => {
    if (status === 'error' && !introActive) errorReturnButton.current?.focus();
  }, [status, introActive]);
  useEffect(() => {
    if (!introActive && hadIntro.current) backButton.current?.focus();
    hadIntro.current = introActive;
  }, [introActive]);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    let disposed = false;
    let failed = false;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const ready = () => {
      if (!disposed && !failed) setStatus('ready');
    };
    const fail = (message: string) => {
      if (!disposed && !failed) {
        failed = true;
        setStatus('error');
        setQuestionOpen(false);
        setCleanView(false);
        setError(message || '三维空间暂未打开，可以先阅读本页内容。');
      }
    };
    const updateHotspots = (items: HotspotPosition[]) => {
      if (disposed) return;
      const width = host.current?.clientWidth ?? 0;
      const height = host.current?.clientHeight ?? 0;
      for (const item of items) {
        const node = hotspotElements.current.get(item.id);
        if (!node) continue;
        node.style.transform = `translate(${item.x}px, ${item.y}px) translate(-24px, -24px)`;
        node.style.visibility =
          item.visible &&
          item.x > 45 &&
          item.x < width - 160 &&
          item.y > 90 &&
          item.y < height - 100
            ? 'visible'
            : 'hidden';
      }
    };
    try {
      if (regionId === 'luding') {
        const bridge = createBridgeStudy(host.current!, {
          showCompany: true,
          reduced: reducedMotion,
          onReady: ready,
          onFrame: () => {},
          onMetrics: () => {},
          onError: fail,
          onAnchors: (items) =>
            updateHotspots(
              items.map((item) => ({
                ...item,
                id: item.id === 'bridge' ? 'detail' : 'terrain',
                x: item.x * (host.current?.clientWidth ?? 0),
                y: item.y * (host.current?.clientHeight ?? 0),
              })),
            ),
        });
        bridge.setTime(30);
        bridge.focusArrival();
        engine.current = {
          setView(view) {
            if (view === 'arrival') bridge.focusArrival();
            else if (view === 'company') bridge.focusCompany();
            else if (view === 'detail') bridge.focusSpot('bridge');
            else bridge.pose(0);
          },
          setPaused: (value) => bridge.setPaused(value),
          dispose: () => bridge.dispose(),
        };
      } else {
        engine.current = createRegionalWorld(host.current!, regionId, {
          reducedMotion,
          onReady: ready,
          onError: (issue) => fail(issue.message),
          onHotspots: updateHotspots,
        });
      }
    } catch {
      queueMicrotask(() => fail('三维空间暂未打开，可以先阅读本页内容。'));
    }
    const visibility = () =>
      engine.current?.setPaused(
        document.hidden || manuallyPaused.current || introShowing.current,
      );
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', visibility);
      engine.current?.dispose();
      engine.current = null;
      element?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, [regionId]);

  useEffect(() => {
    manuallyPaused.current = paused;
    introShowing.current = introActive;
    engine.current?.setPaused(paused || document.hidden || introActive);
  }, [paused, introActive]);

  const chooseSpot = (id: SpotId) => {
    if (status !== 'ready') return;
    setActive(id);
    setPanelOpen(true);
    setQuestionOpen(false);
    setVisited((current) =>
      current.includes(id) ? current : [...current, id],
    );
    engine.current?.setView(SPOT_VIEWS[id]);
  };
  const selected = story.hotspots.find((spot) => spot.id === active);
  const previous = ATLAS_REGIONS[chapterIndex - 1];
  const next = ATLAS_REGIONS[chapterIndex + 1];
  const showQuestion = () => {
    if (status !== 'ready' || visited.length < 3) return;
    setQuestionOpen(true);
    setPanelOpen(true);
  };

  return (
    <dialog
      className="regional-observation"
      data-region={regionId}
      data-status={status}
      data-panel-open={panelOpen}
      data-clean-view={cleanView}
      data-intro-active={introActive}
      ref={dialog}
      aria-label={`${story.title} · 沉浸探索`}
      onCancel={(event) => {
        event.preventDefault();
        if (introActive) onExit();
        else if (cleanView) setCleanView(false);
        else if (aboutOpen) setAboutOpen(false);
        else if (questionOpen) setQuestionOpen(false);
        else onExit();
      }}
    >
      <div
        className="regional-exploration"
        inert={introActive}
        aria-hidden={introActive || undefined}
      >
        <div className="regional-world" ref={host} />
        {status !== 'ready' && (
          <div
            className="regional-fallback"
            style={{ backgroundImage: `url("${story.cover}")` }}
            aria-hidden="true"
          />
        )}
        <div className="regional-shade" aria-hidden="true" />

        <header className="regional-header">
          <button className="regional-back" onClick={onExit} ref={backButton}>
            <ArrowLeft size={17} aria-hidden="true" /> 返回总地图
          </button>
          <div className="regional-chapter-label">
            <Compass size={17} aria-hidden="true" />
            <span>山河纪行</span>
            <i />
            <b>{String(chapterIndex + 1).padStart(2, '0')}</b>
            <span>/ 08</span>
          </div>
          <button
            className="regional-disclosure"
            ref={aboutButton}
            onClick={() => setAboutOpen((value) => !value)}
            aria-expanded={aboutOpen}
            aria-controls="regional-about"
          >
            {hasAiBackdrop ? 'AI 远景 · 艺术再现' : '艺术再现'} <span>ⓘ</span>
          </button>
        </header>

        <section className="regional-hero" aria-labelledby="regional-title">
          <span className="regional-eyebrow">{story.eyebrow}</span>
          <h2 id="regional-title">{story.title}</h2>
          <p>{story.subtitle}</p>
          <span className="regional-red-seal" aria-hidden="true">
            山河
          </span>
        </section>

        {status === 'ready' && (
          <div
            className="regional-spatial-hotspots"
            aria-label="场景中的观察点"
            hidden={cleanView}
          >
            {story.hotspots.map((spot, index) => (
              <button
                key={spot.id}
                className="regional-spatial-hotspot"
                data-active={active === spot.id}
                data-visited={visited.includes(spot.id)}
                aria-label={`观察点：${spot.title}`}
                tabIndex={cleanView ? -1 : 0}
                ref={(node) => {
                  if (node) hotspotElements.current.set(spot.id, node);
                  else hotspotElements.current.delete(spot.id);
                }}
                onClick={() => chooseSpot(spot.id)}
              >
                <span>
                  {visited.includes(spot.id) ? <Check size={13} /> : index + 1}
                </span>
                <em>{spot.title}</em>
              </button>
            ))}
          </div>
        )}

        <aside className="regional-view-tools" aria-label="空间视角">
          {onBattle && (
            <button
              title="打开四渡赤水战役沙盘"
              aria-label="打开四渡赤水战役沙盘"
              onClick={onBattle}
            >
              <Flag size={19} />
            </button>
          )}
          {cinematic?.enabled && (
            <button
              title="重看开场片段"
              aria-label="重看开场片段"
              onClick={() => {
                setIntroSession((value) => value + 1);
                setIntroActive(true);
                setCleanView(false);
                setQuestionOpen(false);
              }}
            >
              <Film size={19} />
            </button>
          )}
          <button
            disabled={status !== 'ready'}
            title="纯净观景"
            aria-label="进入纯净观景"
            ref={cleanButton}
            onClick={() => setCleanView(true)}
          >
            <Eye size={19} />
          </button>
          <button
            disabled={status !== 'ready'}
            title="回到初景"
            aria-label="回到初景"
            onClick={() => {
              engine.current?.setView('arrival');
              setActive(null);
              setQuestionOpen(false);
            }}
          >
            <RotateCcw size={19} />
          </button>
          <button
            disabled={status !== 'ready'}
            title={paused ? '继续环境动态' : '暂停环境动态'}
            aria-label={paused ? '继续环境动态' : '暂停环境动态'}
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play size={19} /> : <Pause size={19} />}
          </button>
          <span>
            拖动环顾
            <br />
            滚轮远近
          </span>
        </aside>

        {status === 'loading' && (
          <div className="regional-load-state" role="status">
            <span className="regional-load-orbit" />
            <p>正在走进{story.title}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="regional-error" role="alert">
            <p>{error}</p>
            <button ref={errorReturnButton} onClick={onExit}>
              返回地图
            </button>
          </div>
        )}

        <div className="regional-story-wrap">
          <div className="regional-story-topline">
            <span>
              自由探索 <b>{visited.length}</b>
              <i>/ 3</i>
            </span>
            <button
              onClick={() => setPanelOpen((value) => !value)}
              aria-expanded={panelOpen}
              aria-controls="regional-story-panel"
            >
              {panelOpen ? '收起手记' : '展开手记'}
              <ChevronDown size={14} />
            </button>
          </div>
          <nav className="regional-spot-tabs" aria-label="探索场景细节">
            {story.hotspots.map((spot, index) => {
              const Icon = SPOT_ICONS[spot.id];
              return (
                <button
                  key={spot.id}
                  aria-label={spot.title}
                  disabled={status !== 'ready'}
                  aria-pressed={active === spot.id}
                  onClick={() => chooseSpot(spot.id)}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{spot.title}</span>
                  <small>
                    {visited.includes(spot.id) ? (
                      <Check size={13} aria-label="已观察" />
                    ) : (
                      `0${index + 1}`
                    )}
                  </small>
                </button>
              );
            })}
          </nav>
          <section
            className="regional-story-panel"
            id="regional-story-panel"
            hidden={!panelOpen}
          >
            {!questionOpen ? (
              <>
                <div className="regional-narrative" aria-live="polite">
                  <span>{selected?.kicker ?? '行路手记'}</span>
                  <h3>{selected?.title ?? story.subtitle}</h3>
                  <p>{selected?.text ?? story.description}</p>
                </div>
                <div className="regional-reflection">
                  <span>
                    <HelpCircle size={15} /> 观景 · 思考
                  </span>
                  <p>
                    {visited.length === 3
                      ? story.question.prompt
                      : '走近山川、人物与细节，读懂画面里的行路故事。'}
                  </p>
                  <button
                    disabled={status !== 'ready' || visited.length < 3}
                    ref={thinkingButton}
                    onClick={showQuestion}
                  >
                    {visited.length === 3
                      ? answer === null
                        ? '想一想'
                        : '重温思考'
                      : `再观察 ${3 - visited.length} 处`}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </>
            ) : (
              <div className="regional-question">
                <div className="regional-question-title">
                  <span>观景 · 思考</span>
                  <button
                    aria-label="关闭思考"
                    onClick={() => setQuestionOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <h3>{story.question.prompt}</h3>
                <div className="regional-answers">
                  {story.question.choices.map((choice, index) => (
                    <button
                      key={choice}
                      ref={index === 0 ? firstAnswer : undefined}
                      disabled={status !== 'ready'}
                      aria-label={`${String.fromCharCode(65 + index)} ${choice}`}
                      aria-pressed={answer === index}
                      data-result={
                        answer === index
                          ? index === story.question.answer
                            ? 'correct'
                            : 'consider'
                          : undefined
                      }
                      onClick={() => setAnswer(index)}
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      {choice}
                    </button>
                  ))}
                </div>
                {answer !== null && (
                  <div className="regional-answer-feedback" role="status">
                    <p>
                      <strong>
                        {answer === story.question.answer
                          ? '你注意到了关键。'
                          : '再回到画面看一看。'}
                      </strong>{' '}
                      {story.question.explanation}
                    </p>
                    <button onClick={() => setQuestionOpen(false)}>
                      继续探索 <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {onRegionChange && (
          <nav className="regional-chapter-navigation" aria-label="切换场景">
            <button
              disabled={!previous}
              onClick={() => previous && onRegionChange(previous.id)}
            >
              <ChevronLeft size={15} />
              <span>{previous?.title ?? '起点'}</span>
            </button>
            <span>{ATLAS_REGIONS[chapterIndex]?.title}</span>
            <button
              disabled={!next}
              onClick={() => next && onRegionChange(next.id)}
            >
              <span>{next?.title ?? '已至卷末'}</span>
              <ChevronRight size={15} />
            </button>
          </nav>
        )}

        {aboutOpen && (
          <aside className="regional-about" id="regional-about">
            <button
              ref={aboutCloseButton}
              aria-label="关闭说明"
              onClick={() => setAboutOpen(false)}
            >
              <X size={16} />
            </button>
            <h3>关于这片空间</h3>
            <p>
              此处为长征主题的艺术场景。人物为匿名示意模型，环境、数量与摆放不代表历史实测；观察题只讨论画面，不改变历史过程。
            </p>
            {hasAiBackdrop && (
              <p>
                远景复用了 MiniMax
                生成的环境图，非历史照片。全景背面仍可见接缝，尚未通过无缝验收。
              </p>
            )}
            {cinematic?.enabled && (
              <p>开场片段使用 MiniMax 生成，为艺术再现，不是历史影像。</p>
            )}
            <p>本页探索不计入正式历史专题的学习完成记录。</p>
          </aside>
        )}
        {cleanView && (
          <div className="regional-clean-return">
            <span>{hasAiBackdrop ? 'AI 远景 · 艺术再现' : '艺术再现'}</span>
            <button ref={cleanReturnButton} onClick={() => setCleanView(false)}>
              <ArrowLeft size={14} />
              返回探索 <small>Esc</small>
            </button>
          </div>
        )}
      </div>
      {cinematic?.enabled && introActive && (
        <CinematicIntro
          key={introSession}
          cinematic={cinematic}
          onComplete={() => {
            engine.current?.setView('arrival');
            setActive(null);
            setQuestionOpen(false);
            setIntroActive(false);
          }}
          onExit={onExit}
        />
      )}
    </dialog>
  );
}
