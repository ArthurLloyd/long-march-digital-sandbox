import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Compass,
  Expand,
  Flag,
  Layers,
  Minimize,
  ShieldCheck,
} from 'lucide-react';
import { SceneViewport } from '../components/layout/SceneViewport';
import { HistoryEventPanel } from '../features/history';
import { Timeline, usePlayback } from '../features/timeline';
import { publishedDataset } from '../data/verified';
import { useFullscreen } from '../hooks/use-fullscreen';
import type { SceneError } from '../shared/contracts';

type Panel = 'event' | 'sources' | 'guide';

export function App() {
  const { events, routes, sources } = publishedDataset;
  const playback = usePlayback(events);
  const [panel, setPanel] = useState<Panel>('event');
  const [panelFocusRequest, setPanelFocusRequest] = useState(0);
  const informationRef = useRef<HTMLElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState<SceneError | null>(null);
  const [sceneKey, setSceneKey] = useState(0);
  const fullscreen = useFullscreen();
  const onSceneReady = useCallback(() => setReady(true), []);
  const onSceneError = useCallback(
    (error: SceneError) => setSceneError(error),
    [],
  );
  useEffect(() => {
    if (panelFocusRequest === 0) return;
    informationRef.current?.scrollIntoView({
      behavior: 'auto',
      block: 'start',
    });
    panelHeadingRef.current?.focus({ preventScroll: true });
  }, [panelFocusRequest]);
  const openPanel = (next: Panel) => {
    setPanel(next);
    if (window.matchMedia?.('(max-width: 1023px)').matches) {
      setPanelFocusRequest((request) => request + 1);
    }
  };
  const selectEvent = (id: string) => {
    playback.select(id);
    openPanel('event');
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳至沙盘内容
      </a>
      <header className="topbar">
        <a
          className="brand"
          href="#main-content"
          aria-label="长征·不灭的火种首页"
        >
          <span className="brand-mark" aria-hidden="true">
            <Flag size={23} strokeWidth={1.4} />
          </span>
          <span>
            <strong>
              长征<span>·</span>不灭的火种
            </strong>
            <small>长征三维历史数字沙盘</small>
          </span>
        </a>
        <nav aria-label="顶部导航">
          <button
            className={
              panel === 'event' ? 'nav-button is-active' : 'nav-button'
            }
            aria-pressed={panel === 'event'}
            onClick={() => openPanel('event')}
          >
            历史专题
          </button>
          <button
            className={
              panel === 'sources' ? 'nav-button is-active' : 'nav-button'
            }
            aria-pressed={panel === 'sources'}
            onClick={() => openPanel('sources')}
          >
            资料来源
          </button>
          <button
            className={
              panel === 'guide' ? 'nav-button is-active' : 'nav-button'
            }
            aria-pressed={panel === 'guide'}
            onClick={() => openPanel('guide')}
          >
            使用说明
          </button>
        </nav>
        <button
          className="fullscreen-button"
          onClick={() => void fullscreen.toggle()}
          aria-label={fullscreen.active ? '退出全屏' : '进入全屏'}
        >
          {fullscreen.active ? <Minimize size={17} /> : <Expand size={17} />}
          <span>{fullscreen.active ? '退出全屏' : '全屏体验'}</span>
        </button>
      </header>
      {fullscreen.error && (
        <p className="fullscreen-message" role="status">
          {fullscreen.error}
        </p>
      )}

      <main id="main-content" className="workspace" tabIndex={-1}>
        <aside className="chapter-sidebar" aria-label="专题导航">
          <div className="sidebar-heading">
            <Compass size={18} strokeWidth={1.5} />
            <h2>探索长征</h2>
          </div>
          <button className="topic-button" onClick={() => openPanel('event')}>
            <span>历史进程</span>
            <ChevronRight size={16} />
          </button>
          <p className="sidebar-caption">事件章节</p>
          {events.length ? (
            <ol className="chapter-list">
              {events.map((event) => (
                <li key={event.id}>
                  <button
                    aria-current={
                      event.id === playback.activeEvent?.id ? 'step' : undefined
                    }
                    onClick={() => selectEvent(event.id)}
                  >
                    {event.title}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="chapter-empty">
              <span className="chapter-rail" aria-hidden="true" />
              <strong>章节核验中</strong>
              <p>以可靠史料为起点，逐步开放历史节点。</p>
            </div>
          )}
          <div className="sidebar-context">
            <span>当前专题</span>
            <strong>长征历史总览</strong>
            <p>正式内容审核完成后开放</p>
          </div>
          <button
            className="integrity-link"
            onClick={() => openPanel('sources')}
          >
            <ShieldCheck size={18} strokeWidth={1.4} />
            <span>了解史料核验原则</span>
            <ArrowRight size={14} />
          </button>
        </aside>

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

        <aside
          className="information-panel"
          aria-label="事件资料与说明"
          ref={informationRef}
        >
          <div className="panel-heading">
            <h2 ref={panelHeadingRef} tabIndex={-1}>
              {panel === 'event'
                ? '事件资料'
                : panel === 'sources'
                  ? '资料来源'
                  : '使用说明'}
            </h2>
            <BookOpen size={17} strokeWidth={1.4} />
          </div>
          {panel === 'event' && (
            <HistoryEventPanel
              event={playback.activeEvent}
              sources={sources.filter((source) =>
                playback.activeEvent?.sourceIds.includes(source.sourceId),
              )}
              onClose={playback.close}
              teachingState={{ mode: 'observe', stepId: null }}
            />
          )}
          {panel === 'sources' && (
            <section className="reading-panel">
              <ShieldCheck size={25} strokeWidth={1.4} />
              <h3>让每一个节点有迹可查</h3>
              <p>目前尚未发布经复核的史料来源。</p>
              <ul>
                <li>正式事件与路线须关联可查证的资料。</li>
                <li>至少两名不同成员独立复核。</li>
                <li>近似位置与示意路线须明确标注。</li>
                <li>艺术再现不能冒充真实档案。</li>
              </ul>
              <p className="integrity-note">
                自动校验只检查数据规则，不能代替人工史实审核。
              </p>
            </section>
          )}
          {panel === 'guide' && (
            <section className="reading-panel">
              <Layers size={25} strokeWidth={1.4} />
              <h3>从一个历史节点开始</h3>
              <p>
                当前为工程开发预览。正式数据发布后，可通过左侧章节或底部时间轴选择事件。
              </p>
              <ol>
                <li>选择章节，定位相关历史事件。</li>
                <li>在右侧阅读事件、精度标识与出处。</li>
                <li>使用时间轴依次浏览核验节点。</li>
              </ol>
              <p className="integrity-note">
                无正式节点时，播放与切换控件保持禁用。抽象底座不代表真实历史地理。
              </p>
            </section>
          )}
          <div className="panel-footer">
            <span className="status-dot" />
            内容核验中
          </div>
        </aside>
      </main>

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
      <footer className="app-footer">
        <span>赓续长征精神，智创青春新程</span>
        <span>开发预览 · 非正式历史地图</span>
      </footer>
    </div>
  );
}
