import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LongMarchSceneV2Props } from '../shared/contracts';
import { createDraftV2Dataset } from './fixtures/v2-dataset';
import { LongMarchSceneV2 } from '../features/scene/LongMarchSceneV2';
import type { PanoramaBookmark } from '../features/scene/atlas/map-renderer';

const map = vi.hoisted(() => ({
  setSpatialView: vi.fn(),
  dispose: vi.fn(),
  restore: vi.fn(),
  options: null as null | {
    onReady: () => void;
    onCameraChanged?: (bookmark: PanoramaBookmark) => void;
  },
}));
vi.mock('../features/scene/atlas/map-renderer', () => ({
  createPanoramaMap: (_host: HTMLElement, options: typeof map.options) => {
    map.options = options;
    return {
      setSpatialView: map.setSpatialView,
      dispose: map.dispose,
      restore: map.restore,
    };
  },
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
describe('main map phase adapter', () => {
  it('uses C phase changes, clears spatial layers and rejects bookmarks from a different phase', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const dataset = createDraftV2Dataset();
    Object.assign(dataset.forceSnapshots[0]!, {
      displayMode: 'point',
      coordinates: [102, 30],
      coordinatePrecision: 'schematic',
    });
    const p: LongMarchSceneV2Props = {
      dataset,
      events: dataset.events,
      routes: [],
      phaseId: 'fixture-phase',
      selection: null,
      activeEventId: null,
      playbackProgress: 0,
      cameraBookmark: null,
      onObjectSelect: vi.fn(),
      onCameraBookmark: vi.fn(),
      onSceneReady: vi.fn(),
      onSceneError: vi.fn(),
      onEventSelect: vi.fn(),
    };
    const { rerender, unmount } = render(<LongMarchSceneV2 {...p} />);
    expect(p.onSceneReady).not.toHaveBeenCalled();
    act(() => map.options?.onReady());
    expect(p.onSceneReady).toHaveBeenCalledOnce();
    expect(map.setSpatialView).toHaveBeenLastCalledWith(
      expect.objectContaining({
        units: [expect.objectContaining({ id: 'fixture-unit' })],
      }),
    );
    p.phaseId = 'next-phase';
    p.cameraBookmark = {
      sceneId: 'long-march-modern-panorama',
      phaseId: 'fixture-phase',
      coordinateSystem: 'scene-local',
      position: [1, 2, 3],
      target: [0, 0, 0],
      zoom: 1,
    };
    rerender(<LongMarchSceneV2 {...p} />);
    expect(map.setSpatialView).toHaveBeenLastCalledWith(
      expect.objectContaining({ units: [] }),
    );
    expect(map.restore).not.toHaveBeenCalled();
    const callback = map.options!;
    act(() =>
      callback.onCameraChanged?.({
        sceneId: 'long-march-modern-panorama',
        position: [2, 3, 4],
        target: [0, 0, 0],
      }),
    );
    expect(p.onCameraBookmark).toHaveBeenLastCalledWith(
      expect.objectContaining({ phaseId: 'next-phase' }),
    );
    unmount();
    expect(map.dispose).toHaveBeenCalledOnce();
    act(() => callback.onReady());
    expect(p.onSceneReady).toHaveBeenCalledOnce();
  });
});
