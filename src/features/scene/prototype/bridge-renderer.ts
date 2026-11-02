import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createBridgeMaterials } from './bridge-materials';
import { createCanyon } from './bridge-landscape';
import { createAtmosphere } from './bridge-atmosphere';
import { bridgeDeckHeight, createMarchingCompany } from './marching-company';

export interface StudyMetrics {
  fps: number;
  p95: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
}
export interface StudyHotspot {
  id: 'bridge' | 'banks';
  x: number;
  y: number;
  visible: boolean;
}
export interface BridgeStudyOptions {
  onReady?: () => void;
  onRendered?: () => void;
  showCompany?: boolean;
  backdropUrl?: string;
  reduced: boolean;
  onFrame: (delta: number) => void;
  onMetrics: (metrics: StudyMetrics) => void;
  onError: (message: string) => void;
  onExplore?: () => void;
  onCameraMode?: (mode: 'guided' | 'free') => void;
  /** Optional normalized anchors; getHotspots() returns host-relative pixels. */
  onAnchors?: (anchors: StudyHotspot[]) => void;
}

/** Entire landscape and bridge are invented local art-space, never surveyed history. */
export function createBridgeStudy(
  host: HTMLElement,
  options: BridgeStudyOptions,
) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  let didRender = false;
  let low = window.innerWidth < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, low ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    'aria-label',
    '峡谷视野。拖动探索，滚轮缩放；方向键环顾，加减键缩放，Home回到远观。',
  );
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#6b8a91');
  scene.fog = new THREE.FogExp2('#6b8a91', 0.0038);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.15, 1600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !options.reduced;
  controls.dampingFactor = 0.07;
  controls.minDistance = 8;
  controls.maxDistance = 245;
  controls.minPolarAngle = 0.18;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.enablePan = false;
  controls.rotateSpeed = 0.34;
  controls.zoomSpeed = 0.55;
  scene.add(new THREE.HemisphereLight('#a6cce3', '#13232a', 1.0));
  const sun = new THREE.DirectionalLight('#ffc47e', 4.2);
  sun.position.set(-95, 90, -160);
  sun.target.position.set(0, 25, -8);
  scene.add(sun.target);
  sun.castShadow = !low;
  sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, {
    left: -85,
    right: 85,
    top: 90,
    bottom: -70,
    near: 1,
    far: 350,
  });
  sun.shadow.normalBias = 0.11;
  sun.shadow.bias = -0.00015;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#8fb8d0', 1.1);
  fill.position.set(10, 75, 100);
  scene.add(fill);
  const bridgeLight = new THREE.SpotLight('#ffd29a', 14000, 230, 0.58, 0.7, 2);
  bridgeLight.position.set(-10, 100, 20);
  bridgeLight.target.position.set(0, 40, -8);
  scene.add(bridgeLight, bridgeLight.target);
  const materials = createBridgeMaterials();
  const { rock, stone, wood, iron } = materials;
  const atmosphere = createAtmosphere();
  scene.add(atmosphere.group);
  let backdrop: THREE.Texture | null = null;
  let released = false;
  if (options.backdropUrl)
    new THREE.TextureLoader().load(
      options.backdropUrl,
      (texture) => {
        if (released) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        backdrop = texture;
        atmosphere.sky.material.uniforms.landscapeSky!.value = texture;
        atmosphere.sky.material.uniforms.landscapeMix!.value = 0.28;
      },
      undefined,
      () => {
        /* The existing procedural sky remains available. */
      },
    );
  const canyon = createCanyon(materials.noise, rock);
  scene.add(canyon.group);
  const company = options.showCompany
    ? createMarchingCompany(bridgeDeckHeight, true)
    : null;
  if (company) scene.add(company.group);
  let followingCompany = false;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(atmosphere.sky.clone());
  const environment = pmrem.fromScene(envScene, 0, 0.1, 1600);
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.3;
  const red = new THREE.MeshStandardMaterial({
    color: '#8f3629',
    roughness: 0.94,
    side: THREE.DoubleSide,
  });
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 2, Math.min(0.14, h * 0.12)),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  for (const side of [-1, 1]) {
    box(12, 27, 11, side * 37, 26, -8, stone);
    box(13, 1, 13, side * 37, 40, -8, stone);
    for (const z of [-11.3, -4.7]) {
      box(1.5, 12, 1.5, side * 32, 46, z, stone);
      box(2, 0.8, 2, side * 32, 52, z, stone);
    }
    box(1.8, 1, 9, side * 32, 51, -8, stone);
  }
  const planks = new THREE.InstancedMesh(
    new RoundedBoxGeometry(0.61, 0.25, 4.3, 2, 0.035),
    wood,
    94,
  );
  planks.castShadow = true;
  planks.receiveShadow = true;
  const plank = new THREE.Object3D();
  for (let i = 0; i < 94; i++) {
    const x = -32 + (i / 93) * 64;
    const sag = 1.8 * (1 - (x / 32) ** 2);
    plank.position.set(x, 41 - sag, -8);
    plank.rotation.set(
      Math.sin(i * 3.1) * 0.009,
      Math.sin(i * 2.7) * 0.007,
      Math.atan((3.6 * x) / 1024),
    );
    plank.updateMatrix();
    planks.setMatrixAt(i, plank.matrix);
    planks.setColorAt(
      i,
      new THREE.Color().setHSL(0.095, 0.12, 0.78 + Math.sin(i * 2.17) * 0.07),
    );
  }
  scene.add(planks);
  const hangerMatrices: THREE.Matrix4[] = [];
  function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number) {
    const object = new THREE.Object3D();
    object.position.copy(a).lerp(b, 0.5);
    object.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    object.scale.set(radius, a.distanceTo(b), radius);
    object.updateMatrix();
    hangerMatrices.push(object.matrix.clone());
  }
  for (const z of [-10.4, -5.6]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const x = i - 32;
      points.push(new THREE.Vector3(x, 43 + (x / 32) ** 2 * 8, z));
      if (i % 4 === 0)
        rod(
          new THREE.Vector3(x, 41 - 1.8 * (1 - (x / 32) ** 2), z),
          points[i]!,
          0.045,
        );
    }
    const cable = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        96,
        0.11,
        6,
        false,
      ),
      iron,
    );
    cable.castShadow = true;
    scene.add(cable);
  }
  const hangers = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 6),
    iron,
    hangerMatrices.length,
  );
  hangerMatrices.forEach((matrix, index) => hangers.setMatrixAt(index, matrix));
  scene.add(hangers);
  for (const z of [-10.1, -5.9]) {
    const points = Array.from({ length: 65 }, (_, i) => {
      const x = i - 32;
      return new THREE.Vector3(x, 40.73 - 1.8 * (1 - (x / 32) ** 2), z);
    });
    const stringer = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        64,
        0.07,
        5,
        false,
      ),
      iron,
    );
    scene.add(stringer);
  }
  // A single subdued ribbon is an artistic accent, never a historical flag claim.
  const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 2.8, 3, 12), red);
  ribbon.position.set(31.1, 49.3, -5.5);
  ribbon.rotation.y = 0.7;
  scene.add(ribbon);

  const fasteners = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.043, 1),
    iron,
    188,
  );
  const bolt = new THREE.Object3D();
  for (let i = 0; i < 94; i++)
    for (let side = 0; side < 2; side++) {
      const x = -32 + (i / 93) * 64;
      bolt.position.set(
        x,
        41.15 - 1.8 * (1 - (x / 32) ** 2),
        -8 + (side ? 1.6 : -1.6),
      );
      bolt.scale.set(1, 0.35, 1);
      bolt.updateMatrix();
      fasteners.setMatrixAt(i * 2 + side, bolt.matrix);
    }
  scene.add(fasteners);
  const chain = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.135, 0.028, 5, 12),
    iron,
    300,
  );
  const link = new THREE.Object3D();
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < 150; i++) {
      const x = -32 + (i / 149) * 64;
      link.position.set(x, 43 + (x / 32) ** 2 * 8, side ? -5.6 : -10.4);
      link.rotation.set(i % 2 ? Math.PI / 2 : 0, 0, Math.atan(x / 64));
      link.scale.set(1.65, 1, 1);
      link.updateMatrix();
      chain.setMatrixAt(side * 150 + i, link.matrix);
    }
  scene.add(chain);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(640, 360),
    0.2,
    0.55,
    1.15,
  );
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  const poses = [
    {
      position: new THREE.Vector3(16, 84, 130),
      target: new THREE.Vector3(-20, 43, -65),
    },
    {
      position: new THREE.Vector3(-24, 44.8, -3),
      target: new THREE.Vector3(13, 42, -8),
    },
    {
      position: new THREE.Vector3(14, 89, 76),
      target: new THREE.Vector3(4, 37, -35),
    },
  ];
  let auto = !options.reduced,
    elapsed = 0,
    visualTime = 0,
    paused = false,
    active = true,
    raf = 0,
    last = 0,
    metricTime = 0,
    anchorTime = 0;
  let samples: number[] = [];
  let width = 1,
    height = 1,
    resizePending = true;
  let transition: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    time: number;
    guided: boolean;
  } | null = null;
  const end = new THREE.Vector3();
  function safety() {
    const nearBridge = camera.position.z > -25 && camera.position.z < 10;
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      nearBridge ? -26 : -19,
      nearBridge ? 26 : 19,
    );
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -150, 220);
    canyon.constrainCamera(camera.position);
    camera.position.y = Math.max(
      nearBridge && Math.abs(camera.position.x) > 19 ? 43 : 12,
      camera.position.y,
    );
    camera.lookAt(controls.target);
  }
  function guidedPose() {
    const section = elapsed < 22 ? 0 : 1;
    const b = THREE.MathUtils.clamp(
      section === 0 ? elapsed / 22 : (elapsed - 22) / 38,
      0,
      1,
    );
    const t = b * b * (3 - 2 * b);
    return {
      position: new THREE.Vector3().lerpVectors(
        poses[section]!.position,
        poses[section + 1]!.position,
        t,
      ),
      target: new THREE.Vector3().lerpVectors(
        poses[section]!.target,
        poses[section + 1]!.target,
        t,
      ),
    };
  }
  function moveTo(
    position: THREE.Vector3,
    target: THREE.Vector3,
    guided = false,
  ) {
    auto = false;
    if (options.reduced) {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      safety();
      transition = null;
      auto = guided;
    } else
      transition = {
        from: camera.position.clone(),
        to: position.clone(),
        fromTarget: controls.target.clone(),
        toTarget: target.clone(),
        time: 0,
        guided,
      };
    options.onCameraMode?.(guided ? 'guided' : 'free');
  }
  function pose(index: number) {
    followingCompany = false;
    const p = poses[index];
    if (!p) return;
    options.onExplore?.();
    moveTo(p.position, p.target);
  }
  camera.position.copy(poses[0]!.position);
  controls.target.copy(poses[0]!.target);
  controls.update();
  options.onCameraMode?.(auto ? 'guided' : 'free');
  function manual() {
    followingCompany = false;
    auto = false;
    transition = null;
    options.onExplore?.();
    options.onCameraMode?.('free');
  }
  controls.addEventListener('start', manual);
  function resize() {
    const rect = host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const w = Math.round(rect.width),
      h = Math.round(rect.height);
    if (w !== width || h !== height) {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resizePending = false;
  }
  const observer = new ResizeObserver(() => {
    resizePending = true;
  });
  observer.observe(host);
  const spots = [
    { id: 'bridge' as const, position: new THREE.Vector3(0, 42, -8) },
    { id: 'banks' as const, position: new THREE.Vector3(31, 48, -28) },
  ];
  function getHotspots(): StudyHotspot[] {
    camera.updateMatrixWorld();
    return spots.map((spot) => {
      const p = spot.position.clone().project(camera);
      const visible =
        p.z > -1 &&
        p.z < 1 &&
        p.x > -0.96 &&
        p.x < 0.96 &&
        p.y > -0.96 &&
        p.y < 0.96;
      return {
        id: spot.id,
        x: (p.x * 0.5 + 0.5) * width,
        y: (-0.5 * p.y + 0.5) * height,
        visible,
      };
    });
  }
  const contextLost = (event: Event) => {
    event.preventDefault();
    active = false;
    cancelAnimationFrame(raf);
    options.onError('画面暂时中断，请重新载入。');
  };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const visibility = () => {
    last = 0;
    samples = [];
    if (!document.hidden && active) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', visibility);
  const keyboard = (event: KeyboardEvent) => {
    if (
      ![
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        '+',
        '-',
        'Home',
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    manual();
    if (event.key === 'Home') {
      pose(0);
      return;
    }
    const spherical = new THREE.Spherical().setFromVector3(
      camera.position.clone().sub(controls.target),
    );
    if (event.key === 'ArrowLeft') spherical.theta -= 0.07;
    if (event.key === 'ArrowRight') spherical.theta += 0.07;
    if (event.key === 'ArrowUp') spherical.phi -= 0.05;
    if (event.key === 'ArrowDown') spherical.phi += 0.05;
    if (event.key === '+') spherical.radius *= 0.9;
    if (event.key === '-') spherical.radius *= 1.1;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.18, Math.PI * 0.495);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, 8, 245);
    camera.position.copy(controls.target).add(end.setFromSpherical(spherical));
    controls.update();
    safety();
  };
  renderer.domElement.addEventListener('keydown', keyboard);
  function frame(now: number) {
    if (!active || document.hidden) return;
    raf = requestAnimationFrame(frame);
    if (last && now - last < 31) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    if (last) samples.push(now - last);
    last = now;
    if (resizePending) resize();
    options.onFrame(dt);
    company?.update(elapsed / 60, !paused && !options.reduced);
    if (company) {
      host.dataset.companyProgress = String(elapsed / 60);
      host.dataset.companyPositions = JSON.stringify(company.positions());
      host.dataset.companyCount = '18';
    }
    if (!paused && !options.reduced) visualTime += dt;
    if (transition) {
      if (transition.guided) {
        const target = guidedPose();
        transition.to.copy(target.position);
        transition.toTarget.copy(target.target);
      }
      transition.time += dt;
      const p = Math.min(1, transition.time / 1.25);
      const t = p * p * (3 - 2 * p);
      camera.position.lerpVectors(transition.from, transition.to, t);
      controls.target.lerpVectors(
        transition.fromTarget,
        transition.toTarget,
        t,
      );
      camera.position.y += Math.sin(p * Math.PI) * 3;
      if (p === 1) {
        auto = transition.guided;
        transition = null;
      }
    } else if (auto && !options.reduced && !paused) {
      const p = guidedPose();
      camera.position.copy(p.position);
      controls.target.copy(p.target);
    }
    if (followingCompany && company && !transition) {
      const destination = company.center();
      camera.position.add(destination.clone().sub(controls.target));
      controls.target.copy(destination);
    }
    atmosphere.update(options.reduced ? 0 : visualTime, camera);
    if (!options.reduced && !paused) {
      const p = ribbon.geometry.attributes.position!;
      for (let i = 0; i < p.count; i++)
        p.setZ(i, Math.sin(p.getY(i) * 2 + visualTime * 1.6) * 0.1);
      p.needsUpdate = true;
    }
    controls.update();
    safety();
    if (now - anchorTime > 66) {
      options.onAnchors?.(
        getHotspots().map((p) => ({ ...p, x: p.x / width, y: p.y / height })),
      );
      anchorTime = now;
    }
    try {
      renderer.info.reset();
      if (low) renderer.render(scene, camera);
      else composer.render(dt);
      if (!didRender) {
        didRender = true;
        options.onReady?.();
      }
      if (!transition) options.onRendered?.();
    } catch {
      active = false;
      cancelAnimationFrame(raf);
      options.onError('画面暂时中断，请重新载入。');
      return;
    }
    if (now - metricTime > 2000 && samples.length > 3) {
      const sorted = [...samples].sort((a, b) => a - b);
      options.onMetrics({
        fps: 1000 / (samples.reduce((a, b) => a + b, 0) / samples.length),
        p95: sorted[Math.floor(sorted.length * 0.95)]!,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      });
      metricTime = now;
      samples = [];
    }
  }
  canyon.setLow(low);
  atmosphere.setLow(low);
  raf = requestAnimationFrame(frame);
  return {
    bookmark() {
      return {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        zoom: camera.zoom,
      };
    },
    restore(value: {
      position: readonly number[];
      target: readonly number[];
      zoom: number;
    }) {
      if (
        value.position.length !== 3 ||
        value.target.length !== 3 ||
        ![...value.position, ...value.target, value.zoom].every(
          Number.isFinite,
        ) ||
        value.zoom <= 0
      )
        return;
      auto = false;
      transition = null;
      followingCompany = false;
      camera.position.fromArray(value.position);
      controls.target.fromArray(value.target);
      camera.zoom = value.zoom;
      camera.updateProjectionMatrix();
      controls.update();
    },
    setTime(value: number) {
      elapsed = THREE.MathUtils.clamp(
        Number.isFinite(value) ? value : 0,
        0,
        60,
      );
    },
    setPaused(value: boolean) {
      paused = value;
    },
    pose,
    focusCompany() {
      if (!company) return;
      const target = company.center();
      moveTo(target.clone().add(new THREE.Vector3(-7, 3.2, 9)), target);
      followingCompany = true;
    },
    getHotspots,
    focusSpot(id: 'bridge' | 'banks') {
      pose(id === 'bridge' ? 1 : 2);
    },
    focus(id: 'bridge' | 'banks') {
      pose(id === 'bridge' ? 1 : 2);
    },
    resumeCamera() {
      const p = guidedPose();
      moveTo(p.position, p.target, !options.reduced);
    },
    quality(value: boolean) {
      low = value;
      renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio, 1.5));
      composer.setPixelRatio(renderer.getPixelRatio());
      renderer.shadowMap.enabled = !low;
      sun.castShadow = !low;
      canyon.setLow(low);
      atmosphere.setLow(low);
      resizePending = true;
    },
    dispose() {
      released = true;
      backdrop?.dispose();
      active = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.removeEventListener('start', manual);
      controls.dispose();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('keydown', keyboard);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set<THREE.BufferGeometry>(),
        mats = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          for (const m of Array.isArray(object.material)
            ? object.material
            : [object.material])
            mats.add(m);
        }
      });
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      materials.dispose();
      environment.dispose();
      sun.shadow.dispose();
      bloom.dispose();
      output.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
