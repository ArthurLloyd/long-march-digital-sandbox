import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { HISTORY_EMPTY_MESSAGE } from '../shared/constants/messages';

function mockMotion(reduced = true) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('reduced-motion'),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}
afterEach(() => vi.unstubAllGlobals());
async function enter() {
  mockMotion();
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: '开启征程' }));
  await screen.findByText('预览已就绪');
  return user;
}

describe('基础应用与空状态', () => {
  it('正常渲染主界面和模块入口', async () => {
    const user = await enter();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '山河之间',
    );
    expect(
      screen.getByRole('navigation', { name: '顶部导航' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByLabelText('抽象沙盘占位，不代表真实地形或历史路线'),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: '历史专题专题核验中' }),
    );
    expect(
      screen.getByRole('dialog', { name: '历史专题' }),
    ).toBeInTheDocument();
  });
  it('无正式数据时明确提示且不展示虚构路线', async () => {
    await enter();
    expect(screen.getByText(HISTORY_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText('开发预览')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '播放历史回放' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '上一个历史节点' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '下一个历史节点' }),
    ).toBeDisabled();
    expect(document.querySelector('canvas')).toBeNull();
  });
  it('资料来源和使用说明导航可操作', async () => {
    const user = await enter();
    await user.click(screen.getByRole('button', { name: '资料来源' }));
    expect(
      screen.getByText('目前尚未发布经复核的史料来源。'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭面板' }));
    await user.click(screen.getByRole('button', { name: '使用说明' }));
    expect(
      screen.getByRole('heading', { name: '从一个历史节点开始' }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(
      screen.getByRole('button', { name: '事件资料了解核验进度' }),
    );
    expect(
      screen.getByRole('heading', { name: '事件资料' }),
    ).toBeInTheDocument();
  });
  it('窄屏导航打开资料并移动键盘焦点', async () => {
    const user = await enter();
    const trigger = screen.getByRole('button', {
      name: '资料来源',
    });
    await user.click(trigger);
    expect(
      screen.getByRole('heading', { name: '资料来源与史料原则' }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });
  it('不支持全屏时提供可读反馈', async () => {
    const user = await enter();
    await user.click(screen.getByRole('button', { name: '进入全屏' }));
    expect(
      screen.getByText('此浏览器暂不支持全屏，请使用浏览器的全屏功能。'),
    ).toBeInTheDocument();
  });
});

describe('展馆进入、返回与无障碍', () => {
  it('首页包含主题和可用主入口', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: '长征 · 不灭的火种' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开启征程' })).toBeEnabled();
  });
  it('常规动画可跳过，核心交互不依赖动画结束事件', async () => {
    mockMotion(false);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '开启征程' }));
    expect(screen.getByText('山河之间，开启征程。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '立即进入' }));
    expect(screen.queryByText('山河之间，开启征程。')).not.toBeInTheDocument();
    expect(
      screen.getByRole('main', { name: '长征沙盘探索空间' }),
    ).toHaveFocus();
  });
  it('减少动画时立即进入，没有过渡遮罩', async () => {
    await enter();
    expect(
      screen.queryByRole('button', { name: '立即进入' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('main', { name: '长征沙盘探索空间' }),
    ).toHaveFocus();
  });
  it('返回首页后可再次进入，焦点回到开启征程', async () => {
    const user = await enter();
    await user.click(screen.getByRole('button', { name: '返回首页' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '开启征程' })).toHaveFocus(),
    );
    await user.click(screen.getByRole('button', { name: '开启征程' }));
    await screen.findByText('预览已就绪');
  });
  it('抽屉锁定背景并将 Tab 保持在操作区', async () => {
    const user = await enter();
    await user.click(
      screen.getByRole('button', { name: '事件资料了解核验进度' }),
    );
    expect(screen.getByRole('dialog', { name: '事件资料' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
    expect(document.querySelector('[inert]')).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', { name: '关闭面板' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: '关闭面板' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
  it('首页史料原则与作品介绍均可打开关闭', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '了解作品' }));
    expect(
      screen.getByRole('dialog', { name: '关于展馆' }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: '史料原则' }));
    expect(
      screen.getByRole('dialog', { name: '资料来源与史料原则' }),
    ).toBeInTheDocument();
  });
});
