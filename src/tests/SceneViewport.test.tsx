import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SceneViewport } from '../components/layout/SceneViewport';
import type { LongMarchSceneProps } from '../shared/contracts';

const mode = vi.hoisted(() => ({ crash: false }));
vi.mock('../features/scene', () => ({
  LongMarchScene: () => {
    if (mode.crash) throw new Error('test renderer failure');
    return <div>测试场景容器</div>;
  },
}));
function props() {
  return {
    events: [],
    routes: [],
    activeEventId: null,
    playbackProgress: 0,
    onEventSelect: vi.fn(),
    onSceneReady: vi.fn(),
    onSceneError: vi.fn(),
    error: null,
    ready: false,
    onRetry: vi.fn(),
  } satisfies LongMarchSceneProps & {
    error: null;
    ready: boolean;
    onRetry: () => void;
  };
}
afterEach(() => {
  mode.crash = false;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('场景容器可靠性', () => {
  it('WebGL 不可用时显示可理解反馈，重试按钮可操作', async () => {
    const input = props();
    render(
      <SceneViewport
        {...input}
        error={{
          code: 'webgl_unavailable',
          message: '当前浏览器不支持 WebGL。文字资料仍可阅读。',
        }}
      />,
    );
    expect(
      screen.getByRole('heading', { name: '当前浏览器无法显示三维场景' }),
    ).toBeInTheDocument();
    screen.getByRole('button', { name: '重试场景' }).click();
    expect(input.onRetry).toHaveBeenCalledOnce();
  });
  it('不无限等待未就绪的场景，并在卸载后清理超时', async () => {
    vi.useFakeTimers();
    const input = props();
    const { unmount } = render(<SceneViewport {...input} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(input.onSceneError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'asset_load_failed' }),
    );
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('场景渲染失败由边界接住并回调应用层', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mode.crash = true;
    const input = props();
    render(<SceneViewport {...input} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '场景暂时无法加载',
    );
    expect(input.onSceneError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'render_failed' }),
    );
  });
});
