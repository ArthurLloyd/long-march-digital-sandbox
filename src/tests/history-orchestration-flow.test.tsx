import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { CompletionStore } from '../app/experience/experience-completion-service';
import { simulatePublishedC2 } from './fixtures/c2-sample';
import { emptyV2 } from './fixtures/v2-dataset';
import { C2EngineeringMap } from './workbench/C2Workbench';
import { engineeringModules } from './workbench/c1-modules';
import type { LongMarchSceneV2Props } from '../shared/contracts';

// Only the v1 fallback scene is mocked: absent v2 maps still exercise fallback.
// Keep App/C1/C2 navigation assertions independent of jsdom's lack of WebGL.
vi.mock('../features/scene', async () => {
  const { useEffect } = await import('react');
  return {
    LongMarchScene: ({ onSceneReady }: { onSceneReady: () => void }) => {
      useEffect(() => onSceneReady(), [onSceneReady]);
      return <div aria-label="三维场景测试替身" />;
    },
  };
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const modules = { ...engineeringModules, Map: C2EngineeringMap };
const makeStore = () =>
  new CompletionStore({
    key: 'c2-test-completions',
    storage: () => localStorage,
    events: window,
  });
const stage = () => screen.getByLabelText('工程当前阶段').textContent;
const camera = () =>
  JSON.parse(screen.getByLabelText('工程地图上下文').textContent!);
async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '开启征程' }));
  await user.click(screen.getByRole('button', { name: '立即进入' }));
  await screen.findByText('预览已就绪');
}
async function finishEquivalent(user: ReturnType<typeof userEvent.setup>) {
  for (let index = 0; index < 5; index++) {
    await user.click(screen.getByRole('button', { name: '我已阅读本段' }));
    if (index === 1 || index === 3) {
      await user.click(
        screen.getByRole('button', { name: '工程：提交完整互动响应' }),
      );
      await user.click(screen.getByRole('button', { name: '确认已阅读解释' }));
      await user.click(screen.getByRole('button', { name: '继续主线' }));
    }
    if (index < 4)
      await user.click(screen.getByRole('button', { name: '下一段' }));
  }
}

describe('C2 真实 App、C1 与公开模块边界联动', () => {
  it('阶段自动播放只更新阶段和态势，一次只存在一个宏观定时器', async () => {
    const user = userEvent.setup();
    render(
      <App
        input={simulatePublishedC2()}
        modules={modules}
        completionStore={makeStore()}
      />,
    );
    await enter(user);
    expect(stage()).toBe('c2-a1');
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '播放专题阶段' }));
    expect(vi.getTimerCount()).toBe(1);
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(stage()).toBe('c2-a2');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText('工程当前态势')).toHaveTextContent(
      'c2-red-a2',
    );
    expect(screen.getByLabelText('工程当前态势')).not.toHaveTextContent(
      'c2-national-a1',
    );
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(stage()).toBe('c2-a3');
    expect(screen.getByRole('button', { name: '播放专题阶段' })).toBeDisabled();
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByText('宏观示意，非真实行军路线。')).toBeVisible();
  });
  it('隐藏/失焦停止推进，返回不累计墙上时间', async () => {
    const user = userEvent.setup();
    render(<App input={simulatePublishedC2()} modules={modules} />);
    await enter(user);
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '播放专题阶段' }));
    fireEvent(window, new Event('blur'));
    await act(() => vi.advanceTimersByTimeAsync(60000));
    expect(stage()).toBe('c2-a1');
    expect(screen.getByRole('button', { name: '播放专题阶段' })).toBeEnabled();
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    fireEvent(document, new Event('visibilitychange'));
    await act(() => vi.advanceTimersByTimeAsync(60000));
    expect(stage()).toBe('c2-a1');
  });
  it('进入重点暂停宏观，首次退出恢复原阶段/书签/焦点并保持暂停', async () => {
    const user = userEvent.setup(),
      store = makeStore();
    render(
      <App
        input={simulatePublishedC2()}
        modules={modules}
        completionStore={store}
      />,
    );
    await enter(user);
    await user.click(screen.getByRole('button', { name: '工程甲·重点入口' }));
    await user.click(
      screen.getByRole('button', { name: '工程：保存当前视角' }),
    );
    const saved = camera().bookmark;
    await user.click(screen.getByRole('button', { name: '播放专题阶段' }));
    await user.click(
      screen.getByRole('button', { name: '工程：打开当前阶段事件' }),
    );
    expect(
      screen.getByRole('heading', { name: '走进这段历史' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '开始体验' }));
    await user.click(screen.getByRole('button', { name: '退出体验' }));
    await user.click(
      screen.getByRole('button', { name: '确认退出，返回沙盘' }),
    );
    expect(stage()).toBe('c2-a2');
    expect(camera().bookmark).toEqual(saved);
    expect(camera().selection).toEqual({ kind: 'event', id: 'fixture-event' });
    expect(
      screen.getByRole('button', { name: '工程：打开当前阶段事件' }),
    ).toHaveFocus();
    expect(screen.getByRole('button', { name: '播放专题阶段' })).toBeEnabled();
    expect(store.getSnapshot().records).toHaveLength(0);
    vi.useFakeTimers();
    await act(() => vi.advanceTimersByTimeAsync(12000));
    expect(stage()).toBe('c2-a2');
  });
  it('主动完成、阶段/专题切换与重播均保留记录，重新挂载仍直接阅读', async () => {
    const user = userEvent.setup(),
      store = makeStore(),
      input = simulatePublishedC2();
    const app = render(
      <App input={input} modules={modules} completionStore={store} />,
    );
    await enter(user);
    await user.click(screen.getByRole('button', { name: '工程甲·重点入口' }));
    await user.click(
      screen.getByRole('button', { name: '工程：打开当前阶段事件' }),
    );
    await user.click(screen.getByRole('button', { name: '开始等价图文体验' }));
    await finishEquivalent(user);
    expect(store.getSnapshot().records).toHaveLength(0);
    await user.click(
      screen.getByRole('button', { name: '完成体验，阅读资料' }),
    );
    expect(
      screen.getByRole('heading', { name: '工程正文（非史实）' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭面板' }));
    await user.click(screen.getByRole('button', { name: '重播当前专题' }));
    expect(stage()).toBe('c2-a1');
    expect(store.getSnapshot().records).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '工程甲·重点入口' }));
    await user.click(
      screen.getByRole('button', { name: '工程：打开当前阶段事件' }),
    );
    expect(screen.getByRole('button', { name: '重播体验' })).toBeEnabled();
    app.unmount();
    render(
      <App input={input} modules={modules} completionStore={makeStore()} />,
    );
    await enter(user);
    await user.click(screen.getByRole('button', { name: '工程甲·重点入口' }));
    await user.click(
      screen.getByRole('button', { name: '工程：打开当前阶段事件' }),
    );
    expect(screen.getByRole('button', { name: '重播体验' })).toBeEnabled();
  });
  it('专题选择与空态势不弹体验，嵌套事件保存明确目标阶段', async () => {
    const user = userEvent.setup();
    render(<App input={simulatePublishedC2()} modules={modules} />);
    await enter(user);
    await user.click(screen.getByRole('button', { name: /历史专题/ }));
    await user.click(screen.getByText('工程专题乙（非史实）', { exact: true }));
    await user.click(
      screen.getByRole('button', { name: '进入专题：工程专题乙（非史实）' }),
    );
    expect(
      screen.getByRole('heading', { name: '历史专题' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭面板' }));
    expect(stage()).toBe('c2-b1');
    await user.click(screen.getByRole('button', { name: '工程乙·资料待补' }));
    expect(stage()).toBe('c2-b2');
    expect(screen.getByLabelText('工程当前态势')).toHaveTextContent('none');
    await user.click(screen.getByRole('button', { name: /历史专题/ }));
    await user.click(screen.getByText('工程专题甲（非史实）', { exact: true }));
    await user.click(screen.getByText('工程甲·重点入口', { exact: true }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /测试事件（非史实）/,
      }),
    );
    expect(
      screen.getByRole('heading', { name: '走进这段历史' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回沙盘' }));
    expect(stage()).toBe('c2-a2');
  });
  it('人物与无坐标地点可读，关联重点仍走 C1 门槛；关闭与取消选择区分', async () => {
    const user = userEvent.setup();
    render(<App input={simulatePublishedC2()} modules={modules} />);
    await enter(user);
    await user.click(screen.getByRole('button', { name: '工程甲·重点入口' }));
    await user.click(screen.getByRole('button', { name: /历史专题/ }));
    await user.click(
      screen.getByRole('button', {
        name: '虚构测试条目（非历史人物）',
      }),
    );
    expect(
      screen.getByRole('heading', {
        name: '虚构测试条目（非历史人物）',
      }),
    ).toHaveFocus();
    await user.click(
      screen.getByRole('button', { name: /测试占位（非历史地点）/ }),
    );
    expect(
      screen.getByRole('heading', {
        name: '测试占位（非历史地点）',
      }),
    ).toHaveFocus();
    expect(screen.getByText(/地点类型：现代对照地点/)).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('region', { name: '关联历史资料' })).getByRole(
        'button',
        { name: '测试事件（非史实）' },
      ),
    );
    expect(
      screen.getByRole('heading', { name: '走进这段历史' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回沙盘' }));
    expect(stage()).toBe('c2-a2');
    expect(screen.getByRole('button', { name: '取消当前选择' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '取消当前选择' }));
    expect(camera().selection).toBeNull();
    expect(stage()).toBe('c2-a2');
  });
  it('阶段改变清空旧书签，拒绝旧地图回调打开不在当前阶段的对象', async () => {
    let latest: LongMarchSceneV2Props | null = null;
    function Map(props: LongMarchSceneV2Props) {
      latest = props;
      return <C2EngineeringMap {...props} />;
    }
    const user = userEvent.setup();
    render(<App input={simulatePublishedC2()} modules={{ ...modules, Map }} />);
    await enter(user);
    await user.click(
      screen.getByRole('button', { name: '工程：保存当前视角' }),
    );
    const old = latest!;
    await user.click(screen.getByRole('button', { name: '工程甲·重点入口' }));
    expect(camera().bookmark).toBeNull();
    act(() =>
      old.onCameraBookmark({
        sceneId: 'c2-engineering-map',
        coordinateSystem: 'scene-local',
        position: [1, 2, 3],
        target: [0, 0, 0],
        zoom: 1,
        phaseId: 'c2-a1',
      }),
    );
    act(() => old.onObjectSelect({ kind: 'event', id: 'c2-observe' }));
    expect(camera().bookmark).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('运行中撤回专题，完成记录不能解锁；不降回旧事件自动播放', async () => {
    const user = userEvent.setup(),
      input = simulatePublishedC2(),
      store = makeStore();
    store.save({
      schemaVersion: 1,
      experienceId: 'exp-feiduo-ludingqiao',
      completionPolicyVersion: 1,
      completedAt: '2026-11-01T00:00:00Z',
      completedInteractionIds: ['ld-01', 'ld-02'],
      completionMode: 'equivalent',
    });
    const app = render(
      <App input={input} modules={modules} completionStore={store} />,
    );
    await enter(user);
    await user.click(screen.getByRole('button', { name: '工程甲·重点入口' }));
    await user.click(
      screen.getByRole('button', { name: '工程：打开当前阶段事件' }),
    );
    expect(screen.getByRole('button', { name: '重播体验' })).toBeEnabled();
    const withdrawn = structuredClone(input);
    withdrawn.topics[0]!.releaseStatus = 'unpublished';
    app.rerender(
      <App input={withdrawn} modules={modules} completionStore={store} />,
    );
    expect(
      screen.getByRole('heading', { name: '暂未开放' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '工程正文（非史实）' }),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: '返回沙盘' }));
    expect(stage()).toBe('none');
    expect(screen.queryByRole('button', { name: '播放历史回放' })).toBeNull();
    expect(store.getSnapshot().records).toHaveLength(1);
  });
  it('合法空数据与非法顺序都安全，没有假阶段/部队；无 v2 地图仍可导航', async () => {
    const user = userEvent.setup();
    const app = render(<App input={emptyV2()} modules={modules} />);
    await enter(user);
    expect(screen.getByRole('button', { name: '播放历史回放' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /历史专题/ }));
    expect(
      screen.getByText('历史专题正在核验，正式内容暂未开放。'),
    ).toBeInTheDocument();
    app.unmount();
    const invalid = simulatePublishedC2();
    invalid.topics[0]!.phaseIds.reverse();
    const next = render(<App input={invalid} modules={modules} />);
    expect(screen.getByRole('alert')).toHaveTextContent('历史资料暂不可用');
    next.unmount();
    render(
      <App
        input={simulatePublishedC2()}
        modules={{ ...engineeringModules, Map: undefined }}
      />,
    );
    await enter(user);
    expect(
      screen.getByRole('button', { name: '工程甲·重点入口' }),
    ).toBeEnabled();
    expect(screen.getByText(/三维阶段图层正在接入/)).toBeInTheDocument();
  });
});
