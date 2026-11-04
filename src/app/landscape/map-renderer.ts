import { sampleChapterCameraFlight } from './camera-flight';
import {
  filmExtent,
  marchFraming,
  routeCameraLevel,
  sampleFilmCamera,
} from './film-camera';
import { campaignFrames, campaignView } from './campaign-framing';
import { campaignRiver, type CampaignRiver } from './campaign-rivers';
import {
  cueIndex,
  crossingSeals,
} from '../../shared/content/journey-screenplay';
import { createFilmSignals } from './film-signals';
import { composeTerrainView } from './camera-composition';
import { createModernLandscape } from './modern-landscape';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GeoBounds, GeoPoint } from './geography';
import {
  projectGeo,
  unprojectGeo,
  regionCenter,
  inCoverage,
} from './geography';
import { REGIONS, type RegionId } from './map-regions';
import type { PublishedMapRoute } from './map-objects';
import type { ForcePhaseState } from '../history/force-state';
import { EXHIBITION_LIGHT } from './exhibition-atmosphere';
import { composeReliefEntry, composeRegionalView } from './relief-block';
import { createJourneyTorch, type JourneyMarker } from './journey-torch';
import { createTerrainDiagnostics } from './terrain-diagnostics';
import { createMarchLayer } from './march-layer';
import { createChapterLandmark } from './chapter-landmark';
import { clearMarchSightline } from './march-presentation';
import {
  browseRegionAt,
  geographicRegionAt,
  regionalMarchDistance,
  translateMarchView,
} from './journey-navigation';
import { sampleJourney, type JourneyTransport } from '../../features/timeline';
import type { MapSafeRect } from './map-safe-area';
import {
  constrainTerrainCamera,
  createSurfaceGesture,
  localTerrainPose,
  cursorTerrainZoom,
  TERRAIN_NAVIGATION,
} from './terrain-navigation';
import {
  PANORAMA_SCENE,
  RUIJIN_SCENE,
  isPanoramaSceneId,
  type PanoramaSceneId,
} from './panorama-bookmark';

export interface PanoramaBookmark {
  sceneId: PanoramaSceneId;
  regionId?: RegionId | null;
  position: [number, number, number];
  target: [number, number, number];
}
export interface MarkerProjection {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}
export interface MarkerViewport {
  width: number;
  height: number;
  distance: number;
}
export interface PanoramaMapAdapter {
  setMarchTransport?(transport: JourneyTransport | null): void;
  setMarchVisible?(visible: boolean): void;
  setMarchCamps?(camps: readonly string[]): void;
  setChapterLandmark?(point: GeoPoint | null): void;
  setSafeAreas?(areas: readonly MapSafeRect[]): void;
  setJourneyMarker(marker: JourneyMarker | null): void;
  entry(): void;
  focus(bounds: GeoBounds, framing?: 'place'): void;
  focusGeo(
    point: GeoPoint,
    bounds?: GeoBounds,
    transition?: 'regional' | 'local',
    regionHint?: RegionId,
  ): void;
  frameMarch?(points: readonly GeoPoint[]): void;
  focusMarch?(mode: 'overview' | 'follow'): void;
  prepareRegion?(region: RegionId | null, bounds?: GeoBounds): void;
  holdCamera?(): void;
  setEventAreas?(areas: readonly { id: string; bounds: GeoBounds }[]): void;
  setMarkers(markers: readonly { id: string; coordinates: GeoPoint }[]): void;
  setForceRegions(state: ForcePhaseState, camps: readonly string[]): void;
  overview(top?: boolean): void;
  zoom(direction: 1 | -1): void;
  bookmark(): PanoramaBookmark;
  restore(bookmark: PanoramaBookmark): void;
  setRoutes(
    routes: readonly PublishedMapRoute[],
    camps: readonly string[],
  ): void;
  setRivers(visible: boolean): void;
  setVerticalExaggeration(value: 1 | 6 | 12 | 24): void;
  suspend(value: boolean): void;
  dispose(): void;
}

/** C-owned continental map shell. A can replace this implementation at the adapter. */
export function createPanoramaMap(
  host: HTMLElement,
  options: {
    reducedMotion: boolean;
    onMarkers: (markers: MarkerProjection[], viewport?: MarkerViewport) => void;
    onError: (message: string) => void;
    onReady: () => void;
    technicalMarkers?: boolean;
    hideGuides?: boolean;
    entryView?: boolean;
    initialBookmark?: PanoramaBookmark;
    onViewChange?: (bookmark: PanoramaBookmark) => void;
    onUserNavigate?: () => void;
    onGeographicBrowse?: (region: RegionId | null) => void;
  },
): PanoramaMapAdapter {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(EXHIBITION_LIGHT.background);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.02, 160);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(EXHIBITION_LIGHT.background);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  let shaderProblem = false;
  renderer.debug.onShaderError = () => {
    shaderProblem = true;
    options.onError('地形着色器无法在当前图形环境编译，请重试地图。');
  };
  renderer.domElement.setAttribute(
    'aria-label',
    '长征涉及区域现代三维地理参考。双击山坡或河面聚焦，滚轮继续靠近；方向键环顾，Home 返回全景。',
  );
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.tabIndex = 0;
  host.append(renderer.domElement);
  const measure = createTerrainDiagnostics(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = TERRAIN_NAVIGATION.minDistance;
  controls.maxDistance = TERRAIN_NAVIGATION.maxDistance;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minPolarAngle = 0.12;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  const ambient = new THREE.HemisphereLight(
    EXHIBITION_LIGHT.skyFill,
    EXHIBITION_LIGHT.groundFill,
    0.7,
  );
  const sun = new THREE.DirectionalLight(EXHIBITION_LIGHT.sun, 3.4);
  sun.position.set(15, 16, -12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 70;
  sun.shadow.normalBias = 0.0015;
  scene.add(ambient, sun, sun.target);

  const landscape = createModernLandscape(scene, renderer);
  const constrain = (levelTarget = false) =>
    constrainTerrainCamera(
      camera,
      controls.target,
      landscape.navigationHeightAt,
      landscape.worldBounds,
      levelTarget,
    );
  const journeyTorch = createJourneyTorch();
  scene.add(journeyTorch.root);
  let verticalExaggeration: 1 | 6 | 12 | 24 = 12;
  const heightAt = (x: number, z: number) => landscape.heightAt(x, z);
  const march = createMarchLayer(scene, landscape.navigationHeightAt);
  const filmSignals = createFilmSignals(scene);
  const chapterLandmark = createChapterLandmark(
    scene,
    landscape.navigationHeightAt,
  );
  let chapterArea: GeoBounds | null = null;
  let safeAreas: readonly MapSafeRect[] = [];
  let centeredMarch = false;
  const applySafeFrame = () => {
    if (entryFraming || !safeAreas.length) {
      camera.clearViewOffset();
      return;
    }
    let left = 0,
      right = width,
      top = 0,
      bottom = height;
    for (const r of safeAreas) {
      if (r.width > width * 0.6 && r.y < 100)
        top = Math.max(top, r.y + r.height);
      else if (r.width > width * 0.6 && r.y > height * 0.55)
        bottom = Math.min(bottom, r.y);
      else if (r.height > 120 && r.x < width * 0.2)
        left = Math.max(left, r.x + r.width);
      else if (r.height > 120 && r.x > width * 0.6)
        right = Math.min(right, r.x);
    }
    if (right - left < width * 0.3) {
      left = 0;
      right = width;
    }
    const sideOffset = width / 2 - (left + right) / 2;
    camera.setViewOffset(
      width,
      height,
      centeredMarch && width >= 900 ? sideOffset * 0.5 : sideOffset,
      height / 2 - (top + bottom) / 2,
      width,
      height,
    );
  };
  const routeGroup = new THREE.Group();
  const forceGroup = new THREE.Group();
  const eventAreaGroup = new THREE.Group();
  scene.add(routeGroup, forceGroup, eventAreaGroup);
  eventAreaGroup.visible = !options.hideGuides;
  const clearRoutes = () => {
    routeGroup.traverse((object) => {
      if (
        object instanceof THREE.Line ||
        object instanceof THREE.Mesh ||
        object instanceof THREE.Points
      ) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((item) => item.dispose());
      }
    });
    routeGroup.clear();
  };
  const clearForceRegions = () => {
    for (const object of [...forceGroup.children])
      if (object instanceof THREE.Line) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    forceGroup.clear();
  };
  const drape = () => {
    for (const group of [routeGroup, forceGroup, eventAreaGroup])
      group.traverse((object) => {
        if (object instanceof THREE.Line || object instanceof THREE.Points) {
          const points = object.geometry.getAttribute('position');
          for (let i = 0; i < points.count; i++)
            points.setY(
              i,
              heightAt(points.getX(i), points.getZ(i)) +
                (object.userData.landscapeLift ?? 0.025),
            );
          points.needsUpdate = true;
          object.geometry.computeBoundingSphere();
        }
      });
  };
  let markers: { id: string; point: THREE.Vector3; lift: number }[] = (
    options.technicalMarkers === false
      ? []
      : (Object.keys(REGIONS) as RegionId[])
  ).map((id) => {
    const [x, z] = projectGeo(regionCenter(REGIONS[id]));
    return {
      id,
      lift: 0.12,
      point: new THREE.Vector3(x, heightAt(x, z) + 0.12, z),
    };
  });
  let disposed = false,
    preparingEntry = false,
    entryFraming = false,
    suspended = false,
    frame = 0,
    didRender = false;
  let focusRevision = 0;
  let width = 1,
    height = 1;
  let flight: null | {
    start: number;
    duration: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    targetFrom: THREE.Vector3;
    targetTo: THREE.Vector3;
    overview?: {
      position: [number, number, number];
      target: [number, number, number];
    };
  } = null;
  const travel = (
    position: THREE.Vector3,
    target: THREE.Vector3,
    regional = false,
  ) => {
    if (options.reducedMotion) {
      camera.position.copy(position);
      controls.target.copy(target);
      constrain();
      controls.update();
      flight = null;
      viewChanged();
    } else
      flight = {
        start: performance.now(),
        duration: regional
          ? 2600
          : camera.position.distanceTo(controls.target) /
                Math.max(0.01, position.distanceTo(target)) >
                6 || controls.target.distanceTo(target) > 3
            ? 2400
            : 1600,
        from: camera.position.clone(),
        to: position,
        targetFrom: controls.target.clone(),
        targetTo: target,
        overview: regional
          ? (() => {
              const middle = controls.target.clone().lerp(target, 0.5);
              const rise = Math.max(
                2.4,
                controls.target.distanceTo(target) * 0.85,
              );
              return {
                position: [
                  middle.x,
                  Math.max(middle.y, heightAt(middle.x, middle.z)) + rise,
                  middle.z + rise * 0.15,
                ] as [number, number, number],
                target: middle.toArray(),
              };
            })()
          : undefined,
      };
  };
  const cancel = () => {
    entryFraming = false;
    preparingEntry = false;
    flight = null;
    focusRevision++;
    landscape.cancelPending();
  };
  let browseAnchor: THREE.Vector3 | null = null;
  let browseRequested = false;
  const userCancel = () => {
    browseAnchor = null;
    browseRequested = true;
    cancel();
    options.onUserNavigate?.();
  };
  controls.addEventListener('start', userCancel);
  const gesture = createSurfaceGesture(renderer.domElement);
  const ray = new THREE.Raycaster();
  const pickSurface = (clientX: number, clientY: number) => {
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    ray.setFromCamera(
      new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    return landscape.pick(ray);
  };
  const wheelSurface = (event: WheelEvent) => {
    if (event.target !== renderer.domElement || suspended || preparingEntry)
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const hit = pickSurface(event.clientX, event.clientY);
    browseAnchor = hit;
    browseRequested = true;
    const delta =
      event.deltaY *
      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1) *
      (event.ctrlKey ? 4 : 1);
    const pose = cursorTerrainZoom(
      camera.position,
      controls.target,
      hit,
      delta,
      THREE.MathUtils.clamp(
        camera.position.distanceTo(controls.target) * 0.6,
        0.45,
        1,
      ),
    );
    cancel();
    options.onUserNavigate?.();
    if (!pose) return;
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    controls.update();
    constrain();
    viewChanged();
    if (delta > 0 && camera.position.distanceTo(controls.target) > 19)
      overview();
  };
  const focusSurface = (event: MouseEvent) => {
    if (!gesture.accept(event)) return;
    const hit = pickSurface(event.clientX, event.clientY);
    if (!hit) return;
    options.onUserNavigate?.();
    const pose = localTerrainPose(camera.position, controls.target, hit);
    if (!pose) return;
    cancel();
    travel(pose.position, pose.target);
  };
  renderer.domElement.addEventListener('pointerdown', gesture.down);
  renderer.domElement.addEventListener('pointermove', gesture.move);
  renderer.domElement.addEventListener('pointerup', gesture.up);
  renderer.domElement.addEventListener('dblclick', focusSurface);
  renderer.domElement.addEventListener('wheel', wheelSurface, {
    passive: false,
    capture: true,
  });
  const bookmark = (): PanoramaBookmark => ({
    sceneId: entryFraming ? RUIJIN_SCENE : PANORAMA_SCENE,
    regionId: landscape.region,
    position: camera.position.toArray(),
    target: controls.target.toArray(),
  });
  const viewChanged = () => {
    constrain();
    options.onViewChange?.(bookmark());
  };
  const userEnd = () => {
    browseRequested = true;
    viewChanged();
  };
  controls.addEventListener('end', userEnd);
  const overview = (top = false) => {
    entryFraming = false;
    preparingEntry = false;
    focusRevision++;
    landscape.overview();
    drape();
    sun.target.position.set(0, 0, 0);
    sun.position.set(15, 16, -12);
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -16;
    sun.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
    travel(
      new THREE.Vector3(0, top ? 31 : 23, top ? 0.1 : 23),
      new THREE.Vector3(0, top ? 0 : -0.6, 0),
    );
  };
  camera.position.set(0, 20, 19);
  controls.target.set(0, 0, 0);
  controls.update();
  const resize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    applySafeFrame();
    camera.updateProjectionMatrix();
    if (entryFraming && !preparingEntry) {
      const pose = composeReliefEntry(
        landscape.bounds,
        heightAt,
        camera.aspect,
      );
      camera.position.fromArray(pose.position);
      controls.target.fromArray(pose.target);
      controls.update();
      constrain();
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const entry = (initial = false) => {
    entryFraming = true;
    applySafeFrame();
    camera.updateProjectionMatrix();
    const revision = ++focusRevision;
    preparingEntry = true;
    void landscape.focus('ruijin', true).then((pivot) => {
      if (disposed || revision !== focusRevision) return;
      preparingEntry = false;
      if (!pivot) {
        options.onError('瑞金区域地形未能加载，请重试。');
        return;
      }
      const pose =
        initial && options.initialBookmark
          ? options.initialBookmark
          : composeReliefEntry(landscape.bounds, heightAt, width / height);
      sun.target.position.set(pivot.x, 0, pivot.z);
      sun.position.copy(sun.target.position).add(new THREE.Vector3(-5, 9, 2));
      sun.shadow.camera.left = -5;
      sun.shadow.camera.right = 5;
      sun.shadow.camera.top = 5;
      sun.shadow.camera.bottom = -5;
      sun.shadow.camera.updateProjectionMatrix();
      renderer.shadowMap.needsUpdate = true;
      drape();
      if (initial) {
        camera.position.fromArray(pose.position);
        controls.target.fromArray(pose.target);
        controls.update();
      } else
        travel(
          new THREE.Vector3(...pose.position),
          new THREE.Vector3(...pose.target),
        );
    });
  };
  if (options.entryView) entry(true);
  const key = (event: KeyboardEvent) => {
    if (
      ![
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        '+',
        '-',
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    cancel();
    options.onUserNavigate?.();
    if (event.key === 'Home') return overview();
    const offset = camera.position.clone().sub(controls.target);
    if (event.key === '+' || event.key === '-')
      offset.multiplyScalar(event.key === '+' ? 0.88 : 1.12);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      offset.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        event.key === 'ArrowLeft' ? 0.12 : -0.12,
      );
    else {
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.phi = THREE.MathUtils.clamp(
        spherical.phi + (event.key === 'ArrowUp' ? -0.08 : 0.08),
        controls.minPolarAngle,
        controls.maxPolarAngle,
      );
      offset.setFromSpherical(spherical);
    }
    offset.clampLength(controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    constrain();
    viewChanged();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    suspended = true;
    options.onError('图形上下文已丢失，请重试地图。');
  };
  renderer.domElement.addEventListener('keydown', key);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  let drawnHeightVersion = -1;
  let shadowDistance = 0;
  let lastMarchPoint: THREE.Vector3 | null = null;
  let browseRegion: RegionId | null = 'ruijin';
  let browsePublished = false;
  let browseSince = 0;
  let browseCandidate: RegionId | null = 'ruijin';
  const shadowTarget = new THREE.Vector3(Infinity, Infinity, Infinity);
  let filmKey = '';
  let filmGround = 0;
  let framing: ReturnType<typeof marchFraming> = null;
  let cut: { start: number; eye: THREE.Vector3; target: THREE.Vector3 } | null =
    null;
  let bounds = new THREE.Box2();
  let finalBounds = new THREE.Box2();
  let filmWater = false;
  let activeRiver: CampaignRiver | null = null;
  let frames: ReturnType<typeof campaignFrames> = null;

  const draw = (now: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(draw);
    if (suspended || preparingEntry) return;
    const marching = march.update(camera.position.distanceTo(controls.target));
    chapterLandmark.update(camera.position.distanceTo(controls.target));
    const marchingState = march.transport?.read();
    if (marchingState?.playing) browseRequested = false;
    // Playback translates the user's entire composition; it never rewrites
    // the orbit angle, pitch, distance or chosen offset on resume.
    if (
      marching &&
      marchingState?.playing &&
      (marchingState.camera === 'free' || !marchingState.cinematic) &&
      !flight &&
      lastMarchPoint
    )
      translateMarchView(
        camera.position,
        controls.target,
        lastMarchPoint,
        marching.point,
      );
    lastMarchPoint = marching ? marching.point.clone() : null;
    let flightFinished = false;
    if (flight) {
      const t = Math.min(1, (now - flight.start) / flight.duration);
      const pose = sampleChapterCameraFlight(
        {
          position: flight.from.toArray(),
          target: flight.targetFrom.toArray(),
        },
        { position: flight.to.toArray(), target: flight.targetTo.toArray() },
        t,
        flight.overview,
      );
      camera.position.fromArray(pose.position);
      controls.target.fromArray(pose.target);
      if (t === 1) {
        flight = null;
        flightFinished = true;
      }
    }
    const film = Boolean(marchingState?.cinematic);
    if (!film || marchingState?.camera !== 'follow') {
      filmKey = '';
      cut = null;
    }
    let river: CampaignRiver | null = null;
    let sites: ReadonlyArray<{ name: string; position: THREE.Vector2 }> = [];

    filmSignals.root.visible = false;
    if (film && marchingState?.camera === 'follow' && march.transport) {
      const { plan } = march.transport;
      const sample = sampleJourney(
        plan,
        marchingState.sequenceId,
        marchingState.time,
      );
      const chapter = sample.chapter;
      const subject =
        marching?.point ??
        (chapterLandmark.root.visible ? chapterLandmark.root.position : null);
      if (chapter?.cues && subject) {
        const key = [
          plan.key,
          marchingState.sequenceId,
          chapter.id,
          marchingState.unitId,
          verticalExaggeration,
        ].join('/');
        const overhead =
          chapter.id.startsWith('chapter-event-sd') ||
          chapter.id === 'chapter-event-zy-resolution';
        if (filmKey !== key) {
          cut =
            filmKey && marchingState.playing && !options.reducedMotion
              ? {
                  start: now,
                  eye: camera.position.clone(),
                  target: controls.target.clone(),
                }
              : null;
          filmKey = key;
          frames = campaignFrames(chapter.id, chapter.cues, plan.tracks);
          bounds = filmExtent(
            overhead
              ? plan.tracks.filter((t) =>
                  crossingSeals.slice(0, 4).some((s) => s.track === t.id),
                )
              : sample.tracks,
          );
          filmGround = routeCameraLevel(
            bounds,
            subject,
            landscape.navigationHeightAt,
          );
          framing = marchFraming(
            chapter.id,
            sample.tracks.find((track) => track.id === marching?.track.id),
            landscape.navigationHeightAt,
            subject,
          );
          finalBounds =
            chapter.id === 'chapter-event-js'
              ? filmExtent(
                  plan.tracks.filter(
                    (track) =>
                      track.chapterId.startsWith('chapter-event-sd') ||
                      track.chapterId === chapter.id,
                  ),
                )
              : bounds;
        }
        const shot = cueIndex(chapter.cues, sample.progress);
        river = campaignRiver(chapter.id, chapter.cues[shot]![2]);
        const campaignPose = campaignView(
          marchingState.unitId === 'central-red' ? frames : null,
          chapter.cues,
          sample.progress,
          subject,
          camera.aspect,
          marchingState.distance,
          filmGround,
          Boolean(options.reducedMotion),
        );
        sites = campaignPose?.labels ?? [];
        const pose =
          campaignPose ??
          sampleFilmCamera(
            chapter.cues,
            sample.progress,
            subject,
            bounds,
            marchingState.distance,
            filmGround,
            Boolean(options.reducedMotion),
            finalBounds,
            overhead,
            framing,
          );
        const openingPressure =
          chapter.id === 'chapter-event-sd' &&
          sample.progress < chapter.cues[1]![0];
        const seal = crossingSeals.find(
          (s) =>
            sample.tracks.some((t) => t.id === s.track) &&
            sample.progress + 1e-8 >= s.at &&
            sample.progress < s.at + 0.055,
        );
        const coordinates =
          seal &&
          sample.tracks.find((t) => t.id === seal.track)?.points[seal.point];
        const anchor = coordinates && projectGeo(coordinates);
        filmSignals.update(
          openingPressure
            ? subject
            : anchor
              ? new THREE.Vector3(
                  anchor[0],
                  heightAt(...anchor) + 0.09,
                  anchor[1],
                )
              : undefined,
          pose.position.distanceTo(pose.target),
          openingPressure
            ? sample.progress / chapter.cues[1]![0]
            : seal
              ? (sample.progress - seal.at) / 0.055
              : 0,
          openingPressure,
          Boolean(options.reducedMotion),
        );
        if (cut && marchingState.playing) {
          const t = THREE.MathUtils.smoothstep(
            now - cut.start,
            0,
            850 / marchingState.speed,
          );
          pose.target.lerp(cut.target, 1 - t);
          pose.position.lerp(cut.eye, 1 - t);
          if (t === 1) cut = null;
        } else cut = null;
        controls.target.copy(pose.target);
        camera.position.copy(pose.position);
        flight = null;
      }
    }
    const centerSubject = !!(
      film &&
      marchingState?.camera === 'follow' &&
      framing &&
      filmKey
    );
    if (centeredMarch !== centerSubject) {
      centeredMarch = centerSubject;
      applySafeFrame();
    }
    if (filmWater !== film || activeRiver !== river) {
      landscape.setFilmWater(film, river);
      filmWater = film;
      activeRiver = river;
    }
    controls.update();
    const levelFollow =
      marchingState?.camera === 'follow' && (film || marchingState.playing);
    constrain(levelFollow);
    if (flightFinished) viewChanged();
    landscape.update(
      options.reducedMotion ? 0 : now / 1000,
      camera.position.distanceTo(controls.target),
      camera.position,
    );
    controls.zoomSpeed = THREE.MathUtils.clamp(
      camera.position.distanceTo(controls.target) * 0.8,
      0.32,
      1,
    );
    if (!flight)
      landscape.observe(
        controls.target.x,
        controls.target.z,
        camera.position.distanceTo(controls.target),
        now,
        !marchingState ||
          (marchingState.camera === 'free' && !marchingState.playing),
      );
    if (landscape.heightVersion !== drawnHeightVersion) {
      drawnHeightVersion = landscape.heightVersion;
      drape();
      march.drape();
      renderer.shadowMap.needsUpdate = true;
    }
    constrain(levelFollow);
    const viewDistance = camera.position.distanceTo(controls.target);
    if (
      !entryFraming &&
      !flight &&
      browseRequested &&
      !marchingState?.playing &&
      marchingState?.camera === 'free'
    ) {
      const candidate = browseRegionAt(
        browseAnchor ?? controls.target,
        viewDistance,
        browseRegion,
      );
      if (candidate !== browseCandidate) {
        browseCandidate = candidate;
        browseSince = now;
      }
      if (
        now - browseSince > 200 &&
        (!browsePublished || candidate !== browseRegion || browseRequested)
      ) {
        browseRegion = candidate;
        browsePublished = true;
        browseRequested = false;
        if (candidate && landscape.region !== candidate)
          void landscape.focus(candidate);
        options.onGeographicBrowse?.(candidate);
      }
    }
    if (
      !levelFollow &&
      viewDistance < 0.7 &&
      (Math.abs(Math.log(viewDistance / Math.max(0.001, shadowDistance))) >
        0.25 ||
        shadowTarget.distanceTo(controls.target) > viewDistance * 0.3)
    ) {
      shadowTarget.copy(controls.target);
      shadowDistance = viewDistance;
      sun.target.position.copy(controls.target);
      sun.position.copy(controls.target).add(new THREE.Vector3(7, 8, -6));
      const span = Math.max(0.025, viewDistance * 2.5);
      sun.shadow.camera.left = -span;
      sun.shadow.camera.right = span;
      sun.shadow.camera.top = span;
      sun.shadow.camera.bottom = -span;
      sun.shadow.camera.updateProjectionMatrix();
      renderer.shadowMap.needsUpdate = true;
      renderer.shadowMap.needsUpdate = true;
    }
    journeyTorch.update(
      now / 1000,
      camera.position.distanceTo(controls.target),
      heightAt,
      options.reducedMotion,
    );
    try {
      renderer.render(scene, camera);
      measure(now, renderer, camera, controls.target, () => ({
        ...landscape.diagnostics,
        marchPoint: marching?.point.toArray() ?? null,
        marchTrack: marching?.track.id ?? null,
        marchStage: marching?.transferring ? 'transfer' : 'local',
        browseRegion,
        targetGround: heightAt(controls.target.x, controls.target.z),
        targetWater: landscape.waterHeightAt(
          controls.target.x,
          controls.target.z,
        ),
        cameraFloor: landscape.navigationHeightAt(
          camera.position.x,
          camera.position.z,
        ),
      }));
      if (shaderProblem) {
        suspended = true;
        return;
      }
      if (!didRender) {
        didRender = true;
        options.onReady();
      }
    } catch (problem) {
      suspended = true;
      options.onError(
        problem instanceof Error
          ? problem.message
          : '现代地形绘制失败，请重试。',
      );
      return;
    }
    const placeLabels = sites.map(({ name, position }) => {
      const p = new THREE.Vector3(
        position.x,
        heightAt(position.x, position.y) + 0.018,
        position.y,
      ).project(camera);
      return {
        id: 'march:place:' + name,
        x: ((p.x + 1) * width) / 2,
        y: ((1 - p.y) * height) / 2,
        visible:
          Math.abs(p.x) < 0.94 && Math.abs(p.y) < 0.9 && Math.abs(p.z) < 1,
      };
    });
    options.onMarkers(
      [
        ...markers.map((marker) => {
          marker.point.y =
            heightAt(marker.point.x, marker.point.z) + marker.lift;
          const point = marker.point.clone().project(camera);
          return {
            id: marker.id,
            x: ((point.x + 1) * width) / 2,
            y: ((1 - point.y) * height) / 2,
            visible:
              point.z < 1 &&
              point.z > -1 &&
              Math.abs(point.x) < 0.97 &&
              Math.abs(point.y) < 0.94,
          };
        }),
        ...march.projections(camera, width, height),
        ...placeLabels,
      ],
      { width, height, distance: camera.position.distanceTo(controls.target) },
    );
  };
  frame = requestAnimationFrame(draw);
  return {
    setMarchTransport: (transport) => march.setTransport(transport),
    setMarchVisible: march.setVisible,
    setMarchCamps: march.setCamps,
    setChapterLandmark: chapterLandmark.set,
    setSafeAreas: (areas) => {
      safeAreas = areas;
      applySafeFrame();
      camera.updateProjectionMatrix();
    },
    setJourneyMarker: journeyTorch.setMarker,
    entry: () => entry(),
    setEventAreas(areas) {
      for (const object of [...eventAreaGroup.children]) {
        if (object instanceof THREE.Line) {
          object.geometry.dispose();
          (object.material as THREE.Material).dispose();
        }
      }
      eventAreaGroup.clear();
      if (options.hideGuides) return;
      for (const area of areas) {
        const [w, s, e, n] = area.bounds;
        if (!inCoverage([w, s]) || !inCoverage([e, n])) continue;
        const points: THREE.Vector3[] = [];
        // A closed display envelope, explicitly not a route or historical border.
        for (let side = 0; side < 4; side++)
          for (let i = 0; i < 24; i++) {
            const t = i / 24;
            const geo: GeoPoint =
              side === 0
                ? [w + (e - w) * t, s]
                : side === 1
                  ? [e, s + (n - s) * t]
                  : side === 2
                    ? [e - (e - w) * t, n]
                    : [w, n - (n - s) * t];
            const [x, z] = projectGeo(geo);
            points.push(new THREE.Vector3(x, heightAt(x, z) + 0.012, z));
          }
        points.push(points[0]!.clone());
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineDashedMaterial({
            color: '#e4caa0',
            transparent: true,
            opacity: 0.48,
            dashSize: 0.035,
            gapSize: 0.03,
            depthWrite: false,
          }),
        );
        line.userData.exhibitionAreaId = area.id;
        line.userData.landscapeLift = 0.012;
        line.computeLineDistances();
        eventAreaGroup.add(line);
      }
    },
    setForceRegions(state, camps) {
      clearForceRegions();
      for (const { track, snapshot } of state.entries) {
        if (
          !camps.includes(track.camp) ||
          snapshot.displayMode !== 'region' ||
          !snapshot.region ||
          snapshot.region.coordinates.some((p) => !inCoverage(p))
        )
          continue;
        const outline = snapshot.region.coordinates.map((coordinate) => {
          const [x, z] = projectGeo(coordinate);
          return new THREE.Vector3(x, heightAt(x, z) + 0.008, z);
        });
        if (outline.length < 3) continue;
        outline.push(outline[0]!.clone());
        const color =
          track.camp === 'red_army'
            ? '#d66155'
            : track.camp === 'nationalist_army'
              ? '#75b6da'
              : '#ead19a';
        const material =
          snapshot.region.precision === 'schematic'
            ? new THREE.LineDashedMaterial({
                color,
                dashSize: 0.04,
                gapSize: 0.025,
              })
            : new THREE.LineBasicMaterial({ color });
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(outline),
          material,
        );
        line.userData.landscapeLift = 0.008;
        line.computeLineDistances();
        forceGroup.add(line);
      }
    },
    setMarkers(inputs) {
      markers = inputs
        .filter((input) => inCoverage(input.coordinates))
        .map((input) => {
          const [x, z] = projectGeo(input.coordinates);
          return {
            id: input.id,
            lift: 0.006,
            point: new THREE.Vector3(x, heightAt(x, z) + 0.025, z),
          };
        });
    },
    focusGeo(point, bounds, transition, regionHint) {
      entryFraming = false;
      if (!inCoverage(point)) return;
      const revision = ++focusRevision;
      const region = regionHint ?? geographicRegionAt(point, landscape.region);
      const complete = () => {
        if (disposed || revision !== focusRevision) return;
        drape();
        const [x, z] = projectGeo(point);
        const pose = bounds
          ? (() => {
              const a = projectGeo([bounds[0], bounds[3]]),
                b = projectGeo([bounds[2], bounds[1]]);
              return composeRegionalView(
                [a[0], a[1], b[0], b[1]],
                { x, z },
                heightAt,
              );
            })()
          : composeTerrainView(
              { x, z, y: heightAt(x, z) },
              { x: 0.15, z: 1 },
              heightAt,
            );
        travel(
          new THREE.Vector3(...pose.position),
          new THREE.Vector3(...pose.target),
          transition === 'regional',
        );
      };
      if (chapterArea) void landscape.focusArea(chapterArea).then(complete);
      else if (region) void landscape.focus(region).then(complete);
      else complete();
    },
    frameMarch(points) {
      const selected = march.update(
        camera.position.distanceTo(controls.target),
      );
      const coordinates = points.filter(inCoverage).map(projectGeo);
      if (coordinates.length < 2) return;
      entryFraming = false;
      preparingEntry = false;
      focusRevision++;
      // A broad moving regional context, not a fit-to-entire-route zoom jump.
      const [x, z] = coordinates[0]!;
      const target =
        selected?.point.clone() ?? new THREE.Vector3(x, heightAt(x, z), z);
      const area = new THREE.Box2().setFromPoints(
        coordinates.map(([x, z]) => new THREE.Vector2(x, z)),
      );
      target.y = routeCameraLevel(area, target, landscape.navigationHeightAt);
      const distance = 7.2;
      travel(
        new THREE.Vector3(
          target.x + distance * 0.12,
          target.y + distance * 0.7,
          target.z + distance,
        ),
        target,
      );
    },
    prepareRegion(region, bounds) {
      chapterArea = !region && bounds ? bounds : null;
      if (region && landscape.region !== region) void landscape.focus(region);
      else if (!region && bounds) void landscape.focusArea(bounds);
    },
    holdCamera() {
      // Retain terrain preparation, but cancel camera work requested before
      // the viewer chose a free composition (including asynchronous focus).
      entryFraming = false;
      preparingEntry = false;
      focusRevision++;
      flight = null;
    },
    focusMarch(mode) {
      const selected = march.update(
        camera.position.distanceTo(controls.target),
      );
      if (!selected) return;
      entryFraming = false;
      preparingEntry = false;
      const revision = ++focusRevision;
      const state = march.transport?.read();
      const region = state
        ? (sampleJourney(march.transport!.plan, state.sequenceId, state.time)
            .chapter?.regionId ?? null)
        : null;
      const complete = () => {
        if (disposed || revision !== focusRevision) return;
        drape();
        march.drape();
        const current = march.update(
          camera.position.distanceTo(controls.target),
        );
        if (!current) return;
        const distance =
          mode === 'follow'
            ? regionalMarchDistance(region) *
              (march.transport?.read().distance ?? 1)
            : 3.1;
        const target = current.point.clone();
        if (march.transport && state) {
          const tracks = sampleJourney(
            march.transport.plan,
            state.sequenceId,
            state.time,
          ).tracks;
          target.y =
            routeCameraLevel(
              filmExtent(tracks),
              target,
              landscape.navigationHeightAt,
            ) + 0.09;
        }
        const position = new THREE.Vector3(
          target.x + distance * 0.22,
          target.y + distance * 0.7,
          target.z + distance,
        );
        clearMarchSightline(position, target, landscape.navigationHeightAt);
        travel(position, target);
      };
      if (chapterArea) void landscape.focusArea(chapterArea).then(complete);
      else if (region && region in REGIONS) {
        browseRegion = region as RegionId;
        void landscape.focus(region as RegionId).then((pivot) => {
          if (pivot) complete();
        });
      } else complete();
    },
    focus(bounds, framing) {
      entryFraming = false;
      preparingEntry = false;
      const revision = ++focusRevision;
      const id = (Object.entries(REGIONS) as [RegionId, GeoBounds][]).find(
        ([, value]) => value.every((n, i) => n === bounds[i]),
      )?.[0];
      const complete = (
        pivot: {
          x: number;
          z: number;
          viewDirection?: { x: number; z: number };
          waterLevel?: number;
          riverCandidates?: { x: number; z: number; level: number }[];
        } | null,
      ) => {
        if (disposed || revision !== focusRevision) return;
        drape();
        const fallback = projectGeo(regionCenter(bounds));
        const x = pivot?.x ?? fallback[0],
          z = pivot?.z ?? fallback[1];
        const pose = composeRegionalView(
          landscape.bounds,
          { x, z },
          heightAt,
          framing === 'place' ? 0.68 : 1,
        );
        const target = new THREE.Vector3(...pose.target);
        const position = new THREE.Vector3(...pose.position);
        sun.target.position.copy(target);
        sun.position.copy(target).add(new THREE.Vector3(7, 8, -6));
        sun.shadow.camera.left = -3;
        sun.shadow.camera.right = 3;
        sun.shadow.camera.top = 3;
        sun.shadow.camera.bottom = -3;
        sun.shadow.camera.updateProjectionMatrix();
        renderer.shadowMap.needsUpdate = true;
        travel(position, target);
      };
      if (id) {
        browseRegion = id;
        browseRequested = false;
        void landscape.focus(id).then(complete);
      } else complete(null);
    },
    overview,
    zoom(direction) {
      browseRequested = true;
      browseAnchor = null;
      cancel();
      options.onUserNavigate?.();
      const offset = camera.position
        .clone()
        .sub(controls.target)
        .multiplyScalar(direction === 1 ? 0.78 : 1.28);
      offset.clampLength(controls.minDistance, controls.maxDistance);
      travel(controls.target.clone().add(offset), controls.target.clone());
    },
    bookmark,
    restore(bookmark) {
      if (
        !isPanoramaSceneId(bookmark.sceneId) ||
        ![...bookmark.position, ...bookmark.target].every(Number.isFinite)
      )
        return;
      if (
        camera.position.distanceTo(new THREE.Vector3(...bookmark.position)) <
          0.00001 &&
        controls.target.distanceTo(new THREE.Vector3(...bookmark.target)) <
          0.00001
      )
        return;
      cancel();
      const revision = focusRevision;
      const complete = () => {
        if (disposed || revision !== focusRevision) return;
        travel(
          new THREE.Vector3(...bookmark.position),
          new THREE.Vector3(...bookmark.target),
        );
      };
      if (bookmark.sceneId === RUIJIN_SCENE && landscape.region !== 'ruijin')
        void landscape.focus('ruijin', true).then(complete);
      else {
        const point = new THREE.Vector3(...bookmark.target);
        const region =
          bookmark.regionId !== undefined
            ? bookmark.regionId
            : geographicRegionAt(
                unprojectGeo([point.x, point.z]),
                landscape.region,
              );
        if (region && landscape.region !== region)
          void landscape.focus(region).then(complete);
        else {
          if (region === null && landscape.region !== null)
            landscape.overview();
          complete();
        }
      }
    },
    setRoutes(routes, camps) {
      clearRoutes();
      for (const route of routes) {
        if (!camps.includes(route.camp) || route.coordinates.length < 1)
          continue;
        // Never bridge missing or out-of-coverage vertices into a new geometry.
        let segment: THREE.Vector3[] = [];
        const flush = () => {
          if (!segment.length) return;
          const geometry = new THREE.BufferGeometry().setFromPoints(segment);
          const color =
            route.camp === 'red_army'
              ? '#d66155'
              : route.camp === 'nationalist_army'
                ? '#75b6da'
                : '#ead19a';
          if (route.mode === 'points')
            routeGroup.add(
              new THREE.Points(
                geometry,
                new THREE.PointsMaterial({ color, size: 0.045 }),
              ),
            );
          else if (segment.length > 1) {
            const line = new THREE.Line(
              geometry,
              route.mode === 'solid'
                ? new THREE.LineBasicMaterial({ color })
                : new THREE.LineDashedMaterial({
                    color,
                    dashSize: route.camp === 'red_army' ? 0.12 : 0.035,
                    gapSize: 0.07,
                  }),
            );
            line.computeLineDistances();
            routeGroup.add(line);
          } else geometry.dispose();
          segment = [];
        };
        for (const point of route.coordinates) {
          if (!inCoverage(point)) {
            flush();
            continue;
          }
          const [x, z] = projectGeo(point);
          segment.push(new THREE.Vector3(x, heightAt(x, z) + 0.025, z));
        }
        flush();
      }
    },
    setRivers: (visible) => {
      landscape.setRivers(visible);
    },
    setVerticalExaggeration(value) {
      if (![1, 6, 12, 24].includes(value) || value === verticalExaggeration)
        return;
      cancel();
      const previous = heightAt(controls.target.x, controls.target.z);
      verticalExaggeration = value;
      landscape.setExaggeration(value);
      const delta = heightAt(controls.target.x, controls.target.z) - previous;
      controls.target.y += delta;
      camera.position.y += delta;
      constrain();
      drape();
    },
    suspend: (value) => {
      suspended = value;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      journeyTorch.dispose();
      filmSignals.dispose();
      march.dispose();
      chapterLandmark.dispose();
      landscape.dispose();
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('start', userCancel);
      controls.removeEventListener('end', userEnd);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', gesture.down);
      renderer.domElement.removeEventListener('pointermove', gesture.move);
      renderer.domElement.removeEventListener('pointerup', gesture.up);
      renderer.domElement.removeEventListener('dblclick', focusSurface);
      renderer.domElement.removeEventListener('wheel', wheelSurface, true);
      renderer.domElement.removeEventListener('keydown', key);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Points
        ) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((item) => materials.add(item));
        }
      });
      geometries.forEach((item) => item.dispose());
      materials.forEach((item) => item.dispose());
      sun.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
