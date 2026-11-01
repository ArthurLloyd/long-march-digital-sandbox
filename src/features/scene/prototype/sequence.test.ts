import { describe, expect, it } from 'vitest';
import {
  advanceStudy,
  continueStudy,
  createStudy,
  observeStudy,
} from './sequence';

describe('isolated A0 sequence', () => {
  it('cannot skip the observation gate even with a large clock jump', () => {
    const stopped = advanceStudy(continueStudy(createStudy()), 90);
    expect(stopped.phase).toBe('observe');
    expect(stopped.elapsed).toBe(16);
    expect(continueStudy(stopped)).toBe(stopped);
    expect(advanceStudy(stopped, 100)).toBe(stopped);
  });
  it('requires both distinct observations and explicit reflection', () => {
    let state = advanceStudy(continueStudy(createStudy()), 16);
    state = observeStudy(observeStudy(state, 'bridge'), 'bridge');
    expect(state.observed).toEqual(['bridge']);
    expect(continueStudy(state)).toBe(state);
    state = continueStudy(observeStudy(state, 'banks'));
    state = advanceStudy(state, 100);
    expect(state.phase).toBe('reflect');
    expect(continueStudy(state)).toBe(state);
    state = advanceStudy(continueStudy({ ...state, confirmed: true }), 100);
    expect(state.phase).toBe('ended');
    expect(advanceStudy(state, 100).terminalCount).toBe(1);
  });
  it('pause, exit and invalid deltas cannot count as completion', () => {
    for (const phase of ['paused', 'exited'] as const) {
      const state = { ...createStudy(), phase };
      expect(advanceStudy(state, 1000)).toBe(state);
      expect(state.terminalCount).toBe(0);
    }
    const state = continueStudy(createStudy());
    expect(advanceStudy(state, NaN)).toBe(state);
    expect(advanceStudy(state, -1)).toBe(state);
  });
});
