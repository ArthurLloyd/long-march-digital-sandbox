import { sampleCameraFlight } from './camera-flight';
import { composeTerrainView } from './camera-composition';
import { createModernLandscape } from './modern-landscape';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GeoBounds, GeoPoint } from './geography';
import { projectGeo, regionCenter, inCoverage } from './geography';
import { REGIONS, type RegionId } from './map-regions';
import type { PublishedMapRoute } from './map-objects';
import type { ForcePhaseState } from '../history/force-state';
import { EXHIBITION_LIGHT } from './exhibition-atmosphere';
import { composeReliefEntry } from './relief-block';
import {
  PANORAMA_SCENE,
  RUIJIN_SCENE,
  isPanoramaSceneId,
  type PanoramaSceneId,
} from './panorama-bookmark';

export interface PanoramaBookmark {
  sceneId: PanoramaSceneId;
  position: [number, number, number];
  target: [number, number, number];
}
export interface MarkerProjection {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}
export interface PanoramaMapAdapter {
  entry(): void;
  focus(bounds: GeoBounds): void;
  focusGeo(point: GeoPoint): void;
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
    onMarkers: (markers: MarkerProjection[]) => void;
    onError: (message: string) => void;
    onReady: () => void;
    technicalMarkers?: boolean;
    entryView?: boolean;
    initialBookmark?: PanoramaBookmark;
    onViewChange?: (bookmark: PanoramaBookmark) => void;
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
  let shaderProblem = false;
  renderer.debug.onShaderError = () => {
    shaderProblem = true;
    options.onError('地形着色器无法在当前图形环境编译，请重试地图。');
  };
  renderer.domElement.setAttribute(
    'aria-label',
    '长征涉及区域现代三维地理参考。方向键可环顾，地图按钮提供区域定位。',
  );
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.tabIndex = 0;
  host.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 0.18;
  controls.maxDistance = 58;
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
  let verticalExaggeration: 1 | 6 | 12 | 24 = 12;
  const heightAt = (x: number, z: number) => landscape.heightAt(x, z);
  const routeGroup = new THREE.Group();
  const forceGroup = new THREE.Group();
  scene.add(routeGroup, forceGroup);
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
    for (const group of [routeGroup, forceGroup])
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
  } = null;
  const travel = (position: THREE.Vector3, target: THREE.Vector3) => {
    if (options.reducedMotion) {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      flight = null;
      viewChanged();
    } else
      flight = {
        start: performance.now(),
        duration:
          camera.position.distanceTo(controls.target) /
            Math.max(0.01, position.distanceTo(target)) >
            6 || controls.target.distanceTo(target) > 3
            ? 2400
            : 1600,
        from: camera.position.clone(),
        to: position,
        targetFrom: controls.target.clone(),
        targetTo: target,
      };
  };
  const cancel = () => {
    entryFraming = false;
    preparingEntry = false;
    flight = null;
    focusRevision++;
    landscape.cancelPending();
  };
  controls.addEventListener('start', cancel);
  const bookmark = (): PanoramaBookmark => ({
    sceneId: landscape.exhibit ? RUIJIN_SCENE : PANORAMA_SCENE,
    position: camera.position.toArray(),
    target: controls.target.toArray(),
  });
  const viewChanged = () => options.onViewChange?.(bookmark());
  controls.addEventListener('end', viewChanged);
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
    travel(
      new THREE.Vector3(0, top ? 31 : 20, top ? 0.1 : 19),
      new THREE.Vector3(0, 0, 0),
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
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const entry = (initial = false) => {
    entryFraming = true;
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
    if (event.key === 'Home') return overview();
    const offset = camera.position.clone().sub(controls.target);
    if (event.key === '+' || event.key === '-')
      offset.multiplyScalar(event.key === '+' ? 0.88 : 1.12);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      offset.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        event.key === 'ArrowLeft' ? 0.12 : -0.12,
      );
    else
      offset.y = Math.max(
        0.5,
        offset.y + (event.key === 'ArrowUp' ? 0.5 : -0.5),
      );
    camera.position.copy(controls.target).add(offset);
    controls.update();
    viewChanged();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    suspended = true;
    options.onError('图形上下文已丢失，请重试地图。');
  };
  renderer.domElement.addEventListener('keydown', key);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const draw = (now: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(draw);
    if (suspended || preparingEntry) return;
    let flightFinished = false;
    if (flight) {
      const t = Math.min(1, (now - flight.start) / flight.duration);
      const pose = sampleCameraFlight(
        {
          position: flight.from.toArray(),
          target: flight.targetFrom.toArray(),
        },
        { position: flight.to.toArray(), target: flight.targetTo.toArray() },
        t,
      );
      camera.position.fromArray(pose.position);
      controls.target.fromArray(pose.target);
      camera.position.y = Math.max(
        camera.position.y,
        heightAt(camera.position.x, camera.position.z) + 0.015,
      );
      if (t === 1) {
        flight = null;
        flightFinished = true;
      }
    }
    controls.update();
    if (flightFinished) viewChanged();
    landscape.update(options.reducedMotion ? 0 : now / 1000);
    try {
      renderer.render(scene, camera);
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
    options.onMarkers(
      markers.map((marker) => {
        marker.point.y = heightAt(marker.point.x, marker.point.z) + marker.lift;
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
    );
  };
  frame = requestAnimationFrame(draw);
  return {
    entry: () => entry(),
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
    focusGeo(point) {
      entryFraming = false;
      if (!inCoverage(point)) return;
      const revision = ++focusRevision;
      const region = (Object.entries(REGIONS) as [RegionId, GeoBounds][]).find(
        ([, b]) =>
          point[0] >= b[0] &&
          point[0] <= b[2] &&
          point[1] >= b[1] &&
          point[1] <= b[3],
      )?.[0];
      const complete = () => {
        if (disposed || revision !== focusRevision) return;
        drape();
        const [x, z] = projectGeo(point),
          pose = composeTerrainView(
            { x, z, y: heightAt(x, z) },
            { x: 0.15, z: 1 },
            heightAt,
          );
        travel(
          new THREE.Vector3(...pose.position),
          new THREE.Vector3(...pose.target),
        );
      };
      if (region) void landscape.focus(region).then(complete);
      else complete();
    },
    focus(bounds) {
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
        const direction = pivot?.viewDirection ?? { x: 0.15, z: 1 };
        const pose = composeTerrainView(
          { x, z, y: pivot?.waterLevel ?? heightAt(x, z) },
          direction,
          heightAt,
          pivot?.riverCandidates,
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
        travel(position, target);
      };
      if (id) void landscape.focus(id).then(complete);
      else complete(null);
    },
    overview,
    zoom(direction) {
      cancel();
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
          0.00001 &&
        (bookmark.sceneId === RUIJIN_SCENE) === landscape.exhibit
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
      if (bookmark.sceneId === RUIJIN_SCENE && !landscape.exhibit)
        void landscape.focus('ruijin', true).then(complete);
      else {
        if (bookmark.sceneId === PANORAMA_SCENE && landscape.exhibit) {
          landscape.overview();
          drape();
        }
        complete();
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
      camera.position.y = Math.max(
        camera.position.y,
        heightAt(camera.position.x, camera.position.z) + 0.25,
      );
      drape();
    },
    suspend: (value) => {
      suspended = value;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      landscape.dispose();
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('start', cancel);
      controls.removeEventListener('end', viewChanged);
      controls.dispose();
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
