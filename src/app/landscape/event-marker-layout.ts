import type { MarkerProjection } from './map-renderer';
import { intersectsMapRect, type MapSafeRect } from './map-safe-area';

interface MovingLabelAnchor {
  slot: number;
  seen: number;
  moved: number;
  blockedSince: number | null;
  candidate: number;
  candidateSince: number;
}
export type MovingLabelAnchors = Map<string, MovingLabelAnchor>;

const obstructionMs = 1100;
const candidateMs = 240;
const moveCooldownMs = 2200;

function labelSlots({
  width: w,
  height: h,
}: {
  width: number;
  height: number;
}) {
  return [
    [18, 12],
    [-w - 18, 12],
    [-w / 2, -h - 18],
    [18, -h - 12],
    [-w - 18, -h - 12],
    [-w / 2, 24],
    [18, -h * 2 - 24],
    [-w - 18, -h * 2 - 24],
    [18, h + 24],
    [-w - 18, h + 24],
    [-w / 2, -h * 3 - 24],
    [-w / 2, h * 2 + 24],
  ] as const;
}

/** Remember a lane relative to the unit, never a screen position. Every frame
 * still projects the arrow and its callout together, including during camera movement.
 * Only sustained obstruction by a higher-priority label or the UI warrants a new lane. */
export function layoutMovingMapLabels(
  markers: readonly MarkerProjection[],
  viewport: { width: number; height: number },
  sizes: ReadonlyMap<string, { width: number; height: number }>,
  obstacles: readonly MapSafeRect[],
  preferredIds: ReadonlySet<string> = new Set(),
  anchors: MovingLabelAnchors = new Map(),
  now = performance.now(),
) {
  for (const [id, pin] of anchors) {
    if (
      now - pin.seen > moveCooldownMs &&
      !markers.some((m) => m.id === id && m.visible)
    )
      anchors.delete(id);
  }
  const occupied: MapSafeRect[] = [];
  const tips: MapSafeRect[] = [];
  const reservations = new Map<string, MapSafeRect>();
  const active = markers
    .filter((m) => m.visible)
    .map((m) => {
      const size = sizes.get(m.id) ?? { width: 160, height: 28 };
      const boxes = labelSlots(size).map(([dx, dy]) => ({
        x: m.x + dx,
        y: m.y + dy,
        ...size,
      }));
      const pin = anchors.get(m.id);
      if (pin) reservations.set(m.id, boxes[pin.slot]!);
      tips.push({ x: m.x - 10, y: m.y - 10, width: 20, height: 20 });
      return { m, boxes, pin };
    })
    .sort(
      (a, b) =>
        Number(preferredIds.has(b.m.id)) - Number(preferredIds.has(a.m.id)) ||
        Number(!!b.pin) - Number(!!a.pin) ||
        (a.m.id < b.m.id ? -1 : a.m.id > b.m.id ? 1 : 0),
    );

  const inBounds = (b: MapSafeRect) =>
    b.x >= 8 &&
    b.y >= 80 &&
    b.x + b.width <= viewport.width - 8 &&
    b.y + b.height <= viewport.height - 8;
  const clear = (b: MapSafeRect, group: readonly MapSafeRect[]) =>
    !group.some((r) => intersectsMapRect(b, r, 6));
  const placements = new Map<string, MapSafeRect>();
  for (const { m, boxes, pin } of active) {
    reservations.delete(m.id);
    const isClear = (b: MapSafeRect) =>
      inBounds(b) &&
      clear(b, obstacles) &&
      clear(b, occupied) &&
      clear(b, tips);
    let slot = pin?.slot ?? -1;
    if (pin) pin.seen = now;
    if (pin && isClear(boxes[slot]!)) {
      pin.blockedSince = null;
      pin.candidate = -1;
    } else {
      const reserved = [...reservations.values()];
      const best = boxes.findIndex((b) => isClear(b) && clear(b, reserved));
      if (!pin) {
        if (best < 0) continue;
        slot = best;
        anchors.set(m.id, {
          slot,
          seen: now,
          moved: -Infinity,
          blockedSince: null,
          candidate: -1,
          candidateSince: now,
        });
      } else {
        pin.blockedSince ??= now;
        if (pin.candidate !== best) {
          pin.candidate = best;
          pin.candidateSince = now;
        }
        if (
          now - pin.blockedSince >= obstructionMs &&
          now - pin.moved >= moveCooldownMs
        ) {
          if (best >= 0 && now - pin.candidateSince >= candidateMs) {
            pin.slot = slot = best;
            pin.moved = now;
            pin.blockedSince = null;
            pin.candidate = -1;
          } else if (
            best < 0 &&
            (!inBounds(boxes[slot]!) || !clear(boxes[slot]!, obstacles))
          ) {
            // All lanes behind interface chrome: keep the slot for the return.
            continue;
          }
        }
      }
    }
    const box = boxes[slot]!;
    occupied.push(box);
    placements.set(m.id, box);
  }
  return markers.map((m) => {
    const box = placements.get(m.id);
    return {
      ...m,
      labelX: box?.x ?? m.x,
      labelY: box?.y ?? m.y,
      visible: !!box,
    };
  });
}

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
