import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useExperience } from '../app/experience/use-experience';

describe('体验阶段约束', () => {
  it('快速重复进入不会跳过转场或关闭正在阅读的资料', () => {
    const { result } = renderHook(() => useExperience());
    act(() => {
      result.current[1]({ type: 'enter', reduced: false });
      result.current[1]({ type: 'enter', reduced: true });
    });
    expect(result.current[0].phase).toBe('entering');
    act(() => {
      result.current[1]({ type: 'entered' });
      result.current[1]({ type: 'open', overlay: 'sources' });
      result.current[1]({ type: 'enter', reduced: false });
    });
    expect(result.current[0]).toMatchObject({
      phase: 'exploring',
      overlay: 'sources',
    });
    act(() => {
      result.current[1]({ type: 'home' });
      result.current[1]({ type: 'entered' });
    });
    expect(result.current[0].phase).toBe('landing');
    act(() => result.current[1]({ type: 'enter', reduced: true }));
    expect(result.current[0].phase).toBe('exploring');
  });
});
