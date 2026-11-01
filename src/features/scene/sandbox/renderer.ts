import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildTerrain } from './terrain';
import type { Heightfield, RiverData } from './terrain';
import { createUnit } from './units';
import type { UnitSpec } from './units';
import { clampProgress } from './motion';
export interface SandboxNode {
  id: string;
  title: string;
  progress: number;
  coordinates: readonly [number, number];
}
export interface SandboxOptions {
  data: Heightfield;
  rivers: RiverData;
  units: UnitSpec[];
  nodes: SandboxNode[];
  onNode: (id: string) => void;
  onFrame: (v: {
    progress: number;
    detail: boolean;
    playing: boolean;
    following: boolean;
    bearing: number;
    positions: number[][];
    fps: number;
    calls: number;
    triangles: number;
  }) => void;
  onError: (message: string) => void;
  low?: boolean;
}
export function createRegionalRenderer(
  host: HTMLElement,
  labels: HTMLElement,
  options: SandboxOptions,
) {
  const low = options.low ?? window.innerWidth < 700,
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.info.autoReset = false;
  renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1.25 : 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.append(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    'aria-label',
    '立体区域沙盘。方向键旋转，Shift 加方向键平移，加减号缩放，Home 恢复全览。',
  );
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#142f35');
  const fog = new THREE.FogExp2('#142f35', 0.0065);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 220;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.maxTargetRadius = 32;
  controls.target.set(0, 2, 0);
  camera.position.set(38, 40, 50);
  controls.update();
  const terrain = buildTerrain(options.data, options.rivers, low);
  scene.add(terrain.group);
  scene.add(new THREE.HemisphereLight('#e1f4f4', '#24352f', 1.3));
  const sun = new THREE.DirectionalLight('#fff0d2', 3.1);
  sun.position.set(-25, 45, 16);
  sun.castShadow = !low;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -38;
  sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 42;
  sun.shadow.camera.bottom = -42;
  sun.shadow.camera.far = 130;
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -0.00008;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#9ccee0', 0.9);
  fill.position.set(25, 15, -30);
  scene.add(fill);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({
      color: '#142b2e',
      roughness: 0.86,
      metalness: 0.15,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.8;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(160, 80, '#345758', '#264447');
  grid.position.y = -1.77;
  grid.material.transparent = true;
  grid.material.opacity = 0.17;
  scene.add(grid);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.19, 0.6, 0.82);
  bloom.enabled = !low;
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const units = options.units.map((spec) => {
    const unit = createUnit(spec, terrain.space);
    scene.add(unit.group);
    return unit;
  });
  const routeGroup = new THREE.Group();
  scene.add(routeGroup);
  const routes = options.units.map((spec) => {
    const points: THREE.Vector3[] = [];
    for (let i = 1; i < spec.path.length; i++) {
      const a = spec.path[i - 1]!,
        b = spec.path[i]!;
      const steps = Math.max(
        2,
        Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.12),
      );
      for (let j = i === 1 ? 0 : 1; j <= steps; j++) {
        const t = j / steps,
          x = a[0] + (b[0] - a[0]) * t,
          z = a[2] + (b[2] - a[2]) * t;
        points.push(
          new THREE.Vector3(x, terrain.space.height(x, z) + 0.095, z),
        );
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(points),
      m = new THREE.LineDashedMaterial({
        color: spec.color,
        dashSize: 0.22,
        gapSize: 0.16,
        transparent: true,
        opacity: 0.46,
      });
    const base = new THREE.Line(g, m);
    base.computeLineDistances();
    routeGroup.add(base);
    const active = new THREE.Line(
      g.clone(),
      new THREE.LineBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.95,
      }),
    );
    routeGroup.add(active);
    return active;
  });
  const labelRecords = options.nodes.map((node) => {
    const p = terrain.space.project(...node.coordinates);
    p.y += 0.4;
    const button = document.createElement('button');
    button.className = 'map-label';
    button.type = 'button';
    button.textContent = node.title;
    button.setAttribute('aria-label', node.title + '，定位时间节点');
    button.addEventListener('click', () => options.onNode(node.id));
    labels.append(button);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 8),
      new THREE.MeshBasicMaterial({ color: '#f1cf8b' }),
    );
    marker.position.copy(p);
    scene.add(marker);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        p.clone().add(new THREE.Vector3(0, -0.25, 0)),
        p.clone().add(new THREE.Vector3(0, 1.1, 0)),
      ]),
      new THREE.LineBasicMaterial({
        color: '#d8b979',
        transparent: true,
        opacity: 0.65,
      }),
    );
    scene.add(line);
    return { node, p, button };
  });
  let progress = 0,
    playing = false,
    speed = 1,
    follow = false,
    disposed = false,
    suspended = false,
    raf = 0,
    last = 0,
    elapsed = 0,
    frames = 0,
    fps = 0,
    sampleTime = 0,
    notifyTime = 0,
    qualityLow = low;
  let viewMode: 'overview' | 'free' = 'overview';
  const overviewPosition = () =>
    new THREE.Vector3(38, 40, 50).multiplyScalar(
      Math.max(1, 1.2 / camera.aspect),
    );
  let transition: {
    from: THREE.Vector3;
    targetFrom: THREE.Vector3;
    to: THREE.Vector3;
    target: THREE.Vector3;
    start: number;
  } | null = null;
  function fly(position: THREE.Vector3, target: THREE.Vector3) {
    viewMode = 'free';
    follow = false;
    if (reduced) {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      return;
    }
    transition = {
      from: camera.position.clone(),
      targetFrom: controls.target.clone(),
      to: position,
      target,
      start: performance.now(),
    };
  }
  const input = () => {
    viewMode = 'free';
    transition = null;
    follow = false;
  };
  controls.addEventListener('start', input);
  function resize() {
    const w = Math.max(1, host.clientWidth),
      h = Math.max(1, host.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fog.density = 0.0065 / Math.max(1, 1.2 / camera.aspect);
    if (viewMode === 'overview') {
      camera.position.copy(overviewPosition());
      controls.target.set(0, 2, 0);
      controls.update();
    }
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  function key(e: KeyboardEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const offset = camera.position.clone().sub(controls.target);
    if (e.key === 'Home') {
      overview();
    } else if (e.key === '+' || e.key === '=') {
      zoom(0.8);
    } else if (e.key === '-') {
      zoom(1.25);
    } else if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
    ) {
      input();
      if (e.shiftKey) {
        const delta = new THREE.Vector3(
          e.key === 'ArrowLeft' ? -0.7 : e.key === 'ArrowRight' ? 0.7 : 0,
          0,
          e.key === 'ArrowUp' ? -0.7 : e.key === 'ArrowDown' ? 0.7 : 0,
        );
        camera.position.add(delta);
        controls.target.add(delta);
      } else {
        const s = new THREE.Spherical().setFromVector3(offset);
        s.theta +=
          e.key === 'ArrowLeft' ? 0.1 : e.key === 'ArrowRight' ? -0.1 : 0;
        s.phi = THREE.MathUtils.clamp(
          s.phi +
            (e.key === 'ArrowUp' ? -0.08 : e.key === 'ArrowDown' ? 0.08 : 0),
          0.12,
          Math.PI * 0.46,
        );
        camera.position
          .copy(controls.target)
          .add(new THREE.Vector3().setFromSpherical(s));
      }
      controls.update();
    } else return;
    e.preventDefault();
  }
  renderer.domElement.addEventListener('keydown', key);
  function zoom(factor: number) {
    input();
    const delta = camera.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(
      delta.length() * factor,
      controls.minDistance,
      controls.maxDistance,
    );
    camera.position.copy(controls.target).add(delta.setLength(distance));
    controls.update();
  }
  function overview() {
    fly(overviewPosition(), new THREE.Vector3(0, 2, 0));
    viewMode = 'overview';
  }
  function focusUnit() {
    const p = units[0]?.group.position.clone() ?? new THREE.Vector3();
    fly(
      p.clone().add(new THREE.Vector3(4.2, 7.2, 7.4)),
      p.clone().add(new THREE.Vector3(0, 0.3, 0)),
    );
  }
  function visibility() {
    if (document.hidden) {
      playing = false;
      last = 0;
    }
  }
  document.addEventListener('visibilitychange', visibility);
  function contextLost(e: Event) {
    e.preventDefault();
    playing = false;
    options.onError('三维画面已中断，请重新载入沙盘。');
  }
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden || suspended) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    elapsed += reduced ? 0 : dt;
    if (playing) {
      progress = clampProgress(progress + (dt / 70) * speed);
      if (progress === 1) playing = false;
    }
    if (transition) {
      let t = Math.min(1, (now - transition.start) / 1100);
      t = t * t * (3 - 2 * t);
      camera.position.lerpVectors(transition.from, transition.to, t);
      controls.target.lerpVectors(transition.targetFrom, transition.target, t);
      if (t === 1) transition = null;
    }
    if (follow && units[0]) {
      const target = units[0].group.position
        .clone()
        .add(new THREE.Vector3(0, 0.3, 0));
      const d = target.clone().sub(controls.target);
      camera.position.add(d);
      controls.target.copy(target);
    }
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -24, 24);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -29, 29);
    if (
      camera.position.x >= -21 &&
      camera.position.x <= 21 &&
      Math.abs(camera.position.z) <= terrain.space.depth / 2
    )
      camera.position.y = Math.max(
        camera.position.y,
        terrain.space.height(camera.position.x, camera.position.z) + 0.7,
      );
    controls.update();
    terrain.waterTime.value = elapsed;
    units.forEach((u, i) => {
      u.update(
        clampProgress(progress + (options.units[i]?.offset ?? 0)),
        camera,
        elapsed,
        playing && !reduced,
      );
      u.select(i === 0);
    });
    routes.forEach((route, i) =>
      route.geometry.setDrawRange(
        0,
        Math.floor(
          route.geometry.getAttribute('position').count *
            clampProgress(progress + (options.units[i]?.offset ?? 0)),
        ),
      ),
    );
    const occupied: { x: number; y: number }[] = [];
    for (const { node, p, button } of labelRecords) {
      const pos = p
        .clone()
        .add(new THREE.Vector3(0, 1.15, 0))
        .project(camera);
      const x = (pos.x * 0.5 + 0.5) * host.clientWidth,
        y = (-pos.y * 0.5 + 0.5) * host.clientHeight;
      const visible =
        pos.z < 1 &&
        !(
          units[0]?.isDetailed() && Math.abs(node.progress - progress) < 0.13
        ) &&
        x > 20 &&
        x < host.clientWidth - 100 &&
        y > 65 &&
        y < host.clientHeight - 170 &&
        !occupied.some(
          (o) => Math.abs(o.x - x) < 100 && Math.abs(o.y - y) < 34,
        );
      button.hidden = !visible;
      if (visible) {
        occupied.push({ x, y });
        button.style.transform = `translate(${x}px,${y}px)`;
        button.classList.toggle(
          'current',
          Math.abs(node.progress - progress) < 0.13,
        );
      }
    }
    try {
      renderer.info.reset();
      if (qualityLow) renderer.render(scene, camera);
      else composer.render();
    } catch {
      playing = false;
      options.onError('三维渲染失败，请重新载入或切换轻量画质。');
      cancelAnimationFrame(raf);
      return;
    }
    frames++;
    if (now - sampleTime > 1000) {
      fps = Math.round((frames * 1000) / (now - sampleTime));
      frames = 0;
      sampleTime = now;
    }
    if (now - notifyTime > 100) {
      options.onFrame({
        progress,
        detail: units[0]?.isDetailed() ?? false,
        playing,
        following: follow,
        bearing: controls.getAzimuthalAngle(),
        positions: units.map((u) => u.group.position.toArray()),
        fps,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      });
      notifyTime = now;
    }
  }
  raf = requestAnimationFrame(frame);
  return {
    setSuspended: (value: boolean) => {
      suspended = value;
      sampleTime = performance.now();
      frames = 0;
      if (value) playing = false;
      last = 0;
    },
    setProgress: (p: number) => {
      progress = clampProgress(p);
      playing = false;
    },
    play: (v: boolean) => {
      if (v && progress >= 1) progress = 0;
      playing = v;
    },
    setSpeed: (v: number) => {
      speed = v;
    },
    overview,
    top: () =>
      fly(
        new THREE.Vector3(0, 70 * Math.max(1, 1.2 / camera.aspect), 0.1),
        new THREE.Vector3(0, 1, 0),
      ),
    focusUnit,
    zoom,
    setFollow: (v: boolean) => {
      follow = v;
    },
    setContours: (v: boolean) => {
      terrain.contours.value = v ? 1 : 0;
    },
    setRoutes: (v: boolean) => {
      routeGroup.visible = v;
    },
    setQuality: (v: boolean) => {
      qualityLow = v;
      bloom.enabled = !v;
      renderer.shadowMap.enabled = !v;
      renderer.setPixelRatio(Math.min(devicePixelRatio, v ? 1 : 1.7));
      resize();
    },
    getState: () => ({
      progress,
      playing,
      camera: camera.position.toArray(),
      target: controls.target.toArray(),
      units: units.map((u) => ({
        position: u.group.position.toArray(),
        detailed: u.isDetailed(),
      })),
    }),
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('keydown', key);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      controls.dispose();
      composer.passes.forEach((pass) => pass.dispose());
      composer.dispose();
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) o.dispose();
        if (o instanceof THREE.DirectionalLight) o.shadow.dispose();
        if (
          o instanceof THREE.Mesh ||
          o instanceof THREE.Line ||
          o instanceof THREE.Points
        ) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      labels.replaceChildren();
    },
  };
}
