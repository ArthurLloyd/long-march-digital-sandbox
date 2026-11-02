import * as THREE from 'three';

/** Demand-rendered panorama. It never drives the historical clock or map. */
export function createPanorama(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor('#13282d');
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    '全景画面，拖动环顾；方向键转动，加减键缩放，Home 复位',
  );
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 10);
  camera.rotation.order = 'YXZ';
  const geometry = new THREE.SphereGeometry(3, 96, 64);
  geometry.scale(-1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.visible = false;
  scene.add(sphere);
  let yaw = Math.PI / 2,
    pitch = 0,
    frame = 0,
    epoch = 0,
    disposed = false;
  const pointers = new Map<number, { x: number; y: number }>();
  const signal = new AbortController();
  function render() {
    frame = 0;
    if (disposed) return;
    camera.rotation.set(pitch, yaw, 0);
    renderer.render(scene, camera);
    host.dataset.yaw = yaw.toFixed(4);
    host.dataset.pitch = pitch.toFixed(4);
    host.dataset.fov = String(camera.fov);
  }
  function invalidate() {
    if (!frame && !disposed) frame = requestAnimationFrame(render);
  }
  function zoom(delta: number) {
    camera.fov = THREE.MathUtils.clamp(camera.fov + delta, 42, 86);
    camera.updateProjectionMatrix();
    invalidate();
  }
  function home() {
    yaw = Math.PI / 2;
    pitch = 0;
    camera.fov = 68;
    zoom(0);
  }
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || disposed) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    invalidate();
  });
  resize.observe(host);
  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      canvas.focus({ preventScroll: true });
    },
    { signal: signal.signal },
  );
  canvas.addEventListener(
    'pointermove',
    (e) => {
      const previous = pointers.get(e.pointerId);
      if (!previous) return;
      const others = [...pointers.entries()].filter(
        ([id]) => id !== e.pointerId,
      );
      if (others.length) {
        const other = others[0]![1];
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        zoom((before - after) * 0.08);
      } else {
        yaw += ((e.clientX - previous.x) * 0.003 * camera.fov) / 68;
        pitch = THREE.MathUtils.clamp(
          pitch + (e.clientY - previous.y) * 0.003,
          -1.35,
          1.35,
        );
        invalidate();
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    },
    { signal: signal.signal },
  );
  for (const event of [
    'pointerup',
    'pointercancel',
    'lostpointercapture',
  ] as const)
    canvas.addEventListener(event, (e) => pointers.delete(e.pointerId), {
      signal: signal.signal,
    });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoom(e.deltaY * 0.035);
    },
    { passive: false, signal: signal.signal },
  );
  canvas.addEventListener(
    'keydown',
    (e) => {
      if (
        ![
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          '+',
          '=',
          '-',
          'Home',
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') yaw += 0.08;
      if (e.key === 'ArrowRight') yaw -= 0.08;
      if (e.key === 'ArrowUp') pitch = Math.min(1.35, pitch + 0.06);
      if (e.key === 'ArrowDown') pitch = Math.max(-1.35, pitch - 0.06);
      if (e.key === '+' || e.key === '=') zoom(-4);
      if (e.key === '-') zoom(4);
      if (e.key === 'Home') home();
      invalidate();
    },
    { signal: signal.signal },
  );
  return {
    async load(url: string) {
      const ticket = ++epoch;
      host.dataset.loaded = 'false';
      const texture = await new THREE.TextureLoader().loadAsync(url);
      if (disposed || ticket !== epoch) {
        texture.dispose();
        return false;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(
        4,
        renderer.capabilities.getMaxAnisotropy(),
      );
      material.map?.dispose();
      material.map = texture;
      material.needsUpdate = true;
      sphere.visible = true;
      home();
      host.dataset.loaded = 'true';
      return true;
    },
    zoom,
    home,
    seam() {
      yaw = -Math.PI / 2;
      pitch = 0;
      invalidate();
    },
    focus() {
      canvas.focus({ preventScroll: true });
    },
    dispose() {
      disposed = true;
      epoch++;
      cancelAnimationFrame(frame);
      signal.abort();
      resize.disconnect();
      pointers.clear();
      material.map?.dispose();
      material.dispose();
      geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
