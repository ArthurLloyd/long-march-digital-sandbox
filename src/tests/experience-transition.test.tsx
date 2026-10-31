import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExperienceTransition } from '../components/transition/ExperienceTransition';

afterEach(() => vi.useRealTimers());

describe('进入确认必须由用户完成', () => {
  it('等待一分钟也不自动跳转，激活立即进入才完成', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<ExperienceTransition onComplete={onComplete} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: '立即进入' })).toHaveFocus();
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '立即进入' }));
    expect(onComplete).toHaveBeenCalledOnce();
  });
  it('支持返回、Esc和Tab约束，长按Enter不意外确认', () => {
    const onCancel = vi.fn();
    render(<ExperienceTransition onComplete={vi.fn()} onCancel={onCancel} />);
    const confirm = screen.getByRole('button', { name: '立即进入' });
    const cancel = screen.getByRole('button', { name: '返回首页' });
    expect(fireEvent.keyDown(confirm, { key: 'Enter', repeat: true })).toBe(
      false,
    );
    fireEvent.keyDown(confirm, { key: 'Tab', shiftKey: true });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(cancel, { key: 'Tab' });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(confirm, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
