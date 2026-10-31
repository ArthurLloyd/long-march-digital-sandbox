import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createSceneRenderer } from './scene-renderer';

const gpu = vi.hoisted(() => ({
  render: vi.fn(),
  dispose: vi.fn(),
  forceContextLoss: vi.fn(),
}));
vi.mock('three', async (importOriginal) => ({
  ...(await importOriginal<typeof import('three')>()),
  WebGLRenderer: class {
    render = gpu.render;
    dispose = gpu.dispose;
    forceContextLoss = gpu.forceContextLoss;
    renderLists = { dispose: vi.fn() };
    setClearColor() {}
    setPixelRatio() {}
    setSize() {}
  },
}));

let frames: FrameRequestCallback[];
let host: HTMLDivElement;
const callbacks = () => ({
  ready: vi.fn(),
  error: vi.fn(),
  select: vi.fn(),
  quality: vi.fn(),
});
beforeEach(() => {
  frames = [];
  gpu.render.mockReset();
  gpu.dispose.mockClear();
  gpu.forceContextLoss.mockClear();
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    {} as WebGL2RenderingContext,
  );
  host = document.createElement('div');
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    width: 960,
    height: 600,
    left: 0,
    top: 0,
    bottom: 600,
    right: 960,
    toJSON: () => ({}),
  });
  document.body.appendChild(host);
});
afterEach(() => {
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('renderer lifecycle', () => {
  it('reports unavailable WebGL without leaving a canvas behind', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    const handlers = callbacks();
    expect(createSceneRenderer(host, handlers)).toBeNull();
    expect(handlers.error).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'webgl_unavailable' }),
    );
    expect(host.querySelector('canvas')).toBeNull();
    expect(handlers.ready).not.toHaveBeenCalled();
  });
  it('reports ready only after the first rendered frame and releases GPU objects on unmount', () => {
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose');
    const handlers = callbacks();
    const engine = createSceneRenderer(host, handlers)!;
    expect(handlers.ready).not.toHaveBeenCalled();
    frames.shift()!(100);
    frames.shift()!(150);
    expect(handlers.ready).toHaveBeenCalledTimes(1);
    engine.dispose();
    expect(host.querySelector('canvas')).toBeNull();
    expect(gpu.dispose).toHaveBeenCalledOnce();
    expect(gpu.forceContextLoss).toHaveBeenCalledOnce();
    expect(geometryDispose.mock.calls.length).toBeGreaterThan(10);
    expect(materialDispose.mock.calls.length).toBeGreaterThan(3);
    const renderCount = gpu.render.mock.calls.length;
    frames.shift()?.(200);
    expect(gpu.render).toHaveBeenCalledTimes(renderCount);
  });
  it('reports render errors and context loss once instead of spinning forever', () => {
    const handlers = callbacks();
    const engine = createSceneRenderer(host, handlers)!;
    const canvas = host.querySelector('canvas')!;
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    frames.shift()?.(100);
    expect(handlers.error).toHaveBeenCalledTimes(1);
    expect(handlers.error).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'render_failed' }),
    );
    expect(handlers.ready).not.toHaveBeenCalled();
    engine.dispose();
  });
  it('bounds keyboard panning while preserving the camera orientation', () => {
    const engine = createSceneRenderer(host, callbacks())!;
    frames.shift()!(100);
    const camera = gpu.render.mock.calls[0]![1] as THREE.PerspectiveCamera;
    const start = camera.position.clone();
    const orientation = camera.quaternion.clone();
    const canvas = host.querySelector('canvas')!;
    for (let i = 0; i < 100; i++) {
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          shiftKey: true,
          cancelable: true,
        }),
      );
    }
    expect(camera.position.distanceTo(start)).toBeGreaterThan(1);
    expect(Math.abs(camera.position.x - start.x)).toBeLessThanOrEqual(4.001);
    expect(Math.abs(camera.position.z - start.z)).toBeLessThanOrEqual(4.001);
    expect(camera.quaternion.angleTo(orientation)).toBeLessThan(0.00001);
    engine.dispose();
  });
  it('catches a GPU render failure before declaring ready', () => {
    gpu.render.mockImplementationOnce(() => {
      throw new Error('GPU failure');
    });
    const handlers = callbacks();
    const engine = createSceneRenderer(host, handlers)!;
    frames.shift()!(100);
    expect(handlers.ready).not.toHaveBeenCalled();
    expect(handlers.error).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'render_failed' }),
    );
    engine.dispose();
  });
});
