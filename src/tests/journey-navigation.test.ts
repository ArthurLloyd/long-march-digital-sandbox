import * as THREE from 'three';
import { expect, it } from 'vitest';
import {
  browseRegionAt,
  geographicRegionAt,
  translateMarchView,
} from '../app/landscape/journey-navigation';
import {
  floatingArrowHeight,
  MARCH_PRESENTATION,
} from '../app/landscape/march-presentation';
import { projectGeo } from '../app/landscape/geography';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import {
  journeyChapters,
  sampleJourney,
  sampleTrack,
  journeyTrackProgress,
  createJourneyTransport,
} from '../features/timeline/journey';
import raw from '../data/verified/dataset.json';
import { mapSafeRects } from '../app/landscape/map-safe-area';

it('does not offset the map for a collapsed tool panel that still reports layout bounds', () => {
  const host = document.createElement('div'),
    details = document.createElement('details'),
    summary = document.createElement('summary'),
    panel = document.createElement('aside');
  summary.dataset.mapObstacle = panel.dataset.mapObstacle = 'true';
  details.append(summary, panel);
  host.append(details);
  document.body.append(host);
  host.getBoundingClientRect = () => new DOMRect(0, 0, 1200, 800);
  summary.getBoundingClientRect = () => new DOMRect(1000, 100, 160, 40);
  panel.getBoundingClientRect = () => new DOMRect(800, 150, 360, 600);
  expect(mapSafeRects(host)).toHaveLength(1);
  details.open = true;
  expect(mapSafeRects(host)).toHaveLength(2);
  host.remove();
});

it('keeps arbitrary camera orientation, zoom and composition while translating with the arrow', () => {
  const eye = new THREE.Vector3(3, 5, -2),
    target = new THREE.Vector3(2, 1, 1),
    previous = new THREE.Vector3(1, 0.2, 0);
  const offset = eye.clone().sub(target),
    composition = target.clone().sub(previous);
  for (const point of [
    new THREE.Vector3(2, 0.4, 0.3),
    new THREE.Vector3(-1, 0.7, 3),
  ]) {
    translateMarchView(eye, target, previous, point);
    expect(eye.clone().sub(target).distanceTo(offset)).toBeLessThan(1e-10);
    expect(target.clone().sub(point).distanceTo(composition)).toBeLessThan(
      1e-10,
    );
    previous.copy(point);
  }
});

it('resolves the Chishui/Zunyi overlap by declared context and changes browsing level with hysteresis', () => {
  const point = [106.368, 27.855] as const;
  expect(geographicRegionAt(point, 'chishui')).toBe('chishui');
  expect(geographicRegionAt(point, 'zunyi')).toBe('zunyi');
  const [x, z] = projectGeo(point),
    target = new THREE.Vector3(x, 0, z);
  expect(browseRegionAt(target, 4, null)).toBe('chishui');
  expect(browseRegionAt(target, 6, 'chishui')).toBe('chishui');
  expect(browseRegionAt(target, 8, 'chishui')).toBeNull();
});

it('clears a ridge under the arrow tail even when the sampled tip is in a low valley', () => {
  const floor = (_x: number, z: number) => (z < -0.1 && z > -0.18 ? 0.8 : 0.1);
  const y = floatingArrowHeight(
    new THREE.Vector3(),
    new THREE.Vector3(0, 0, 1),
    1,
    floor,
  );
  expect(y).toBeCloseTo(0.8 + MARCH_PRESENTATION.floatingLift);
});

it('keeps all four Chishui arrival glyphs at supplied crossing references instead of regional centres', () => {
  const c = createJourneyContent(raw, 'exhibition');
  for (const n of [1, 2, 3, 4]) {
    const chapter = journeyChapters(c.plan, 'central').find(
      (c) => c.id === `chapter-event-sd-${n}`,
    )!;
    const sample = sampleJourney(
      c.plan,
      'central',
      chapter.start + chapter.duration * chapter.arrival,
    );
    const track = sample.tracks.find((t) => t.unitId === 'central-red')!;
    const pose = sampleTrack(track, journeyTrackProgress(track, sample))!;
    const placements = c.map.entries.filter(
      (p) => p.eventId === `event-sd-${n}`,
    );
    expect(
      Math.min(
        ...placements.map((p) =>
          Math.hypot(
            p.anchorCoordinates[0] - pose.coordinates[0],
            p.anchorCoordinates[1] - pose.coordinates[1],
          ),
        ),
      ),
    ).toBeLessThan(0.015);
  }
});

it('accelerates cross-region presentation independently and still stops at the earliest event cue', () => {
  const c = createJourneyContent(raw, 'exhibition'),
    t = createJourneyTransport(c.plan);
  const chapter = journeyChapters(c.plan, 'central').find(
    (c) => c.id === 'chapter-event-zy',
  )!;
  t.seek(chapter.start + chapter.duration * 0.3);
  t.play();
  const start = t.read().time;
  t.tickWallTime(0.25);
  expect(t.read().time - start).toBeCloseTo(1.8);
  t.tickWallTime(100);
  expect(t.read().pendingEventId).toBe('event-zy');
  expect(t.read().time).toBeCloseTo(
    chapter.start + chapter.duration * chapter.arrival,
  );
});
