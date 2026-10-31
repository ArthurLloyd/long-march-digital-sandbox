import { useCallback, useEffect, useReducer } from 'react';
import type { HistoryEvent } from '../../shared/contracts';

type State = { index: number; playing: boolean; closed: boolean };
type Action =
  | { type: 'select'; index: number }
  | { type: 'toggle' }
  | { type: 'tick'; count: number }
  | { type: 'close' };

function reducer(state: State, action: Action): State {
  if (action.type === 'select')
    return { index: action.index, playing: false, closed: false };
  if (action.type === 'close')
    return { ...state, playing: false, closed: true };
  if (action.type === 'toggle')
    return { ...state, playing: !state.playing, closed: false };
  const next = state.index + 1;
  return next >= action.count
    ? { ...state, playing: false }
    : { index: next, playing: true, closed: false };
}

export function usePlayback(events: readonly HistoryEvent[]) {
  const [state, dispatch] = useReducer(reducer, {
    index: 0,
    playing: false,
    closed: false,
  });
  const index = Math.max(0, Math.min(state.index, events.length - 1));
  const playing = state.playing && events.length > 1;
  const close = useCallback(() => dispatch({ type: 'close' }), []);
  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(
      () => dispatch({ type: 'tick', count: events.length }),
      4000,
    );
    return () => window.clearInterval(interval);
  }, [playing, events.length]);

  return {
    activeEvent: state.closed ? null : (events[index] ?? null),
    index,
    playing,
    progress: events.length > 1 ? index / (events.length - 1) : 0,
    select: (id: string) => {
      const found = events.findIndex((event) => event.id === id);
      if (found >= 0) dispatch({ type: 'select', index: found });
    },
    previous: () => dispatch({ type: 'select', index: Math.max(0, index - 1) }),
    next: () =>
      dispatch({
        type: 'select',
        index: Math.min(events.length - 1, index + 1),
      }),
    toggle: () => {
      if (events.length > 1) {
        if (!playing && index === events.length - 1)
          dispatch({ type: 'select', index: 0 });
        dispatch({ type: 'toggle' });
      }
    },
    close,
  };
}
