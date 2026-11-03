import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChishuiSandbox } from './ChishuiSandbox';
import { RegionalObservation } from '../RegionalObservation';
const m = vi.hoisted(() => ({
  update: vi.fn(),
  camera: vi.fn(),
  reset: vi.fn(),
  dispose: vi.fn(),
  create: vi.fn(),
  fail: false,
  options: null as null | { onError(): void; onExplore(): void },
}));
vi.mock('./chishui-renderer', () => ({
  createChishuiRenderer: (
    _host: HTMLElement,
    options: NonNullable<typeof m.options>,
  ) => {
    m.options = options;
    m.create();
    if (m.fail) throw Error('WebGL unavailable');
    return {
      update: m.update,
      camera: m.camera,
      reset: m.reset,
      dispose: m.dispose,
    };
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  m.fail = false;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
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
});
function setup() {
  const onExit = vi.fn(),
    onLandscape = vi.fn();
  return {
    onExit,
    onLandscape,
    ...render(<ChishuiSandbox onExit={onExit} onLandscape={onLandscape} />),
  };
}
describe('四渡赤水真实入口与回放控制', () => {
  it('从原赤水区域入口直接进入战役沙盘，而不是另建隔离页面', () => {
    render(<RegionalObservation regionId="chishui" onExit={vi.fn()} />);
    expect(
      screen.getByRole('dialog', { name: '四渡赤水 · 战役沙盘', hidden: true }),
    ).toBeInTheDocument();
    expect(m.create).toHaveBeenCalledOnce();
  });
  it('四幕可以直接选择、上一幕下一幕，拖动进度后与三维时钟一致', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /03 三渡赤水/ }));
    expect(
      screen.getByRole('heading', { name: /三渡赤水/ }),
    ).toBeInTheDocument();
    expect(m.update).toHaveBeenLastCalledWith(44);
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    expect(m.update).toHaveBeenLastCalledWith(66);
    fireEvent.click(screen.getByRole('button', { name: '上一幕' }));
    expect(m.update).toHaveBeenLastCalledWith(44);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '28' } });
    expect(m.update).toHaveBeenLastCalledWith(28);
    expect(
      screen.getByRole('heading', { name: /二渡赤水/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '从头回看' }));
    expect(m.update).toHaveBeenLastCalledWith(0);
  });
  it('播放推进、暂停冻结，结束后可重播，且不写学习完成记录', () => {
    vi.useFakeTimers();
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    setup();
    fireEvent.click(screen.getByRole('button', { name: '播放战役回放' }));
    act(() => vi.advanceTimersByTime(1500));
    expect(
      Number((screen.getByRole('slider') as HTMLInputElement).value),
    ).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: '暂停战役回放' }));
    const last = (screen.getByRole('slider') as HTMLInputElement).value;
    act(() => vi.advanceTimersByTime(1000));
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe(last);
    fireEvent.change(screen.getByRole('slider'), { target: { value: 88 } });
    fireEvent.click(screen.getByRole('button', { name: '重新播放战役' }));
    act(() => vi.advanceTimersByTime(300));
    expect(
      Number((screen.getByRole('slider') as HTMLInputElement).value),
    ).toBeLessThan(1);
    expect(storage).not.toHaveBeenCalled();
  });
  it('镜头切换和原河谷返回出口可用，卸载释放资源', () => {
    const { onLandscape, onExit, unmount } = setup();
    fireEvent.click(screen.getByRole('button', { name: '俯瞰全局' }));
    expect(m.camera).toHaveBeenLastCalledWith('overview');
    act(() => m.options?.onExplore());
    expect(screen.getByRole('button', { name: '自由环顾' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: '复位镜头' }));
    expect(m.reset).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /河谷漫游/ }));
    expect(onLandscape).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '返回总地图' }));
    expect(onExit).toHaveBeenCalledOnce();
    unmount();
    expect(m.dispose).toHaveBeenCalledOnce();
  });
  it('史料面板暂停回放，Esc先关闭说明再退出', () => {
    const { onExit } = setup();
    fireEvent.click(screen.getByRole('button', { name: '播放战役回放' }));
    fireEvent.click(screen.getByRole('button', { name: '史料与说明' }));
    expect(
      screen.getByRole('button', { name: '播放战役回放' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /扎西会议/ })).toHaveAttribute(
      'href',
      'https://fuwu.12371.cn/2012/06/11/ARTI1339400564382590_5.shtml',
    );
    fireEvent(
      screen.getByRole('dialog', { hidden: true }),
      new Event('cancel', { bubbles: true, cancelable: true }),
    );
    expect(
      screen.queryByRole('region', { name: '沙盘史料与表现说明' }),
    ).not.toBeInTheDocument();
    expect(onExit).not.toHaveBeenCalled();
    fireEvent(
      screen.getByRole('dialog', { hidden: true }),
      new Event('cancel', { bubbles: true, cancelable: true }),
    );
    expect(onExit).toHaveBeenCalledOnce();
  });
  it('绘制失败可继续选幕阅读，不出现空白死页', async () => {
    m.fail = true;
    setup();
    await act(async () => {});
    expect(screen.getByRole('status')).toHaveTextContent('三维绘制不可用');
    expect(screen.getByRole('img')).toHaveAccessibleName(/平面方向示意/);
    fireEvent.click(screen.getByRole('button', { name: /04 四渡赤水/ }));
    expect(
      screen.getByRole('heading', { name: /四渡赤水.*出敌不意/ }),
    ).toBeInTheDocument();
  });
});
