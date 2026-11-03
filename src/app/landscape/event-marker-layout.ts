import type { MarkerProjection } from './map-renderer';

/** Screen-space label packing only. Never writes back to geographic coordinates. */
export function layoutEventLabels(
  markers: readonly MarkerProjection[],
  width: number,
  height: number,
  selectedId: string | null,
) {
  const boxes: { x: number; y: number }[] = [];
  return [...markers]
    .sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId))
    .map((p) => {
      if (!p.visible) return { ...p, labelX: p.x, labelY: p.y, visible: false };
      for (const [dx, dy] of [
        [0, -15],
        [0, -55],
        [0, 25],
        [0, -95],
        [0, 65],
        [195, -15],
        [-195, -15],
        [195, -55],
        [-195, -55],
      ]) {
        const x = p.x + dx!,
          y = p.y + dy!;
        if (x < 105 || x > width - 105 || y < 115 || y > height - 32) continue;
        if (
          boxes.some((b) => Math.abs(b.x - x) < 200 && Math.abs(b.y - y) < 36)
        )
          continue;
        boxes.push({ x, y });
        return { ...p, labelX: x, labelY: y, visible: true };
      }
      return { ...p, labelX: p.x, labelY: p.y, visible: false };
    });
}
