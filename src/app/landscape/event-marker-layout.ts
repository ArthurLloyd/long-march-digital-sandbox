import type { MarkerProjection } from './map-renderer';
import { intersectsMapRect, type MapSafeRect } from './map-safe-area';

/** Fixed screen offset from the real projected anchor. Crowding hides; it never relocates. */
export function layoutAnchoredMapLabels(
  markers: readonly MarkerProjection[],
  width: number,
  height: number,
  selectedId: string | null,
  obstacles: readonly MapSafeRect[] = [],
  options?: {
    offsets: Record<string, readonly [number, number]>;
    width: number;
  },
) {
  const occupied: MapSafeRect[] = [];
  return [...markers]
    .sort((a, b) => Number(b.id === selectedId) - Number(a.id === selectedId))
    .map((p) => {
      const offset = options?.offsets[p.id] ?? [0, 0],
        labelWidth = options?.width ?? 220;
      const labelX = p.x + offset[0],
        labelY = p.y - 15 + offset[1];
      const box = {
        x: labelX - labelWidth / 2,
        y: labelY - 42,
        width: labelWidth,
        height: 42,
      };
      const visible =
        p.visible &&
        box.x >= 8 &&
        box.x + box.width <= width - 8 &&
        box.y >= 100 &&
        labelY <= height - 18 &&
        ![...obstacles, ...occupied].some((r) => intersectsMapRect(box, r, 8));
      if (visible) occupied.push(box);
      return { ...p, labelX, labelY, visible };
    });
}

/** Screen-space label packing only. Never writes back to geographic coordinates. */
export function layoutEventLabels(
  markers: readonly MarkerProjection[],
  width: number,
  height: number,
  selectedId: string | null,
  obstacles: readonly MapSafeRect[] = [],
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
          obstacles.some((r) =>
            intersectsMapRect(
              { x: x - 100, y: y - 36, width: 200, height: 36 },
              r,
            ),
          )
        )
          continue;
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
