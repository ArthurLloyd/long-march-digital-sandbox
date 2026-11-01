import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type {
  HistoryEvent,
  RouteFeature,
  SceneError,
} from '../../shared/contracts';
import {
  completeSegmentCount,
  createProjection,
  visibleEvents,
  visibleRoutes,
} from './scene-data';
import { createEmberArtwork } from './scene-artwork';

export type CameraAction =
  | 'overview'
  | 'top'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'zoom-in'
  | 'zoom-out';
interface Callbacks {
  ready: () => void;
  error: (error: SceneError) => void;
  select: (id: string) => void;
  quality: (low: boolean) => void;
}
interface SceneInput {
  events: readonly HistoryEvent[];
  routes: readonly RouteFeature[];
  activeEventId: string | null;
  playbackProgress: number;
}
export interface SceneRenderer {
  update: (input: SceneInput) => void;
  camera: (action: CameraAction) => void;
  quality: (low: boolean) => void;
  dispose: () => void;
}

function disposeGroup(group: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.dispose();
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.Points
    ) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(material);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  group.clear();
}

export function createSceneRenderer(
  host: HTMLDivElement,
  callbacks: Callbacks,
): SceneRenderer | null {
  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    '三维展陈视野。左键拖动旋转，右键或双指拖动平移，滚轮或双指缩放；方向键旋转，Shift加方向键平移，加减键缩放，Home复位。',
  );
  canvas.setAttribute('role', 'img');
  let renderer: THREE.WebGLRenderer;
  try {
    const context = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      powerPreference: 'default',
    });
    if (!context) throw new Error('WebGL 2 unavailable');
    renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      alpha: true,
      antialias: true,
    });
  } catch {
    callbacks.error({
      code: 'webgl_unavailable',
      message:
        '设备未提供 WebGL 2。可继续阅读文字资料，或启用浏览器硬件加速后重试。',
    });
    return null;
  }
  let cleanup = () => {
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
  try {
    host.appendChild(canvas);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    const scene = new THREE.Scene();
    const releaseRenderer = cleanup;
    cleanup = () => {
      disposeGroup(scene);
      releaseRenderer();
    };
    scene.fog = new THREE.FogExp2(0x101820, 0.021);
    scene.add(new THREE.HemisphereLight(0xf1dfbd, 0x172737, 2.2));
    const key = new THREE.DirectionalLight(0xffd4a1, 4.5);
    key.position.set(-4, 9, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x91b5cc, 2.6);
    rim.position.set(5, 4, -5);
    scene.add(rim);
    const artwork = createEmberArtwork();
    scene.add(artwork.group);
    const dataGroup = new THREE.Group();
    scene.add(dataGroup);
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 140);
    camera.position.set(12, 10, 18);
    const controls = new OrbitControls(camera, canvas);
    const releaseScene = cleanup;
    cleanup = () => {
      controls.dispose();
      releaseScene();
    };
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 8;
    controls.maxDistance = 36;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.panSpeed = 0.65;
    controls.target.set(0, 1.8, 0);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let low = window.innerWidth < 700 || window.devicePixelRatio > 2;
    let disposed = false;
    let failed = false;
    let ready = false;
    let hasSize = false;
    let frame = 0;
    let previousTime = 0;
    let telemetryTime = 0;
    let telemetryFrames = 0;
    let slowFrames = 0;
    let dirty = true;
    let isDataView = false;
    let input: SceneInput = {
      events: [],
      routes: [],
      activeEventId: null,
      playbackProgress: 0,
    };
    let nodes: THREE.Mesh[] = [];
    let progressLines: { line: THREE.LineSegments; pointCount: number }[] = [];
    let targetGoal: THREE.Vector3 | null = null;
    let positionGoal: THREE.Vector3 | null = null;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: { x: number; y: number; id: number } | null = null;
    const markDirty = () => {
      dirty = true;
    };

    function applyQuality(nextLow: boolean) {
      low = nextLow;
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, low ? 1 : 1.75),
      );
      artwork.setLowQuality(low);
      callbacks.quality(low);
      resize();
    }
    function resize() {
      if (disposed) return;
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      hasSize = true;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.zoom = !isDataView && camera.aspect > 2.4 ? 1.4 : 1;
      camera.updateProjectionMatrix();
      dirty = true;
    }
    function fail(message: string) {
      if (failed || disposed) return;
      failed = true;
      cancelAnimationFrame(frame);
      callbacks.error({ code: 'render_failed', message });
    }
    function changeCamera(action: CameraAction) {
      targetGoal = null;
      positionGoal = null;
      if (action === 'overview' || action === 'top') {
        const target = new THREE.Vector3(0, isDataView ? 0 : 1.8, 0);
        const position =
          action === 'top'
            ? new THREE.Vector3(0, 23, 0.1)
            : new THREE.Vector3(12, 10, 18);
        if (reducedMotion.matches) {
          camera.position.copy(position);
          controls.target.copy(target);
        } else {
          targetGoal = target;
          positionGoal = position;
        }
      } else {
        const offset = camera.position.clone().sub(controls.target);
        const spherical = new THREE.Spherical().setFromVector3(offset);
        if (action === 'left') spherical.theta -= 0.13;
        if (action === 'right') spherical.theta += 0.13;
        if (action === 'up')
          spherical.phi = Math.max(0.12, spherical.phi - 0.1);
        if (action === 'down')
          spherical.phi = Math.min(Math.PI * 0.46, spherical.phi + 0.1);
        if (action === 'zoom-in')
          spherical.radius = Math.max(
            controls.minDistance,
            spherical.radius * 0.86,
          );
        if (action === 'zoom-out')
          spherical.radius = Math.min(
            controls.maxDistance,
            spherical.radius * 1.16,
          );
        camera.position.copy(
          new THREE.Vector3().setFromSpherical(spherical).add(controls.target),
        );
      }
      dirty = true;
      controls.update();
      constrainPan();
    }
    function constrainPan() {
      const bound = isDataView ? 9 : 4;
      const bounded = controls.target
        .clone()
        .clamp(
          new THREE.Vector3(-bound, 0, -bound),
          new THREE.Vector3(bound, 5, bound),
        );
      // Move camera and target together: bounds never distort the current viewing angle.
      camera.position.add(bounded.clone().sub(controls.target));
      controls.target.copy(bounded);
    }
    function panCamera(action: CameraAction) {
      targetGoal = null;
      positionGoal = null;
      const forward = camera.getWorldDirection(new THREE.Vector3());
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3()
        .crossVectors(forward, camera.up)
        .normalize();
      const step = THREE.MathUtils.clamp(
        camera.position.distanceTo(controls.target) * 0.035,
        0.2,
        1.2,
      );
      const delta =
        action === 'left'
          ? right.multiplyScalar(-step)
          : action === 'right'
            ? right.multiplyScalar(step)
            : action === 'up'
              ? forward.multiplyScalar(step)
              : forward.multiplyScalar(-step);
      controls.target.add(delta);
      camera.position.add(delta);
      constrainPan();
      controls.update();
      dirty = true;
    }
    function selectAt(event: PointerEvent) {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const start = pointerStart;
      pointerStart = null;
      if (
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6 ||
        event.button !== 0
      )
        return;
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(nodes)[0];
      if (hit && typeof hit.object.userData.eventId === 'string')
        callbacks.select(hit.object.userData.eventId);
    }
    const onPointerDown = (event: PointerEvent) => {
      pointerStart = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
      targetGoal = null;
      positionGoal = null;
    };
    const cancelPointer = () => {
      pointerStart = null;
    };
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, CameraAction> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
        '+': 'zoom-in',
        '=': 'zoom-in',
        '-': 'zoom-out',
        Home: 'overview',
      };
      const action = map[event.key];
      if (action) {
        event.preventDefault();
        if (event.shiftKey && ['left', 'right', 'up', 'down'].includes(action))
          panCamera(action);
        else changeCamera(action);
      }
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      fail(
        '图形上下文已中断。文字资料仍可阅读，请使用“重试场景”重新创建渲染器。',
      );
    };
    const onMotionChange = () => {
      controls.enableDamping = !reducedMotion.matches;
      if (reducedMotion.matches && targetGoal && positionGoal) {
        controls.target.copy(targetGoal);
        camera.position.copy(positionGoal);
        targetGoal = null;
        positionGoal = null;
      }
      dirty = true;
    };
    const onVisibility = () => {
      previousTime = 0;
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    controls.addEventListener('change', markDirty);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', selectAt);
    canvas.addEventListener('pointercancel', cancelPointer);
    canvas.addEventListener('keydown', onKey);
    canvas.addEventListener('webglcontextlost', onContextLost);
    reducedMotion.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibility);
    cleanup = () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener('change', markDirty);
      controls.dispose();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', selectAt);
      canvas.removeEventListener('pointercancel', cancelPointer);
      canvas.removeEventListener('keydown', onKey);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      reducedMotion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibility);
      disposeGroup(scene);
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
    onMotionChange();
    applyQuality(low);

    function update(next: SceneInput) {
      if (disposed || failed) return;
      const changed =
        next.events !== input.events || next.routes !== input.routes;
      const selectedChanged = next.activeEventId !== input.activeEventId;
      input = next;
      if (changed) {
        disposeGroup(dataGroup);
        nodes = [];
        progressLines = [];
        const events = visibleEvents(next.events);
        const routes = visibleRoutes(next.routes);
        const projection = createProjection([
          ...events.flatMap((event) =>
            event.coordinates ? [event.coordinates] : [],
          ),
          ...routes.flatMap((route) => route.coordinates),
        ]);
        isDataView = events.length > 0 || routes.length > 0;
        artwork.group.visible = !isDataView;
        host.dataset.view = isDataView ? 'data' : 'art';
        if (isDataView) {
          const plate = new THREE.Mesh(
            new THREE.CylinderGeometry(9.6, 10, 0.4, 96),
            new THREE.MeshStandardMaterial({
              color: 0x18272c,
              metalness: 0.38,
              roughness: 0.63,
            }),
          );
          plate.position.y = -0.28;
          dataGroup.add(plate);
          const outline = new THREE.Mesh(
            new THREE.TorusGeometry(9.7, 0.024, 6, 128),
            new THREE.MeshBasicMaterial({ color: 0x98734a }),
          );
          outline.rotation.x = Math.PI / 2;
          outline.position.y = -0.06;
          dataGroup.add(outline);
        }
        for (const event of events) {
          const location = projection.project(event.coordinates!);
          const node = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 10),
            new THREE.MeshStandardMaterial({
              color: 0xe4b878,
              emissive: 0x9a4c20,
              emissiveIntensity: 0.6,
              metalness: 0.4,
              roughness: 0.3,
            }),
          );
          node.position.set(...location);
          node.position.y += 0.15;
          node.userData.eventId = event.id;
          nodes.push(node);
          dataGroup.add(node);
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(
              event.coordinatePrecision === 'approximate' ||
                event.coordinatePrecision === 'schematic'
                ? 0.35
                : 0.23,
              0.014,
              5,
              32,
            ),
            new THREE.MeshBasicMaterial({ color: 0xc38b51 }),
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.set(...location);
          dataGroup.add(ring);
        }
        for (const route of routes) {
          const points = route.coordinates.map(
            (coordinate) =>
              new THREE.Vector3(...projection.project(coordinate)),
          );
          if (route.displayMode === 'points') {
            for (const point of points) {
              const marker = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.1),
                new THREE.MeshBasicMaterial({ color: 0x9fb6ae }),
              );
              marker.position.copy(point);
              dataGroup.add(marker);
            }
            continue;
          }
          if (route.displayMode === 'dashed') {
            const line = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(points),
              new THREE.LineDashedMaterial({
                color: 0xe0c397,
                dashSize: 0.17,
                gapSize: 0.13,
                transparent: true,
                opacity: 0.75,
              }),
            );
            line.computeLineDistances();
            dataGroup.add(line);
            continue;
          }
          const segments: THREE.Vector3[] = [];
          for (let i = 1; i < points.length; i++)
            segments.push(points[i - 1]!, points[i]!);
          const base = new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(segments),
            new THREE.LineBasicMaterial({
              color: 0x8e8271,
              transparent: true,
              opacity: 0.7,
            }),
          );
          dataGroup.add(base);
          const line = new THREE.LineSegments(
            new THREE.BufferGeometry().setFromPoints(segments),
            new THREE.LineBasicMaterial({ color: 0xf6b66d }),
          );
          line.position.y = 0.005;
          dataGroup.add(line);
          progressLines.push({ line, pointCount: points.length });
        }
        controls.target.set(0, isDataView ? 0 : 1.8, 0);
        controls.update();
        constrainPan();
      }
      for (const { line, pointCount } of progressLines)
        line.geometry.setDrawRange(
          0,
          completeSegmentCount(pointCount, next.playbackProgress) * 2,
        );
      for (const node of nodes) {
        const selected = node.userData.eventId === next.activeEventId;
        node.scale.setScalar(selected ? 1.8 : 1);
        const material = node.material as THREE.MeshStandardMaterial;
        material.color.setHex(selected ? 0xffe3a8 : 0xe4b878);
        material.emissiveIntensity = selected ? 1.6 : 0.6;
        if (selected && (selectedChanged || changed)) {
          const target = node.position.clone();
          const position = target.clone().add(new THREE.Vector3(7, 8, 11));
          if (reducedMotion.matches) {
            controls.target.copy(target);
            camera.position.copy(position);
          } else {
            targetGoal = target;
            positionGoal = position;
          }
        }
      }
      dirty = true;
    }

    function render(time: number) {
      if (disposed || failed) return;
      frame = requestAnimationFrame(render);
      if (document.hidden || !hasSize) return;
      if (previousTime && time - previousTime < (low ? 32 : 16)) return;
      if (previousTime && time - previousTime > 45 && time - previousTime < 250)
        slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 90 && !low) applyQuality(true);
      previousTime = time;
      try {
        const moving = targetGoal && positionGoal;
        if (moving) {
          controls.target.lerp(targetGoal!, 0.08);
          camera.position.lerp(positionGoal!, 0.08);
          if (camera.position.distanceTo(positionGoal!) < 0.015) {
            camera.position.copy(positionGoal!);
            controls.target.copy(targetGoal!);
            targetGoal = null;
            positionGoal = null;
          }
          dirty = true;
        }
        controls.update();
        constrainPan();
        if (!reducedMotion.matches && !isDataView) {
          artwork.animate(time / 1000);
          dirty = true;
        }
        if (dirty || !ready) {
          renderer.render(scene, camera);
          telemetryFrames++;
          if (
            import.meta.env.DEV &&
            renderer.info &&
            time - telemetryTime >= 1000
          ) {
            canvas.dataset.renderFps = (
              (telemetryFrames * 1000) /
              (time - telemetryTime)
            ).toFixed(1);
            canvas.dataset.drawCalls = String(renderer.info.render.calls);
            canvas.dataset.triangles = String(renderer.info.render.triangles);
            canvas.dataset.geometries = String(renderer.info.memory.geometries);
            canvas.dataset.textures = String(renderer.info.memory.textures);
            telemetryTime = time;
            telemetryFrames = 0;
          }
          dirty = false;
          if (!ready) {
            ready = true;
            callbacks.ready();
          }
        }
      } catch {
        fail('三维场景渲染中断，请重试。已核验文字资料仍可继续阅读。');
      }
    }
    frame = requestAnimationFrame(render);
    return {
      update,
      camera: changeCamera,
      quality: applyQuality,
      dispose: cleanup,
    };
  } catch {
    cleanup();
    callbacks.error({
      code: 'render_failed',
      message: '三维场景初始化失败，已释放图形资源。请重试或继续阅读文字资料。',
    });
    return null;
  }
}
