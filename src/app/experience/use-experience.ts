import { useReducer } from 'react';
export type Overlay = 'chapters' | 'history' | 'sources' | 'guide' | 'about';
type State = {
  phase: 'landing' | 'entering' | 'exploring';
  overlay: Overlay | null;
};
type Action =
  | { type: 'enter'; reduced: boolean }
  | { type: 'entered' }
  | { type: 'home' }
  | { type: 'open'; overlay: Overlay }
  | { type: 'close' };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'enter':
      if (state.phase !== 'landing') return state;
      return {
        phase: action.reduced ? 'exploring' : 'entering',
        overlay: null,
      };
    case 'entered':
      return state.phase === 'entering'
        ? { ...state, phase: 'exploring' }
        : state;
    case 'home':
      return { phase: 'landing', overlay: null };
    case 'open':
      return { ...state, overlay: action.overlay };
    case 'close':
      return { ...state, overlay: null };
  }
}
export function useExperience() {
  return useReducer(reducer, { phase: 'landing', overlay: null });
}
