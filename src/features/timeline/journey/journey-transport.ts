import {
  journeyChapters,
  journeyDuration,
  type JourneyPlan,
  type JourneyState,
  type JourneyCamera,
} from './journey-model';

/** C2's continuous exhibition transport. It has no RAF, storage or completion writes. */
export function createJourneyTransport(plan: JourneyPlan) {
  const initial = (): JourneyState => ({
    sequenceId: plan.sequences[0]?.id ?? '',
    time: 0,
    playing: false,
    speed: 1,
    unitId: 'central-red',
    camera: 'overview',
    distance: 1,
    pendingEventId: null,
    seen: [],
  });
  let state = initial();
  let snapshot = state;
  let lastPublication = 0;
  const listeners = new Set<() => void>();
  const frames = new Set<() => void>();
  const publish = (next: JourneyState, urgent = true) => {
    state = next;
    frames.forEach((f) => f());
    const now = performance.now();
    if (urgent || now - lastPublication >= 180) {
      snapshot = state;
      lastPublication = now;
      listeners.forEach((f) => f());
    }
  };
  const pause = () => publish({ ...state, playing: false });
  const seek = (time: number) =>
    publish({
      ...state,
      time: Math.max(
        0,
        Math.min(journeyDuration(plan, state.sequenceId), time),
      ),
      playing: false,
      pendingEventId: null,
    });
  const acknowledge = () =>
    publish({ ...state, pendingEventId: null, playing: false });
  const advance = (delta: number) => {
    if (!state.playing || delta <= 0 || !Number.isFinite(delta)) return;
    const end = journeyDuration(plan, state.sequenceId);
    const next = Math.min(end, state.time + delta * state.speed);
    const cue = journeyChapters(plan, state.sequenceId)
      .flatMap((c) =>
        c.eventIds.map((id) => ({
          id,
          time: c.start + c.duration * c.arrival,
        })),
      )
      .filter(
        (c) =>
          !state.seen.includes(c.id) && c.time >= state.time && c.time <= next,
      )
      .sort((a, b) => a.time - b.time)[0];
    if (cue)
      publish({
        ...state,
        time: cue.time,
        playing: false,
        pendingEventId: cue.id,
        seen: [...state.seen, cue.id],
      });
    else publish({ ...state, time: next, playing: next < end }, next === end);
  };
  return {
    plan,
    read: () => state,
    getSnapshot: () => snapshot,
    subscribe: (f: () => void) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    subscribeFrame: (f: () => void) => {
      frames.add(f);
      return () => {
        frames.delete(f);
      };
    },
    advance,
    pause,
    seek,
    acknowledge,
    play: () =>
      publish({
        ...state,
        pendingEventId: null,
        playing: state.time < journeyDuration(plan, state.sequenceId),
      }),
    restart: () =>
      publish({
        ...state,
        time: 0,
        seen: [],
        pendingEventId: null,
        playing: false,
      }),
    reset: () => publish(initial()),
    sequence: (id: string) => {
      if (plan.sequences.some((s) => s.id === id))
        publish({
          ...state,
          sequenceId: id,
          time: 0,
          seen: [],
          pendingEventId: null,
          playing: false,
        });
    },
    speed: (speed: number) => {
      if ([0.5, 1, 2, 4].includes(speed)) publish({ ...state, speed });
    },
    camera: (camera: JourneyCamera) => publish({ ...state, camera }),
    distance: (distance: number) =>
      publish({ ...state, distance: Math.max(0.6, Math.min(2, distance)) }),
    unit: (unitId: string) => publish({ ...state, unitId }),
    restore: (saved: JourneyState) => {
      if (plan.sequences.some((s) => s.id === saved.sequenceId))
        publish({ ...saved, playing: false, pendingEventId: null });
    },
  };
}
export type JourneyTransport = ReturnType<typeof createJourneyTransport>;
