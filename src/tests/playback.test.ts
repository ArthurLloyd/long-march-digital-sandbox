import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDraftEvent } from '../data/fixtures/draft-dataset';
import { usePlayback } from '../features/timeline/use-playback';

afterEach(() => vi.useRealTimers());
describe('时间轴控制', () => {
  it('空数据时不播放，进度为零', () => {
    const { result } = renderHook(() => usePlayback([]));
    act(() => result.current.toggle());
    expect(result.current.activeEvent).toBeNull();
    expect(result.current.playing).toBe(false);
    expect(result.current.progress).toBe(0);
  });
  it('选择、关闭、播放和自动停止保持一致', () => {
    vi.useFakeTimers();
    const events = [
      createDraftEvent(),
      { ...createDraftEvent(), id: 'fixture-2' },
    ];
    const { result } = renderHook(() => usePlayback(events));
    act(() => result.current.select('fixture-2'));
    expect(result.current.progress).toBe(1);
    act(() => result.current.close());
    expect(result.current.activeEvent).toBeNull();
    act(() => result.current.toggle());
    expect(result.current.activeEvent?.id).toBe('fixture-event');
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.activeEvent?.id).toBe('fixture-2');
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.playing).toBe(false);
  });
});
