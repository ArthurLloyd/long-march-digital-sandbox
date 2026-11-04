import { narrationSeconds } from '../../../shared/content/journey-screenplay';
import {
  journeyChapters,
  sampleJourney,
  journeyDuration,
  type JourneyPlan,
  type JourneyState,
  type JourneyCamera,
} from './journey-model';

/** Wall-clock pacing: the former 4x is the exhibition's new displayed 1x. */
export const JOURNEY_BASE_RATE = 4;
export const JOURNEY_FOLLOW_RANGE = { min: 0.5, max: 2.5, step: 0.05 } as const;
const CHAPTER_HANDOFF_SECONDS = 0.55;

/** C2's continuous exhibition transport. It has no RAF, storage or completion writes. */
export function createJourneyTransport(plan: JourneyPlan) {
  const initial = (): JourneyState => ({
    sequenceId: plan.sequences[0]?.id ?? '',
    time: 0,
    playing: false,
    speed: 1,
    unitId: 'central-red',
    camera: 'follow',
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
  const seek = (time: number) => {
    const destination = Math.max(
      0,
      Math.min(journeyDuration(plan, state.sequenceId), time),
    );
    const upcoming = new Set(
      journeyChapters(plan, state.sequenceId)
        .filter((c) => c.start + c.duration * c.arrival >= destination)
        .flatMap((c) => c.eventIds),
    );
    publish({
      ...state,
      time: destination,
      playing: false,
      pendingEventId: null,
      // Re-entering a chapter is a new arrival, even if its story was read
      // earlier. Seeking itself still never opens the events being skipped.
      seen: state.seen.filter((id) => !upcoming.has(id)),
    });
  };
  const acknowledge = () =>
    publish({ ...state, pendingEventId: null, playing: false });
  const advance = (delta: number) => {
    if (!state.playing || delta <= 0 || !Number.isFinite(delta)) return;
    const end = journeyDuration(plan, state.sequenceId);
    const next = Math.min(end, state.time + delta * state.speed);
    const cue = journeyChapters(plan, state.sequenceId)
      .filter((c) => c.pauseAtArrival !== false)
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
    if (cue && !state.cinematic)
      publish({
        ...state,
        time: cue.time,
        playing: false,
        pendingEventId: cue.id,
        seen: [...state.seen, cue.id],
      });
    else {
      const finalChapter =
        next === end && state.cinematic
          ? journeyChapters(plan, state.sequenceId).at(-1)
          : null;
      publish(
        {
          ...state,
          time: next,
          playing: next < end,
          pendingEventId: finalChapter?.eventIds.at(-1) ?? null,
        },
        next === end,
      );
    }
  };
  // Both the map and subtitles sample logical time. Only its wall-clock
  // mapping changes, so seeks and alternate speeds land on the same waypoint.
  const schedules = new Map<
    string,
    { start: number; end: number; seconds: number }[]
  >();
  const playbackSchedule = () => {
    let schedule = schedules.get(state.sequenceId);
    if (!schedule) {
      const chapters = journeyChapters(plan, state.sequenceId);
      schedule = chapters.flatMap(
        (chapter) =>
          chapter.cues?.map((cue, index, cues) => ({
            start: chapter.start + cue[0] * chapter.duration,
            end: chapter.start + (cues[index + 1]?.[0] ?? 1) * chapter.duration,
            // A sidebar postscript has no spoken line between the two chapters.
            seconds:
              cue[6] === 'annotation' &&
              index === cues.length - 1 &&
              chapter !== chapters.at(-1)
                ? CHAPTER_HANDOFF_SECONDS
                : narrationSeconds(cue[3]),
          })) ?? [
            {
              start: chapter.start,
              end: chapter.end,
              seconds: chapter.duration / JOURNEY_BASE_RATE,
            },
          ],
      );
      schedules.set(state.sequenceId, schedule);
    }
    return schedule;
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
    tickWallTime: (seconds: number) => {
      if (!state.playing || !Number.isFinite(seconds) || seconds <= 0) return;
      if (state.cinematic) {
        let remaining = seconds * state.speed,
          time = state.time;
        for (const cue of playbackSchedule()) {
          if (time >= cue.end) continue;
          const rate = (cue.end - cue.start) / cue.seconds;
          const needed = (cue.end - time) / rate;
          if (remaining < needed) {
            time += remaining * rate;
            break;
          }
          time = cue.end;
          remaining -= needed;
        }
        advance((time - state.time) / state.speed);
        return;
      }
      const sample = sampleJourney(plan, state.sequenceId, state.time);
      const rate = sample.stage !== 'local' ? 1.8 : 1;
      advance(seconds * JOURNEY_BASE_RATE * rate);
    },
    cinematic: (enabled: boolean) =>
      publish({ ...state, cinematic: enabled, pendingEventId: null }),
    pause,
    seek,
    acknowledge,
    visit: (id: string) =>
      publish({
        ...state,
        seen: state.seen.includes(id) ? state.seen : [...state.seen, id],
        playing: false,
      }),
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
          unitId: id === 'red25' ? 'central-red' : state.unitId,
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
      publish({
        ...state,
        distance: Math.max(
          JOURNEY_FOLLOW_RANGE.min,
          Math.min(JOURNEY_FOLLOW_RANGE.max, distance),
        ),
      }),
    unit: (unitId: string) => publish({ ...state, unitId }),
    restore: (saved: JourneyState) => {
      if (plan.sequences.some((s) => s.id === saved.sequenceId))
        publish({
          ...saved,
          unitId: saved.sequenceId === 'red25' ? 'central-red' : saved.unitId,
          playing: false,
          pendingEventId: null,
        });
    },
  };
}
export type JourneyTransport = ReturnType<typeof createJourneyTransport>;
