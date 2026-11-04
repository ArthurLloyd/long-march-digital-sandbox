import { tongziHandoff, type Cue } from './journey-screenplay';

// A decimal cue or vertex selects an instant within a shot or registered
// segment. These are editorial fractions, never new historical coordinates.
type Stops = readonly (readonly [cue: number, vertex: number])[];
// These pursuit arrows indicate pressure toward a region. Keep a gap at
// the target town: the cited action does not establish capture of the town.
const approachZhaxi = 0.78;
const approachTongzi = 0.84;
const departYudu = 0.055;
const departErlang = 0.06;
const departJiaoping = 0.12;

// Two consecutive chapters sometimes share a movement. Reuse the actual
// track at both ends so there is no cut back to the bank after crossing.
const passes: Record<string, Record<string, string>> = {
  'chapter-event-zy-resolution': {
    'march-blue-sd1-north': 'film-zhaxi-pressure',
  },
  'chapter-ex-event-yudu-crossing': {
    'march-yudu-blockades': 'film-depart-yudu',
  },
  'chapter-event-sd-2': { 'march-sd3': 'film-return-zunyi' },
  'chapter-event-sd-3': { 'march-blue-sd4-chuan': 'film-west-pursuit' },
  'chapter-event-sd-4': {
    'film-feint': 'film-feint-continues',
    'march-jinsha': 'film-depart-erlang',
  },
  'chapter-event-js': { 'march-anshunchang': 'film-depart-jiaoping' },
};
export function filmTrackPass(trackId: string, chapterId: string) {
  return passes[chapterId]?.[trackId];
}

const stops: Record<string, Stops> = {
  'march-red25-departure': [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  'march-red25-yongping': [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  'march-red25-ganquan': [
    [0, 0],
    [1, 0.3],
    [2, 1],
  ],
  // After assembly, the film hands off to the registered Yudu–Xinfeng
  // direction. The next chapter resumes from the exact same progress.
  'film-depart-yudu': [
    [1, 0],
    [2, departYudu],
    [3, departYudu],
  ],
  'march-yudu-blockades': [
    [0, departYudu],
    [1, departYudu],
    [2, 3],
  ],
  // These two Hunan columns are pursuers. Delay their reveal until the
  // westbound red column has passed both departure longitudes. Actual
  // blocking positions are the registered garrisons at Xing'an and Quanzhou.
  'enemy-map-xiangjiang-jiahe': [
    [1.43, 0],
    [2, 1],
  ],
  'enemy-map-xiangjiang-linwu': [
    [1.36, 0],
    [2, 2],
  ],
  'march-sidu-approach': [
    [0, 0],
    [2, 0],
    [3, 1],
  ],
  'march-sd1': [
    [0, 0],
    [4, 0],
    [5, 1],
    [6, 2],
    [7, 3],
  ],
  'march-sd1-right': [
    [4, 0],
    [5, 1],
  ],
  'march-blue-sd1-flank': [
    [1, 0],
    [3, 1],
  ],
  'march-blue-sd1-north': [
    [5, 0],
    [6.75, approachZhaxi],
  ],
  'film-zhaxi-pressure': [[0, approachZhaxi]],
  'march-sd2': [
    [0, 0],
    [1, 0],
    [2, 1],
    [3, 2],
  ],
  'march-sd2-alt': [
    [0, 0],
    [1, 0],
    [2, 1],
    [3, 2],
  ],
  'march-blue-sd2-chuan': [
    [2, 0],
    [4, 1],
  ],
  'march-blue-sd2-qian': [
    [3, 0],
    [3 + tongziHandoff, approachTongzi],
  ],
  'march-blue-sd2-wu': [
    [3, 0],
    [5, 1],
  ],
  'film-return-zunyi': [
    [3, 0],
    [3 + tongziHandoff, 0],
    [4, 1],
  ],
  'film-feint': [
    [3, 0],
    [4, 0.45],
    [5, 0.65],
  ],
  'film-feint-continues': [
    [0, 0.65],
    [1.65, 1],
  ],
  'film-west-pursuit': [
    [4, 0],
    [5, 0.48],
  ],
  'march-sd3': [
    [0, 1],
    [1, 1],
    [2, 2],
    [3, 3],
  ],
  'march-blue-sd3-chuan': [
    [0, 0],
    [1, 1],
  ],
  'march-sd4': [
    [0, 0],
    [1, 0],
    [2, 1],
  ],
  'march-sd4-alt': [
    [0, 0],
    [1, 0],
    [2, 1],
  ],
  'march-blue-sd4-chuan': [
    [0, 0.48],
    [1.55, 1],
  ],
  'film-depart-erlang': [
    [2.08, 0],
    [3, departErlang / 2],
    [4, departErlang],
  ],
  'march-jinsha': [
    [0, departErlang],
    [1, 1],
    [2, 1],
    [3, 3],
    [4, 3],
    [5, 4],
  ],
  'enemy-map-jinsha-sundu': [
    [1, 0],
    [2, 1],
  ],
  'film-depart-jiaoping': [
    [5.18, 0],
    [6, departJiaoping],
  ],
  'march-anshunchang': [
    [0, departJiaoping],
    [1, departJiaoping],
    [2, 3],
  ],
};

function between(values: readonly number[], index: number) {
  const i = Math.floor(index);
  const here = values[i] ?? 1;
  return here + ((values[i + 1] ?? 1) - here) * (index - i);
}
export function filmMovement(
  id: string,
  cues: readonly Cue[],
  progress: number,
  vertexFractions: readonly number[],
) {
  const keys = stops[id];
  if (!keys) return null;
  const time = (index: number) => {
    const i = Math.floor(index);
    const here = cues[i]?.[0] ?? 1;
    return here + ((cues[i + 1]?.[0] ?? 1) - here) * (index - i);
  };
  const fraction = (index: number) => between(vertexFractions, index * 128);
  let previous = keys[0]!;
  if (progress < time(previous[0]))
    return { visible: false, progress: fraction(previous[1]) };
  for (let i = 1; i < keys.length; i++) {
    const next = keys[i]!;
    if (progress < time(next[0])) {
      const t =
        (progress - time(previous[0])) / (time(next[0]) - time(previous[0]));
      // Ease into and out of a stop but carry speed through intermediate
      // vertices. A unit does not halt each time its traced direction bends.
      const departing = i === 1 || keys[i - 2]![1] === previous[1];
      const arriving = i === keys.length - 1 || keys[i + 1]![1] === next[1];
      const t2 = t * t;
      const mix =
        t +
        (departing ? -t * (1 - t) * (1 - t) : 0) +
        (arriving ? t2 * (1 - t) : 0);
      return {
        visible: true,
        progress:
          fraction(previous[1]) +
          (fraction(next[1]) - fraction(previous[1])) * mix,
      };
    }
    previous = next;
  }
  // Completed inclinations are subdued in the map layer while their
  // positions remain anchored; scrubbing restores the instant of contact.
  const endedAt = time(previous[0]);
  const decay =
    id === 'film-zhaxi-pressure'
      ? 1
      : Math.min(1, (progress - endedAt) / 0.035);
  return { visible: true, progress: fraction(previous[1]), decay };
}
