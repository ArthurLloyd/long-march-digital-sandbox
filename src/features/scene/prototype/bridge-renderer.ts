import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface StudyMetrics {
  fps: number;
  p95: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
}
export interface BridgeStudyOptions {
  reduced: boolean;
  onFrame: (delta: number) => void;
  onMetrics: (metrics: StudyMetrics) => void;
  onError: (message: string) => void;
}

/** Every dimension is invented local art-space, never a surveyed historical place. */
export function createBridgeStudy(
  host: HTMLElement,
  options: BridgeStudyOptions,
) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute(
    'aria-label',
    '非地理艺术河谷，可拖动环顾，使用预设视角按钮也能观察',
  );
  renderer.domElement.tabIndex = 0;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#829492');
  scene.fog = new THREE.FogExp2('#829492', 0.0054);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(800, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {},
      vertexShader:
        'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 vDirection;
        void main(){vec3 d=normalize(vDirection);float h=smoothstep(-.08,.55,d.y);
        vec3 color=mix(vec3(.60,.64,.59),vec3(.14,.25,.31),h);
        float warmth=pow(max(0.,dot(d,normalize(vec3(-.24,.22,-1.)))),26.);
        color+=vec3(.30,.16,.04)*warmth;gl_FragColor=vec4(color,1.);}`,
    }),
  );
  scene.add(sky);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.2, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !options.reduced;
  controls.dampingFactor = 0.07;
  controls.minDistance = 22;
  controls.minAzimuthAngle = -0.35;
  controls.maxAzimuthAngle = 0.35;
  controls.maxDistance = 180;
  controls.maxPolarAngle = Math.PI * 0.43;
  controls.minPolarAngle = 0.3;
  controls.enablePan = false;
  controls.rotateSpeed = 0.35;
  controls.zoomSpeed = 0.55;
  scene.add(new THREE.HemisphereLight('#c1d2d3', '#232a25', 1.8));
  const sun = new THREE.DirectionalLight('#ffd29a', 6.2);
  sun.position.set(-95, 150, -160);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -70,
    right: 70,
    top: 70,
    bottom: -70,
    near: 1,
    far: 360,
  });
  sun.shadow.normalBias = 0.2;
  scene.add(sun);
  scene.add(new THREE.AmbientLight('#9aaca9', 0.25));
  const bridgeFill = new THREE.DirectionalLight('#c3dce1', 1.1);
  bridgeFill.position.set(25, 65, 100);
  scene.add(bridgeFill);

  // A small deterministic noise texture supplies stone grain; it is original procedural material.
  const grainData = new Uint8Array(128 * 128 * 4);
  let randomState = 71237;
  for (let i = 0; i < 128 * 128; i++) {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    const value = 110 + (randomState % 95);
    grainData.set([value, value, value, 255], i * 4);
  }
  const grain = new THREE.DataTexture(grainData, 128, 128, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(9, 16);
  grain.needsUpdate = true;

  const rock = new THREE.MeshStandardMaterial({
    color: '#84918a',
    roughness: 0.97,
    metalness: 0.02,
    flatShading: false,
    bumpMap: grain,
    bumpScale: 0.2,
    vertexColors: true,
  });
  const stone = new THREE.MeshStandardMaterial({
    color: '#949084',
    roughness: 0.95,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: '#aa8356',
    roughness: 0.89,
  });
  const iron = new THREE.MeshStandardMaterial({
    color: '#4f534c',
    roughness: 0.68,
    metalness: 0.65,
  });
  const red = new THREE.MeshStandardMaterial({
    color: '#82392d',
    roughness: 0.9,
    side: THREE.DoubleSide,
  });

  function massif(
    side: number,
    offset: number,
    height: number,
    depth: number,
    shade: number,
  ) {
    const geometry = new THREE.PlaneGeometry(160, depth, 68, 150);
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position!;
    const colors: number[] = [];
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const z = vertices.getZ(i) + offset;
      const edge = (x + 80) / 160;
      const bend = Math.sin(z * 0.012) * 3.5 + Math.sin(z * 0.031) * 1.2;
      const worldX = side * (21 + edge * 160 + bend);
      const cliff = 24 * (1 - Math.exp(-edge * 27));
      const ridge = Math.pow(edge, 1.17) * height;
      const fold =
        Math.sin(z * 0.025 + edge * 7 + side) * 13 +
        Math.sin(z * 0.064 - edge * 13) * 4.5 +
        Math.cos(z * 0.13 + edge * 21) * 1.6;
      let y = 7 + cliff + ridge + fold * Math.min(1, edge * 3.5);
      // A cut terrace visibly receives both bridge abutments, instead of swallowing their towers.
      const terrace =
        Math.exp(-Math.pow((z + 8) / 14, 4)) *
        Math.exp(-Math.pow((Math.abs(worldX) - 40) / 15, 4));
      y = THREE.MathUtils.lerp(y, 39.6, terrace);
      vertices.setXYZ(i, worldX, y, z);
      const stratum = Math.sin(y * 0.33 + Math.sin(z * 0.022) * 2) * 0.025;
      const v =
        shade *
        (0.62 + edge * 0.14 + stratum + Math.sin(z * 0.07 + edge * 29) * 0.025);
      colors.push(v * 0.91, v, v * 0.96);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    if (side < 0 && geometry.index) {
      const indices = geometry.index;
      for (let i = 0; i < indices.count; i += 3) {
        const b = indices.getX(i + 1);
        indices.setX(i + 1, indices.getX(i + 2));
        indices.setX(i + 2, b);
      }
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, rock);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  massif(-1, -190, 100, 780, 1);
  massif(1, -190, 125, 780, 0.91);

  // Continuous irregular ridgelines, deliberately without recognizable geographic coordinates.
  for (let layer = 0; layer < 3; layer++) {
    const geometry = new THREE.PlaneGeometry(780, 160, 140, 1);
    const vertices = geometry.attributes.position!;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i);
      const upper = vertices.getY(i) > 0;
      const crest =
        76 +
        layer * 18 +
        Math.sin(x * 0.009 + layer * 1.7) * 30 +
        Math.sin(x * 0.023 - layer) * 14 +
        Math.sin(x * 0.047 + 0.8) * 5;
      vertices.setXYZ(i, x, upper ? crest : -35, -500 - layer * 85);
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshBasicMaterial({
      color: ['#59716f', '#6c807c', '#82938b'][layer],
      side: THREE.DoubleSide,
    });
    scene.add(new THREE.Mesh(geometry, material));
  }

  const riverMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying float vDepth; uniform float time;
      void main(){vUv=uv; vec3 p=position; p.z+=sin(p.y*.16+time)*.09+cos(p.x*.45+time)*.05;
      vec4 view=modelViewMatrix*vec4(p,1.);vDepth=-view.z;gl_Position=projectionMatrix*view;}`,
    fragmentShader: `varying vec2 vUv; varying float vDepth; uniform float time;
      void main(){float r=sin(vUv.x*150.+sin(vUv.y*110.+time*.5)*3.);
      float w=sin(vUv.y*1800.-time*4.+sin(vUv.x*25.)*5.);float fleck=pow(max(0.,r*w),16.);
      float reflection=exp(-pow((vUv.x-.34)*9.,2.))*.17;
      vec3 c=mix(vec3(.12,.26,.27),vec3(.46,.60,.55),fleck*.28+reflection);
      c+=vec3(.19,.12,.045)*reflection;float fog=1.-exp(-.0054*.0054*vDepth*vDepth);
      gl_FragColor=vec4(mix(c,vec3(.51,.58,.57),clamp(fog,0.,1.)),1.);}`,
  });
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(65, 1500, 24, 180),
    riverMaterial,
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 7, -500);
  scene.add(river);

  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
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
    new THREE.BoxGeometry(0.58, 0.28, 4.3),
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
    plank.rotation.z = Math.atan((3.6 * x) / 1024);
    plank.updateMatrix();
    planks.setMatrixAt(i, plank.matrix);
    planks.setColorAt(
      i,
      new THREE.Color().setHSL(0.095, 0.23, 0.65 + Math.sin(i * 2.17) * 0.08),
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

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(270, 270),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader:
        'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:
        'varying vec2 vUv; void main(){float d=distance(vUv,vec2(.5));float a=exp(-d*d*24.)*.38;gl_FragColor=vec4(.96,.68,.34,a);}',
    }),
  );
  halo.position.set(-58, 150, -350);
  scene.add(halo);

  const poses = [
    {
      position: new THREE.Vector3(8, 70, 115),
      target: new THREE.Vector3(-8, 33, -45),
    },
    {
      position: new THREE.Vector3(6, 54, 38),
      target: new THREE.Vector3(0, 43, -8),
    },
    {
      position: new THREE.Vector3(-4, 85, 105),
      target: new THREE.Vector3(4, 35, -50),
    },
  ];
  let auto = true,
    elapsed = 0,
    active = true,
    raf = 0,
    last = 0,
    metricTime = 0;
  let samples: number[] = [];
  const end = new THREE.Vector3();
  function pose(index: number) {
    const p = poses[index]!;
    camera.position.copy(p.position);
    controls.target.copy(p.target);
    controls.update();
    auto = false;
  }
  pose(0);
  auto = !options.reduced;
  const manual = () => {
    auto = false;
  };
  controls.addEventListener('start', manual);
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const contextLost = (event: Event) => {
    event.preventDefault();
    active = false;
    cancelAnimationFrame(raf);
    options.onError('三维上下文中断。请重新载入小样；本次未记录完成状态。');
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
    auto = false;
    if (event.key === 'Home') {
      pose(0);
      return;
    }
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') spherical.theta -= 0.08;
    if (event.key === 'ArrowRight') spherical.theta += 0.08;
    if (event.key === 'ArrowUp') spherical.phi -= 0.06;
    if (event.key === 'ArrowDown') spherical.phi += 0.06;
    if (event.key === '+') spherical.radius *= 0.9;
    if (event.key === '-') spherical.radius *= 1.1;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.3, Math.PI * 0.43);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, 22, 180);
    camera.position.copy(controls.target).add(end.setFromSpherical(spherical));
    controls.update();
  };
  renderer.domElement.addEventListener('keydown', keyboard);
  function frame(now: number) {
    if (!active || document.hidden) return;
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    if (last && now - last < 31) return;
    if (last) samples.push(now - last);
    last = now;
    options.onFrame(dt);
    if (auto && !options.reduced) {
      const section = elapsed < 22 ? 0 : 1;
      const blend =
        section === 0 ? elapsed / 22 : Math.min(1, (elapsed - 22) / 38);
      const ease = blend * blend * (3 - 2 * blend);
      camera.position.lerpVectors(
        poses[section]!.position,
        poses[section + 1]!.position,
        ease,
      );
      controls.target.lerpVectors(
        poses[section]!.target,
        poses[section + 1]!.target,
        ease,
      );
    }
    riverMaterial.uniforms.time!.value = options.reduced ? 0 : elapsed;
    halo.quaternion.copy(camera.quaternion);
    controls.update();
    // Viewpoint movement stays inside the open river corridor; no preset or orbit can enter a cliff.
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -17, 17);
    camera.position.z = Math.max(16, camera.position.z);
    camera.position.y = Math.max(27, camera.position.y);
    camera.lookAt(controls.target);
    try {
      renderer.render(scene, camera);
    } catch {
      active = false;
      cancelAnimationFrame(raf);
      options.onError('渲染中断，请重载小样后重试。');
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
  raf = requestAnimationFrame(frame);
  return {
    setTime(value: number) {
      elapsed = value;
    },
    pose,
    resumeCamera() {
      auto = !options.reduced;
    },
    quality(low: boolean) {
      renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = !low;
      sun.castShadow = !low;
      resize();
    },
    dispose() {
      active = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.removeEventListener('start', manual);
      controls.dispose();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('keydown', keyboard);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh) object.dispose();
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(material);
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      grain.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
