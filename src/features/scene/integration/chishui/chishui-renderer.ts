import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CHISHUI_CHAPTERS,
  DIAGRAM_PLACES,
  riverX,
  sampleChishui,
} from './chishui-story';

export type ChishuiCamera = 'guided' | 'overview' | 'free';
export interface ChishuiRenderer {
  update(time: number): void;
  camera(mode: ChishuiCamera): void;
  reset(): void;
  dispose(): void;
}
interface Options {
  reduced: boolean;
  onExplore(): void;
  onError(): void;
}
/** Self-contained artistic diagram. No historical or modern coordinate inputs. */
export function createChishuiRenderer(
  host: HTMLElement,
  options: Options,
): ChishuiRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    '四渡赤水三维示意沙盘，拖动旋转、滚轮缩放；镜头按钮可恢复导览',
  );
  host.append(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#101f24');
  scene.fog = new THREE.FogExp2('#101f24', 0.0025);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 700);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !options.reduced;
  controls.dampingFactor = 0.065;
  controls.minDistance = 35;
  controls.maxDistance = 210;
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.minPolarAngle = 0.17;
  controls.enablePan = false;
  let mode: ChishuiCamera = 'guided';
  const explore = () => {
    mode = 'free';
    options.onExplore();
  };
  controls.addEventListener('start', explore);
  scene.add(new THREE.HemisphereLight('#edf4e5', '#203b39', 2.3));
  const sun = new THREE.DirectionalLight('#ffe1ad', 3.2);
  sun.position.set(-55, 85, -28);
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#76c4d0', 1.4);
  rim.position.set(50, 25, 35);
  scene.add(rim);
  const root = new THREE.Group();
  scene.add(root);
  const material = (color: string, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...extra });
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(124, 4, 94),
    material('#182f30'),
  );
  pedestal.position.y = -3;
  root.add(pedestal);
  const trim = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(124.2, 4.2, 94.2)),
    new THREE.LineBasicMaterial({
      color: '#9c885c',
      transparent: true,
      opacity: 0.6,
    }),
  );
  trim.position.y = -3;
  root.add(trim);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    material('#101f24'),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -5.2;
  scene.add(ground);

  function height(x: number, z: number) {
    const d = Math.abs(x - riverX(z));
    const ridge =
      4 +
      3 * Math.sin(x * 0.125 + z * 0.08) ** 2 +
      2 * Math.cos(z * 0.22 - x * 0.08) ** 2;
    return (
      -0.35 +
      (1 - Math.exp(-Math.max(0, d - 2.3) * 0.15)) * ridge +
      Math.sin(x * 0.6 + z * 0.3) * Math.min(d * 0.025, 0.35)
    );
  }
  const nx = 150,
    nz = 112;
  const terrain = new THREE.PlaneGeometry(120, 90, nx, nz);
  terrain.rotateX(-Math.PI / 2);
  const positions = terrain.attributes.position!;
  const colors = new Float32Array(positions.count * 3);
  const low = new THREE.Color('#355452'),
    high = new THREE.Color('#899584');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i),
      y = height(x, z);
    positions.setY(i, y);
    const color = low.clone().lerp(high, Math.max(0, Math.min(1, y / 10)));
    color.multiplyScalar(0.92 + Math.sin(x * 1.5 + z * 1.2) * 0.06);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  root.add(
    new THREE.Mesh(
      terrain,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        flatShading: true,
      }),
    ),
  );
  // Relief contour strokes, derived only from the invented exhibit surface.
  const contourPoints: number[] = [];
  const dx = 120 / nx,
    dz = 90 / nz;
  for (let ix = 0; ix < nx; ix += 2)
    for (let iz = 0; iz < nz; iz += 2) {
      const x = -60 + ix * dx,
        z = -45 + iz * dz;
      const corners = [
        [x, z],
        [x + dx * 2, z],
        [x + dx * 2, z + dz * 2],
        [x, z + dz * 2],
      ];
      for (let level = 1; level <= 10; level += 1.1) {
        const hits: number[][] = [];
        for (let e = 0; e < 4; e++) {
          const a = corners[e]!,
            b = corners[(e + 1) % 4]!;
          const ha = height(a[0]!, a[1]!),
            hb = height(b[0]!, b[1]!);
          if (ha < level === hb < level) continue;
          const f = (level - ha) / (hb - ha);
          hits.push([
            THREE.MathUtils.lerp(a[0]!, b[0]!, f),
            level + 0.035,
            THREE.MathUtils.lerp(a[1]!, b[1]!, f),
          ]);
        }
        for (let j = 0; j + 1 < hits.length; j += 2)
          contourPoints.push(...hits[j]!, ...hits[j + 1]!);
      }
    }
  const contourGeo = new THREE.BufferGeometry();
  contourGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(contourPoints, 3),
  );
  root.add(
    new THREE.LineSegments(
      contourGeo,
      new THREE.LineBasicMaterial({
        color: '#c6c7a2',
        transparent: true,
        opacity: 0.15,
      }),
    ),
  );
  // Original river ribbon. The animated streaks are visual water cues, not flow data.
  const riverPositions: number[] = [],
    riverIndices: number[] = [];
  for (let i = 0; i <= 240; i++) {
    const z = -45 + (i / 240) * 90,
      x = riverX(z);
    riverPositions.push(x - 2.3, 0.05, z, x + 2.3, 0.05, z);
    if (i < 240) {
      const k = i * 2;
      riverIndices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const riverGeometry = new THREE.BufferGeometry();
  riverGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(riverPositions, 3),
  );
  riverGeometry.setIndex(riverIndices);
  riverGeometry.computeVertexNormals();
  root.add(
    new THREE.Mesh(
      riverGeometry,
      material('#55a1a3', {
        metalness: 0.38,
        roughness: 0.28,
        side: THREE.DoubleSide,
      }),
    ),
  );
  const waterPoints = new Float32Array(60 * 3);
  const waterGeo = new THREE.BufferGeometry();
  waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPoints, 3));
  const water = new THREE.Points(
    waterGeo,
    new THREE.PointsMaterial({
      color: '#c6f4ee',
      size: 0.23,
      transparent: true,
      opacity: 0.7,
    }),
  );
  root.add(water);

  function label(
    text: string,
    x: number,
    y: number,
    z: number,
    color = '#e9dfc3',
    scale = 1,
  ) {
    const surface = document.createElement('canvas');
    surface.width = 640;
    surface.height = 104;
    const ctx = surface.getContext('2d')!;
    const paint = () => {
      ctx.clearRect(0, 0, 640, 104);
      ctx.fillStyle = 'rgba(12,28,30,.88)';
      ctx.fillRect(0, 4, 640, 96);
      ctx.strokeStyle = 'rgba(214,190,137,.4)';
      ctx.strokeRect(1, 5, 638, 94);
      ctx.font = '500 56px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 320, 52);
    };
    paint();
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Canvas does not automatically load unicode-range web fonts like DOM text.
    // Redraw labels once the exact Chinese glyph subset is available.
    void document.fonts
      ?.load('500 56px "Noto Sans SC"', text)
      .then(() => {
        if (disposed) return;
        paint();
        texture.needsUpdate = true;
        dirty = true;
      })
      .catch(() => {
        /* The system-font label remains available. */
      });
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
        transparent: true,
      }),
    );
    sprite.scale.set(19 * scale, 3.09 * scale, 1);
    sprite.position.set(x, y, z);
    sprite.renderOrder = 5;
    root.add(sprite);
    return sprite;
  }
  for (const p of DIAGRAM_PLACES) {
    label(p.name, p.x, height(p.x, p.z) + 4, p.z);
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12),
      material('#dac294'),
    );
    marker.position.set(p.x, height(p.x, p.z) + 0.4, p.z);
    root.add(marker);
  }
  label('赤 水 河', -1, 1.9, 4, '#aee1de', 0.85);
  const bankLabel = label('川南侧', -43, 8, -35, '#a6b6b0', 0.8);
  bankLabel.material.opacity = 0.65;
  label('黔北侧', 42, 8, -35, '#a6b6b0', 0.8).material.opacity = 0.65;

  const red = new THREE.MeshBasicMaterial({ color: '#ff7053' });
  const gold = new THREE.MeshBasicMaterial({ color: '#ffe2a0' });
  const blue = new THREE.MeshBasicMaterial({
    color: '#79bbdd',
    transparent: true,
    opacity: 0.7,
  });
  const curves = CHISHUI_CHAPTERS.map((ch) => {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    ch.path.forEach((p, i) => {
      if (!i) return;
      const a = ch.path[i - 1]!;
      for (let step = 0; step < 30; step++) {
        const point = (t: number) => {
          const x = THREE.MathUtils.lerp(a[0], p[0], t),
            z = THREE.MathUtils.lerp(a[1], p[1], t);
          return new THREE.Vector3(x, height(x, z) + 1.2, z);
        };
        curve.add(
          new THREE.LineCurve3(point(step / 30), point((step + 1) / 30)),
        );
      }
    });
    return curve;
  });
  const lines = curves.map((curve) => {
    const geometry = new THREE.TubeGeometry(curve, 200, 0.27, 5, false);
    const mesh = new THREE.Mesh(geometry, red.clone());
    root.add(mesh);
    return mesh;
  });
  const soldiers: THREE.Group[] = [];
  // Abstract unit tokens, not scaled troop counts or historical uniforms.
  for (let i = 0; i < 20; i++) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.3, 0.75, 6),
      material('#bd4f3d'),
    );
    body.position.y = 0.55;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 5),
      material('#d4c7aa'),
    );
    head.position.y = 1.05;
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.12, 0.42),
      material('#f9c67d'),
    );
    foot.position.y = 0.08;
    group.add(body, head, foot);
    root.add(group);
    soldiers.push(group);
  }
  const flag = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 5, 8),
    material('#c5ad7f'),
  );
  pole.position.y = 2.5;
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2),
    new THREE.MeshBasicMaterial({ color: '#d94c37', side: THREE.DoubleSide }),
  );
  cloth.position.set(1.7, 4.1, 0);
  flag.add(pole, cloth);
  root.add(flag);
  const halo = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.55, 48), gold);
  halo.rotation.x = -Math.PI / 2;
  root.add(halo);
  const crossingRing = new THREE.Mesh(
    new THREE.RingGeometry(2.8, 3.05, 48),
    gold,
  );
  crossingRing.rotation.x = -Math.PI / 2;
  root.add(crossingRing);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(1, 2.5, 3), gold);
  root.add(tip);
  const pressure = new THREE.Group();
  root.add(pressure);
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 3.5), blue);
    bar.position.z = 1;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.5, 3), blue);
    arrow.rotation.x = Math.PI / 2;
    arrow.position.z = 4;
    g.add(bar, arrow);
    pressure.add(g);
  }
  const flashes = new THREE.Group();
  root.add(flashes);
  for (let i = 0; i < 8; i++) {
    const flash = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.7, 12),
      new THREE.MeshBasicMaterial({
        color: '#ffd498',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    );
    flash.rotation.x = -Math.PI / 2;
    flashes.add(flash);
  }
  let dirty = true;
  const markDirty = () => {
    dirty = true;
  };
  controls.addEventListener('change', markDirty);
  let time = 0,
    last = performance.now(),
    raf = 0,
    disposed = false;
  const targetCamera = new THREE.Vector3(),
    targetLook = new THREE.Vector3(),
    v = new THREE.Vector3();
  function pose(snap = false, delta = 1 / 30) {
    const s = sampleChishui(time),
      p = curves[s.chapter]!.getPoint(Math.max(0.04, s.progress));
    const narrow = host.clientWidth < 850;
    if (mode === 'overview') {
      targetLook.set(0, 1, 0);
      targetCamera.set(
        narrow ? 45 : 38,
        narrow ? 155 : 125,
        narrow ? 135 : 106,
      );
    } else if (mode === 'guided') {
      targetLook.copy(p).multiplyScalar(0.32);
      targetLook.y = 1;
      // Chapter-specific side changes make the repeated crossings legible.
      const side = s.chapter % 2 === 0 ? 1 : -1;
      targetCamera.set(
        targetLook.x + side * (narrow ? 65 : 58),
        narrow ? 128 : 94,
        targetLook.z + 90,
      );
    }
    if (mode !== 'free') {
      const blend = snap || options.reduced ? 1 : 1 - Math.exp(-5 * delta);
      camera.position.lerp(targetCamera, blend);
      controls.target.lerp(targetLook, blend);
    }
  }
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    dirty = true;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  pose(true);
  controls.update();
  let contextUnavailable = false;
  const contextLost = (e: Event) => {
    e.preventDefault();
    contextUnavailable = true;
    cancelAnimationFrame(raf);
    options.onError();
  };
  canvas.addEventListener('webglcontextlost', contextLost);
  function frame(now: number) {
    if (disposed || contextUnavailable) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    if (now - last < 33) return;
    const delta = Math.min(0.5, (now - last) / 1000);
    last = now;
    const s = sampleChishui(time),
      curve = curves[s.chapter]!;
    lines.forEach((line, i) => {
      line.visible = i <= s.chapter;
      line.material.transparent = true;
      line.material.opacity = i === s.chapter ? 1 : 0.22;
      line.geometry.setDrawRange(
        0,
        Math.floor((i < s.chapter ? 1 : s.progress) * 200) * 5 * 6,
      );
    });
    const p = curve.getPoint(s.progress);
    flag.position.copy(p);
    flag.rotation.y = -0.3;
    halo.position.copy(p);
    halo.position.y += 0.1;
    const crossing = CHISHUI_CHAPTERS[s.chapter]!.crossing;
    crossingRing.position.set(crossing[0], 1.3, crossing[1]);
    crossingRing.scale.setScalar(1 + Math.sin(time * 3) * 0.12);
    const tangent = curve.getTangent(Math.min(0.999, s.progress));
    tip.position.copy(p);
    tip.position.y += 1.4;
    tip.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      tangent.normalize(),
    );
    soldiers.forEach((unit, i) => {
      const t = s.progress - i * 0.009;
      unit.visible = t >= 0;
      if (t < 0) return;
      const point = curve.getPoint(Math.min(1, t));
      unit.position.copy(point);
      unit.position.x += (i % 2 ? 1 : -1) * 0.5;
      unit.position.y += Math.sin(time * 7 + i) * 0.08;
    });
    pressure.children.forEach((unit, i) => {
      const side = s.chapter % 2 === 0 ? 1 : -1;
      unit.position.set(side * (48 - s.progress * 7), 9, -31 + i * 10);
      unit.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      unit.scale.setScalar(0.75);
    });
    flashes.children.forEach((obj, i) => {
      const mesh = obj as THREE.Mesh<
        THREE.RingGeometry,
        THREE.MeshBasicMaterial
      >;
      // Schematic battle emphasis, never specific casualties or weapon simulation.
      const phase = (time * 0.65 + i * 0.17) % 1;
      const battle =
        (s.chapter === 0 || s.chapter === 1) &&
        s.progress > 0.18 &&
        s.progress < 0.85;
      mesh.material.opacity =
        battle && !options.reduced ? (1 - phase) * 0.45 : 0;
      mesh.position.copy(p);
      mesh.position.x += Math.sin(i * 3.1) * 4;
      mesh.position.z += Math.cos(i * 2.3) * 3;
      mesh.position.y += 0.25;
      mesh.scale.setScalar(0.5 + phase * 4);
    });
    for (let i = 0; i < 60; i++) {
      const z = -44 + ((i * 1.5 + time * 0.9) % 88);
      v.set(riverX(z) + Math.sin(i * 2.3) * 1.3, 0.17, z);
      waterPoints.set([v.x, v.y, v.z], i * 3);
    }
    waterGeo.attributes.position!.needsUpdate = true;
    pose(false, delta);
    controls.update();
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
  }
  raf = requestAnimationFrame(frame);
  return {
    update(value) {
      const next = sampleChishui(value).time;
      if (next !== time) dirty = true;
      time = next;
    },
    camera(value) {
      dirty = true;
      mode = value;
      pose(options.reduced);
    },
    reset() {
      dirty = true;
      mode = 'guided';
      pose(true);
      controls.update();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.removeEventListener('start', explore);
      controls.removeEventListener('change', markDirty);
      controls.dispose();
      canvas.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        const m = mesh.material;
        if (m) for (const mat of Array.isArray(m) ? m : [m]) materials.add(mat);
      });
      for (const mat of materials)
        for (const value of Object.values(mat))
          if (value instanceof THREE.Texture) textures.add(value);
      geometries.forEach((g) => g.dispose());
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
