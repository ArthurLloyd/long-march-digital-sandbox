import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Mountain,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  CHAPTER_SECONDS,
  CHISHUI_CHAPTERS,
  CHISHUI_SOURCES,
  DIAGRAM_PLACES,
  TOTAL_SECONDS,
  sampleChishui,
} from './chishui-story';
import {
  createChishuiRenderer,
  type ChishuiCamera,
  type ChishuiRenderer,
} from './chishui-renderer';
import './chishui-sandbox.css';
import { campaignBeat } from '../../../../shared/content/chishui-campaign';

/** Scene playback only. Never writes C1 completion evidence or historical data. */
export function ChishuiSandbox({
  onExit,
  onLandscape,
}: {
  onExit(): void;
  onLandscape(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<ChishuiRenderer | null>(null);
  const clock = useRef(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [camera, setCamera] = useState<ChishuiCamera>('guided');
  const [failed, setFailed] = useState(false);
  const [sources, setSources] = useState(false);
  const [voice, setVoice] = useState(false);
  const [reduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [canSpeak] = useState(
    () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
  );
  const closeSources = useRef<HTMLButtonElement>(null);
  const sourceOpener = useRef<HTMLButtonElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  const sample = sampleChishui(time),
    chapter = CHISHUI_CHAPTERS[sample.chapter]!;
  const narrative = campaignBeat(
    `chapter-event-sd-${sample.chapter + 1}`,
    sample.progress,
  )!;
  const ended = time >= TOTAL_SECONDS;
  const seek = useCallback((value: number) => {
    const safe = sampleChishui(value).time;
    clock.current = safe;
    setTime(safe);
    engine.current?.update(safe);
  }, []);
  const chooseChapter = (index: number) => {
    setPlaying(false);
    seek(Math.max(0, Math.min(3, index)) * CHAPTER_SECONDS);
  };
  const toggle = () => {
    if (ended) seek(0);
    setPlaying((value) => !value);
  };
  const chooseCamera = (value: ChishuiCamera) => {
    setCamera(value);
    engine.current?.camera(value);
  };
  useEffect(() => {
    const modal = dialog.current,
      previous = document.activeElement;
    modal?.showModal();
    start.current?.focus();
    let renderer: ChishuiRenderer | null = null;
    try {
      renderer = createChishuiRenderer(host.current!, {
        reduced,
        onExplore: () => setCamera('free'),
        onError: () => {
          setFailed(true);
          setPlaying(false);
        },
      });
      engine.current = renderer;
      renderer.update(clock.current);
    } catch {
      queueMicrotask(() => setFailed(true));
    }
    const visibility = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      renderer?.dispose();
      engine.current = null;
      modal?.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [reduced]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = performance.now(),
      lastUi = last;
    const tick = (now: number) => {
      if (!document.hidden)
        clock.current = Math.min(
          TOTAL_SECONDS,
          clock.current + Math.min(0.1, (now - last) / 1000) * speed,
        );
      last = now;
      engine.current?.update(clock.current);
      if (now - lastUi > 80 || clock.current === TOTAL_SECONDS) {
        setTime(clock.current);
        lastUi = now;
      }
      if (clock.current >= TOTAL_SECONDS) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);
  useEffect(() => {
    if (!voice || !playing || !canSpeak) return;
    const speech = new SpeechSynthesisUtterance(
      CHISHUI_CHAPTERS[sample.chapter]!.narration,
    );
    speech.lang = 'zh-CN';
    speech.rate = 0.92;
    window.speechSynthesis.speak(speech);
    return () => window.speechSynthesis.cancel();
  }, [voice, playing, canSpeak, sample.chapter]);
  useEffect(() => {
    if (sources) closeSources.current?.focus();
  }, [sources]);
  const closeSourcePanel = () => {
    setSources(false);
    sourceOpener.current?.focus();
  };
  return (
    <dialog
      className="chishui-sandbox"
      ref={dialog}
      aria-label="四渡赤水 · 战役沙盘"
      onCancel={(event) => {
        event.preventDefault();
        if (sources) closeSourcePanel();
        else onExit();
      }}
      onKeyDown={(event) => {
        const tag = (event.target as HTMLElement).tagName;
        if (
          sources ||
          ['INPUT', 'SELECT', 'BUTTON', 'A', 'TEXTAREA'].includes(tag) ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        if (event.code === 'Space') {
          event.preventDefault();
          toggle();
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          setPlaying(false);
          seek(clock.current - 5);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          setPlaying(false);
          seek(clock.current + 5);
        }
      }}
    >
      <div
        className="cs-world"
        ref={host}
        data-testid="chishui-world"
        aria-hidden={failed || undefined}
      />
      {failed && (
        <div className="cs-fallback">
          <Diagram chapter={sample.chapter} progress={sample.progress} />
          <span role="status">
            三维绘制不可用，已切换到可操作的平面示意；回放与史实阅读仍可使用。
          </span>
        </div>
      )}
      <div className="cs-vignette" aria-hidden="true" />
      <header className="cs-header">
        <button onClick={onExit}>
          <ArrowLeft size={17} />
          返回总地图
        </button>
        <div className="cs-brand">
          <Compass size={18} />
          <span>山河纪行</span>
          <i />
          战役复盘 <b>03</b>
        </div>
        <button
          ref={sourceOpener}
          onClick={() => {
            setPlaying(false);
            setSources(true);
          }}
          aria-expanded={sources}
        >
          <BookOpen size={16} />
          史料与说明
        </button>
      </header>
      <section className="cs-title" aria-labelledby="cs-title">
        <span className="cs-eyebrow">川 · 滇 · 黔 / 1935</span>
        <h2 id="cs-title">四渡赤水</h2>
        <p>在转折之间，寻找主动。</p>
        <span className="cs-art-label">原创程序艺术再现 · 战役方向示意</span>
      </section>
      <aside className="cs-story" aria-label="当前战局">
        <div className="cs-story-top">
          <span>第 {['一', '二', '三', '四'][sample.chapter]} 幕</span>
          <b>
            {String(sample.chapter + 1).padStart(2, '0')}
            <small> / 04</small>
          </b>
        </div>
        <div className="cs-story-heading" aria-live="polite">
          <span>{narrative.beat.date}</span>
          <h3>
            {chapter.name}
            <em>{chapter.keyword}</em>
          </h3>
        </div>
        <section className="cs-causal-story" aria-live="polite">
          <h4>{narrative.beat.title}</h4>
          <dl>
            <div>
              <dt>敌情</dt>
              <dd>{narrative.beat.threat}</dd>
            </div>
            <div>
              <dt>应对</dt>
              <dd>{narrative.beat.response}</dd>
            </div>
            <div>
              <dt>意义</dt>
              <dd>{narrative.beat.significance}</dd>
            </div>
          </dl>
        </section>
        <div className="cs-legend">
          <span>
            <i />
            中央红军行动
          </span>
          <span>
            <i />
            追堵压力
          </span>
          <small>标记数量不代表兵力，蓝色箭头不表示具体部队驻地。</small>
        </div>
      </aside>
      <div className="cs-field-caption" aria-hidden="true">
        <span>{chapter.caption}</span>
        <b>{ended ? '四渡之后，继续向南' : chapter.label}</b>
      </div>
      <nav className="cs-camera" aria-label="沙盘镜头">
        <button
          aria-pressed={camera === 'guided'}
          onClick={() => chooseCamera('guided')}
        >
          <Compass size={17} />
          跟随讲解
        </button>
        <button
          aria-pressed={camera === 'overview'}
          onClick={() => chooseCamera('overview')}
        >
          <Mountain size={17} />
          俯瞰全局
        </button>
        <button
          aria-pressed={camera === 'free'}
          onClick={() => chooseCamera('free')}
        >
          自由环顾
        </button>
        <button
          onClick={() => {
            setCamera('guided');
            engine.current?.reset();
          }}
          title="复位镜头"
        >
          <RotateCcw size={16} />
          <span className="cs-sr">复位镜头</span>
        </button>
      </nav>
      <footer className="cs-controls">
        <nav className="cs-chapters" aria-label="选择渡河阶段">
          {CHISHUI_CHAPTERS.map((item, index) => (
            <button
              key={item.id}
              aria-current={index === sample.chapter ? 'step' : undefined}
              onClick={() => chooseChapter(index)}
            >
              <span>0{index + 1}</span>
              <div>
                <b>{item.name}</b>
                <small>{item.keyword}</small>
              </div>
              <i
                style={
                  {
                    '--cs-progress': `${index < sample.chapter ? 100 : index === sample.chapter ? sample.progress * 100 : 0}%`,
                  } as React.CSSProperties
                }
              />
            </button>
          ))}
        </nav>
        <div className="cs-transport">
          <button
            aria-label="上一幕"
            disabled={sample.chapter === 0}
            onClick={() => chooseChapter(sample.chapter - 1)}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            className="cs-play"
            ref={start}
            aria-label={
              ended ? '重新播放战役' : playing ? '暂停战役回放' : '播放战役回放'
            }
            onClick={toggle}
          >
            {playing ? <Pause size={23} /> : <Play size={23} />}
          </button>
          <button
            aria-label="下一幕"
            disabled={sample.chapter === 3}
            onClick={() => chooseChapter(sample.chapter + 1)}
          >
            <ChevronRight size={22} />
          </button>
          <button
            aria-label="从头回看"
            onClick={() => {
              setPlaying(false);
              seek(0);
            }}
          >
            <RotateCcw size={17} />
          </button>
          <div className="cs-scrub">
            <label htmlFor="cs-progress">
              {ended ? '复盘结束' : '战役回放'}
              <span>
                {Math.floor(time / 60)}:
                {String(Math.floor(time % 60)).padStart(2, '0')} / 1:28
              </span>
            </label>
            <input
              id="cs-progress"
              type="range"
              min="0"
              max={TOTAL_SECONDS}
              step="0.1"
              value={time}
              onChange={(e) => {
                setPlaying(false);
                seek(Number(e.target.value));
              }}
              aria-label="战役回放进度"
            />
          </div>
          <label className="cs-speed">
            倍速
            <select
              aria-label="回放倍速"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {[0.5, 1, 1.5, 2].map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label={voice ? '关闭语音讲解' : '开启语音讲解'}
            aria-pressed={voice}
            disabled={!canSpeak}
            title={
              canSpeak
                ? '使用设备中文语音，文字讲解始终可读'
                : '当前浏览器不支持语音，请阅读右侧讲解'
            }
            onClick={() => setVoice((v) => !v)}
          >
            {voice ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button className="cs-landscape" onClick={onLandscape}>
            河谷漫游 <ChevronRight size={14} />
          </button>
        </div>
        <p className="cs-footnote">
          {reduced
            ? '低动态模式 · 可选幕阅读或主动播放'
            : '拖动旋转 · 滚轮缩放 · 空格暂停/播放'}
          <span>地形、河道与行动线均为叙事示意；展示时长不代表历史时长。</span>
        </p>
      </footer>
      {sources && (
        <section className="cs-sources" aria-label="沙盘史料与表现说明">
          <button
            ref={closeSources}
            aria-label="关闭史料说明"
            onClick={closeSourcePanel}
          >
            <X size={20} />
          </button>
          <span className="cs-eyebrow">阅读这段历史</span>
          <h3>四次渡河，一场机动战。</h3>
          <p>
            1935年1月至3月，中央红军在川滇黔边地区反复机动。沙盘按四次渡河组织叙事；不省略四渡之后仍需南渡乌江等后续行动。
          </p>
          <h4>史料入口</h4>
          {CHISHUI_SOURCES.map((source) => (
            <a
              href={source.url}
              key={source.url}
              target="_blank"
              rel="noreferrer"
            >
              {source.title}
              <small>{source.publisher} ↗</small>
            </a>
          ))}
          <h4>画面如何阅读</h4>
          <p>
            本场景由 AI
            辅助编程制作。山川、河道和地名摆放为原创程序示意，不是实测地形。红线表示主力行动方向；蓝色图形表示追堵压力，不是精确敌军位置。人物标记、闪光与旗帜是艺术符号，不表示具体兵力、伤亡、装备或逐时战斗。
          </p>
          <p>
            分幕日期采用史料叙述范围。原历史数据、已有审核记录和正式学习完成记录均未改写。语音来自浏览器设备，可能因系统语音资源不同而不可用。
          </p>
          <small>
            参考视频未能访问，本实现沿用项目已有泸定桥界面语言，自行设计战役沙盘；没有复制其未知画面。
          </small>
        </section>
      )}
    </dialog>
  );
}

function Diagram({ chapter, progress }: { chapter: number; progress: number }) {
  const current = CHISHUI_CHAPTERS[chapter]!;
  return (
    <svg
      viewBox="-62 -47 124 94"
      role="img"
      aria-label={`${current.name}平面方向示意，非精确历史地图`}
    >
      <defs>
        <pattern
          id="cs-grid"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M8 0H0V8"
            fill="none"
            stroke="#d8c89e"
            strokeOpacity=".1"
            strokeWidth=".15"
          />
        </pattern>
      </defs>
      <rect x="-62" y="-47" width="124" height="94" fill="#223d3c" />
      <rect x="-62" y="-47" width="124" height="94" fill="url(#cs-grid)" />
      <path
        d="M0,-45 C12,-30 -12,-14 0,0 S12,24 0,45"
        fill="none"
        stroke="#609fa4"
        strokeWidth="4"
      />
      <polyline
        points={current.path.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="#ff8566"
        strokeWidth="1.2"
        pathLength="100"
        strokeDasharray={`${progress * 100} 100`}
      />
      <circle
        cx={current.crossing[0]}
        cy={current.crossing[1]}
        r="3"
        fill="none"
        stroke="#f8d79a"
        strokeWidth=".6"
      />
      {DIAGRAM_PLACES.map((p) => (
        <g key={p.name}>
          <circle cx={p.x} cy={p.z} r=".7" fill="#f6d595" />
          <text
            x={p.x}
            y={p.z - 2}
            textAnchor="middle"
            fontSize="2.3"
            fill="#eee0c3"
          >
            {p.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
