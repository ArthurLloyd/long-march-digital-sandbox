import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExhibitionPanorama } from '../app/landscape/ExhibitionPanorama';
import type { createPanoramaMap } from '../app/landscape/map-renderer';
import type {
  HistoryDatasetV2,
  LongMarchSceneV2Props,
} from '../shared/contracts';
import { emptyV2 } from './fixtures/v2-dataset';
import { simulatePublishedSample } from './fixtures/c1-sample';
import { simulatePublishedC2 } from './fixtures/c2-sample';
import { selectScenePhaseView } from '../app/history/scene-phase-view';

type RendererOptions = Parameters<typeof createPanoramaMap>[1];
const renderer = vi.hoisted(() => ({
  options: null as RendererOptions | null,
  fail: false,
  api: {
    focus: vi.fn(),
    focusGeo: vi.fn(),
    overview: vi.fn(),
    zoom: vi.fn(),
    setMarkers: vi.fn(),
    setRoutes: vi.fn(),
    setForceRegions: vi.fn(),
    setRivers: vi.fn(),
    setVerticalExaggeration: vi.fn(),
    restore: vi.fn(),
    bookmark: vi.fn(),
    suspend: vi.fn(),
    dispose: vi.fn(),
  },
}));
// GPU boundary only. It never reports ready unless the test explicitly delivers
// the renderer callback, and cannot be included in a production build.
vi.mock('../app/landscape/map-renderer', () => ({
  createPanoramaMap: (_host: HTMLElement, options: RendererOptions) => {
    if (renderer.fail) throw new Error('WebGL unavailable');
    renderer.options = options;
    return renderer.api;
  },
}));
function properties(
  dataset: HistoryDatasetV2 = emptyV2(),
  phaseId: string | null = null,
): LongMarchSceneV2Props {
  return {
    dataset,
    phaseId,
    events: dataset.events,
    routes: dataset.routes,
    activeEventId: null,
    playbackProgress: 0,
    selection: null,
    cameraBookmark: null,
    onSceneReady: vi.fn(),
    onSceneError: vi.fn(),
    onEventSelect: vi.fn(),
    onObjectSelect: vi.fn(),
    onCameraBookmark: vi.fn(),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  renderer.options = null;
  renderer.fail = false;
  renderer.api.bookmark.mockReturnValue({
    sceneId: 'long-march-modern-panorama',
    position: [0, 4, 6],
    target: [0, 0, 0],
  });
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('原展馆的现代全景与正式历史边界', () => {
  it('真实渲染器回调前不报告就绪，退出仅释放一次', () => {
    const props = properties(),
      view = render(<ExhibitionPanorama {...props} />);
    expect(props.onSceneReady).not.toHaveBeenCalled();
    expect(renderer.api.setMarkers.mock.lastCall![0]).toHaveLength(8);
    expect(
      renderer.api.setMarkers.mock.lastCall![0].every((point: { id: string }) =>
        point.id.startsWith('view:'),
      ),
    ).toBe(true);
    act(() => renderer.options!.onReady());
    expect(props.onSceneReady).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(renderer.api.dispose).toHaveBeenCalledTimes(1);
  });
  it('无法创建 WebGL 时返回错误，不冒充 ready', () => {
    renderer.fail = true;
    const props = properties();
    render(<ExhibitionPanorama {...props} />);
    expect(props.onSceneError).toHaveBeenCalledWith({
      code: 'webgl_unavailable',
      message: 'WebGL unavailable',
    });
    expect(props.onSceneReady).not.toHaveBeenCalled();
  });
  it('现代区域取景不打开历史体验，收起题字后焦点回到可见菜单', async () => {
    const props = properties(),
      user = userEvent.setup();
    render(<ExhibitionPanorama {...props} />);
    await user.click(screen.getByText('山河取景'));
    await user.click(screen.getByRole('button', { name: '赤水河谷' }));
    expect(renderer.api.focus).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: '收起赤水河谷电影题字' }),
    ).toBeInTheDocument();
    expect(props.onEventSelect).not.toHaveBeenCalled();
    expect(props.onObjectSelect).not.toHaveBeenCalled();
    await user.click(screen.getByText('山河取景'));
    await user.click(screen.getByRole('button', { name: '大渡河谷' }));
    expect(
      screen.getByRole('button', { name: '收起大渡河谷电影题字' }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByText('山河取景').closest('summary')).toHaveFocus(),
    );
  });
  it('已发布事件先取景和题字，再由主动阅读回调进入 C1；撤回立即移除旧标题', async () => {
    // All coordinates and approvals below exist only in isolated test memory.
    const data = simulatePublishedSample(),
      event = data.events[0]!;
    event.coordinates = [106, 28];
    event.coordinatePrecision = 'schematic';
    const props = properties(data),
      user = userEvent.setup(),
      view = render(<ExhibitionPanorama {...props} />);
    await user.click(screen.getByRole('button', { name: event.title }));
    expect(renderer.api.focusGeo).toHaveBeenCalledWith([106, 28]);
    expect(props.onEventSelect).not.toHaveBeenCalled();
    expect(view.container.querySelector('.museum-map-events')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await user.click(
      screen.getByRole('button', { name: `收起${event.title}电影题字` }),
    );
    await user.click(screen.getByRole('button', { name: '阅读事件' }));
    expect(props.onEventSelect).toHaveBeenCalledWith(event.id);
    expect(props.onCameraBookmark).toHaveBeenCalledWith({
      sceneId: 'long-march-modern-panorama',
      position: [0, 4, 6],
      target: [0, 0, 0],
      coordinateSystem: 'scene-local',
      zoom: 1,
      phaseId: props.phaseId,
    });
    await user.click(screen.getByRole('button', { name: event.title }));
    view.rerender(<ExhibitionPanorama {...props} events={[]} />);
    expect(
      screen.queryByRole('button', { name: `收起${event.title}电影题字` }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '阅读事件' }),
    ).not.toBeInTheDocument();
  });
  it('只消费 C2 当前阶段态势，切换阶段不插值或产生新时钟', () => {
    const timer = vi.spyOn(window, 'setInterval');
    const data = simulatePublishedC2();
    for (const snapshot of data.forceSnapshots)
      if (snapshot.coordinates) snapshot.coordinates = [106, 28];
    const a = properties(selectScenePhaseView(data, 'c2-a1').dataset, 'c2-a1'),
      view = render(<ExhibitionPanorama {...a} />);
    expect(
      renderer.api.setMarkers.mock.lastCall![0].filter(
        (point: { id: string }) => point.id.startsWith('force:'),
      ),
    ).toHaveLength(2);
    expect(
      renderer.api.setForceRegions.mock.lastCall![0].entries.map(
        (e: { snapshot: { phaseId: string } }) => e.snapshot.phaseId,
      ),
    ).toEqual(['c2-a1', 'c2-a1']);
    const b = properties(selectScenePhaseView(data, 'c2-a3').dataset, 'c2-a3');
    view.rerender(<ExhibitionPanorama {...b} />);
    expect(
      renderer.api.setMarkers.mock.lastCall![0].filter(
        (point: { id: string }) => !point.id.startsWith('view:'),
      ),
    ).toEqual([]);
    expect(renderer.api.setRoutes.mock.lastCall![0][0].coordinates).toEqual(
      data.routes[0]!.coordinates,
    );
    const none = properties(
      selectScenePhaseView(data, 'missing').dataset,
      'missing',
    );
    view.rerender(<ExhibitionPanorama {...none} />);
    expect(renderer.api.setRoutes).toHaveBeenLastCalledWith(
      [],
      ['red_army', 'nationalist_army', 'other'],
    );
    expect(none.onSceneReady).not.toHaveBeenCalled();
    expect(timer).not.toHaveBeenCalled();
    timer.mockRestore();
  });
  it('手动取景停止阶段跟随，重新启用只聚焦已有的发布坐标', async () => {
    const data = simulatePublishedSample();
    data.events[0]!.coordinates = [106, 28];
    data.events[0]!.coordinatePrecision = 'schematic';
    const props = properties(data),
      user = userEvent.setup();
    const view = render(<ExhibitionPanorama {...props} />);
    expect(renderer.api.focusGeo).toHaveBeenLastCalledWith([106, 28]);
    await user.click(screen.getByText('山河取景'));
    await user.click(screen.getByRole('button', { name: '赤水河谷' }));
    await user.keyboard('{Escape}');
    renderer.api.focusGeo.mockClear();
    view.rerender(<ExhibitionPanorama {...props} phaseId="another-phase" />);
    expect(renderer.api.focusGeo).not.toHaveBeenCalled();
    await user.click(screen.getByText('地图图层'));
    await user.click(screen.getByRole('checkbox', { name: '随阶段取景' }));
    expect(renderer.api.focusGeo).toHaveBeenLastCalledWith([106, 28]);
  });
});
