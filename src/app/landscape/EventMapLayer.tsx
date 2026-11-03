import {
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from 'react';
import { MapPin, X, ArrowUpRight } from 'lucide-react';
import type {
  EventMapModel,
  MapEventEntry,
} from '../history/event-map/event-map-selectors';
import type { MarkerProjection, MarkerViewport } from './map-renderer';
import {
  layoutEventLabels,
  layoutAnchoredMapLabels,
} from './event-marker-layout';
import '../../styles/event-map.css';
import type { MapSafeRect } from './map-safe-area';
import type { GeoPoint } from './geography';

export interface EventMapLayerHandle {
  project(
    markers: readonly MarkerProjection[],
    viewport?: MarkerViewport,
  ): MapSafeRect[];
}
export function EventMapLayer({
  model,
  ref,
  activeEventIds,
  onChoose,
  onRead,
  onOverview,
  reading,
  onRegion,
  directRead = false,
  safeAreas = [],
  arrivingEventId,
  arrivingCoordinates,
}: {
  model: EventMapModel;
  ref: Ref<EventMapLayerHandle>;
  activeEventIds: readonly string[];
  onChoose: (entry: MapEventEntry) => void;
  onRead: (eventId: string) => void;
  onOverview: () => void;
  onRegion: (regionId: string) => void;
  reading: boolean;
  directRead?: boolean;
  safeAreas?: readonly MapSafeRect[];
  arrivingEventId?: string | null;
  arrivingCoordinates?: GeoPoint | null;
}) {
  const [selection, setSelection] = useState<string | null>(null);
  const [region, setRegion] = useState('all');
  const elements = useRef(new Map<string, HTMLButtonElement>());
  const leaders = useRef(new Map<string, SVGLineElement>());
  const pointerHold = useRef<{
    id: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const selectedTrigger = useRef<HTMLElement | null>(null),
    readTrigger = useRef<HTMLElement | null>(null);
  const wasReading = useRef(reading),
    directory = useRef<HTMLDetailsElement>(null);
  const selected = model.entries.find((p) => p.placementId === selection);
  const eventCount = new Set(model.entries.map((p) => p.eventId)).size;
  const regions = model.resources.positions.regions.filter((r) =>
    model.entries.some((p) => p.regionIds.includes(r.regionId)),
  );
  const choose = (entry: MapEventEntry) => {
    if (pointerHold.current?.moved) {
      pointerHold.current = null;
      return;
    }
    pointerHold.current = null;
    selectedTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSelection(entry.placementId);
    onChoose(entry);
    if (directRead) onRead(entry.eventId);
    if (directory.current) directory.current.open = false;
  };
  const browseRegion = (id: string) => {
    setSelection(null);
    setRegion(id);
    if (id === 'all') onOverview();
    else onRegion(id);
  };
  useLayoutEffect(() => {
    if (wasReading.current && !reading && readTrigger.current?.isConnected)
      readTrigger.current.focus({ preventScroll: true });
    wasReading.current = reading;
  }, [reading]);
  useImperativeHandle(
    ref,
    () => ({
      project(markers, viewport) {
        if (!viewport) return [];
        const far = !directRead && viewport.distance > 4.8;
        const wanted = markers.filter((m) =>
          far
            ? m.id.startsWith('event-region:') &&
              regions.some((r) => m.id === `event-region:${r.regionId}`)
            : m.id.startsWith('placement:') &&
              model.entries.some((p) => m.id === `placement:${p.placementId}`),
        );
        const layout = new Map(
          (directRead ? layoutAnchoredMapLabels : layoutEventLabels)(
            wanted,
            viewport.width,
            viewport.height,
            arrivingEventId
              ? `placement:${
                  model.entries
                    .filter((p) => p.eventId === arrivingEventId)
                    .sort((a, b) => {
                      if (!arrivingCoordinates) return 0;
                      const distance = (p: MapEventEntry) =>
                        Math.hypot(
                          p.anchorCoordinates[0] - arrivingCoordinates[0],
                          p.anchorCoordinates[1] - arrivingCoordinates[1],
                        );
                      return distance(a) - distance(b);
                    })[0]?.placementId
                }`
              : selection
                ? `placement:${selection}`
                : null,
            safeAreas,
          ).map((m) => [m.id, m]),
        );
        for (const [id, element] of elements.current) {
          if (pointerHold.current?.id === id) continue;
          const p = layout.get(id),
            visible = Boolean(p?.visible);
          element.style.visibility = visible ? 'visible' : 'hidden';
          element.tabIndex = visible ? 0 : -1;
          element.setAttribute('aria-hidden', String(!visible));
          if (p)
            element.style.transform = `translate(${p.labelX}px,${p.labelY}px) translate(-50%,-100%)`;
          const leader = leaders.current.get(id);
          if (leader) {
            leader.style.visibility = visible ? 'visible' : 'hidden';
            if (p) {
              leader.setAttribute('x1', String(p.x));
              leader.setAttribute('y1', String(p.y));
              leader.setAttribute('x2', String(p.labelX));
              leader.setAttribute('y2', String(p.labelY));
            }
          }
        }
        return [...layout.values()]
          .filter((p) => p.visible && elements.current.has(p.id))
          .map((p) => {
            const element = elements.current.get(p.id)!;
            const width = element.offsetWidth || (directRead ? 220 : 200);
            const height = element.offsetHeight || 42;
            return {
              x: p.labelX - width / 2,
              y: p.labelY - height,
              width,
              height,
            };
          });
      },
    }),
    [
      model,
      regions,
      selection,
      directRead,
      safeAreas,
      arrivingEventId,
      arrivingCoordinates,
    ],
  );
  const register = (id: string, element: HTMLButtonElement | null) => {
    if (element) elements.current.set(id, element);
    else elements.current.delete(id);
  };
  const holdMarker = (id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      pointerHold.current = { id, x: e.clientX, y: e.clientY, moved: false };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      const p = pointerHold.current;
      if (p?.id === id && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6)
        p.moved = true;
    },
    onPointerUp: () => {
      requestAnimationFrame(() => {
        pointerHold.current = null;
      });
    },
    onPointerCancel: () => {
      pointerHold.current = null;
    },
  });
  const readable =
    region === 'all'
      ? model.entries
      : model.entries.filter((p) => p.regionIds.includes(region));
  const unique = [...new Map(readable.map((p) => [p.eventId, p])).values()];
  return (
    <section className="event-map-layer" aria-label="事件概略地图">
      {!directRead && (
        <details
          className="event-map-directory"
          ref={directory}
          data-map-obstacle={directRead ? 'true' : undefined}
        >
          <summary>
            <MapPin size={15} />
            {directRead ? '区域故事' : '事件地图'} <span>{eventCount}</span>
          </summary>
          <div className="event-map-directory-body">
            <div className="event-map-directory-heading">
              <h2>山河中的历史</h2>
              <button
                onClick={() => {
                  browseRegion('all');
                  if (directory.current) directory.current.open = false;
                }}
              >
                查看总览
                <ArrowUpRight size={14} />
              </button>
            </div>
            <p>
              {eventCount} 个事件 · {model.entries.length} 个位置标记
            </p>
            <label>
              浏览区域
              <select
                value={
                  regions.some((r) => r.regionId === region) ? region : 'all'
                }
                onChange={(e) => {
                  browseRegion(e.target.value);
                }}
              >
                <option value="all">全部区域</option>
                {regions.map((r) => (
                  <option key={r.regionId} value={r.regionId}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            {model.error && <p role="status">{model.error}</p>}
            <div className="event-map-directory-list">
              {unique.map((p) => (
                <button key={p.eventId} onClick={() => choose(p)}>
                  <strong>{p.displayLabel ?? p.event.title}</strong>
                  <span>{p.event.dateText}</span>
                </button>
              ))}
            </div>
            {model.unlocated.length > 0 && (
              <details>
                <summary>尚无位置参考（{model.unlocated.length}）</summary>
                {model.unlocated.map((e) => (
                  <button key={e.id} onClick={() => onRead(e.id)}>
                    {e.title} · 阅读正文
                  </button>
                ))}
              </details>
            )}
          </div>
        </details>
      )}
      <p className="event-map-legend">
        事件位置为概略定位 <span>◇ 事件点 ▱ 区域参考</span>
      </p>
      <div className="event-map-markers">
        <svg className="event-map-leaders" aria-hidden="true">
          {model.entries.map((p) => (
            <line
              key={p.placementId}
              ref={(el) => {
                if (el) leaders.current.set(`placement:${p.placementId}`, el);
                else leaders.current.delete(`placement:${p.placementId}`);
              }}
            />
          ))}
        </svg>
        {regions.map((r) => (
          <button
            className="event-map-cluster"
            key={r.regionId}
            {...holdMarker(`event-region:${r.regionId}`)}
            ref={(el) => register(`event-region:${r.regionId}`, el)}
            onClick={() => {
              browseRegion(r.regionId);
            }}
            aria-label={`浏览${r.title}事件`}
            aria-hidden="true"
            tabIndex={-1}
          >
            <MapPin size={14} />
            <span>{r.title}</span>
            <small>
              {
                new Set(
                  model.entries
                    .filter((p) => p.regionIds.includes(r.regionId))
                    .map((p) => p.eventId),
                ).size
              }
              事件
            </small>
          </button>
        ))}
        {model.entries.map((p) => (
          <button
            className="event-map-marker"
            key={p.placementId}
            {...holdMarker(`placement:${p.placementId}`)}
            ref={(el) => register(`placement:${p.placementId}`, el)}
            data-current={activeEventIds.includes(p.eventId)}
            data-selected={selected?.placementId === p.placementId}
            data-kind={p.placementKind}
            data-arriving={p.eventId === arrivingEventId}
            aria-label={`${p.displayLabel ?? p.event.title}，${p.locationLabel}`}
            aria-hidden="true"
            tabIndex={-1}
            aria-pressed={selected?.placementId === p.placementId}
            onClick={() => choose(p)}
          >
            <span aria-hidden="true">
              {p.placementKind === 'point' ? '◇' : '▱'}
            </span>
            <span>{p.displayLabel ?? p.event.title}</span>
          </button>
        ))}
      </div>
      {selected && !directRead && (
        <aside
          className="event-map-preview"
          aria-label="事件位置预览"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setSelection(null);
              selectedTrigger.current?.focus({ preventScroll: true });
            }
          }}
        >
          <div className="event-map-preview-heading">
            <span>
              {selected.origin === 'historical'
                ? '历史坐标'
                : selected.placementKind === 'point'
                  ? '概略地点'
                  : '区域参考'}
            </span>
            <button
              aria-label="关闭事件位置预览"
              onClick={() => {
                setSelection(null);
                selectedTrigger.current?.focus({ preventScroll: true });
              }}
            >
              <X size={17} />
            </button>
          </div>
          <h2>{selected.displayLabel ?? selected.event.title}</h2>
          <p className="event-map-date">{selected.event.dateText}</p>
          <p className="event-map-location">
            <MapPin size={14} />
            {selected.locationLabel}
          </p>
          <p className="event-map-summary">{selected.event.summary}</p>
          {model.entries.filter((p) => p.eventId === selected.eventId).length >
            1 && (
            <div className="event-map-related" aria-label="本事件的关联位置">
              {model.entries
                .filter((p) => p.eventId === selected.eventId)
                .map((p) => (
                  <button
                    aria-pressed={p.placementId === selected.placementId}
                    key={p.placementId}
                    onClick={() => choose(p)}
                  >
                    {p.locationLabel}
                  </button>
                ))}
            </div>
          )}
          <details className="event-map-evidence" key={selected.placementId}>
            <summary>位置依据与精度</summary>
            <p>
              {selected.precision === 'exact'
                ? '原始精确坐标'
                : selected.precision === 'approximate'
                  ? '概略点；非测绘定位'
                  : '示意区域；中心仅用于取景'}
            </p>
            <p>{selected.rationale}</p>
            <p>{selected.limitations}</p>
            <h3>现代定位资料</h3>
            <ul>
              {selected.locationReferenceIds
                .map((id) =>
                  model.resources.references.find((r) => r.referenceId === id),
                )
                .filter((r) => r !== undefined)
                .map((r) => (
                  <li key={r.referenceId}>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.title}
                    </a>
                  </li>
                ))}
            </ul>
            <h3>历史关系资料</h3>
            <ul>
              {selected.historicalSources.map((s) => (
                <li key={s.sourceId}>
                  <a
                    href={
                      /^https?:\/\//.test(s.urlOrCatalogNumber)
                        ? s.urlOrCatalogNumber
                        : undefined
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <button
            className="event-map-read"
            onClick={(e) => {
              readTrigger.current = e.currentTarget;
              onRead(selected.eventId);
            }}
          >
            阅读事件
            <ArrowUpRight size={17} />
          </button>
        </aside>
      )}
    </section>
  );
}
