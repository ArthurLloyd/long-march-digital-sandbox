import { expect, it } from 'vitest';
import * as THREE from 'three';
import raw from '../data/verified/dataset.json';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import {
  campaignFrames,
  campaignView,
} from '../app/landscape/campaign-framing';
import { referenceCues } from '../shared/content/journey-screenplay';
const { plan } = createJourneyContent(raw, 'exhibition');
it('frames every campaign beat with known waypoints, including the westward pursuit and the return crossing', () => {
  for (const c of plan.chapters.filter((c) => referenceCues(c.id))) {
    const frames = campaignFrames(c.id, c.cues!, plan.tracks);
    expect(frames, c.id).not.toBeNull();
    frames!.forEach((frame, i) =>
      expect(frame?.labels.length, c.cues![i]![2]).toBeGreaterThan(0),
    );
  }
  const c = plan.chapters.find((c) => c.id === 'chapter-event-sd-4')!,
    cues = c.cues!;
  const frames = campaignFrames(c.id, cues, plan.tracks);
  const i = cues.findIndex((c) => c[2] === '四渡赤水');
  const subject = new THREE.Vector3(0, 0, 0);
  const before = campaignView(
    frames,
    cues,
    cues[i]![0] - 0.000001,
    subject,
    1.75,
    1,
    0,
    false,
  )!;
  const at = campaignView(
    frames,
    cues,
    cues[i]![0],
    subject,
    1.75,
    1,
    0,
    false,
  )!;
  expect(at.labels.map((l) => l.name)).toEqual(
    expect.arrayContaining(['古蔺', '二郎滩', '太平渡']),
  );
  expect(at.position.distanceTo(before.position)).toBeLessThan(0.001);
  const moved = campaignView(
    frames,
    cues,
    cues[i]![0] + 0.001,
    subject.set(1, 20, 2),
    1.75,
    1,
    0,
    false,
  )!;
  expect(moved.position.y).toBeCloseTo(at.position.y);
});
