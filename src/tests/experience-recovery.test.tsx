import raw from '../data/verified/dataset.json';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LongMarchSceneProps } from '../shared/contracts';
import { App } from '../app/App';

const scene = vi.hoisted(() => ({
  mode: 'pending' as 'pending' | 'ready',
  mounts: 0,
}));
vi.mock('../features/scene', () => ({
  LongMarchScene: function SceneProbe({ onSceneReady }: LongMarchSceneProps) {
    useEffect(() => {
      scene.mounts += 1;
      if (scene.mode === 'ready') onSceneReady();
    }, [onSceneReady]);
    return <div>场景接口测试</div>;
  },
}));
vi.mock('../app/landscape/ExhibitionPanorama', async () => ({
  ExhibitionPanorama: (await import('../features/scene')).LongMarchScene,
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  scene.mode = 'pending';
  scene.mounts = 0;
});

describe('场景超时后的完整恢复路径', () => {
  it('超时后可打开资料、关闭并重试，重新挂载场景且可以返回首页', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<App input={raw} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '开启征程' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '立即进入' }));
    });
    const mountsBeforeRetry = scene.mounts;
    await act(async () => vi.advanceTimersByTimeAsync(15000));
    expect(screen.getByRole('alert')).toHaveTextContent('场景加载时间较长');
    // Keep this timer-driven test deterministic: focus the trigger before activation.
    const sourceTrigger = screen.getByRole('button', { name: '资料来源' });
    sourceTrigger.focus();
    fireEvent.click(sourceTrigger);
    expect(
      screen.getByRole('dialog', { name: '资料来源与史料原则' }),
    ).toHaveTextContent('目前尚未发布经复核的史料来源。');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: '资料来源' })).toHaveFocus();
    scene.mode = 'ready';
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '重试场景' }));
    });
    expect(scene.mounts).toBeGreaterThan(mountsBeforeRetry);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('预览已就绪')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回首页' }));
    await act(async () => vi.advanceTimersByTimeAsync(32));
    expect(screen.getByRole('button', { name: '开启征程' })).toHaveFocus();
    expect(vi.getTimerCount()).toBe(0);
  });
});
