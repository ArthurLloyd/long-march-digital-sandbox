import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegionalObservation } from './RegionalObservation';
import { REGION_STORIES } from './region-stories';

const mocks = vi.hoisted(() => ({
  cinematic: {
    enabled: false,
    src: '/assets/textures/scene-cinematics/snow-intro.mp4',
    poster: '/assets/textures/scene-covers/snow.jpg',
    label: '雪岭同行',
  },
  options: null as null | {
    onReady: () => void;
    onError: (message: Error) => void;
  },
  anchors: null as
    | null
    | ((
        items: {
          id: 'bridge' | 'banks';
          x: number;
          y: number;
          visible: boolean;
        }[],
      ) => void),
  view: vi.fn(),
  paused: vi.fn(),
  dispose: vi.fn(),
  bridgeTime: vi.fn(),
  bridgeCompany: vi.fn(),
  bridgeArrival: vi.fn(),
  bridgePose: vi.fn(),
  bridgeSpot: vi.fn(),
  bridgeDispose: vi.fn(),
  create: vi.fn(),
}));

vi.mock('./cinematic-config', () => ({
  SCENE_CINEMATICS: { snow: mocks.cinematic },
}));

vi.mock('./regional-world', () => ({
  createRegionalWorld: (
    _host: HTMLElement,
    id: string,
    options: NonNullable<typeof mocks.options>,
  ) => {
    mocks.options = options;
    mocks.create(id);
    return {
      setView: mocks.view,
      setPaused: mocks.paused,
      dispose: mocks.dispose,
    };
  },
}));
vi.mock('../prototype/bridge-renderer', () => ({
  createBridgeStudy: (
    _host: HTMLElement,
    options: {
      onReady: () => void;
      onError: (message: string) => void;
      onAnchors: NonNullable<typeof mocks.anchors>;
    },
  ) => {
    mocks.options = {
      onReady: options.onReady,
      onError: (error) => options.onError(error.message),
    };
    mocks.anchors = options.onAnchors;
    return {
      setTime: mocks.bridgeTime,
      focusCompany: mocks.bridgeCompany,
      focusArrival: mocks.bridgeArrival,
      pose: mocks.bridgePose,
      focusSpot: mocks.bridgeSpot,
      setPaused: mocks.paused,
      dispose: mocks.bridgeDispose,
    };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.options = null;
  mocks.anchors = null;
  mocks.cinematic.enabled = false;
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('regional immersive observation', () => {
  it('keeps the paused world inert until the film ends, then supports replay without losing observations', async () => {
    vi.useFakeTimers();
    mocks.cinematic.enabled = true;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const { container } = render(
      <RegionalObservation regionId="snow" onExit={() => {}} />,
    );
    await act(async () => {});
    act(() => mocks.options?.onReady());
    expect(container.querySelector('.regional-exploration')).toHaveAttribute(
      'inert',
    );
    expect(mocks.paused).toHaveBeenLastCalledWith(true);
    fireEvent.ended(container.querySelector('video')!);
    act(() => vi.advanceTimersByTime(480));
    expect(
      container.querySelector('.regional-exploration'),
    ).not.toHaveAttribute('inert');
    expect(mocks.view).toHaveBeenLastCalledWith('arrival');
    expect(mocks.paused).toHaveBeenLastCalledWith(false);
    fireEvent.click(
      screen.getByRole('button', {
        name: REGION_STORIES.snow.hotspots[0]!.title,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '重看开场片段' }));
    await act(async () => {});
    expect(container.querySelector('.regional-exploration')).toHaveAttribute(
      'inert',
    );
    fireEvent.ended(container.querySelector('video')!);
    act(() => vi.advanceTimersByTime(480));
    expect(screen.getByText('自由探索')).toHaveTextContent('1');
  });

  it('requires a rendered scene and three distinct observations before opening the question', () => {
    render(<RegionalObservation regionId="snow" onExit={() => {}} />);
    const story = REGION_STORIES.snow;
    expect(screen.getByRole('button', { name: '再观察 3 处' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: story.hotspots[0]!.title }),
    ).toBeDisabled();
    act(() => mocks.options?.onReady());
    for (const hotspot of story.hotspots) {
      fireEvent.click(screen.getByRole('button', { name: hotspot.title }));
    }
    expect(mocks.view.mock.calls.map(([view]) => view)).toEqual([
      'landscape',
      'company',
      'detail',
    ]);
    fireEvent.click(screen.getByRole('button', { name: '想一想' }));
    expect(
      screen.getByRole('button', { name: `A ${story.question.choices[0]}` }),
    ).toHaveFocus();
    fireEvent.click(
      screen.getByRole('button', { name: `A ${story.question.choices[0]}` }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      story.question.explanation,
    );
    fireEvent.click(screen.getByRole('button', { name: '继续探索' }));
    expect(
      screen.getByRole('button', { name: '重温思考' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重温思考' })).toHaveFocus();
  });

  it('does not count repeated visits as three distinct observations', () => {
    render(<RegionalObservation regionId="ruijin" onExit={() => {}} />);
    act(() => mocks.options?.onReady());
    const button = screen.getByRole('button', {
      name: REGION_STORIES.ruijin.hotspots[0]!.title,
    });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: '再观察 2 处' })).toBeDisabled();
  });

  it('keeps reading and exit available on render failure and disposes the failed renderer', () => {
    const exit = vi.fn();
    const view = render(<RegionalObservation regionId="grass" onExit={exit} />);
    act(() => mocks.options?.onError(new Error('资源未能加载')));
    expect(screen.getByRole('alert')).toHaveTextContent('资源未能加载');
    expect(screen.getByRole('button', { name: '返回地图' })).toHaveFocus();
    act(() => mocks.options?.onReady());
    expect(screen.getByRole('dialog')).toHaveAttribute('data-status', 'error');
    expect(
      screen.getByText(REGION_STORIES.grass.description),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再观察 3 处' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '返回总地图' }));
    expect(exit).toHaveBeenCalledOnce();
    view.unmount();
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });

  it('preserves the user pause choice across page visibility changes', () => {
    render(<RegionalObservation regionId="zunyi" onExit={() => {}} />);
    act(() => mocks.options?.onReady());
    fireEvent.click(screen.getByRole('button', { name: '暂停环境动态' }));
    fireEvent(document, new Event('visibilitychange'));
    expect(mocks.paused).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: '继续环境动态' }));
    expect(mocks.paused).toHaveBeenLastCalledWith(false);
  });

  it('uses the existing bridge with soldiers and maps the same discovery controls', () => {
    const view = render(
      <RegionalObservation regionId="luding" onExit={() => {}} />,
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.bridgeTime).toHaveBeenCalledWith(30);
    expect(mocks.bridgeArrival).toHaveBeenCalledOnce();
    act(() => mocks.options?.onReady());
    fireEvent.click(
      screen.getByRole('button', {
        name: REGION_STORIES.luding.hotspots[2]!.title,
      }),
    );
    expect(mocks.bridgeSpot).toHaveBeenCalledWith('bridge');
    view.unmount();
    expect(mocks.bridgeDispose).toHaveBeenCalledOnce();
  });

  it('cleans up the old scene and resets observation progress when the region changes', () => {
    const view = render(
      <RegionalObservation regionId="ruijin" onExit={() => {}} />,
    );
    act(() => mocks.options?.onReady());
    fireEvent.click(
      screen.getByRole('button', {
        name: REGION_STORIES.ruijin.hotspots[0]!.title,
      }),
    );
    view.rerender(<RegionalObservation regionId="reunion" onExit={() => {}} />);
    expect(mocks.dispose).toHaveBeenCalledOnce();
    expect(mocks.create).toHaveBeenLastCalledWith('reunion');
    expect(screen.getByRole('button', { name: '再观察 3 处' })).toBeDisabled();
  });

  it('converts the original bridge normalized anchors to viewport pixels', () => {
    const { container } = render(
      <RegionalObservation regionId="luding" onExit={() => {}} />,
    );
    const host = container.querySelector('.regional-world')!;
    Object.defineProperties(host, {
      clientWidth: { value: 1000 },
      clientHeight: { value: 600 },
    });
    act(() => mocks.options?.onReady());
    act(() =>
      mocks.anchors?.([{ id: 'bridge', x: 0.4, y: 0.5, visible: true }]),
    );
    const marker = screen.getByRole('button', {
      name: `观察点：${REGION_STORIES.luding.hotspots[2]!.title}`,
    });
    expect(marker).toHaveStyle({
      transform: 'translate(400px, 300px) translate(-24px, -24px)',
      visibility: 'visible',
    });
    act(() =>
      mocks.anchors?.([{ id: 'bridge', x: 0.97, y: 0.5, visible: true }]),
    );
    expect(marker).toHaveStyle({ visibility: 'hidden' });
  });

  it('returns from clean viewing with Escape before exiting the region', () => {
    const exit = vi.fn();
    render(<RegionalObservation regionId="jinsha" onExit={exit} />);
    act(() => mocks.options?.onReady());
    fireEvent.click(screen.getByRole('button', { name: '进入纯净观景' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-clean-view', 'true');
    const hotspots = dialog.querySelector('.regional-spatial-hotspots')!;
    expect(hotspots).toHaveAttribute('hidden');
    for (const marker of hotspots.querySelectorAll('button')) {
      expect(marker).toHaveAttribute('tabindex', '-1');
    }
    expect(screen.getByRole('button', { name: '返回探索 Esc' })).toHaveFocus();
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(dialog).toHaveAttribute('data-clean-view', 'false');
    expect(hotspots).not.toHaveAttribute('hidden');
    for (const marker of hotspots.querySelectorAll('button')) {
      expect(marker).toHaveAttribute('tabindex', '0');
    }
    expect(screen.getByRole('button', { name: '进入纯净观景' })).toHaveFocus();
    expect(exit).not.toHaveBeenCalled();
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(exit).toHaveBeenCalledOnce();
  });
});
