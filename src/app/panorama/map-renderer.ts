import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { GeoBounds } from './geography';
import {
  geography,
  MAP_DEPTH,
  MAP_WIDTH,
  heightAt,
  projectGeo,
  regionCenter,
  inCoverage,
} from './geography';
import { PANORAMA_NODES, REGIONS, type RegionId } from './navigation';
import type { PublishedMapRoute } from './route-layers';

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
  controls.minDistance = 1.4;
  controls.maxDistance = 58;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minPolarAngle = 0.12;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  const ambient = new THREE.HemisphereLight('#d7ebdc', '#213f38', 1.7);
  const sun = new THREE.DirectionalLight('#fff1d3', 2.8);
  sun.position.set(-15, 20, -12);
  scene.add(ambient, sun);

  const terrain = new THREE.PlaneGeometry(
    MAP_WIDTH,
    MAP_DEPTH,
    geography.cols - 1,
    geography.rows - 1,
  );
  terrain.rotateX(-Math.PI / 2);
  const positions = terrain.getAttribute('position');
  let verticalExaggeration: 1 | 6 | 12 | 24 = 12;
  const scaledHeights = new Float32Array(positions.count);
  const colors = new Float32Array(positions.count * 3);
  const low = new THREE.Color('#345d48'),
    middle = new THREE.Color('#68806a'),
    high = new THREE.Color('#a39f80'),
    peak = new THREE.Color('#e3dfce');
  for (let i = 0; i < positions.count; i++) {
    const metres = Math.max(0, geography.heights[i] ?? 0);
    scaledHeights[i] = heightAt(positions.getX(i), positions.getZ(i), 1);
    positions.setY(i, scaledHeights[i]! * verticalExaggeration);
    const color =
      metres < 1500
        ? low.clone().lerp(middle, metres / 1500)
        : metres < 4200
          ? middle.clone().lerp(high, (metres - 1500) / 2700)
          : high.clone().lerp(peak, Math.min(1, (metres - 4200) / 1800));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(terrain, material);
  scene.add(mesh);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(MAP_WIDTH, 0.25, MAP_DEPTH),
    new THREE.MeshStandardMaterial({ color: '#294844', roughness: 1 }),
  );
  base.position.y = -0.13;
  scene.add(base);
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(base.geometry),
    new THREE.LineBasicMaterial({
      color: '#a2aa89',
      transparent: true,
      opacity: 0.55,
    }),
  );
  outline.position.copy(base.position);
  scene.add(outline);

  const rivers = new THREE.Group();
  const riverMaterial = new LineMaterial({
    color: '#81bdc8',
    transparent: true,
    opacity: 0.9,
  });
  riverMaterial.linewidth = 3.2;
  const riverLines: { line: Line2; points: readonly THREE.Vector3[] }[] = [];
  for (const river of geography.rivers) {
    for (const line of river.coordinates) {
      const points = line.map((point) => {
        const [x, z] = projectGeo([point[0]!, point[1]!]);
        return new THREE.Vector3(
          x,
          heightAt(x, z, verticalExaggeration) + 0.008,
          z,
        );
      });
      const renderedLine = new Line2(
        new LineGeometry().setPositions(
          points.flatMap((point) => point.toArray()),
        ),
        riverMaterial,
      );
      riverLines.push({ line: renderedLine, points });
      rivers.add(renderedLine);
    }
  }
  scene.add(rivers);
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
  const markers = PANORAMA_NODES.map((node) => {
    const [x, z] = projectGeo(regionCenter(REGIONS[node.id]));
    return {
      id: node.id,
      point: new THREE.Vector3(
        x,
        heightAt(x, z, verticalExaggeration) + 0.12,
        z,
      ),
    };
  });
  let disposed = false,
    suspended = false,
    frame = 0,
    didRender = false;
  let width = 1,
    height = 1;
  let flight: null | {
    start: number;
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
    } else
      flight = {
        start: performance.now(),
        from: camera.position.clone(),
        to: position,
        targetFrom: controls.target.clone(),
        targetTo: target,
      };
  };
  const cancel = () => {
    flight = null;
  };
  controls.addEventListener('start', cancel);
  const overview = (top = false) =>
    travel(
      new THREE.Vector3(0, top ? 35 : 25, top ? 0.1 : 23),
      new THREE.Vector3(0, 0, 0),
    );
  camera.position.set(0, 25, 23);
  controls.target.set(0, 0, 0);
  controls.update();
  const resize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    riverMaterial.resolution.set(width, height);
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
      const t = Math.min(1, (now - flight.start) / 1200);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(flight.from, flight.to, ease);
      controls.target.lerpVectors(flight.targetFrom, flight.targetTo, ease);
      if (t === 1) flight = null;
    }
    controls.update();
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
    options.onMarkers(
      markers.map((marker) => {
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
      const [x, z] = projectGeo(regionCenter(bounds));
      const target = new THREE.Vector3(
        x,
        heightAt(x, z, verticalExaggeration),
        z,
      );
      const left = projectGeo([bounds[0], bounds[1]]),
        right = projectGeo([bounds[2], bounds[3]]);
      const span = Math.max(
        Math.abs(right[0] - left[0]),
        Math.abs(right[1] - left[1]),
        1.7,
      );
      const distance = Math.max(1.45, span * 0.6);
      const position = target
        .clone()
        .add(
          new THREE.Vector3(distance * 0.12, distance * 0.4, distance * 0.92),
        );
      position.y = Math.max(
        position.y,
        heightAt(position.x, position.z, verticalExaggeration) + 0.3,
      );
      travel(position, target);
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
          const color = route.camp === 'red_army' ? '#d66155' : '#75b6da';
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
              new THREE.LineDashedMaterial({
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
          segment.push(
            new THREE.Vector3(
              x,
              heightAt(x, z, verticalExaggeration) + 0.025,
              z,
            ),
          );
        }
        flush();
      }
    },
    setRivers: (visible) => {
      rivers.visible = visible;
    },
    setVerticalExaggeration(value) {
      if (![1, 6, 12, 24].includes(value) || value === verticalExaggeration)
        return;
      verticalExaggeration = value;
      for (let i = 0; i < positions.count; i++)
        positions.setY(i, scaledHeights[i]! * value);
      positions.needsUpdate = true;
      terrain.computeVertexNormals();
      terrain.computeBoundingSphere();
      const drape = (group: THREE.Group, offset: number) =>
        group.traverse((object) => {
          if (object instanceof THREE.Line || object instanceof THREE.Points) {
            const points = object.geometry.getAttribute('position');
            for (let i = 0; i < points.count; i++)
              points.setY(
                i,
                heightAt(points.getX(i), points.getZ(i), value) + offset,
              );
            points.needsUpdate = true;
            object.geometry.computeBoundingSphere();
          }
        });
      riverLines.forEach(({ line, points }) => {
        line.geometry.dispose();
        line.geometry = new LineGeometry().setPositions(
          points.flatMap((point) => [
            point.x,
            heightAt(point.x, point.z, value) + 0.008,
            point.z,
          ]),
        );
      });
      drape(routeGroup, 0.025);
      markers.forEach((marker) => {
        marker.point.y = heightAt(marker.point.x, marker.point.z, value) + 0.12;
      });
    },
    suspend: (value) => {
      suspended = value;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('start', cancel);
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
