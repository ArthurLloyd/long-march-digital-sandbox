import type * as THREE from 'three';

/** Opt-in, read-only measurements from the real renderer; never drives state. */
export function createTerrainDiagnostics(canvas: HTMLCanvasElement) {
  const enabled = new URLSearchParams(window.location.search).has(
    'terrainMetrics',
  );
  let previous = 0,
    published = 0;
  const frames: number[] = [];
  return (
    now: number,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    target: THREE.Vector3,
    terrain: () => Record<string, unknown> = () => ({}),
  ) => {
    if (!enabled) return;
    if (previous && now - previous < 1000) frames.push(now - previous);
    previous = now;
    if (now - published < 1000) return;
    published = now;
    const sorted = frames.slice(-180).sort((a, b) => a - b);
    const distance = camera.position.distanceTo(target);
    canvas.dataset.terrainDiagnostics = JSON.stringify({
      time: now,
      position: camera.position.toArray(),
      target: target.toArray(),
      distance,
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
      targetPlaneWidth:
        2 * distance * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect,
      frameMedianMs: sorted[Math.floor(sorted.length * 0.5)] ?? null,
      frameP95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? null,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      viewport: [canvas.clientWidth, canvas.clientHeight],
      visibility: document.visibilityState,
      userAgent: navigator.userAgent,
      ...terrain(),
    });
    if (frames.length > 180) frames.splice(0, frames.length - 180);
  };
}
