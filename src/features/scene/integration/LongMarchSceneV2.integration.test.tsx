import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  HistoryDatasetV2,
  LongMarchSceneV2Props,
} from '../../../shared/contracts';
import { LongMarchSceneV2 } from '../LongMarchSceneV2';
import { ATLAS_REGIONS, REGIONS, type RegionId } from '../atlas/regions';
import type { PanoramaBookmark } from '../atlas/map-renderer';

const map = vi.hoisted(() => ({
  options: null as null | { onReady(): void },
  focus: vi.fn(),
  overview: vi.fn(),
  zoom: vi.fn(),
  setSpatialView: vi.fn(),
  setRivers: vi.fn(),
  setVerticalExaggeration: vi.fn(),
  bookmark: vi.fn(),
  restore: vi.fn(),
  suspend: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('../atlas/map-renderer', () => ({
  createPanoramaMap: (_host: HTMLElement, options: typeof map.options) => {
    map.options = options;
    return map;
  },
}));

vi.mock('./RegionalObservation', () => ({
  RegionalObservation: ({
    regionId,
    onExit,
    onRegionChange,
  }: {
    regionId: RegionId;
    onExit(): void;
    onRegionChange?: (id: RegionId) => void;
  }) => (
    <div role="dialog" aria-label="区域观察" data-region={regionId}>
      <button onClick={onExit}>关闭观察场景</button>
      <button onClick={() => onRegionChange?.('zunyi')}>切换至遵义</button>
      <button onClick={() => onRegionChange?.('grass')}>切换至草地</button>
    </div>
  ),
}));

const originalBookmark: PanoramaBookmark = {
  sceneId: 'long-march-modern-panorama',
  position: [3.2, 2.1, 6.5],
  target: [0.4, 0.2, 1.1],
};

function props(): LongMarchSceneV2Props {
  const dataset: HistoryDatasetV2 = {
    schemaVersion: 2,
    events: [],
    routes: [],
    sources: [],
    topics: [],
    phases: [],
    people: [],
    places: [],
    forceTracks: [],
    forceSnapshots: [],
    experiences: [],
    segments: [],
    interactions: [],
    fallbackContents: [],
    assets: [],
  };
  return {
    dataset,
    events: [],
    routes: [],
    phaseId: null,
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
}

beforeEach(() => {
  vi.clearAllMocks();
  map.options = null;
  map.bookmark.mockReturnValue(originalBookmark);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('regional observation integration in the main map', () => {
  it('keeps regional entries unavailable until the main map is ready', () => {
    render(<LongMarchSceneV2 {...props()} />);
    const chapters = within(
      screen.getByRole('navigation', { name: '区域地理观察' }),
    );
    expect(chapters.getAllByRole('button')).toHaveLength(8);
    for (const button of chapters.getAllByRole('button'))
      expect(button).toBeDisabled();
    expect(screen.getByRole('button', { name: /从瑞金出发/ })).toBeDisabled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => map.options?.onReady());
    for (const button of chapters.getAllByRole('button'))
      expect(button).toBeEnabled();
  });

  it.each(ATLAS_REGIONS)(
    'opens $id from its own region, suspends the map and restores its original view on exit',
    ({ id, title }) => {
      const p = props();
      const result = render(<LongMarchSceneV2 {...p} />);
      act(() => map.options?.onReady());
      const chapters = within(
        screen.getByRole('navigation', { name: '区域地理观察' }),
      );
      fireEvent.click(
        chapters.getByRole('button', { name: new RegExp(title) }),
      );
      expect(map.focus).toHaveBeenLastCalledWith(REGIONS[id]);
      const entry = screen.getByRole('button', { name: /走进此地/ });
      entry.focus();
      fireEvent.click(entry);
      expect(screen.getByRole('dialog', { name: '区域观察' })).toHaveAttribute(
        'data-region',
        id,
      );
      expect(map.bookmark).toHaveBeenCalledOnce();
      expect(map.suspend).toHaveBeenLastCalledWith(true);

      fireEvent.click(screen.getByRole('button', { name: '关闭观察场景' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(map.suspend.mock.calls).toEqual([[true], [false]]);
      expect(map.restore).toHaveBeenLastCalledWith(originalBookmark);
      expect(entry).toHaveFocus();
      expect(p.onObjectSelect).not.toHaveBeenCalled();
      expect(p.onEventSelect).not.toHaveBeenCalled();
      result.unmount();
      expect(map.dispose).toHaveBeenCalledOnce();
    },
  );

  it('retains the original map bookmark across scene-to-scene navigation', () => {
    render(<LongMarchSceneV2 {...props()} />);
    act(() => map.options?.onReady());
    const entry = screen.getByRole('button', { name: /从瑞金出发/ });
    entry.focus();
    fireEvent.click(entry);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-region', 'ruijin');
    map.bookmark.mockReturnValue({
      ...originalBookmark,
      position: [99, 99, 99],
    });

    fireEvent.click(screen.getByRole('button', { name: '切换至遵义' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-region', 'zunyi');
    fireEvent.click(screen.getByRole('button', { name: '切换至草地' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-region', 'grass');
    expect(map.bookmark).toHaveBeenCalledOnce();
    expect(map.suspend).toHaveBeenCalledOnce();
    expect(map.restore).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '关闭观察场景' }));
    expect(map.restore).toHaveBeenCalledExactlyOnceWith(originalBookmark);
    expect(map.suspend.mock.calls).toEqual([[true], [false]]);
    expect(entry).toHaveFocus();
  });
});
