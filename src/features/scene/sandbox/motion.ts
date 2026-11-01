/** Pure playback math: traverses supplied segments, never invents missing segments. */
export type Point3 = readonly [number, number, number];
export function clampProgress(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
export function samplePath(points: readonly Point3[], progress: number) {
  if (!points.length) return null;
  if (points.length === 1)
    return {
      position: [...points[0]!] as [number, number, number],
      heading: 0,
    };
  const lengths = points
    .slice(1)
    .map((b, i) => Math.hypot(b[0] - points[i]![0], b[2] - points[i]![2]));
  const total = lengths.reduce((a, b) => a + b, 0);
  let distance = clampProgress(progress) * total;
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]!;
    if (distance <= length || i === lengths.length - 1) {
      const a = points[i]!,
        b = points[i + 1]!;
      const t = length > 0 ? Math.min(1, distance / length) : 0;
      return {
        position: [
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          a[2] + (b[2] - a[2]) * t,
        ] as [number, number, number],
        heading: Math.atan2(b[0] - a[0], b[2] - a[2]),
      };
    }
    distance -= length;
  }
  return null;
}
/** Hysteresis prevents models flickering into symbols at the zoom threshold. */
export function modelDetail(distance: number, previous: boolean) {
  return previous ? distance < 27 : distance < 23;
}
