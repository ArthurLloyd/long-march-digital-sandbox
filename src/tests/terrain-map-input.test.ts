import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createPanoramaMap } from '../app/landscape/map-renderer';
import { projectGeo } from '../app/landscape/geography';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import raw from '../data/verified/dataset.json';
import { createJourneyTransport, journeyChapters } from '../features/timeline';
const boundary = vi.hoisted(() => ({
  render: vi.fn(),
  dispose: vi.fn(),
  lose: vi.fn(),
  pick: vi.fn(),
  cancel: vi.fn(),
  landDispose: vi.fn(),
  controls: null as unknown,
  frames: [] as FrameRequestCallback[],
  landFocus: vi.fn(),
  focusArea: vi.fn(),
  terrainHeight: 0.1,
  heightVersion: 0,
}));
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
      domElement = document.createElement('canvas');
      shadowMap = {};
      debug = {};
      info = {
        render: { calls: 0, triangles: 0 },
        memory: { geometries: 0, textures: 0 },
      };
      setPixelRatio() {}
      setClearColor() {}
      setSize() {}
      render = boundary.render;
      dispose = boundary.dispose;
      forceContextLoss = boundary.lose;
    },
  };
});
vi.mock('three/examples/jsm/controls/OrbitControls.js', async () => {
  const { EventDispatcher, Vector3 } = await import('three');
  return {
    OrbitControls: class extends EventDispatcher<{
      start: object;
      end: object;
    }> {
      target = new Vector3();
      maxPolarAngle = 1.4;
      minPolarAngle = 0.12;
      minDistance = 0.004;
      maxDistance = 58;
      constructor() {
        super();
        boundary.controls = this;
      }
      update() {}
      dispose() {}
    },
  };
});
vi.mock('../app/landscape/modern-landscape', () => ({
  createModernLandscape: () => ({
    heightAt: () => boundary.terrainHeight,
    navigationHeightAt: () => boundary.terrainHeight,
    waterHeightAt: () => null,
    worldBounds: [-20, -20, 20, 20],
    bounds: [-2, -2, 2, 2],
    get heightVersion() {
      return boundary.heightVersion;
    },
    region: null,
    focus: boundary.landFocus,
    focusArea: boundary.focusArea,
    overview: vi.fn(),
    cancelPending: boundary.cancel,
    observe: vi.fn(),
    update: vi.fn(),
    diagnostics: {},
    pick: boundary.pick,
    setRivers: vi.fn(),
    setExaggeration: vi.fn(),
    dispose: boundary.landDispose,
  }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  boundary.frames = [];
  boundary.terrainHeight = 0.1;
  boundary.heightVersion = 0;
  boundary.landFocus.mockReset().mockResolvedValue({ x: 0, z: 0 });
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    boundary.frames.push(fn);
    return boundary.frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());
const setup = (reducedMotion = true) => {
  const host = document.createElement('div');
  document.body.append(host);
  const onViewChange = vi.fn(),
    onReady = vi.fn();
  const api = createPanoramaMap(host, {
    reducedMotion,
    onViewChange,
    onReady,
    onError: vi.fn(),
    onMarkers: vi.fn(),
    technicalMarkers: false,
  });
  const canvas = host.querySelector('canvas')!;
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    width: 1024,
    height: 768,
    left: 0,
    top: 0,
    right: 1024,
    bottom: 768,
    toJSON() {
      return {};
    },
  });
  return {
    api,
    host,
    canvas,
    onViewChange,
    onReady,
  };
};
const dbl = (canvas: HTMLCanvasElement) =>
  canvas.dispatchEvent(
    new MouseEvent('dblclick', {
      bubbles: true,
      button: 0,
      clientX: 20,
      clientY: 20,
    }),
  );
describe('真实地图输入接线（只模拟GPU边界）', () => {
  it('到达镜头等待新地区地形；旧异步响应不能覆盖用户手动镜头', async () => {
    const { api, host } = setup(),
      content = createJourneyContent(raw, 'exhibition');
    const transport = createJourneyTransport(content.plan);
    const chapter = journeyChapters(content.plan, 'central').find(
      (c) => c.id === 'chapter-event-js',
    )!;
    transport.seek(chapter.start + chapter.duration * chapter.arrival);
    api.setMarchTransport!(transport);
    let finish!: (p: { x: number; z: number }) => void;
    boundary.landFocus.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const before = api.bookmark();
    api.focusMarch!('follow');
    expect(boundary.landFocus).toHaveBeenLastCalledWith('jinsha');
    expect(api.bookmark()).toEqual(before);
    boundary.terrainHeight = 0.8;
    finish({ x: 0, z: 0 });
    await Promise.resolve();
    expect(api.bookmark().target[1]).toBeGreaterThan(0.8);
    expect(api.bookmark()).not.toEqual(before);
    boundary.landFocus.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    api.focusMarch!('follow');
    api.zoom(1);
    const manual = api.bookmark();
    finish({ x: 0, z: 0 });
    await Promise.resolve();
    expect(api.bookmark()).toEqual(manual);
    boundary.landFocus.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    api.focusMarch!('follow');
    api.holdCamera!();
    const freeView = api.bookmark();
    finish({ x: 0, z: 0 });
    await Promise.resolve();
    expect(api.bookmark()).toEqual(freeView);
    api.dispose();
    host.remove();
  });
  it('独立章节地区准备不会重写自由镜头', () => {
    const { api, host } = setup(),
      before = api.bookmark();
    api.prepareRegion!(null, [103.7, 34, 104.1, 34.2]);
    expect(boundary.focusArea).toHaveBeenCalledWith([103.7, 34, 104.1, 34.2]);
    expect(api.bookmark()).toEqual(before);
    api.dispose();
    host.remove();
  });
  it('事件区域是贴地闭合轮廓而非行军线，地形更新后重贴地，清空释放几何', () => {
    const { api, host } = setup();
    api.setEventAreas!([
      { id: 'area-test', bounds: [105.8, 27.9, 106.2, 28.4] },
    ]);
    boundary.frames.shift()!(performance.now());
    const scene = boundary.render.mock.lastCall![0] as THREE.Scene;
    let area: THREE.Line | null = null;
    scene.traverse((object) => {
      if (object.userData.exhibitionAreaId === 'area-test')
        area = object as THREE.Line;
    });
    expect(area).not.toBeNull();
    const line = area! as THREE.Line,
      positions = line.geometry.getAttribute('position');
    expect(positions.getX(0)).toBe(positions.getX(positions.count - 1));
    expect(positions.getZ(0)).toBe(positions.getZ(positions.count - 1));
    expect(positions.getY(0)).toBeCloseTo(0.112);
    boundary.terrainHeight = 0.5;
    boundary.heightVersion++;
    boundary.frames.shift()!(performance.now() + 20);
    expect(positions.getY(0)).toBeCloseTo(0.512);
    const disposed = vi.spyOn(line.geometry, 'dispose');
    api.setEventAreas!([]);
    expect(disposed).toHaveBeenCalledOnce();
    expect(line.parent).toBeNull();
    api.dispose();
    host.remove();
  });
  it('连续选择事件只采用最后一次异步取景；旧区域加载不能拉回', async () => {
    const { api, host } = setup();
    let first!: (value: { x: number; z: number }) => void,
      second!: (value: { x: number; z: number }) => void;
    boundary.landFocus
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            first = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            second = resolve;
          }),
      );
    api.focusGeo([106.916, 27.691]);
    api.focusGeo([102.23, 29.915]);
    second({ x: 0, z: 0 });
    await Promise.resolve();
    const last = api.bookmark();
    expect(last.target[0]).toBeCloseTo(projectGeo([102.23, 29.915])[0]);
    first({ x: 0, z: 0 });
    await Promise.resolve();
    expect(api.bookmark()).toEqual(last);
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
    api.dispose();
    host.remove();
  });
  it('画布滚轮取得鼠标下地表锚点；空白与工具滚轮不改动视角，退出移除监听', () => {
    const { api, canvas, host } = setup();
    boundary.pick.mockReturnValue(new THREE.Vector3(0.8, 0.1, 0.6));
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        clientX: 800,
        clientY: 400,
        deltaY: -120,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(boundary.pick).toHaveBeenCalled();
    expect(api.bookmark().target[0]).toBeGreaterThan(0);
    const before = api.bookmark();
    boundary.pick.mockReturnValue(null);
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        clientX: 800,
        clientY: 400,
        deltaY: -120,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(api.bookmark()).toEqual(before);
    const ui = document.createElement('button');
    host.append(ui);
    const n = boundary.pick.mock.calls.length;
    ui.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true }));
    expect(boundary.pick).toHaveBeenCalledTimes(n);
    api.dispose();
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -120 }));
    expect(boundary.pick).toHaveBeenCalledTimes(n);
    host.remove();
  });
  it('最后一次地表命中成为目标；失败和UI点击不覆盖；操作不重挂画布', () => {
    const { api, host, canvas, onViewChange } = setup();
    boundary.pick.mockReturnValue(new THREE.Vector3(0.2, 0.1, 0.3));
    dbl(canvas);
    expect(api.bookmark().target[0]).toBe(0.2);
    boundary.pick.mockReturnValue(new THREE.Vector3(0.6, 0.1, 0.7));
    dbl(canvas);
    expect(api.bookmark().target[0]).toBe(0.6);
    const before = api.bookmark();
    boundary.pick.mockReturnValue(null);
    dbl(canvas);
    expect(api.bookmark()).toEqual(before);
    const pickCount = boundary.pick.mock.calls.length;
    const ui = document.createElement('button');
    host.append(ui);
    dbl(ui as unknown as HTMLCanvasElement);
    expect(boundary.pick).toHaveBeenCalledTimes(pickCount);
    expect(host.querySelector('canvas')).toBe(canvas);
    expect(onViewChange).toHaveBeenCalled();
    api.dispose();
    host.remove();
  });
  it('用户输入取消镜头过渡；按钮、键盘、恢复书签均受到同一地表保护；清理移除监听和RAF', () => {
    const { api, host, canvas } = setup(false);
    boundary.pick.mockReturnValue(new THREE.Vector3(0.4, 0.1, 0.8));
    dbl(canvas);
    (
      boundary.controls as THREE.EventDispatcher<{ start: object }>
    ).dispatchEvent({ type: 'start' });
    const initial = api.bookmark();
    boundary.frames.shift()!(performance.now() + 4000);
    expect(api.bookmark().target).toEqual(initial.target);
    api.dispose();
    host.remove();
    const next = setup();
    next.api.restore({
      sceneId: 'long-march-modern-panorama',
      position: [0, -1, 0.002],
      target: [0, -1, 0],
    });
    expect(next.api.bookmark().position[1]).toBeGreaterThan(0.1);
    next.api.zoom(1);
    expect(next.api.bookmark().position[1]).toBeGreaterThan(0.1);
    next.canvas.dispatchEvent(
      new KeyboardEvent('keydown', { key: '+', bubbles: true }),
    );
    expect(next.api.bookmark().position[1]).toBeGreaterThan(0.1);
    next.api.dispose();
    expect(next.host.querySelector('canvas')).toBeNull();
    const calls = boundary.pick.mock.calls.length;
    dbl(next.canvas);
    expect(boundary.pick).toHaveBeenCalledTimes(calls);
    expect(boundary.landDispose).toHaveBeenCalledTimes(2);
    expect(boundary.dispose).toHaveBeenCalledTimes(2);
    next.host.remove();
  });
});
