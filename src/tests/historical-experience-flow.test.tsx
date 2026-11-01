import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import {
  CompletionStore,
  COMPLETION_STORAGE_KEY,
} from '../app/experience/experience-completion-service';
import { simulatePublishedSample } from './fixtures/c1-sample';
import { engineeringModules } from './workbench/c1-modules';
import { CompletionSettings } from '../components/experience/CompletionSettings';
import { restoreCameraBookmark } from '../app/experience/experience-context';
import type { HistoricalDetailProps } from '../shared/contracts';
import { lazy, type ComponentType } from 'react';
import type {
  EquivalentExperienceProps,
  ImmersiveExperienceProps,
} from '../shared/contracts';
import { useHistoricalExperience } from '../app/experience/use-historical-experience';
import { createExperienceCatalog } from '../app/experience/historical-experience-routing';

// Only the v1 fallback scene is mocked: missing v2/experience modules remain missing.
// These App flow tests run in jsdom; GPU lifecycle has separate scene coverage.
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
const makeStore = () =>
  new CompletionStore({ storage: () => localStorage, events: window });
async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '开启征程' }));
  await user.click(screen.getByRole('button', { name: '立即进入' }));
  await screen.findByText('预览已就绪');
}
async function openEvent(
  user: ReturnType<typeof userEvent.setup>,
  source = 'map',
) {
  if (source === 'map')
    await user.click(
      screen.getByRole('button', { name: '工程：打开地图事件' }),
    );
  if (source === 'chapter') {
    await user.click(screen.getByRole('button', { name: /历史专题/ }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /测试事件（非史实）/,
      }),
    );
  }
  if (source === 'timeline')
    await user.click(
      within(screen.getByRole('region', { name: '历史时间轴' })).getByRole(
        'button',
        { name: '测试事件（非史实）' },
      ),
    );
}
async function finishRenderer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '工程：报告准备完成' }));
  await user.click(screen.getByRole('button', { name: '工程：报告当前段落' }));
  for (let index = 0; index < 5; index++) {
    if (index > 0)
      await user.click(screen.getByRole('button', { name: '工程：前进一段' }));
    if (index === 1 || index === 3) {
      await user.click(
        screen.getByRole('button', {
          name: `工程：触发 ld-0${index === 1 ? 1 : 2}`,
        }),
      );
      expect(screen.getByRole('button', { name: '继续主线' })).toBeDisabled();
      await user.click(
        screen.getByRole('button', { name: '工程：提交完整互动响应' }),
      );
      await user.click(screen.getByRole('button', { name: '确认已阅读解释' }));
      await user.click(screen.getByRole('button', { name: '继续主线' }));
      expect(screen.getByRole('dialog')).toContainElement(
        document.activeElement as HTMLElement,
      );
    }
  }
  await user.click(screen.getByRole('button', { name: '工程：报告终点' }));
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
describe('C1 完整应用闭环（明确工程适配器）', () => {
  it('懒加载未完成也能退出，等价内容未呈现时不能确认阅读', async () => {
    const user = userEvent.setup();
    const Renderer = lazy(
      () =>
        new Promise<{ default: ComponentType<ImmersiveExperienceProps> }>(
          () => {},
        ),
    );
    const Equivalent = lazy(
      () =>
        new Promise<{ default: ComponentType<EquivalentExperienceProps> }>(
          () => {},
        ),
    );
    const store = makeStore();
    render(
      <App
        input={simulatePublishedSample()}
        modules={{ ...engineeringModules, Renderer, Equivalent }}
        completionStore={store}
      />,
    );
    await enter(user);
    await openEvent(user);
    await user.click(screen.getByRole('button', { name: '开始体验' }));
    expect(
      screen.getByText('正在加载体验组件，您仍可退出。'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '退出体验' }));
    await user.click(
      screen.getByRole('button', { name: '确认退出，返回沙盘' }),
    );
    await openEvent(user);
    await user.click(screen.getByRole('button', { name: '开始等价图文体验' }));
    expect(screen.queryByRole('button', { name: '我已阅读本段' })).toBeNull();
    expect(screen.getByRole('button', { name: '下一段' })).toBeDisabled();
    expect(store.getSnapshot().records).toHaveLength(0);
  });
  it('资料关联导航也经过首次门槛，并同步宏观选中节点', async () => {
    const user = userEvent.setup();
    const data = simulatePublishedSample();
    data.events.push({
      ...structuredClone(data.events[0]!),
      id: 'fixture-event-2',
      title: '普通工程事件',
    });
    data.topics[0]!.eventIds.push('fixture-event-2');
    data.phases[0]!.eventIds.push('fixture-event-2');
    function Details(props: HistoricalDetailProps) {
      return (
        <>
          <p>普通工程正文</p>
          <button
            onClick={() =>
              props.onNavigate({
                type: 'open_object',
                selection: { kind: 'event', id: 'fixture-event' },
              })
            }
          >
            打开关联重点事件
          </button>
        </>
      );
    }
    render(
      <App
        input={data}
        modules={{ ...engineeringModules, Details }}
        completionStore={makeStore()}
      />,
    );
    await enter(user);
    await user.click(
      within(screen.getByRole('region', { name: '历史时间轴' })).getByRole(
        'button',
        { name: '普通工程事件' },
      ),
    );
    await user.click(screen.getByRole('button', { name: '打开关联重点事件' }));
    expect(
      screen.getByRole('heading', { name: '走进这段历史' }),
    ).toBeInTheDocument();
    expect(document.querySelector('.timeline-current')).toHaveTextContent(
      '测试事件（非史实）',
    );
  });
  it.each(['map', 'chapter', 'timeline'])(
    '%s 主动入口使用相同首次门槛',
    async (source) => {
      const user = userEvent.setup();
      render(
        <App
          input={simulatePublishedSample()}
          modules={engineeringModules}
          completionStore={makeStore()}
        />,
      );
      await enter(user);
      await openEvent(user, source);
      expect(
        screen.getByRole('heading', { name: '走进这段历史' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('不代表真实人物、事件、地点或日期。'),
      ).toBeNull();
    },
  );
  it('两互动、解释与终点齐全仍须点击完成；刷新直达、重播退出保留记录与焦点', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    const data = simulatePublishedSample();
    const first = render(
      <App input={data} modules={engineeringModules} completionStore={store} />,
    );
    await enter(user);
    await user.click(
      screen.getByRole('button', { name: '工程：报告地图书签' }),
    );
    await openEvent(user);
    await user.click(screen.getByRole('button', { name: '开始体验' }));
    expect(screen.getByRole('dialog')).toContainElement(
      document.activeElement as HTMLElement,
    );
    await finishRenderer(user);
    expect(store.getSnapshot().records).toHaveLength(0);
    await user.click(
      screen.getByRole('button', { name: '完成体验，阅读资料' }),
    );
    expect(store.getSnapshot().records).toHaveLength(1);
    expect(screen.getByRole('heading', { name: '事件资料' })).toHaveFocus();
    expect(
      screen.getByRole('heading', { name: '工程正文（非史实）' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重播体验' }));
    await user.click(screen.getByRole('button', { name: '退出体验' }));
    await user.click(
      screen.getByRole('button', { name: '确认退出，返回沙盘' }),
    );
    expect(
      screen.getByRole('button', { name: '工程：打开地图事件' }),
    ).toHaveFocus();
    expect(screen.getByLabelText('工程地图书签')).toHaveTextContent(
      'engineering-map',
    );
    expect(store.getSnapshot().records).toHaveLength(1);
    first.unmount();
    render(
      <App
        input={data}
        modules={engineeringModules}
        completionStore={makeStore()}
      />,
    );
    await enter(user);
    await openEvent(user);
    expect(screen.getByRole('button', { name: '重播体验' })).toBeEnabled();
  });
  it('未完成退出不记录；错误和 reduced-motion 都不能自动通关', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    render(
      <App
        input={simulatePublishedSample()}
        modules={engineeringModules}
        completionStore={store}
      />,
    );
    await enter(user);
    await openEvent(user);
    await user.click(screen.getByRole('button', { name: '开始体验' }));
    await user.click(screen.getByRole('button', { name: '退出体验' }));
    await user.click(
      screen.getByRole('button', { name: '确认退出，返回沙盘' }),
    );
    expect(store.getSnapshot().records).toHaveLength(0);
    await openEvent(user);
    await user.click(screen.getByRole('button', { name: '开始体验' }));
    await user.click(
      screen.getByRole('button', { name: '工程：模拟 WebGL 故障' }),
    );
    expect(
      screen.getByRole('heading', { name: '体验暂时中断' }),
    ).toBeInTheDocument();
    expect(store.getSnapshot().records).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: '改用等价图文体验' }));
    await finishEquivalent(user);
    expect(store.getSnapshot().records).toHaveLength(0);
    await user.click(
      screen.getByRole('button', { name: '完成体验，阅读资料' }),
    );
    expect(store.getSnapshot().records[0]?.completionMode).toBe('equivalent');
  });
  it('页面失焦暂停，恢复仍需主动继续；超时和提前终点不保存', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    render(
      <App
        input={simulatePublishedSample()}
        modules={engineeringModules}
        completionStore={store}
      />,
    );
    await enter(user);
    await openEvent(user);
    await user.click(screen.getByRole('button', { name: '开始体验' }));
    await user.click(
      screen.getByRole('button', { name: '工程：报告准备完成' }),
    );
    fireEvent(window, new Event('blur'));
    expect(screen.getByLabelText('渲染播放命令')).toHaveTextContent('paused');
    await user.click(screen.getByRole('button', { name: '继续体验' }));
    await user.click(screen.getByRole('button', { name: '工程：报告终点' }));
    vi.useFakeTimers();
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(store.getSnapshot().records).toHaveLength(0);
    expect(
      screen.getByRole('button', { name: '完成体验，阅读资料' }),
    ).toBeDisabled();
  });
  it('无阶段兼容回放经过重点事件不打开体验，手动访问才进入', async () => {
    const user = userEvent.setup();
    const data = simulatePublishedSample();
    data.events.push({
      ...structuredClone(data.events[0]!),
      id: 'fixture-event-2',
      title: '另一个工程事件',
    });
    data.topics[0]!.phaseIds = [];
    data.phases = [];
    data.forceTracks = [];
    data.forceSnapshots = [];
    render(
      <App
        input={data}
        modules={engineeringModules}
        completionStore={makeStore()}
      />,
    );
    await enter(user);
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '播放历史回放' }));
    await act(async () => vi.advanceTimersByTimeAsync(4000));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('.timeline-current')).toHaveTextContent(
      '另一个工程事件',
    );
    fireEvent.click(screen.getByRole('button', { name: '工程：打开地图事件' }));
    expect(
      screen.getByRole('heading', { name: '走进这段历史' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回沙盘' }));
    expect(screen.getByRole('button', { name: '播放历史回放' })).toBeEnabled();
  });
  it('已发布输入撤回后立即移除正文，不受已有完成记录影响', async () => {
    const user = userEvent.setup();
    const data = simulatePublishedSample();
    const store = makeStore();
    const manifest = data.experiences[0]!;
    store.save({
      schemaVersion: 1,
      experienceId: manifest.experienceId,
      completionPolicyVersion: 1,
      completedAt: '2026-11-01T00:00:00Z',
      completedInteractionIds: manifest.requiredInteractionIds,
      completionMode: '3d',
    });
    const rendered = render(
      <App input={data} modules={engineeringModules} completionStore={store} />,
    );
    await enter(user);
    await openEvent(user);
    expect(
      screen.getByRole('heading', { name: '工程正文（非史实）' }),
    ).toBeInTheDocument();
    const withdrawn = structuredClone(data);
    withdrawn.experiences[0]!.releaseStatus = 'unpublished';
    rendered.rerender(
      <App
        input={withdrawn}
        modules={engineeringModules}
        completionStore={store}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: '工程正文（非史实）' }),
    ).toBeNull();
    expect(
      screen.getByRole('heading', { name: '暂未开放' }),
    ).toBeInTheDocument();
  });
  it('存储失败仍能当前会话完成并阅读，提示不打断', async () => {
    const user = userEvent.setup();
    const store = new CompletionStore({
      storage: () => {
        throw new Error('denied');
      },
    });
    render(
      <App
        input={simulatePublishedSample()}
        modules={engineeringModules}
        completionStore={store}
      />,
    );
    await enter(user);
    await openEvent(user);
    await user.click(screen.getByRole('button', { name: '开始等价图文体验' }));
    await finishEquivalent(user);
    await user.click(
      screen.getByRole('button', { name: '完成体验，阅读资料' }),
    );
    expect(
      screen.getByText('本次体验已完成，但浏览器无法保存长期进度。'),
    ).toBeInTheDocument();
    expect(store.getSnapshot().records).toHaveLength(1);
  });
  it('缺少适配器或降级内容时不显示假开始；减少动态允许完整等价流程', async () => {
    const user = userEvent.setup();
    const rendered = render(
      <App
        input={simulatePublishedSample()}
        modules={{}}
        completionStore={makeStore()}
      />,
    );
    await enter(user);
    await user.click(screen.getByRole('button', { name: /历史专题/ }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /测试事件（非史实）/,
      }),
    );
    expect(screen.getByRole('button', { name: '开始体验' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '开始等价图文体验' }),
    ).toBeDisabled();
    rendered.unmount();
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const store = makeStore();
    render(
      <App
        input={simulatePublishedSample()}
        modules={engineeringModules}
        completionStore={store}
      />,
    );
    await enter(user);
    await openEvent(user);
    expect(screen.getByRole('button', { name: '开始体验' })).toBeDisabled();
    expect(store.getSnapshot().records).toHaveLength(0);
  });
});
describe('清除与书签边界', () => {
  it('退出恢复原选择/阶段，隐藏页面暂停且不自动恢复', () => {
    const pauseMacro = vi.fn(),
      restoreContext = vi.fn();
    const context = {
      selection: { kind: 'event' as const, id: 'fixture-event' },
      phaseId: 'fixture-phase',
      bookmark: null,
    };
    const catalog = createExperienceCatalog(simulatePublishedSample());
    const store = makeStore();
    const { result } = renderHook(() =>
      useHistoricalExperience({
        catalog,
        modules: engineeringModules,
        store,
        context,
        pauseMacro,
        restoreContext,
      }),
    );
    act(() => result.current.openHistoricalObject(context.selection));
    act(() => result.current.start('equivalent'));
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(result.current.state.status).toBe('paused');
    act(() => result.current.exit());
    expect(restoreContext).toHaveBeenLastCalledWith(context);
    expect(pauseMacro).toHaveBeenCalled();
    expect(result.current.state.selection).toEqual(context.selection);
  });
  it('清除需要明确确认，取消不会执行', async () => {
    const user = userEvent.setup();
    const clear = vi.fn();
    render(<CompletionSettings onClear={clear} />);
    await user.click(screen.getByRole('button', { name: '清除体验记录' }));
    expect(clear).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '取消清除' }));
    expect(clear).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '清除体验记录' }));
    await user.click(screen.getByRole('button', { name: '确认清除体验记录' }));
    expect(clear).toHaveBeenCalledOnce();
  });
  it('错误 scene/phase/坐标系/数值拒绝恢复，不伪造书签', () => {
    const bookmark = {
      sceneId: 'scene',
      phaseId: 'phase',
      coordinateSystem: 'scene-local',
      position: [0, 1, 2],
      target: [0, 0, 0],
      zoom: 1,
    };
    expect(
      restoreCameraBookmark(bookmark, { sceneId: 'scene', phaseId: 'phase' }),
    ).toEqual(bookmark);
    for (const patch of [
      { sceneId: 'other' },
      { phaseId: 'other' },
      { coordinateSystem: 'WGS84' },
      { position: [NaN, 0, 0] },
    ])
      expect(
        restoreCameraBookmark(
          { ...bookmark, ...patch },
          { sceneId: 'scene', phaseId: 'phase' },
        ),
      ).toBeNull();
    expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
  });
});
