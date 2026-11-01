import { useEffect, useRef, useState } from 'react';
import { PANORAMA_NODES, nodeKind, type RegionId } from './navigation';
import { createPanoramaMap, type PanoramaMapAdapter } from './map-renderer';

export function MapCanvas({
  activeRegion,
  unlocked,
  onSelect,
  onAdapter,
  suspended,
  summaries,
  exaggeration,
  concealMarkers,
}: {
  activeRegion: RegionId;
  unlocked: ReadonlySet<RegionId>;
  onSelect: (region: RegionId) => void;
  onAdapter: (api: PanoramaMapAdapter | null) => void;
  suspended: boolean;
  summaries: Readonly<Record<RegionId, string>>;
  exaggeration: 1 | 6 | 12 | 24;
  concealMarkers: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Partial<Record<RegionId, HTMLButtonElement | null>>>(
    {},
  );
  const api = useRef<PanoramaMapAdapter | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    if (!host.current) return;
    let map: PanoramaMapAdapter | null = null;
    let cancelled = false;
    try {
      map = createPanoramaMap(host.current, {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
          .matches,
        onError: setError,
        onReady: () => {
          if (!cancelled) {
            setReady(true);
            onAdapter(map);
          }
        },
        onMarkers: (markers) =>
          markers.forEach((marker) => {
            const element = labels.current[marker.id];
            if (!element) return;
            const shift =
              marker.id === 'chishui'
                ? -30
                : marker.id === 'snow'
                  ? -18
                  : marker.id === 'luding'
                    ? 16
                    : 0;
            element.style.transform = `translate(${marker.x}px, ${marker.y + shift}px) translate(-50%, -100%)`;
            element.style.visibility = marker.visible ? 'visible' : 'hidden';
          }),
      });
      api.current = map;
    } catch (problem) {
      const message =
        problem instanceof Error
          ? problem.message
          : '当前浏览器无法创建三维地图';
      queueMicrotask(() => {
        if (!cancelled) setError(message);
      });
    }
    return () => {
      cancelled = true;
      map?.dispose();
      api.current = null;
      onAdapter(null);
    };
  }, [epoch, onAdapter]);
  useEffect(() => api.current?.suspend(suspended), [suspended]);
  return (
    <div className="pan-map-stage" aria-label="全景三维地图">
      <div className="pan-map-canvas" ref={host} />
      <div
        className={`pan-map-markers ${concealMarkers ? 'is-concealed' : ''}`}
        aria-hidden={concealMarkers}
        inert={concealMarkers}
      >
        {PANORAMA_NODES.map((node) => (
          <button
            key={node.id}
            ref={(element) => {
              labels.current[node.id] = element;
            }}
            className={`pan-marker ${node.id === activeRegion ? 'is-active' : ''}`}
            disabled={!unlocked.has(node.id) || !ready || suspended}
            title={`${node.title}：${summaries[node.id]}\n技术取景区域，不是历史精确点位${unlocked.has(node.id) ? '' : '；推进浏览后解锁'}`}
            data-node-kind={nodeKind(node)}
            aria-label={`定位${node.title}区域`}
            onClick={() => onSelect(node.id)}
          >
            <span aria-hidden="true" className="pan-marker-dot" />
            {node.title}
            <small>区域</small>
          </button>
        ))}
      </div>
      <div className="pan-map-range">
        96°–118° E <span>现代地理参考</span> 23°–39° N
      </div>
      {!ready && !error && (
        <p className="pan-map-message" role="status">
          正在展开全景地形…
        </p>
      )}
      {error && (
        <div className="pan-map-message" role="alert">
          <p>三维地图暂不可用：{error}</p>
          <button
            onClick={() => {
              setError('');
              setReady(false);
              setEpoch((value) => value + 1);
            }}
          >
            重试三维地图
          </button>
          <p>仍可使用左侧导航、时间轴和四渡工程板。</p>
        </div>
      )}
      <span className="pan-map-status" role="status">
        {ready && !error
          ? `现代地形 · 高度 ${exaggeration}×${exaggeration === 1 ? ' 未额外夸张' : ' 艺术增强'} · 河宽为显示增强`
          : '地图载入中'}
      </span>
    </div>
  );
}
