import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
} from 'react';
import { loadRegionalObservation } from '../../features/scene';
import {
  ArrowUpRight,
  ChevronDown,
  Expand,
  Layers,
  Map,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
} from 'lucide-react';
import { MapControlFrame } from '../../components/exhibition/MapControlFrame';
import { ForceLegend } from '../../components/layout/ForceLegend';
import { ToolEmblem } from '../../components/exhibition/ExhibitionOrnaments';
import type { LongMarchSceneV2Props } from '../../shared/contracts';
import { CinematicTitle } from '../../components/exhibition/CinematicTitle';
import { createPanoramaMap, type PanoramaMapAdapter } from './map-renderer';
import { GEOGRAPHIC_VIEWS, REGIONS, type RegionId } from './map-regions';
import { inCoverage, regionCenter } from './geography';
import { selectMapRoutes } from './map-objects';
import type { EventMapModel } from '../history/event-map/event-map-selectors';
import { EventMapLayer, type EventMapLayerHandle } from './EventMapLayer';
import { RUIJIN_SCENE, isPanoramaSceneId } from './panorama-bookmark';
import type { JourneyTransport } from '../../features/timeline';
import {
  observeMapSafeAreas,
  intersectsMapRect,
  type MapSafeRect,
} from './map-safe-area';
import { layoutAnchoredMapLabels } from './event-marker-layout';
import {
  selectForceStateForPhase,
  SPATIAL_LABELS,
} from '../history/force-state';
import '../../styles/exhibition-panorama.css';
import '../../styles/exhibition-map-controls.css';
import '../../styles/exhibition-map-toolbox.css';
import '../../styles/exhibition-art-notebook.css';
const GLOBAL_REGION_LABEL_OFFSETS: Record<string, readonly [number, number]> = {
  'view:ruijin': [70, 0],
  'view:zunyi': [130, 35],
  'view:chishui': [110, -25],
  'view:jinsha': [-90, 50],
  'view:luding': [-130, 10],
  'view:snow': [-90, -30],
  'view:grass': [-20, -30],
  'view:reunion': [90, -35],
};
const geographicMarkers = GEOGRAPHIC_VIEWS.map((view) => ({
  id: `view:${view.id}`,
  coordinates: regionCenter(REGIONS[view.id]),
}));
const RegionalObservation = lazy(() =>
  loadRegionalObservation().then((module) => ({
    default: module.RegionalObservation,
  })),
);

/** C-owned geographical view. C1 owns experience completion; C2 owns phases. */
export function ExhibitionPanorama(
  props: LongMarchSceneV2Props & {
    onRegionHistory?: (region: string) => void;
    historyRegions?: readonly string[];
    observationRequest?: RegionId | null;
    onObservationClosed?: () => void;
    eventMap?: EventMapModel | null;
    eventMapReading?: boolean;
    onExhibitionPreview?: () => void;
    onExhibitionRead?: (eventId: string) => void;
    geographicRegion?: RegionId | null;
    onBrowseRegion?: (region: RegionId | null) => void;
    onMapAdapter?: (adapter: PanoramaMapAdapter | null) => void;
    onMarchOverview?: () => void;
    journey?: JourneyTransport;
    opening?: boolean;
    arrivalEventId?: string | null;
    showMarch?: boolean;
    observationScope?: 'single' | 'continuous';
    onObservationOpened?: () => void;
  },
) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<PanoramaMapAdapter | null>(null);
  const eventLayer = useRef<EventMapLayerHandle>(null);
  const geographyLeaders = useRef<Record<string, SVGLineElement | null>>({});
  const [safeAreas, setSafeAreas] = useState<readonly MapSafeRect[]>([]);
  const safeAreasRef = useRef<readonly MapSafeRect[]>([]);
  const latest = useRef(props),
    labels = useRef<Record<string, HTMLElement | null>>({});
  const trigger = useRef<HTMLElement | null>(null),
    views = useRef<HTMLDetailsElement>(null),
    toolbox = useRef<HTMLDetailsElement>(null);
  const [epoch, setEpoch] = useState(0),
    [cinematic, setCinematic] = useState<string | null>(null);
  const [view, setView] = useState<RegionId | null>(null),
    [eventId, setEventId] = useState<string | null>(null);
  const [rivers, setRivers] = useState(true),
    [gain, setGain] = useState<1 | 6 | 12 | 24>(12);
  const [follow, setFollow] = useState(true);
  const [localEntry, setEntry] = useState(
    () =>
      (props.cameraBookmark?.sceneId === RUIJIN_SCENE &&
        props.cameraBookmark.phaseId === props.phaseId) ||
      (!props.cameraBookmark &&
        !props.activeEventId &&
        !props.events.some(
          (event) =>
            event.releaseStatus === 'published' &&
            event.reviewStatus === 'reviewed' &&
            event.coordinates,
        )),
  );
  const entry = props.opening ?? localEntry;
  const initialEntry = useRef(entry);
  const focusedView =
    props.geographicRegion !== undefined
      ? props.geographicRegion
      : entry
        ? 'ruijin'
        : view;
  const [observation, setObservation] = useState<RegionId | null>(null);
  const observationTrigger = useRef<HTMLElement | null>(null);
  const observationBookmark = useRef<ReturnType<
    PanoramaMapAdapter['bookmark']
  > | null>(null);
  const observationPhase = useRef<string | null>(null);
  const openObservation = useCallback((id: RegionId) => {
    latest.current.onObservationOpened?.();
    observationTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    observationBookmark.current = api.current?.bookmark() ?? null;
    observationPhase.current = latest.current.phaseId;
    api.current?.suspend(true);
    setObservation(id);
  }, []);
  useEffect(() => {
    const region = props.observationRequest;
    if (!region) return;
    const frame = requestAnimationFrame(() => openObservation(region));
    return () => cancelAnimationFrame(frame);
  }, [props.observationRequest, openObservation]);
  const closeObservation = () => {
    setObservation(null);
    props.onObservationClosed?.();
    api.current?.suspend(false);
    if (
      observationBookmark.current &&
      observationPhase.current === latest.current.phaseId
    )
      api.current?.restore(observationBookmark.current);
    requestAnimationFrame(() => observationTrigger.current?.focus());
  };
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
        entryView: initialEntry.current,
        initialBookmark:
          latest.current.cameraBookmark &&
          latest.current.cameraBookmark.phaseId === latest.current.phaseId &&
          isPanoramaSceneId(latest.current.cameraBookmark.sceneId)
            ? {
                ...latest.current.cameraBookmark,
                sceneId: latest.current.cameraBookmark.sceneId,
              }
            : undefined,
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
        onMarkers: (markers, viewport) => {
          eventLayer.current?.project(markers, viewport);
          const geographyLayout =
            latest.current.geographicRegion !== undefined && viewport
              ? layoutAnchoredMapLabels(
                  markers.filter(
                    (m) =>
                      m.id.startsWith('view:') &&
                      (!latest.current.geographicRegion ||
                        m.id === `view:${latest.current.geographicRegion}`),
                  ),
                  viewport.width,
                  viewport.height,
                  null,
                  safeAreasRef.current,
                  {
                    width: 150,
                    offsets:
                      latest.current.geographicRegion === null
                        ? GLOBAL_REGION_LABEL_OFFSETS
                        : {},
                  },
                )
              : [];
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
            const besideTorch = label.classList.contains('is-ruijin-anchor');
            const besideMarch = marker.id.startsWith('march:');
            const closeMarch =
              latest.current.journey?.read().camera === 'follow';
            const packed = geographyLayout.find((m) => m.id === marker.id);
            label.style.transform = packed
              ? `translate(${packed.labelX}px,${packed.labelY}px) translate(-50%,-100%)`
              : besideMarch
                ? `translate(${marker.x + (closeMarch ? 70 : 90)}px,${marker.y + (closeMarch ? 48 : 80)}px)`
                : `translate(${marker.x + (besideTorch ? 145 : 0)}px,${marker.y + (besideTorch ? 28 : shift)}px) translate(-50%,-100%)`;
            const geographicVisible =
              latest.current.geographicRegion === undefined ||
              !marker.id.startsWith('view:') ||
              !latest.current.geographicRegion ||
              marker.id === `view:${latest.current.geographicRegion}`;
            const occupied = packed
              ? !packed.visible
              : safeAreasRef.current.some((r) =>
                  intersectsMapRect(
                    {
                      x: marker.x - 90,
                      y: marker.y - 38,
                      width: 180,
                      height: 38,
                    },
                    r,
                  ),
                );
            label.style.visibility =
              marker.visible && geographicVisible && !occupied
                ? 'visible'
                : 'hidden';
            label.tabIndex =
              marker.visible && geographicVisible && !occupied ? 0 : -1;
            const leader = geographyLeaders.current[marker.id];
            if (leader && packed) {
              leader.setAttribute('x1', String(marker.x));
              leader.setAttribute('y1', String(marker.y));
              leader.setAttribute('x2', String(packed.labelX));
              leader.setAttribute('y2', String(packed.labelY));
              leader.style.visibility = label.style.visibility;
            }
          });
        },
        onViewChange: (bookmark) => {
          if (active)
            latest.current.onCameraBookmark({
              ...bookmark,
              coordinateSystem: 'scene-local',
              zoom: 1,
              phaseId: latest.current.phaseId,
            });
        },
        onUserNavigate: () => {
          latest.current.journey?.pause();
          latest.current.journey?.camera('free');
        },
      });
      api.current = map;
      latest.current.onMapAdapter?.(map);
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
      latest.current.onMapAdapter?.(null);
    };
  }, []);
  useEffect(() => {
    api.current?.setMarchVisible?.(props.showMarch !== false);
  }, [props.showMarch, epoch]);
  useEffect(() => {
    api.current?.setMarchTransport?.(props.journey ?? null);
  }, [props.journey, epoch]);
  useEffect(() => {
    if (!props.journey || !host.current) return;
    return observeMapSafeAreas(host.current, (areas) => {
      safeAreasRef.current = areas;
      setSafeAreas(areas);
      api.current?.setSafeAreas?.(areas);
    });
  }, [props.journey, epoch]);
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
      ...(props.eventMap?.entries ?? []).map((p) => ({
        id: `placement:${p.placementId}`,
        coordinates: p.anchorCoordinates,
      })),
      ...(props.eventMap?.resources.positions.regions ?? [])
        .filter((r) =>
          props.eventMap?.entries.some((p) => p.regionIds.includes(r.regionId)),
        )
        .map((r) => ({
          id: `event-region:${r.regionId}`,
          coordinates: r.anchorCoordinates,
        })),
    ]);
    api.current?.setEventAreas?.(
      (props.eventMap?.entries ?? []).flatMap((p) =>
        p.bounds ? [{ id: p.placementId, bounds: p.bounds }] : [],
      ),
    );
  }, [points, forcePoints, props.eventMap, epoch]);
  useEffect(() => {
    api.current?.setRoutes(routes, camps);
  }, [routes, camps, epoch]);
  useEffect(() => {
    api.current?.setForceRegions(forceState, camps);
  }, [forceState, camps, epoch]);
  useEffect(() => {
    const redPoints = forcePoints.filter(
      ({ track }) => track.camp === 'red_army',
    );
    // A single unambiguous point can drive the journey marker. Multiple units
    // keep their individually labelled force layer; never invent one centroid.
    api.current?.setJourneyMarker(
      redPoints.length === 1
        ? {
            coordinates: redPoints[0]!.snapshot.coordinates!,
            kind: 'force',
            prominent: false,
          }
        : focusedView === 'ruijin' &&
            (entry || !props.phaseId) &&
            (!props.journey || entry)
          ? {
              coordinates: regionCenter(REGIONS.ruijin),
              kind: 'origin',
              prominent: entry,
            }
          : null,
    );
  }, [forcePoints, props.phaseId, focusedView, entry, epoch, props.journey]);
  useEffect(() => {
    api.current?.setRivers(rivers);
  }, [rivers, epoch]);
  useEffect(() => {
    api.current?.setVerticalExaggeration(gain);
  }, [gain, epoch]);
  useEffect(() => {
    if (!epoch) return;
    const saved = props.cameraBookmark;
    if (
      saved &&
      saved.phaseId === props.phaseId &&
      isPanoramaSceneId(saved.sceneId)
    )
      api.current?.restore({ ...saved, sceneId: saved.sceneId });
  }, [props.cameraBookmark, props.phaseId, epoch]);
  useEffect(() => {
    if (!follow || props.journey) return;
    if (
      props.cameraBookmark &&
      isPanoramaSceneId(props.cameraBookmark.sceneId) &&
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
    props.journey,
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
  const chooseView = (id: RegionId, titleOverride?: string) => {
    remember();
    setEntry(false);
    setFollow(false);
    setEventId(null);
    setView(id);
    props.onBrowseRegion?.(id);
    props.journey?.pause();
    props.journey?.camera('free');
    const title =
      titleOverride ?? GEOGRAPHIC_VIEWS.find((item) => item.id === id)!.title;
    if (view === id && visibleCinematic === title) {
      setCinematic(null);
      if (views.current) views.current.open = false;
      trigger.current = views.current?.querySelector('summary') ?? null;
      requestAnimationFrame(() => trigger.current?.focus());
      return;
    }
    if (!props.journey)
      setCinematic((current) => (current === title ? null : title));
    if (id === 'ruijin' && titleOverride)
      api.current?.focus(REGIONS[id], 'place');
    else api.current?.focus(REGIONS[id]);
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
      className={`museum-panorama${visibleCinematic ? ' is-cinematic' : ''}${entry ? ' is-entry' : ''}${props.eventMap ? ' has-event-map' : ''}${props.geographicRegion !== undefined ? ' is-geographic-led' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && visibleCinematic) {
          e.preventDefault();
          dismiss();
        } else if (e.key === 'Escape' && toolbox.current?.open) {
          e.preventDefault();
          toolbox.current.open = false;
          toolbox.current.querySelector('summary')?.focus();
        }
      }}
    >
      <div ref={host} className="museum-map-canvas" />
      {props.eventMap &&
        (props.geographicRegion === undefined ||
          props.geographicRegion !== null ||
          props.eventMap.entries.length > 0) && (
          <EventMapLayer
            ref={eventLayer}
            model={props.eventMap}
            reading={Boolean(props.eventMapReading)}
            directRead={Boolean(props.journey)}
            safeAreas={safeAreas}
            activeEventIds={props.events.map((e) => e.id)}
            arrivingEventId={props.arrivalEventId}
            onChoose={(p) => {
              setEntry(false);
              setFollow(false);
              setCinematic(null);
              setEventId(null);
              if (!props.journey) setView(null);
              props.onExhibitionPreview?.();
              api.current?.focusGeo(p.anchorCoordinates, p.bounds ?? undefined);
            }}
            onOverview={() => {
              setEntry(false);
              setFollow(false);
              setCinematic(null);
              setEventId(null);
              setView(null);
              api.current?.overview();
              props.onBrowseRegion?.(null);
            }}
            onRegion={(id) => {
              if (props.journey && id in REGIONS) {
                chooseView(id as RegionId);
                return;
              }
              const region = props.eventMap?.resources.positions.regions.find(
                (r) => r.regionId === id,
              );
              if (!region) return;
              setEntry(false);
              setFollow(false);
              setCinematic(null);
              setEventId(null);
              setView(null);
              props.onExhibitionPreview?.();
              api.current?.focusGeo(region.anchorCoordinates, region.bounds);
            }}
            onRead={(id) => {
              if (
                !props.eventMap?.entries.some((p) => p.eventId === id) &&
                !props.eventMap?.unlocated.some((e) => e.id === id)
              )
                return;
              const saved = api.current?.bookmark();
              if (saved)
                props.onCameraBookmark({
                  ...saved,
                  coordinateSystem: 'scene-local',
                  zoom: 1,
                  phaseId: props.phaseId,
                });
              props.onExhibitionRead?.(id);
            }}
          />
        )}
      <p className="museum-terrain-hint">滚轮随鼠标取景 · 双击山坡或河面聚焦</p>
      {focusedView && (
        <button
          className={`museum-region-anchor${focusedView === 'ruijin' ? ' is-ruijin-anchor' : ''}`}
          ref={(element) => {
            labels.current[`view:${focusedView}`] = element;
          }}
          aria-label={`${focusedView === 'ruijin' ? '瑞金' : GEOGRAPHIC_VIEWS.find((item) => item.id === focusedView)!.title}区域定位，现代取景中心参考，不是历史事件坐标`}
          onClick={() =>
            chooseView(
              focusedView,
              focusedView === 'ruijin' ? '瑞金' : undefined,
            )
          }
        >
          <MapControlFrame />
          <span className="map-anchor-diamond" aria-hidden="true" />
          {focusedView === 'ruijin'
            ? '瑞金 · 赣南丘陵'
            : GEOGRAPHIC_VIEWS.find((item) => item.id === focusedView)!.title}
          <small>取景区域</small>
        </button>
      )}
      {entry && (
        <div className="museum-entry-place">
          <h2>瑞金</h2>
          <p className="museum-departure-line">从瑞金启程，重温长征之路。</p>
        </div>
      )}
      <details className="museum-map-toolbox" ref={toolbox}>
        <summary data-map-obstacle="true">
          <MapControlFrame />
          <SlidersHorizontal size={16} />
          <span>地图工具</span>
          <ChevronDown size={14} className="map-disclosure-chevron" />
        </summary>
        <aside
          className="museum-map-tool-panel"
          aria-label="地图工具面板"
          data-map-obstacle="true"
        >
          <div className="museum-tool-panel-heading">
            <span>山河取景与观察</span>
            <button
              aria-label="收起地图工具"
              onClick={() => {
                if (toolbox.current) {
                  toolbox.current.open = false;
                  toolbox.current.querySelector('summary')?.focus();
                }
              }}
            >
              收起
            </button>
          </div>

          <details ref={views} className="museum-geographic-views">
            <summary>
              <MapControlFrame />
              山河取景<span>现代地理</span>
            </summary>
            <div className="museum-geographic-menu">
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
            </div>
          </details>
          <details className="museum-map-layers">
            <summary>
              <MapControlFrame />
              <Layers size={16} />
              地图图层
              <ChevronDown size={14} className="map-disclosure-chevron" />
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
          <ForceLegend state={forceState} hasV2Renderer />
          {!props.journey && focusedView && !visibleCinematic && (
            <div className="museum-art-entry">
              <button
                className="outlined-button"
                onClick={() => openObservation(focusedView)}
              >
                <MapControlFrame />
                <ToolEmblem kind="chapters" />
                <span>
                  走进
                  {focusedView === 'ruijin'
                    ? '瑞金'
                    : GEOGRAPHIC_VIEWS.find((item) => item.id === focusedView)!
                        .title}
                  艺术场景
                </span>
                <ArrowUpRight size={20} />
              </button>
              {props.historyRegions?.includes(focusedView) && (
                <button
                  className="outlined-button"
                  onClick={() => props.onRegionHistory?.(focusedView)}
                >
                  <MapControlFrame />
                  <ToolEmblem kind="history" />
                  <span>阅读本区域历史</span>
                  <ArrowUpRight size={20} />
                </button>
              )}
            </div>
          )}
          {view && !visibleCinematic && !entry && !props.eventMap && (
            <details className="museum-region-events">
              <summary>
                <MapControlFrame />
                查看区域内事件
                <ChevronDown size={14} className="map-disclosure-chevron" />
              </summary>
              <p>仅显示当前历史阶段已发布且位置可用的事件。</p>
              {points
                .filter((point) => {
                  const [west, south, east, north] = REGIONS[view];
                  return (
                    point.coordinates![0] >= west &&
                    point.coordinates![0] <= east &&
                    point.coordinates![1] >= south &&
                    point.coordinates![1] <= north
                  );
                })
                .map((point) => (
                  <button
                    key={point.id}
                    onClick={() => {
                      remember();
                      setEventId(point.id);
                      setCinematic(point.title);
                      api.current?.focusGeo(point.coordinates!);
                    }}
                  >
                    {point.title}
                  </button>
                ))}
              {!points.some((point) => {
                const [west, south, east, north] = REGIONS[view];
                return (
                  point.coordinates![0] >= west &&
                  point.coordinates![0] <= east &&
                  point.coordinates![1] >= south &&
                  point.coordinates![1] <= north
                );
              }) && <p>当前区域暂无可发布事件。历史资料仍在核验中。</p>}
            </details>
          )}
        </aside>
      </details>
      <nav
        className="museum-map-toolbar"
        aria-label="全景地图视角"
        data-map-obstacle="true"
      >
        <button
          onClick={() => {
            setEntry(false);
            setCinematic(null);
            setView(null);
            setEventId(null);
            api.current?.overview();
            props.onBrowseRegion?.(null);
            props.journey?.camera('free');
          }}
        >
          <MapControlFrame />
          <Expand size={16} />
          全景
        </button>
        <button
          aria-label={props.onMarchOverview ? '区域俯瞰' : undefined}
          onClick={() => {
            setEntry(false);
            setView(null);
            setCinematic(null);
            if (props.onMarchOverview) {
              props.onMarchOverview();
              return;
            }
            api.current?.overview(true);
            props.onBrowseRegion?.(null);
            props.journey?.camera('free');
          }}
        >
          <MapControlFrame />
          <Map size={16} />
          俯瞰
        </button>
        <button aria-label="拉近地图" onClick={() => api.current?.zoom(1)}>
          <MapControlFrame />
          <ZoomIn size={18} />
        </button>
        <button aria-label="拉远地图" onClick={() => api.current?.zoom(-1)}>
          <MapControlFrame />
          <ZoomOut size={18} />
        </button>
      </nav>
      <div
        className="museum-map-events"
        inert={Boolean(visibleCinematic)}
        aria-hidden={Boolean(visibleCinematic)}
      >
        {props.journey && (
          <svg className="journey-geography-leaders" aria-hidden="true">
            {GEOGRAPHIC_VIEWS.map((v) => (
              <line
                key={v.id}
                ref={(el) => {
                  geographyLeaders.current[`view:${v.id}`] = el;
                }}
              />
            ))}
          </svg>
        )}
        {GEOGRAPHIC_VIEWS.filter((item) => item.id !== focusedView).map(
          (item) => (
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
              <MapControlFrame />
              {item.title}
              <small>区域</small>
            </button>
          ),
        )}
        {props.journey?.plan.tracks.map((track) => (
          <span
            key={track.id}
            ref={(element) => {
              labels.current[`march:${track.id}`] = element;
            }}
            className="journey-unit-label"
            data-camp={track.camp}
            aria-label={track.unitName}
          >
            {track.unitName}
          </span>
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
        {!props.eventMap &&
          points.map((point) => (
            <button
              ref={(el) => {
                labels.current[`event:${point.id}`] = el;
              }}
              key={point.id}
              className="museum-event-marker"
              title={`${point.title} · ${point.coordinatePrecision === 'exact' ? '精确' : point.coordinatePrecision === 'approximate' ? '近似' : '示意'}位置`}
              onClick={() => {
                setEntry(false);
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
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors · ODbL
        </a>
      </div>
      {observation && (
        <Suspense
          fallback={
            <div className="scene-state" role="status">
              <p>正在准备区域艺术空间</p>
              <button className="outlined-button" onClick={closeObservation}>
                返回总地图
              </button>
            </div>
          }
        >
          <div className="museum-art-space">
            <RegionalObservation
              regionId={observation}
              onExit={closeObservation}
              onRegionChange={(id) => {
                if (latest.current.observationScope === 'single')
                  closeObservation();
                else setObservation(id);
              }}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
