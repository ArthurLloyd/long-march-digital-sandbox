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
import './integration/integrated-scene.css';

export function LongMarchSceneV2(props: LongMarchSceneV2Props) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<PanoramaMapAdapter | null>(null),
    latest = useRef(props);
  const bridgeEntry = useRef<HTMLButtonElement>(null);
  const regionLabels = useRef(new Map<string, HTMLButtonElement>());
  const objectLabels = useRef(new Map<string, HTMLButtonElement>());
  const [region, setRegion] = useState<RegionId | null>(null),
    [mode, setMode] = useState('全程总览'),
    [observation, setObservation] = useState(false);
  const [gain, setGain] = useState<1 | 6 | 12 | 24>(12),
    [rivers, setRivers] = useState(true);
  const [ready, setReady] = useState(false);
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
  const openObservation = () => {
    saved.current = api.current?.bookmark() ?? null;
    api.current?.suspend(true);
    setObservation(true);
  };
  const closeObservation = () => {
    setObservation(false);
    api.current?.suspend(false);
    if (saved.current) api.current?.restore(saved.current);
    requestAnimationFrame(() => bridgeEntry.current?.focus());
  };
  return (
    <div
      className="atlas-root"
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
      <nav className="atlas-controls" aria-label="地图视野">
        <span>山河视野</span>
        <button
          disabled={!ready}
          onClick={() => {
            setRegion(null);
            setMode('全程总览');
            api.current?.overview();
          }}
        >
          全程
        </button>
        <button
          disabled={!ready}
          onClick={() => {
            setRegion(null);
            setMode('固定俯瞰');
            api.current?.overview(true);
          }}
        >
          俯瞰
        </button>
        <button
          disabled={!ready}
          aria-label="放大地图"
          onClick={() => api.current?.zoom(1)}
        >
          ＋
        </button>
        <button
          disabled={!ready}
          aria-label="缩小地图"
          onClick={() => api.current?.zoom(-1)}
        >
          −
        </button>
        <label>
          <span className="atlas-sr">区域地理观察</span>
          <select
            aria-label="区域地理观察"
            value={region ?? ''}
            disabled={!ready}
            onChange={(event) => {
              if (event.target.value) focus(event.target.value as RegionId);
            }}
          >
            <option value="">选择区域</option>
            {ATLAS_REGIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </nav>
      <div className="atlas-tuning">
        <label>
          地势{' '}
          <select
            aria-label="地势显示高度"
            value={gain}
            onChange={(event) => {
              const value = Number(event.target.value) as 1 | 6 | 12 | 24;
              setGain(value);
              api.current?.setVerticalExaggeration(value);
            }}
          >
            <option value={1}>原始</option>
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
          />{' '}
          水系
        </label>
        <span>{mode}</span>
      </div>
      {region && (
        <div className="atlas-region-title">
          <small>LANDSCAPE STUDY</small>
          <h2>{ATLAS_REGIONS.find((item) => item.id === region)?.title}</h2>
          <p>现代地理 · 区域观察</p>
          {region === 'luding' && (
            <button ref={bridgeEntry} onClick={openObservation}>
              走近桥谷 · 结构观察 ↗
            </button>
          )}
        </div>
      )}
      <p className="atlas-attribution">
        USGS / Mapzen · Natural Earth · © OpenStreetMap contributors{' '}
        <span>{gain === 1 ? '原始高程' : '地势艺术增强'} · 非历史地貌复原</span>
      </p>
      <p className="atlas-operation">拖动环顾 · 滚轮缩放 · 右键平移</p>
      {observation && <BridgeObservation onClose={closeObservation} />}
    </div>
  );
}
