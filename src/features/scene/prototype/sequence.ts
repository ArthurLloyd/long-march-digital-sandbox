/** Isolated A0 engineering sequence. No historical narrative or completion record. */
export type StudyPhase =
  'idle' | 'playing' | 'paused' | 'observe' | 'reflect' | 'ended' | 'exited';
export interface StudyState {
  phase: StudyPhase;
  elapsed: number;
  observed: string[];
  confirmed: boolean;
  terminalCount: number;
}
export const createStudy = (): StudyState => ({
  phase: 'idle',
  elapsed: 0,
  observed: [],
  confirmed: false,
  terminalCount: 0,
});
export function advanceStudy(state: StudyState, delta: number): StudyState {
  if (state.phase !== 'playing' || !Number.isFinite(delta) || delta <= 0)
    return state;
  const elapsed = Math.min(60, state.elapsed + delta);
  if (state.elapsed < 16 && elapsed >= 16 && state.observed.length < 2)
    return { ...state, elapsed: 16, phase: 'observe' };
  if (state.elapsed < 40 && elapsed >= 40 && !state.confirmed)
    return { ...state, elapsed: 40, phase: 'reflect' };
  if (elapsed >= 60)
    return {
      ...state,
      elapsed: 60,
      phase: 'ended',
      terminalCount: state.terminalCount + 1,
    };
  return { ...state, elapsed };
}
export function observeStudy(
  state: StudyState,
  id: 'bridge' | 'banks',
): StudyState {
  if (state.phase !== 'observe') return state;
  return { ...state, observed: Array.from(new Set([...state.observed, id])) };
}
export function continueStudy(state: StudyState): StudyState {
  if (state.phase === 'observe' && state.observed.length !== 2) return state;
  if (state.phase === 'reflect' && !state.confirmed) return state;
  if (!['idle', 'paused', 'observe', 'reflect'].includes(state.phase))
    return state;
  return { ...state, phase: 'playing' };
}
