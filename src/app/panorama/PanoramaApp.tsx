import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Expand,
  Focus,
  Layers,
  Map,
  Mountain,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { HistoryDatasetV2 } from '../../shared/contracts';
import { usePhaseClock } from '../../features/timeline';
import { MapCanvas } from './MapCanvas';
import { CrossingBoard } from './CrossingBoard';
import { CinematicTitle } from './CinematicTitle';
import {
  createPanoramaNavigation,
  PANORAMA_NODES,
  REGIONS,
  SLOT_EXPERIENCE_IDS,
  type ImmersiveSlotId,
  type RegionId,
} from './navigation';
import { ROUTE_LAYERS, selectPublishedMapRoutes } from './route-layers';
import type { PanoramaBookmark, PanoramaMapAdapter } from './map-renderer';
import './panorama.css';

export function PanoramaApp({ candidate }: { candidate: HistoryDatasetV2 }) {
  const navigation = useMemo(
    () => createPanoramaNavigation(candidate),
    [candidate],
  );
  const [slot, setSlot] = useState<ImmersiveSlotId | null>(null);
  const [cinematic, setCinematic] = useState(false);
  const clock = usePhaseClock(navigation.clockModel, slot === null);
  const index = Math.max(
    0,
    navigation.steps.findIndex((step) => step.phaseId === clock.activePhaseId),
  );
  const step = navigation.steps[index]!;
  const [view, setView] = useState<'overview' | 'region'>('overview');
  const [follow, setFollow] = useState(true);
  const [rivers, setRivers] = useState(true);
  const [exaggeration, setExaggeration] = useState<1 | 6 | 12 | 24>(12);
  const [camps, setCamps] = useState(['red_army', 'nationalist_army']);
  const map = useRef<PanoramaMapAdapter | null>(null);
  const [mapRevision, setMapRevision] = useState(0);
  const detailPanel = useRef<HTMLElement>(null);
  const bookmark = useRef<PanoramaBookmark | null>(null);
  const entryButton = useRef<HTMLButtonElement>(null);
  const returnButton = useRef<HTMLButtonElement>(null);
  const titleButton = useRef<HTMLButtonElement>(null);
  const onAdapter = useCallback((api: PanoramaMapAdapter | null) => {
    map.current = api;
    if (api) setMapRevision((value) => value + 1);
  }, []);
  const publishedRoutes = useMemo(
    () => selectPublishedMapRoutes(candidate, clock.activePhaseId),
    [candidate, clock.activePhaseId],
  );
  const unlocked = useMemo(
    () =>
      new Set(navigation.steps.slice(0, index + 1).map((item) => item.region)),
    [navigation, index],
  );
  const event = candidate.events.find((item) => item.id === step.eventId);
  const summaries = useMemo(
    () =>
      Object.fromEntries(
        PANORAMA_NODES.map((node) => {
          const eventId = navigation.steps.find(
            (item) => item.region === node.id,
          )?.eventId;
          return [
            node.id,
            candidate.events.find((item) => item.id === eventId)?.summary ??
              '技术入口，历史资料和发生地点待 B 复核。',
          ];
        }),
      ) as Record<RegionId, string>,
    [candidate, navigation],
  );
  const sources = candidate.sources.filter((item) =>
    event?.sourceIds.includes(item.sourceId),
  );
  useEffect(() => {
    map.current?.setRoutes(publishedRoutes, camps);
  }, [publishedRoutes, camps, mapRevision]);
  useEffect(() => {
    map.current?.setRivers(rivers);
  }, [rivers, mapRevision]);
  useEffect(() => {
    map.current?.setVerticalExaggeration(exaggeration);
  }, [exaggeration, mapRevision]);
  useEffect(() => {
    if (follow && view === 'region') map.current?.focus(REGIONS[step.region]);
  }, [step.region, step.phaseId, follow, view, mapRevision]);
  useEffect(() => {
    detailPanel.current?.scrollTo?.({ top: 0 });
  }, [step.phaseId]);
  useEffect(() => {
    if (slot) returnButton.current?.focus();
  }, [slot]);
  const select = (phaseId: string) => {
    if (phaseId === clock.activePhaseId && cinematic) {
      setCinematic(false);
      return;
    }
    setCinematic(true);
    clock.selectPhase(phaseId);
    setView('region');
    const next = navigation.steps.find((item) => item.phaseId === phaseId);
    if (next) map.current?.focus(REGIONS[next.region]);
  };
  const selectRegion = (id: RegionId) => {
    const node = PANORAMA_NODES.find((item) => item.id === id);
    if (node) select(node.phaseId);
  };
  const overview = () => {
    setCinematic(false);
    setView('overview');
    map.current?.overview();
  };
  const enter = () => {
    if (!step.immersive) return;
    setCinematic(false);
    clock.pause();
    bookmark.current = map.current?.bookmark() ?? null;
    setSlot(step.immersive);
  };
  const leave = () => {
    setSlot(null);
    clock.pause();
    if (bookmark.current) map.current?.restore(bookmark.current);
    requestAnimationFrame(() => entryButton.current?.focus());
  };
  const toggleCamp = (id: string) =>
    setCamps((values) =>
      values.includes(id)
        ? values.filter((value) => value !== id)
        : [...values, id],
    );
  return (
    <div className={`panorama-shell ${cinematic ? 'is-cinematic' : ''}`}>
      <header className="pan-header" inert={slot !== null}>
        <a href="/" className="pan-brand">
          <Mountain size={23} />
          <span>
            长征 · 不灭的火种<small>全景地图框架</small>
          </span>
        </a>
        <p>现代地理底图 · 历史候选审阅原型</p>
        <span className="pan-candidate-label">未完成人工复核 · 非正式发布</span>
      </header>
      <aside
        className="pan-navigation"
        aria-label="全景事件导航"
        inert={slot !== null}
      >
        <h1>从全景看长征</h1>
        <p>瑞金至陕甘的区域浏览骨架。选择节点或推进底部阶段。</p>
        <nav aria-label="重要事件">
          {PANORAMA_NODES.map((node, nodeIndex) => (
            <button
              key={node.id}
              aria-current={node.id === step.region ? 'location' : undefined}
              onClick={() => selectRegion(node.id)}
            >
              <span className="pan-nav-number">
                {String(nodeIndex + 1).padStart(2, '0')}
              </span>
              <span>
                {node.title}
                <small>
                  {node.immersive
                    ? '沉浸入口占位'
                    : node.id === 'chishui'
                      ? '四阶段路线机制'
                      : '区域取景节点'}
                </small>
              </span>
            </button>
          ))}
        </nav>
        <div className="pan-layer-controls">
          <h2>
            <Layers size={15} />
            地图图层
          </h2>
          <label className="pan-height-control">
            地形高度
            <select
              aria-label="地形高度倍率"
              value={exaggeration}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value === 1 || value === 6 || value === 12 || value === 24)
                  setExaggeration(value);
              }}
            >
              <option value="1">1× 未额外夸张</option>
              <option value="6">6× 艺术增强</option>
              <option value="12">12× 艺术增强</option>
              <option value="24">24× 艺术增强</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={rivers}
              onChange={(e) => setRivers(e.target.checked)}
            />
            现代河流
          </label>
          {ROUTE_LAYERS.slice(0, 2).map((layer) => (
            <label key={layer.id}>
              <input
                type="checkbox"
                checked={camps.includes(layer.id)}
                onChange={() => toggleCamp(layer.id)}
              />
              <span className={`pan-swatch ${layer.id}`} />
              {layer.label}
            </label>
          ))}
          <p>
            已核路线 {publishedRoutes.length} 条<br />
            事件细分与沉浸局部路径待交付。多支主力按 unitId 分层，不虚构队伍。
          </p>
        </div>
      </aside>
      <main
        className="pan-main"
        aria-label="全景地图与局部入口"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !slot) {
            setCinematic(false);
            requestAnimationFrame(() => titleButton.current?.focus());
          }
        }}
      >
        <div className="pan-map-viewport" inert={slot !== null}>
          <MapCanvas
            activeRegion={step.region}
            unlocked={unlocked}
            onSelect={selectRegion}
            onAdapter={onAdapter}
            suspended={slot !== null}
            summaries={summaries}
            exaggeration={exaggeration}
            concealMarkers={cinematic}
          />
          <div className="pan-map-toolbar" aria-label="地图视角">
            <button onClick={overview}>
              <Expand size={16} />
              全景
            </button>
            <button
              onClick={() => {
                setView('overview');
                map.current?.overview(true);
              }}
            >
              <Map size={16} />
              俯瞰
            </button>
            <button
              onClick={() => {
                setView('region');
                map.current?.focus(REGIONS[step.region]);
              }}
            >
              <Focus size={16} />
              区域推进
            </button>
            <button
              aria-label="放大全景地图"
              onClick={() => map.current?.zoom(1)}
            >
              <ZoomIn size={17} />
            </button>
            <button
              aria-label="缩小全景地图"
              onClick={() => map.current?.zoom(-1)}
            >
              <ZoomOut size={17} />
            </button>
          </div>
          <div className="pan-map-caption">
            <strong>
              {view === 'overview' ? '全景总览' : `${step.title} · 区域取景`}
            </strong>
            <span>
              区域标识是镜头占位，不是事件坐标。拖动旋转，滚轮缩放，右键平移。
            </span>
          </div>
          {cinematic && (
            <CinematicTitle
              title={step.title}
              onDismiss={() => {
                setCinematic(false);
                requestAnimationFrame(() => titleButton.current?.focus());
              }}
            />
          )}
        </div>
        {slot && (
          <section
            className="pan-immersive-slot"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pan-slot-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') leave();
              if (event.key === 'Tab') {
                event.preventDefault();
                returnButton.current?.focus();
              }
            }}
          >
            <p>全景地图 / 局部沉浸入口</p>
            <h2 id="pan-slot-title">
              {PANORAMA_NODES.find((node) => node.immersive === slot)?.title}
            </h2>
            <div className="pan-slot-outline">
              <Mountain size={70} strokeWidth={0.8} />
              <p>场景挂接位置已预留</p>
            </div>
            <p>
              等待 A 的正式沉浸渲染器与 B
              的内容审核。本页不冒充已完成三维体验，不产生完成记录。
            </p>
            <dl>
              <dt>体验 ID</dt>
              <dd>{SLOT_EXPERIENCE_IDS[slot]}</dd>
              <dt>返回行为</dt>
              <dd>保留阶段与地图镜头，恢复后暂停</dd>
            </dl>
            <button ref={returnButton} onClick={leave}>
              <ArrowLeft size={16} />
              返回区域地图
            </button>
          </section>
        )}
      </main>
      <aside
        className="pan-detail"
        aria-hidden={cinematic}
        ref={detailPanel}
        aria-label="当前阶段资料"
        inert={slot !== null || cinematic}
      >
        <div className="pan-section-heading">
          <h2>
            <button
              className="pan-event-title-trigger"
              ref={titleButton}
              aria-pressed={cinematic}
              title="点击显示或收起画面艺术题字"
              onClick={() => setCinematic((value) => !value)}
            >
              {step.title}
            </button>
          </h2>
          <span>
            {index + 1} / {navigation.steps.length}
          </span>
        </div>
        <p className="pan-time-label">{step.timeLabel}</p>
        <p className="pan-data-note">
          候选正文 · 坐标未知。所有地图事件标识仅为区域镜头入口。
        </p>
        {step.region === 'chishui' && (
          <CrossingBoard
            phaseId={step.phaseId}
            red={camps.includes('red_army')}
            blue={camps.includes('nationalist_army')}
            onSelect={select}
          />
        )}
        {step.immersive && (
          <button
            ref={entryButton}
            className="pan-enter-button"
            onClick={enter}
          >
            查看沉浸入口占位
            <ArrowRight size={16} />
          </button>
        )}
        <h3>过程说明</h3>
        <p>
          {event?.summary ??
            '此处是技术入口。具体出发、会师阶段、部队与地点需由 B 补充证据并复核，本轮没有新增正式史实记录。'}
        </p>
        {event && (
          <details>
            <summary>展开 B 候选历史介绍</summary>
            <p className="pan-history-text">{event.detail}</p>
          </details>
        )}
        {sources.length > 0 && (
          <details>
            <summary>候选记录的来源（{sources.length}）</summary>
            <ul>
              {sources.map((source) => (
                <li key={source.sourceId}>
                  {source.title}
                  <small>
                    {source.publisherOrAuthor} · {source.pageOrSection}
                  </small>
                </li>
              ))}
            </ul>
          </details>
        )}
        <details className="pan-geography-note">
          <summary>底图来源与使用边界</summary>
          <p>
            Mapzen / Tilezen Terrain Tiles；全球 GMTED2010 / SRTM：USGS，全球
            ETOPO1：NOAA。河流：Natural Earth，公有领域。
          </p>
          <p>
            现代高程 385×321 网格，z6；高度可选 1×/6×/12×/24×，默认 12×
            艺术增强，河宽为显示增强。
            现代河流经过小比例尺概化，不能替代历史河道、赤水渡口与行军证据。此图不含政治边界，不是地图合规认证。
          </p>
          <p>
            主要山地读图范围：南岭、云贵高原、横断山地、四川盆地西缘、秦岭及黄土高原；具体标注与局部精度待
            A/B 复核。
          </p>
        </details>
      </aside>
      <footer className="pan-timeline" inert={slot !== null}>
        <div className="pan-timeline-heading">
          <div>
            <h2>长征全景浏览</h2>
            <p>浏览顺序不代表各军团统一历史时间；自动推进不等于体验完成。</p>
          </div>
          <label>
            <input
              type="checkbox"
              checked={follow}
              onChange={(e) => setFollow(e.target.checked)}
            />
            随阶段取景
          </label>
          <div className="pan-playback">
            <button
              aria-label="回到瑞金起始入口"
              onClick={() => {
                clock.reset();
                overview();
              }}
            >
              <RotateCcw size={16} />
            </button>
            <button
              aria-label="上一浏览阶段"
              disabled={index === 0}
              onClick={() => {
                setView('region');
                clock.previousPhase();
              }}
            >
              <ArrowLeft size={16} />
            </button>
            <button
              aria-label={clock.playing ? '暂停全景浏览' : '播放全景浏览'}
              disabled={index === navigation.steps.length - 1}
              onClick={() => {
                setView('region');
                if (clock.playing) clock.pause();
                else clock.play();
              }}
            >
              {clock.playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              aria-label="下一浏览阶段"
              disabled={index === navigation.steps.length - 1}
              onClick={() => {
                setView('region');
                clock.nextPhase();
              }}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="pan-phase-track" aria-label="浏览阶段节点">
          {navigation.steps.map((item, i) => (
            <button
              key={item.phaseId}
              aria-current={item.phaseId === step.phaseId ? 'step' : undefined}
              onClick={() => select(item.phaseId)}
            >
              <span className={i <= index ? 'is-reached' : ''} />
              <small>{item.title.replace('赤水', '')}</small>
            </button>
          ))}
        </div>
      </footer>
      {slot && <div className="pan-slot-scrim" aria-hidden="true" />}
    </div>
  );
}
