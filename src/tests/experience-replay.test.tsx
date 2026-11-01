import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { lazy, type ComponentType } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { useHistoricalExperience } from '../app/experience/use-historical-experience';
import { createExperienceCatalog } from '../app/experience/historical-experience-routing';
import { CompletionStore } from '../app/experience/experience-completion-service';
import { simulatePublishedSample } from './fixtures/c1-sample';
import { engineeringModules } from './workbench/c1-modules';
import { responseFor } from './fixtures/c1-driver';
import type { ImmersiveExperienceProps } from '../shared/contracts';

afterEach(() => vi.unstubAllGlobals());
function prepared() {
  const data = simulatePublishedSample();
  const memory = new Map<string, string>();
  const store = new CompletionStore({
    key: 'replay-test-only',
    storage: () => ({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
    }),
  });
  store.save({
    schemaVersion: 1,
    experienceId: data.experiences[0]!.experienceId,
    completionPolicyVersion: 1,
    completedAt: '2026-11-02T00:00:00Z',
    completedInteractionIds: ['ld-01', 'ld-02'],
    completionMode: 'equivalent',
  });
  return { data, store };
}
async function reading(modules = engineeringModules) {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const user = userEvent.setup();
  const { data, store } = prepared();
  const view = render(
    <App input={data} modules={modules} completionStore={store} />,
  );
  await user.click(screen.getByRole('button', { name: '开启征程' }));
  await user.click(screen.getByRole('button', { name: '立即进入' }));
  await user.click(
    await screen.findByRole('button', { name: '工程：打开地图事件' }),
  );
  return { user, store, data, view };
}
describe('C1 重播模式、运行隔离与完成记录', () => {
  it('默认重播沿用可用的等价模式，新 runId 清空互动并拒绝旧回调', () => {
    const { data, store } = prepared();
    const { result } = renderHook(() =>
      useHistoricalExperience({
        catalog: createExperienceCatalog(data),
        modules: { ...engineeringModules, Renderer: undefined },
        store,
        context: { phaseId: 'fixture-phase', selection: null, bookmark: null },
        pauseMacro: vi.fn(),
        restoreContext: vi.fn(),
      }),
    );
    act(() =>
      result.current.openHistoricalObject({
        kind: 'event',
        id: 'fixture-event',
      }),
    );
    act(() => result.current.start());
    const first = result.current.state.run!;
    const old = result.current.rendererProps!;
    expect(first.mode).toBe('equivalent');
    act(() =>
      result.current.stepViewed(first.bundle.fallback.steps[0]!.stepId),
    );
    act(() => result.current.nextStep());
    act(() =>
      result.current.stepViewed(first.bundle.fallback.steps[1]!.stepId),
    );
    const interaction = data.interactions[0]!;
    act(() =>
      result.current.response(
        interaction.interactionId,
        responseFor(interaction),
      ),
    );
    act(() => result.current.acknowledge(interaction.interactionId));
    expect(result.current.state.run!.responses).not.toEqual({});
    act(() => result.current.exit());
    act(() =>
      result.current.openHistoricalObject({
        kind: 'event',
        id: 'fixture-event',
      }),
    );
    act(() => result.current.start());
    const replay = result.current.state.run!;
    expect(replay.runId).not.toBe(first.runId);
    expect(replay.index).toBe(0);
    expect(replay.responses).toEqual({});
    expect(replay.completed).toEqual([]);
    expect(replay.acknowledged).toEqual([]);
    act(() =>
      old.onTerminalReached({
        experienceId: first.experienceId,
        scriptVersion: first.scriptVersion,
        runId: first.runId,
        segmentId: first.bundle.manifest.terminalSegmentId,
      }),
    );
    expect(result.current.state.run!.terminalReached).toBe(false);
    expect(store.getSnapshot().records).toHaveLength(1);
  });
  it('两种模块均可用时明确选择，重播不能自动完成', async () => {
    const { user, store } = await reading();
    expect(screen.getByRole('button', { name: '三维沉浸重播' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '图文体验重播' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '图文体验重播' }));
    expect(
      screen.getByRole('button', { name: '完成体验，阅读资料' }),
    ).toBeDisabled();
    expect(screen.getByText(/段落 1 \/ 5 · 互动 0 \/ 2/)).toBeVisible();
    expect(store.getSnapshot().records).toHaveLength(1);
  });
  it('两个模块不可用时保留正文并说明原因', async () => {
    await reading({
      ...engineeringModules,
      Renderer: undefined,
      Equivalent: undefined,
    });
    expect(screen.getByRole('button', { name: '三维沉浸重播' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '图文体验重播' })).toBeDisabled();
    expect(
      screen.getByRole('heading', { name: '工程正文（非史实）' }),
    ).toBeVisible();
    expect(screen.getByText(/重播所需的呈现或教学模块暂不可用/)).toBeVisible();
  });
  it('延迟的 Renderer 不妨碍主动选择图文重播或退出', async () => {
    const Renderer = lazy(
      () =>
        new Promise<{ default: ComponentType<ImmersiveExperienceProps> }>(
          () => {},
        ),
    );
    const { user, store } = await reading({ ...engineeringModules, Renderer });
    await user.click(screen.getByRole('button', { name: '三维沉浸重播' }));
    expect(screen.getByText('正在加载体验组件，您仍可退出。')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '退出体验' }));
    await user.click(
      screen.getByRole('button', { name: '确认退出，返回沙盘' }),
    );
    await user.click(
      screen.getByRole('button', { name: '工程：打开地图事件' }),
    );
    await user.click(screen.getByRole('button', { name: '图文体验重播' }));
    expect(screen.getByRole('button', { name: '我已阅读本段' })).toBeVisible();
    expect(store.getSnapshot().records).toHaveLength(1);
  });
  it('Renderer 运行失败后可主动改用等价，既有完成记录保留', async () => {
    const { user, store } = await reading();
    await user.click(screen.getByRole('button', { name: '三维沉浸重播' }));
    await user.click(
      screen.getByRole('button', { name: '工程：模拟 WebGL 故障' }),
    );
    expect(screen.getByRole('heading', { name: '体验暂时中断' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '改用等价图文体验' }));
    expect(
      screen.getByRole('button', { name: '完成体验，阅读资料' }),
    ).toBeDisabled();
    expect(store.getSnapshot().records).toHaveLength(1);
  });
});
