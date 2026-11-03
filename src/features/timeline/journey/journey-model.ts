export type JourneyCamera = 'overview' | 'follow' | 'free';
export interface JourneyChapter {
  id: string;
  title: string;
  dateText: string;
  regionId: string;
  topicId: string | null;
  phaseId: string | null;
  eventIds: string[];
  duration: number;
  arrival: number;
}
export interface JourneyTrack {
  id: string;
  chapterId: string;
  holdChapterIds?: string[];
  unitId: string;
  unitName: string;
  camp: 'red_army' | 'nationalist_army';
  points: [number, number][];
  sourceIds: string[];
  evidenceType: 'documented_geometry' | 'sourced_strategic_direction';
  precision: 'approximate' | 'schematic';
  limitations: string;
  dateText: string;
}
export interface JourneySequence {
  id: string;
  title: string;
  chapterIds: string[];
}
export interface JourneyPlan {
  key: string;
  sequences: JourneySequence[];
  chapters: JourneyChapter[];
  tracks: JourneyTrack[];
}
export interface JourneyState {
  sequenceId: string;
  time: number;
  playing: boolean;
  speed: number;
  unitId: string;
  camera: JourneyCamera;
  distance: number;
  pendingEventId: string | null;
  seen: string[];
}
type TimedChapter = JourneyChapter & { start: number; end: number };
const chapterCache = new WeakMap<JourneyPlan, Map<string, TimedChapter[]>>();
const trackCache = new WeakMap<JourneyTrack, number[]>();
export function journeyChapters(plan: JourneyPlan, sequenceId: string) {
  const cached = chapterCache.get(plan)?.get(sequenceId);
  if (cached) return cached;
  const sequence = plan.sequences.find((s) => s.id === sequenceId);
  let start = 0;
  const result = (sequence?.chapterIds ?? []).flatMap((id) => {
    const chapter = plan.chapters.find((c) => c.id === id);
    if (!chapter) return [];
    const item = { ...chapter, start, end: start + chapter.duration };
    start = item.end;
    return [item];
  });
  const entries = chapterCache.get(plan) ?? new Map<string, TimedChapter[]>();
  entries.set(sequenceId, result);
  chapterCache.set(plan, entries);
  return result;
}
export function journeyDuration(plan: JourneyPlan, sequenceId: string) {
  return journeyChapters(plan, sequenceId).at(-1)?.end ?? 0;
}
/** Pure sampling: seeking never depends on the nearest spatial point or past motion. */
export function sampleJourney(
  plan: JourneyPlan,
  sequenceId: string,
  time: number,
) {
  const chapters = journeyChapters(plan, sequenceId);
  const chapter = chapters.find((c) => time < c.end) ?? chapters.at(-1) ?? null;
  const progress = chapter
    ? Math.max(0, Math.min(1, (time - chapter.start) / chapter.duration))
    : 0;
  const tracks = plan.tracks.filter((t) => t.chapterId === chapter?.id);
  return { chapter, progress, tracks, transition: tracks.length === 0 };
}
export function sampleTrack(track: JourneyTrack, progress: number) {
  if (track.points.length < 2) return null;
  const distances = trackCache.get(track) ?? [0];
  if (!trackCache.has(track))
    for (let i = 1; i < track.points.length; i++) {
      const a = track.points[i - 1]!,
        b = track.points[i]!;
      distances.push(
        distances[i - 1]! +
          Math.hypot(
            (b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180),
            b[1] - a[1],
          ),
      );
    }
  trackCache.set(track, distances);
  const length = distances.at(-1)!;
  const distance = Math.max(0, Math.min(1, progress)) * length;
  let index = distances.findIndex((d, i) => i > 0 && d >= distance);
  if (index < 1) index = track.points.length - 1;
  const a = track.points[index - 1]!,
    b = track.points[index]!;
  const f =
    (distance - distances[index - 1]!) /
    Math.max(1e-9, distances[index]! - distances[index - 1]!);
  return {
    coordinates: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f] as [
      number,
      number,
    ],
    direction: [b[0] - a[0], b[1] - a[1]] as [number, number],
  };
}
