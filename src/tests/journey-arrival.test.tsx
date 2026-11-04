import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { JourneyArrival } from '../app/exhibition/JourneyArrival';
afterEach(() => vi.useRealTimers());
it('highlights an arrived event, allows immediate reading, and waits three seconds before automatic opening', () => {
  vi.useFakeTimers();
  const open = vi.fn();
  render(
    <JourneyArrival
      eventId="engineering-event"
      title="工程到达提示"
      onOpen={open}
    />,
  );
  act(() => vi.advanceTimersByTime(2999));
  expect(open).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: '已到达工程到达提示，点击阅读' }),
  );
  expect(open).toHaveBeenCalledWith('engineering-event');
});
it('opens after three seconds and cancels stale timers after a seek or unmount', () => {
  vi.useFakeTimers();
  const open = vi.fn(),
    view = render(
      <JourneyArrival eventId="a" title="A工程提示" onOpen={open} />,
    );
  act(() => vi.advanceTimersByTime(3000));
  expect(open).toHaveBeenCalledExactlyOnceWith('a');
  view.rerender(<JourneyArrival eventId="b" title="B工程提示" onOpen={open} />);
  act(() => vi.advanceTimersByTime(2000));
  view.unmount();
  act(() => vi.advanceTimersByTime(3000));
  expect(open).toHaveBeenCalledTimes(1);
});
