import { expect, it } from 'vitest';
import * as THREE from 'three';
import raw from '../data/verified/dataset.json';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import {
  createJourneyTransport,
  journeyChapters,
} from '../features/timeline/journey';
import { createMarchLayer } from '../app/landscape/march-layer';
import { projectGeo } from '../app/landscape/geography';
import {
  layoutMovingMapLabels,
  type MovingLabelAnchors,
} from '../app/landscape/event-marker-layout';
import { intersectsMapRect } from '../app/landscape/map-safe-area';
import {
  combineTerrainFields,
  type TerrainField,
} from '../app/landscape/terrain-field';

it('keeps moving labels near their own tip, clear of events and other units in the same frame', () => {
  const sizes = new Map([
    ['red', { width: 150, height: 28 }],
    ['blue', { width: 140, height: 28 }],
  ]);
  const event = { x: 520, y: 290, width: 200, height: 42 };
  const first = layoutMovingMapLabels(
    [
      { id: 'red', x: 500, y: 300, visible: true },
      { id: 'blue', x: 480, y: 330, visible: true },
    ],
    { width: 1200, height: 800 },
    sizes,
    [event],
    new Set(['red']),
  );
  const boxes = first
    .filter((p) => p.visible)
    .map((p) => ({ x: p.labelX, y: p.labelY, ...sizes.get(p.id)! }));
  expect(boxes).toHaveLength(2);
  expect(boxes.every((b) => !intersectsMapRect(b, event, 6))).toBe(true);
  expect(intersectsMapRect(boxes[0]!, boxes[1]!, 6)).toBe(false);
  for (const p of first) {
    const size = sizes.get(p.id)!;
    const edgeDistance = Math.hypot(
      Math.max(p.labelX - p.x, p.x - p.labelX - size.width, 0),
      Math.max(p.labelY - p.y, p.y - p.labelY - size.height, 0),
    );
    expect(edgeDistance).toBeLessThan(35);
  }
  const moved = layoutMovingMapLabels(
    [{ id: 'red', x: 800, y: 400, visible: true }],
    { width: 1200, height: 800 },
    sizes,
    [],
  )[0]!;
  expect(moved.labelX).toBeGreaterThan(800);
  expect(moved.labelY).toBeGreaterThanOrEqual(400);
});

it('does not leave a visible stale label for an offscreen arrow', () => {
  expect(
    layoutMovingMapLabels(
      [{ id: 'red', x: 500, y: 300, visible: false }],
      { width: 1200, height: 800 },
      new Map(),
      [],
    )[0]!.visible,
  ).toBe(false);
});

it('joins Zunyi and Chishui source surfaces without holes or extra source extrema', () => {
  const field = (
    bounds: TerrainField['worldBounds'],
    value: number,
  ): TerrainField => ({
    worldBounds: bounds,
    contains: (x, z) =>
      x >= bounds[0] && x <= bounds[2] && z >= bounds[1] && z <= bounds[3],
    metres: () => value,
    height: () => value / 1000,
  });
  const a = field([0, 0, 2, 2], 100),
    b = field([1, 0, 3, 2], 200),
    combined = combineTerrainFields([a, b]);
  expect(combined.worldBounds).toEqual([0, 0, 3, 2]);
  expect(combined.metres(0.5, 1)).toBe(100);
  expect(combined.metres(2.5, 1)).toBe(200);
  for (let x = 0; x <= 3; x += 0.05) {
    expect(combined.contains(x, 1)).toBe(true);
    expect(combined.height(x, 1, 12)).toBeGreaterThanOrEqual(0.1);
    expect(combined.height(x, 1, 12)).toBeLessThanOrEqual(0.2);
  }
  expect(a.worldBounds).toEqual([0, 0, 2, 2]);
});

it('pins all seven marching callouts to their own moving tips through momentary crossing obstacles, regardless of projection order', () => {
  const ids = Array.from({ length: 7 }, (_, i) => 'yudu-column-' + i);
  const size = { width: 76, height: 26 };
  const sizes = new Map(ids.map((id) => [id, size]));
  const anchors: MovingLabelAnchors = new Map();
  const offsets = new Map<string, [number, number]>();
  for (let frame = 0; frame < 240; frame++) {
    const markers = ids.map((id, i) => ({
      id,
      x: 280 + i * 128 - frame * 0.35,
      y: 400 + Math.sin(frame / 24 + i) * 12,
      visible: true,
    }));
    const obstacle =
      frame % 40 < 18 && frame > 0
        ? [{ x: markers[3]!.x + 16, y: 400, width: 85, height: 42 }]
        : [];
    const labels = layoutMovingMapLabels(
      frame % 2 ? markers : markers.reverse(),
      { width: 1440, height: 900 },
      sizes,
      obstacle,
      new Set(),
      anchors,
      (frame * 1000) / 60,
    );
    for (const l of labels) {
      expect(l.visible).toBe(true);
      const offset: [number, number] = [l.labelX - l.x, l.labelY - l.y];
      const first = offsets.get(l.id) ?? offset;
      expect(offset[0]).toBeCloseTo(first[0], 7);
      expect(offset[1]).toBeCloseTo(first[1], 7);
      offsets.set(l.id, first);
    }
  }
});

it('changes lane once for a lasting obstruction, stays there when it clears and hides as soon as its arrow goes offscreen', () => {
  const anchors: MovingLabelAnchors = new Map();
  const offsets = new Set<string>();
  for (let frame = 0; frame < 310; frame++) {
    const x = 530 + frame / 3,
      y = 380;
    const blocked = frame > 8 && frame < 200;
    const l = layoutMovingMapLabels(
      [{ id: 'red', x, y, visible: frame !== 309 }],
      { width: 1280, height: 720 },
      new Map([['red', { width: 90, height: 28 }]]),
      blocked ? [{ x: x + 15, y: y + 10, width: 100, height: 32 }] : [],
      new Set(),
      anchors,
      (frame * 1000) / 60,
    )[0]!;
    expect(l.visible).toBe(frame !== 309);
    if (l.visible) {
      const offset = [Math.round(l.labelX - x), Math.round(l.labelY - y)].join(
        ',',
      );
      offsets.add(offset);
      if (frame < 65) expect(offset).toBe('18,12');
      if (frame > 85) expect(offset).not.toBe('18,12');
    }
  }
  expect(offsets.size).toBe(2);
});

it('follows the projected tips of all seven actual Yudu units for the whole convergence without lane flicker', () => {
  const { plan } = createJourneyContent(raw, 'exhibition');
  const chapterId = 'chapter-ex-event-yudu-assembly';
  const transport = createJourneyTransport(plan);
  const sequence = plan.sequences.find((s) =>
    s.chapterIds.includes(chapterId),
  )!;
  transport.sequence(sequence.id);
  transport.cinematic(true);
  const chapter = journeyChapters(plan, sequence.id).find(
    (c) => c.id === chapterId,
  )!;
  const units = plan.formations!.filter(
    (f) => f.chapterId === chapterId && f.camp === 'red_army',
  );
  const ids = new Set(units.map((u) => 'march:' + u.id));
  const [x, z] = projectGeo(units[0]!.anchor);
  const viewport = { width: 1600, height: 900 };
  const camera = new THREE.PerspectiveCamera(
    45,
    viewport.width / viewport.height,
    0.01,
    100,
  );
  const scene = new THREE.Scene(),
    layer = createMarchLayer(scene, () => 1);
  const sizes = new Map([...ids].map((id) => [id, { width: 80, height: 28 }]));
  const anchors: MovingLabelAnchors = new Map();
  const seen = new Map<string, { dx: number; dy: number; moved: number }>();
  let movedTips = 0;
  let previousX = 0;
  layer.setTransport(transport);
  try {
    for (let frame = 0; frame <= 180; frame++) {
      const t = frame / 180,
        now = t * chapter.duration * 1000;
      transport.seek(chapter.start + chapter.duration * t * 0.9999);
      layer.update(2);
      camera.position.set(x + 0.3 + t * 0.12, 2.7, z + 2);
      camera.lookAt(x, 1, z);
      camera.updateMatrixWorld();
      const markers = layer
        .projections(camera, viewport.width, viewport.height)
        .filter((m) => ids.has(m.id));
      expect(markers).toHaveLength(7);
      const labels = layoutMovingMapLabels(
        markers,
        viewport,
        sizes,
        [],
        new Set(),
        anchors,
        now,
      );
      expect(labels.filter((l) => l.visible)).toHaveLength(7);
      if (frame && Math.abs(markers[0]!.x - previousX) > 0.001) movedTips++;
      previousX = markers[0]!.x;
      for (const label of labels) {
        const tip = markers.find((m) => m.id === label.id)!;
        const dx = Math.round(label.labelX - tip.x),
          dy = Math.round(label.labelY - tip.y);
        const old = seen.get(label.id);
        if (old && (old.dx !== dx || old.dy !== dy)) {
          expect(now - old.moved).toBeGreaterThanOrEqual(2200);
          seen.set(label.id, { dx, dy, moved: now });
        } else if (!old) seen.set(label.id, { dx, dy, moved: -Infinity });
      }
    }
    expect(movedTips).toBeGreaterThan(100);
  } finally {
    layer.dispose();
  }
});
