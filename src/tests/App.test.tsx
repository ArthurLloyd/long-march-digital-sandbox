import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { HISTORY_EMPTY_MESSAGE } from '../shared/constants/messages';

describe('基础应用与空状态', () => {
  it('正常渲染主界面和模块入口', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('长征');
    expect(
      screen.getByRole('navigation', { name: '顶部导航' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByLabelText('抽象沙盘占位，不代表真实地形或历史路线'),
    ).toBeInTheDocument();
  });
  it('无正式数据时明确提示且不展示虚构路线', async () => {
    render(<App />);
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
    await screen.findByText('预览已就绪');
  });
  it('资料来源和使用说明导航可操作', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '资料来源' }));
    expect(
      screen.getByText('目前尚未发布经复核的史料来源。'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '使用说明' }));
    expect(
      screen.getByRole('heading', { name: '从一个历史节点开始' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '历史专题' }));
    expect(
      screen.getByRole('heading', { name: '事件资料' }),
    ).toBeInTheDocument();
  });
  it('窄屏导航将所选资料带入视图并移动键盘焦点', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    try {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole('button', { name: '资料来源' }));
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start',
      });
      expect(screen.getByRole('heading', { name: '资料来源' })).toHaveFocus();
    } finally {
      vi.unstubAllGlobals();
      delete (HTMLElement.prototype as { scrollIntoView?: unknown })
        .scrollIntoView;
    }
  });
  it('不支持全屏时提供可读反馈', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '进入全屏' }));
    expect(
      screen.getByText('此浏览器暂不支持全屏，请使用浏览器的全屏功能。'),
    ).toBeInTheDocument();
  });
});
