import { sampleCameraFlight } from './camera-flight';
import { composeTerrainView } from './camera-composition';
import { createModernLandscape } from './modern-landscape';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GeoBounds } from './geography';
import { projectGeo, regionCenter, inCoverage } from './geography';
import { ATLAS_REGIONS, REGIONS, type RegionId } from './regions';
import {
  validPoint,
  type PublishedMapRoute,
  type SpatialView,
} from './spatial-view';
import { createUnitLayer } from './unit-layer';

export interface PanoramaBookmark {
  sceneId: 'long-march-modern-panorama';
  position: [number, number, number];
  target: [number, number, number];
}
export interface MarkerProjection {
  id: RegionId;
  x: number;
  y: number;
  visible: boolean;
}
export interface PanoramaMapAdapter {
  focus(bounds: GeoBounds): void;
  overview(top?: boolean): void;
  zoom(direction: 1 | -1): void;
  bookmark(): PanoramaBookmark;
  restore(bookmark: PanoramaBookmark): void;
  setRoutes(
    routes: readonly PublishedMapRoute[],
    camps: readonly string[],
  ): void;
  setSpatialView(view: SpatialView): void;
  setRivers(visible: boolean): void;
  setVerticalExaggeration(value: 1 | 6 | 12 | 24): void;
  suspend(value: boolean): void;
  dispose(): void;
}

/** Shared renderer extracted from C checkpoint 728cbd3; one geography implementation, no app dependency. */
export function createPanoramaMap(
  host: HTMLElement,
  options: {
    reducedMotion: boolean;
    onMarkers: (markers: MarkerProjection[]) => void;
    onError: (message: string) => void;
    onReady: () => void;
    onCameraChanged?: (bookmark: PanoramaBookmark) => void;
    onManualControl?: () => void;
    onObjects?: (
      objects: {
        id: string;
        kind: string;
        title: string;
        x: number;
        y: number;
        visible: boolean;
      }[],
    ) => void;
  },
): PanoramaMapAdapter {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#17343a');
  const camera = new THREE.PerspectiveCamera(43, 1, 0.02, 160);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor('#17343a');
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
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
  const ambient = new THREE.HemisphereLight('#c8dcd6', '#152e26', 0.7);
  const sun = new THREE.DirectionalLight('#fff1d3', 3.2);
  sun.position.set(-15, 20, -12);
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
  const units = createUnitLayer(heightAt);
  scene.add(units.group);
  let spatial: SpatialView = { routes: [], units: [], objects: [] };
  const reportCamera = () =>
    options.onCameraChanged?.({
      sceneId: 'long-march-modern-panorama',
      position: camera.position.toArray(),
      target: controls.target.toArray(),
    });
  controls.addEventListener('end', reportCamera);
  const routeGroup = new THREE.Group();
  scene.add(routeGroup);
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
  const refreshRouteHeights = () => {
    routeGroup.traverse((object) => {
      if (object instanceof THREE.Line || object instanceof THREE.Points) {
        const p = object.geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++)
          p.setY(i, heightAt(p.getX(i), p.getZ(i)) + 0.025);
        p.needsUpdate = true;
        object.geometry.computeBoundingSphere();
        if (object instanceof THREE.Line) object.computeLineDistances();
      }
    });
  };
  const markers = ATLAS_REGIONS.map((node) => {
    const [x, z] = projectGeo(regionCenter(REGIONS[node.id]));
    return {
      id: node.id,
      point: new THREE.Vector3(x, heightAt(x, z) + 0.12, z),
    };
  });
  let disposed = false,
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
      reportCamera();
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
    flight = null;
    focusRevision++;
    landscape.cancelPending();
  };
  const manual = () => {
    cancel();
    options.onManualControl?.();
  };
  controls.addEventListener('start', manual);
  const overview = (top = false) => {
    focusRevision++;
    landscape.overview();
    refreshRouteHeights();
    sun.target.position.set(0, 0, 0);
    sun.position.set(-15, 20, -12);
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -16;
    sun.shadow.camera.updateProjectionMatrix();
    travel(
      new THREE.Vector3(0, top ? 33 : 24, top ? 0.1 : 23),
      new THREE.Vector3(0, 0, 0),
    );
  };
  camera.position.set(0, 24, 23);
  controls.target.set(0, 0, 0);
  controls.update();
  const resize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
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
    if (suspended) return;
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
        reportCamera();
      }
    }
    controls.update();
    landscape.update(options.reducedMotion ? 0 : now / 1000);
    units.update(camera);
    try {
      renderer.render(scene, camera);
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
    options.onObjects?.(
      spatial.objects
        .filter((object) => inCoverage(object.point))
        .map((object) => {
          const [x, z] = projectGeo(object.point);
          const point = new THREE.Vector3(x, heightAt(x, z) + 0.025, z).project(
            camera,
          );
          return {
            id: object.selection.id,
            kind: object.selection.kind,
            title: object.title,
            x: ((point.x + 1) * width) / 2,
            y: ((1 - point.y) * height) / 2,
            visible:
              Math.abs(point.x) < 0.96 &&
              Math.abs(point.y) < 0.9 &&
              point.z > -1 &&
              point.z < 1,
          };
        }),
    );
    options.onMarkers(
      markers.map((marker) => {
        marker.point.y = heightAt(marker.point.x, marker.point.z) + 0.12;
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
    focus(bounds) {
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
        refreshRouteHeights();
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
        sun.position.copy(target).add(new THREE.Vector3(-7, 12, -5));
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
      const offset = camera.position
        .clone()
        .sub(controls.target)
        .multiplyScalar(direction === 1 ? 0.78 : 1.28);
      offset.clampLength(controls.minDistance, controls.maxDistance);
      travel(controls.target.clone().add(offset), controls.target.clone());
    },
    bookmark: () => ({
      sceneId: 'long-march-modern-panorama',
      position: camera.position.toArray(),
      target: controls.target.toArray(),
    }),
    restore(bookmark) {
      if (
        bookmark.sceneId !== 'long-march-modern-panorama' ||
        ![...bookmark.position, ...bookmark.target].every(Number.isFinite)
      )
        return;
      travel(
        new THREE.Vector3(...bookmark.position),
        new THREE.Vector3(...bookmark.target),
      );
    },
    setSpatialView(view) {
      spatial = view;
      units.set(view.units);
      this.setRoutes(view.routes, ['red_army', 'nationalist_army', 'other']);
      host.dataset.units = String(view.units.length);
      host.dataset.routes = String(view.routes.length);
    },
    setRoutes(routes, camps) {
      clearRoutes();
      for (const route of routes) {
        if (
          !camps.includes(route.camp) ||
          route.coordinates.length < 1 ||
          route.mode === 'hidden' ||
          route.precision === 'unknown'
        )
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
                : '#d9c49a';
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
          if (!validPoint(point) || !inCoverage(point)) {
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
      refreshRouteHeights();
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
      controls.removeEventListener('start', manual);
      controls.removeEventListener('end', reportCamera);
      units.dispose();
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
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
