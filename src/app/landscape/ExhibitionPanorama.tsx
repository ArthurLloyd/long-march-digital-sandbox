import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Expand, Layers, Map, Mountain, ZoomIn, ZoomOut } from 'lucide-react';
import type { LongMarchSceneV2Props } from '../../shared/contracts';
import { CinematicTitle } from '../../components/exhibition/CinematicTitle';
import { createPanoramaMap, type PanoramaMapAdapter } from './map-renderer';
import { GEOGRAPHIC_VIEWS, REGIONS, type RegionId } from './map-regions';
import { inCoverage, regionCenter } from './geography';
import { selectMapRoutes } from './map-objects';
import {
  selectForceStateForPhase,
  SPATIAL_LABELS,
} from '../history/force-state';
import '../../styles/exhibition-panorama.css';
const geographicMarkers = GEOGRAPHIC_VIEWS.map((view) => ({
  id: `view:${view.id}`,
  coordinates: regionCenter(REGIONS[view.id]),
}));

/** C-owned geographical view. C1 owns experience completion; C2 owns phases. */
export function ExhibitionPanorama(props: LongMarchSceneV2Props) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<PanoramaMapAdapter | null>(null);
  const latest = useRef(props),
    labels = useRef<Record<string, HTMLElement | null>>({});
  const trigger = useRef<HTMLElement | null>(null),
    views = useRef<HTMLDetailsElement>(null);
  const [epoch, setEpoch] = useState(0),
    [cinematic, setCinematic] = useState<string | null>(null);
  const [view, setView] = useState<RegionId | null>(null),
    [eventId, setEventId] = useState<string | null>(null);
  const [rivers, setRivers] = useState(true),
    [gain, setGain] = useState<1 | 6 | 12 | 24>(12);
  const [follow, setFollow] = useState(true);
  const [camps, setCamps] = useState(['red_army', 'nationalist_army', 'other']);
  useLayoutEffect(() => {
    latest.current = props;
  }, [props]);
  const points = useMemo(
    () =>
      props.events.filter(
        (event) =>
          event.releaseStatus === 'published' &&
          event.reviewStatus === 'reviewed' &&
          event.coordinates !== null &&
          event.coordinatePrecision !== 'unknown' &&
          inCoverage(event.coordinates),
      ),
    [props.events],
  );
  const routes = useMemo(
    () => selectMapRoutes(props.dataset, props.phaseId),
    [props.dataset, props.phaseId],
  );
  const forceState = useMemo(
    () => selectForceStateForPhase(props.dataset, props.phaseId),
    [props.dataset, props.phaseId],
  );
  const forcePoints = useMemo(
    () =>
      forceState.entries.filter(
        ({ track, snapshot }) =>
          camps.includes(track.camp) &&
          snapshot.displayMode === 'point' &&
          snapshot.coordinates !== null &&
          inCoverage(snapshot.coordinates),
      ),
    [forceState, camps],
  );
  const event = points.find((item) => item.id === eventId);
  // A phase change or withdrawal must not leave a stale event title onscreen.
  const visibleCinematic =
    cinematic && (!eventId || event?.title === cinematic) ? cinematic : null;
  useEffect(() => {
    if (!host.current) return;
    let map: PanoramaMapAdapter | null = null,
      active = true;
    try {
      map = createPanoramaMap(host.current, {
        technicalMarkers: false,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
          .matches,
        onReady: () => {
          if (active) {
            setEpoch((value) => value + 1);
            latest.current.onSceneReady();
          }
        },
        onError: (message) => {
          if (active)
            latest.current.onSceneError({ code: 'render_failed', message });
        },
        onMarkers: (markers) =>
          markers.forEach((marker) => {
            const label = labels.current[marker.id];
            if (!label) return;
            const shift =
              marker.id === 'view:chishui'
                ? -26
                : marker.id === 'view:snow'
                  ? -18
                  : marker.id === 'view:luding'
                    ? 16
                    : 0;
            label.style.transform = `translate(${marker.x}px,${marker.y + shift}px) translate(-50%,-100%)`;
            label.style.visibility = marker.visible ? 'visible' : 'hidden';
          }),
        onViewChange: (bookmark) => {
          if (active)
            latest.current.onCameraBookmark({
              ...bookmark,
              coordinateSystem: 'scene-local',
              zoom: 1,
              phaseId: latest.current.phaseId,
            });
        },
      });
      api.current = map;
    } catch (problem) {
      latest.current.onSceneError({
        code: 'webgl_unavailable',
        message:
          problem instanceof Error
            ? problem.message
            : '当前浏览器无法创建全景地图。',
      });
    }
    return () => {
      active = false;
      map?.dispose();
      api.current = null;
    };
  }, []);
  useEffect(() => {
    api.current?.setMarkers([
      ...geographicMarkers,
      ...points.map((event) => ({
        id: `event:${event.id}`,
        coordinates: event.coordinates!,
      })),
      ...forcePoints.map(({ snapshot }) => ({
        id: `force:${snapshot.snapshotId}`,
        coordinates: snapshot.coordinates!,
      })),
    ]);
  }, [points, forcePoints, epoch]);
  useEffect(() => {
    api.current?.setRoutes(routes, camps);
  }, [routes, camps, epoch]);
  useEffect(() => {
    api.current?.setForceRegions(forceState, camps);
  }, [forceState, camps, epoch]);
  useEffect(() => {
    api.current?.setRivers(rivers);
  }, [rivers, epoch]);
  useEffect(() => {
    api.current?.setVerticalExaggeration(gain);
  }, [gain, epoch]);
  useEffect(() => {
    const saved = props.cameraBookmark;
    if (
      saved &&
      saved.phaseId === props.phaseId &&
      saved.sceneId === 'long-march-modern-panorama'
    )
      api.current?.restore({ ...saved, sceneId: 'long-march-modern-panorama' });
  }, [props.cameraBookmark, props.phaseId, epoch]);
  useEffect(() => {
    if (!follow) return;
    if (
      props.cameraBookmark?.sceneId === 'long-march-modern-panorama' &&
      props.cameraBookmark.phaseId === props.phaseId
    )
      return;
    const selected =
      points.find((event) => event.id === props.activeEventId) ?? points[0];
    if (selected?.coordinates) api.current?.focusGeo(selected.coordinates);
  }, [
    props.activeEventId,
    props.cameraBookmark,
    props.phaseId,
    points,
    follow,
    epoch,
  ]);
  const dismiss = useCallback(() => {
    setCinematic(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }, []);
  const remember = () => {
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };
  const chooseView = (id: RegionId) => {
    remember();
    setFollow(false);
    setEventId(null);
    setView(id);
    const title = GEOGRAPHIC_VIEWS.find((item) => item.id === id)!.title;
    if (view === id && visibleCinematic === title) {
      setCinematic(null);
      if (views.current) views.current.open = false;
      trigger.current = views.current?.querySelector('summary') ?? null;
      requestAnimationFrame(() => trigger.current?.focus());
      return;
    }
    setCinematic((current) => (current === title ? null : title));
    api.current?.focus(REGIONS[id]);
    if (views.current) views.current.open = false;
    trigger.current = views.current?.querySelector('summary') ?? null;
  };
  const toggleCamp = (camp: string) =>
    setCamps((current) =>
      current.includes(camp)
        ? current.filter((item) => item !== camp)
        : [...current, camp],
    );
  return (
    <div
      className={`museum-panorama${visibleCinematic ? ' is-cinematic' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && visibleCinematic) {
          e.preventDefault();
          dismiss();
        }
      }}
    >
      <div ref={host} className="museum-map-canvas" />
      <nav className="museum-map-toolbar" aria-label="全景地图视角">
        <button
          onClick={() => {
            setCinematic(null);
            setView(null);
            setEventId(null);
            api.current?.overview();
          }}
        >
          <Expand size={16} />
          全景
        </button>
        <button
          onClick={() => {
            setCinematic(null);
            api.current?.overview(true);
          }}
        >
          <Map size={16} />
          俯瞰
        </button>
        <button aria-label="拉近地图" onClick={() => api.current?.zoom(1)}>
          <ZoomIn size={18} />
        </button>
        <button aria-label="拉远地图" onClick={() => api.current?.zoom(-1)}>
          <ZoomOut size={18} />
        </button>
      </nav>
      <details ref={views} className="museum-geographic-views">
        <summary>
          <Mountain size={17} />
          山河取景<span>现代地理</span>
        </summary>
        <div>
          {GEOGRAPHIC_VIEWS.map((item) => (
            <button
              key={item.id}
              aria-pressed={view === item.id}
              onClick={() => chooseView(item.id)}
            >
              {item.title}
            </button>
          ))}
        </div>
        <p>区域取景入口，不是历史事件坐标。</p>
      </details>
      <details className="museum-map-layers">
        <summary>
          <Layers size={16} />
          地图图层
        </summary>
        <label title="仅跟随已发布的事件坐标，未知位置保持当前视野">
          <input
            type="checkbox"
            checked={follow}
            onChange={(e) => {
              setFollow(e.target.checked);
              const selected =
                points.find((point) => point.id === props.activeEventId) ??
                points[0];
              if (e.target.checked && selected?.coordinates)
                api.current?.focusGeo(selected.coordinates);
            }}
          />
          随阶段取景
        </label>
        <label>
          <input
            type="checkbox"
            checked={rivers}
            onChange={(e) => setRivers(e.target.checked)}
          />
          现代河流
        </label>
        <label>
          <input
            type="checkbox"
            checked={camps.includes('red_army')}
            onChange={() => toggleCamp('red_army')}
          />
          红军图层
        </label>
        <label>
          <input
            type="checkbox"
            checked={camps.includes('nationalist_army')}
            onChange={() => toggleCamp('nationalist_army')}
          />
          国军图层
        </label>
        <label>
          地势表现
          <select
            aria-label="地势表现强度"
            value={gain}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n === 1 || n === 6 || n === 12 || n === 24) setGain(n);
            }}
          >
            <option value="1">原始地势</option>
            <option value="6">层峦</option>
            <option value="12">雄浑</option>
            <option value="24">磅礴</option>
          </select>
        </label>
        {!routes.length && <p>当前阶段暂无可发布的行军路线。</p>}
      </details>
      <div
        className="museum-map-events"
        inert={Boolean(visibleCinematic)}
        aria-hidden={Boolean(visibleCinematic)}
      >
        {GEOGRAPHIC_VIEWS.map((item) => (
          <button
            key={`view:${item.id}`}
            ref={(element) => {
              labels.current[`view:${item.id}`] = element;
            }}
            className="museum-geographic-marker"
            aria-pressed={view === item.id}
            aria-label={`取景${item.title}区域`}
            title="现代地理取景区，不是历史事件发生点"
            onClick={() => chooseView(item.id)}
          >
            {item.title}
            <small>区域</small>
          </button>
        ))}
        {forcePoints.map(({ track, snapshot }) => (
          <span
            key={snapshot.snapshotId}
            ref={(element) => {
              labels.current[`force:${snapshot.snapshotId}`] = element;
            }}
            className="museum-force-marker"
            data-camp={track.camp}
            role="img"
            aria-label={`${track.name} · ${SPATIAL_LABELS[snapshot.coordinatePrecision]}态势点，不表示真实兵力`}
          >
            <span aria-hidden="true" />
            {track.name}
          </span>
        ))}
        {points.map((point) => (
          <button
            ref={(el) => {
              labels.current[`event:${point.id}`] = el;
            }}
            key={point.id}
            className="museum-event-marker"
            title={`${point.title} · ${point.coordinatePrecision === 'exact' ? '精确' : point.coordinatePrecision === 'approximate' ? '近似' : '示意'}位置`}
            onClick={() => {
              remember();
              setEventId(point.id);
              setView(null);
              setCinematic(point.title);
              api.current?.focusGeo(point.coordinates!);
            }}
          >
            {point.title}
          </button>
        ))}
      </div>
      {event && !visibleCinematic && (
        <aside className="museum-map-event-preview" aria-label="地图事件预览">
          <h2>{event.title}</h2>
          <p>{event.dateText}</p>
          <button
            className="outlined-button"
            onClick={() => {
              const saved = api.current?.bookmark();
              if (saved)
                props.onCameraBookmark({
                  ...saved,
                  coordinateSystem: 'scene-local',
                  zoom: 1,
                  phaseId: props.phaseId,
                });
              props.onEventSelect(event.id);
            }}
          >
            阅读事件
          </button>
        </aside>
      )}
      {visibleCinematic && (
        <CinematicTitle
          title={visibleCinematic}
          hint="点击题字收起，继续探索山河"
          onDismiss={dismiss}
        />
      )}
      <div className="museum-map-credit">
        <details>
          <summary>现代地理 · 艺术表现</summary>
          <div>
            <p>地势、河宽与深度为艺术显示，不用于历史或地理量测。</p>
            <p>现代高程：USGS / Mapzen；全景河流：Natural Earth。</p>
            <p>局部现代水系：OpenStreetMap contributors · ODbL。</p>
          </div>
        </details>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors · ODbL
        </a>
      </div>
    </div>
  );
}
