import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  CameraBookmark,
  LongMarchSceneV2Props,
} from '../../shared/contracts';
import {
  createPanoramaMap,
  type PanoramaMapAdapter,
} from './atlas/map-renderer';
import { ATLAS_REGIONS, REGIONS, type RegionId } from './atlas/regions';
import { buildSpatialView } from './atlas/spatial-view';
import { BridgeObservation } from './integration/BridgeObservation';
import { PanoramaObservation } from './integration/PanoramaObservation';
import './integration/integrated-scene.css';
import {
  Compass,
  Scan,
  Plus,
  Minus,
  ArrowUpRight,
  Info,
  SlidersHorizontal,
  Map as MapIcon,
} from 'lucide-react';
import { REGION_MOOD } from './atlas/environment-details';

export function LongMarchSceneV2(props: LongMarchSceneV2Props) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<PanoramaMapAdapter | null>(null),
    latest = useRef(props);
  const bridgeEntry = useRef<HTMLButtonElement>(null);
  const regionLabels = useRef(new Map<string, HTMLButtonElement>());
  const objectLabels = useRef(new Map<string, HTMLButtonElement>());
  const [region, setRegion] = useState<RegionId | null>(null),
    [mode, setMode] = useState('全程总览'),
    [observation, setObservation] = useState<
      'bridge' | 'snow' | 'grass' | null
    >(null);
  const [gain, setGain] = useState<1 | 6 | 12 | 24>(6),
    [rivers, setRivers] = useState(true);
  const [ready, setReady] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCinematic(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  const emitted = useRef(''),
    saved = useRef<ReturnType<PanoramaMapAdapter['bookmark']> | null>(null);
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  const view = useMemo(
    () => buildSpatialView(props.dataset, props.phaseId),
    [props.dataset, props.phaseId],
  );
  useEffect(() => {
    if (!host.current) return;
    let cancelled = false;
    try {
      const map = createPanoramaMap(host.current, {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
          .matches,
        onMarkers: (markers) => {
          for (const marker of markers) {
            const node = regionLabels.current.get(marker.id);
            if (!node) continue;
            node.style.transform = `translate(${marker.x}px,${marker.y}px)`;
            node.style.visibility = marker.visible ? 'visible' : 'hidden';
          }
        },
        onObjects: (objects) => {
          for (const object of objects) {
            const label = objectLabels.current.get(
              `${object.kind}:${object.id}`,
            );
            if (label) {
              label.style.transform = `translate(${object.x}px,${object.y}px) translate(-50%,-100%)`;
              label.style.visibility = object.visible ? 'visible' : 'hidden';
            }
          }
        },
        onReady: () => {
          if (!cancelled) {
            setReady(true);
            latest.current.onSceneReady();
          }
        },
        onError: (message) => {
          if (!cancelled)
            latest.current.onSceneError({ code: 'render_failed', message });
        },
        onManualControl: () => {
          if (!cancelled) setMode('自由浏览');
        },
        onCameraChanged: (value) => {
          if (cancelled) return;
          const bookmark: CameraBookmark = {
            ...value,
            coordinateSystem: 'scene-local',
            zoom: 1,
            phaseId: latest.current.phaseId,
          };
          emitted.current = JSON.stringify(bookmark);
          latest.current.onCameraBookmark(bookmark);
        },
      });
      api.current = map;
      map.setSpatialView(
        buildSpatialView(latest.current.dataset, latest.current.phaseId),
      );
      const initial = latest.current.cameraBookmark;
      if (
        initial?.sceneId === 'long-march-modern-panorama' &&
        initial.phaseId === latest.current.phaseId
      )
        map.restore({ ...initial, sceneId: 'long-march-modern-panorama' });
    } catch {
      queueMicrotask(() => {
        if (!cancelled)
          latest.current.onSceneError({
            code: 'webgl_unavailable',
            message: '当前设备无法创建三维地图，请重试或继续阅读资料。',
          });
      });
    }
    return () => {
      cancelled = true;
      api.current?.dispose();
      api.current = null;
    };
  }, []);
  useEffect(() => {
    api.current?.setSpatialView(view);
  }, [view]);
  useEffect(() => {
    const bookmark = props.cameraBookmark;
    if (
      bookmark?.sceneId === 'long-march-modern-panorama' &&
      bookmark.phaseId === props.phaseId &&
      JSON.stringify(bookmark) !== emitted.current
    )
      api.current?.restore({
        ...bookmark,
        sceneId: 'long-march-modern-panorama',
      });
  }, [props.cameraBookmark, props.phaseId]);
  useEffect(() => {
    if (!props.selection) return;
    const object = view.objects.find(
      (object) =>
        object.selection.kind === props.selection?.kind &&
        object.selection.id === props.selection.id,
    );
    if (!object) return;
    const [x, y] = object.point;
    const region = (
      Object.entries(REGIONS) as [RegionId, readonly number[]][]
    ).find(([, b]) => x >= b[0]! && x <= b[2]! && y >= b[1]! && y <= b[3]!);
    api.current?.focus(
      region ? REGIONS[region[0]] : [x - 0.1, y - 0.1, x + 0.1, y + 0.1],
    );
  }, [props.selection, view.objects]);
  const focus = (id: RegionId) => {
    setRegion(id);
    setMode('区域视野');
    api.current?.focus(REGIONS[id]);
  };
  const openObservation = (kind: 'bridge' | 'snow' | 'grass') => {
    saved.current = api.current?.bookmark() ?? null;
    api.current?.suspend(true);
    setObservation(kind);
  };
  const closeObservation = () => {
    setObservation(null);
    api.current?.suspend(false);
    if (saved.current) api.current?.restore(saved.current);
    requestAnimationFrame(() => bridgeEntry.current?.focus());
  };
  return (
    <div
      className="atlas-root"
      data-cinematic={cinematic}
      data-region={region ?? 'overview'}
      data-phase-id={props.phaseId ?? ''}
      data-unit-count={view.units.length}
      data-route-count={view.routes.length}
    >
      <div className="atlas-canvas" ref={host} />
      <nav
        className="atlas-region-markers"
        aria-label="总图区域入口"
        hidden={region !== null}
      >
        {ATLAS_REGIONS.map((item, index) => (
          <button
            key={item.id}
            aria-label={`观察${item.title}`}
            disabled={!ready}
            data-side={index % 2 ? 'right' : 'left'}
            ref={(node) => {
              if (node) regionLabels.current.set(item.id, node);
              else regionLabels.current.delete(item.id);
            }}
            onClick={() => focus(item.id)}
          >
            <i aria-hidden="true" />
            <span>{item.title}</span>
          </button>
        ))}
      </nav>
      <div className="atlas-object-labels">
        {view.objects.map((object) => (
          <button
            key={`${object.selection.kind}:${object.selection.id}`}
            ref={(node) => {
              const key = `${object.selection.kind}:${object.selection.id}`;
              if (node) objectLabels.current.set(key, node);
              else objectLabels.current.delete(key);
            }}
            onClick={() => props.onObjectSelect(object.selection)}
          >
            {object.title}
          </button>
        ))}
      </div>
      <div className="atlas-vignette" aria-hidden="true" />
      <div className="atlas-region-title">
        <small>
          <span /> 山河纪行 <span />
        </small>
        <h2>
          {region
            ? ATLAS_REGIONS.find((item) => item.id === region)?.title
            : '山河之间'}
        </h2>
        <p>
          {region ? REGION_MOOD[region].subtitle : '循山川脉络，见辽阔天地。'}
        </p>
        {(region === 'snow' || region === 'grass') && (
          <button ref={bridgeEntry} onClick={() => openObservation(region)}>
            展开环境画卷 <ArrowUpRight size={15} />
          </button>
        )}
        {region === 'luding' && (
          <button ref={bridgeEntry} onClick={() => openObservation('bridge')}>
            走近桥谷 <ArrowUpRight size={15} />
          </button>
        )}
      </div>
      <nav className="atlas-controls" aria-label="地图视野">
        <button
          title="全程总览"
          aria-label="全程总览"
          disabled={!ready}
          onClick={() => {
            setRegion(null);
            setMode('全程总览');
            api.current?.overview();
          }}
        >
          <MapIcon size={19} />
          <span>总图</span>
        </button>
        <button
          title="固定俯瞰"
          aria-label="固定俯瞰"
          disabled={!ready}
          onClick={() => {
            setRegion(null);
            setMode('固定俯瞰');
            api.current?.overview(true);
          }}
        >
          <Compass size={19} />
          <span>俯瞰</span>
        </button>
        <i />
        <button
          aria-label="放大地图"
          disabled={!ready}
          onClick={() => api.current?.zoom(1)}
        >
          <Plus size={19} />
        </button>
        <button
          aria-label="缩小地图"
          disabled={!ready}
          onClick={() => api.current?.zoom(-1)}
        >
          <Minus size={19} />
        </button>
        <button
          aria-label={cinematic ? '退出观景模式' : '进入观景模式'}
          aria-pressed={cinematic}
          onClick={() => setCinematic(!cinematic)}
        >
          <Scan size={19} />
          <span>{cinematic ? '返回' : '观景'}</span>
        </button>
      </nav>
      <details className="atlas-settings">
        <summary>
          <SlidersHorizontal size={15} /> 画面
        </summary>
        <div className="atlas-tuning">
          <label>
            地势
            <select
              aria-label="地势显示高度"
              value={gain}
              onChange={(event) => {
                const value = Number(event.target.value) as 1 | 6 | 12 | 24;
                setGain(value);
                api.current?.setVerticalExaggeration(value);
              }}
            >
              <option value={1}>原始高程</option>
              <option value={6}>层峦</option>
              <option value={12}>雄浑</option>
              <option value={24}>磅礴</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={rivers}
              onChange={(event) => {
                setRivers(event.target.checked);
                api.current?.setRivers(event.target.checked);
              }}
            />
            显示水系
          </label>
          <span>{mode}</span>
        </div>
      </details>
      <nav className="atlas-chapters" aria-label="区域地理观察">
        <div className="atlas-chapter-heading">
          <span>山 河 图 卷</span>
          <small>选择一处，走近山河</small>
        </div>
        <div className="atlas-chapter-list">
          {ATLAS_REGIONS.map((item, index) => (
            <button
              key={item.id}
              disabled={!ready}
              aria-pressed={region === item.id}
              onClick={() => focus(item.id)}
              data-biome={item.id}
            >
              <span className="atlas-chapter-art" aria-hidden="true">
                <i />
                <b />
                <em />
              </span>
              <span className="atlas-chapter-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <strong>{item.title}</strong>
              <small>{REGION_MOOD[item.id].subtitle.split(' · ')[0]}</small>
            </button>
          ))}
        </div>
      </nav>
      <details className="atlas-information">
        <summary>
          <Info size={13} /> 地图说明
        </summary>
        <div>
          <strong>山川为景，史料为据</strong>
          <p>
            地形取自现代高程，植被、积雪与近景为艺术示意，不代表历史地貌。图卷封面为
            AI 环境意象。地势可切换原始高程。
          </p>
          <p>历史路线与军队位置只显示已发布资料；未知位置不作推测。</p>
          <p>
            地形 USGS / Mapzen · 水系 Natural Earth / © OpenStreetMap
            contributors
          </p>
        </div>
      </details>
      <a
        className="atlas-source-credit"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap
      </a>
      <p className="atlas-operation">
        拖动环顾 <span>·</span> 滚轮远近 <span>·</span> 右键平移
      </p>
      {cinematic && (
        <span className="atlas-cinematic-hint">按 Esc 返回 · 拖动自由观景</span>
      )}
      {observation === 'bridge' && (
        <BridgeObservation onClose={closeObservation} />
      )}
      {(observation === 'snow' || observation === 'grass') && (
        <PanoramaObservation kind={observation} onClose={closeObservation} />
      )}
    </div>
  );
}
