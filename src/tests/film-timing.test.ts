import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import raw from '../data/verified/dataset.json';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import { journeyChapters, createJourneyTransport } from '../features/timeline';
import { createMarchLayer } from '../app/landscape/march-layer';
import { projectGeo } from '../app/landscape/geography';
import {
  narrationSeconds,
  subtitleAt,
} from '../shared/content/journey-screenplay';

const { plan } = createJourneyContent(raw, 'exhibition');
describe('narrated map', () => {
  it('arrives at each spoken location even after jumping backwards', () => {
    const transport = createJourneyTransport(plan),
      layer = createMarchLayer(new THREE.Scene(), () => 0);
    transport.cinematic(true);
    layer.setTransport(transport);
    const shots = [
      ['chapter-event-js', '贵阳方向', 'march-jinsha', 1],
      ['chapter-event-js', '皎平渡', 'march-jinsha', 4],
      ['chapter-event-sd-2', '重占遵义', 'march-sd3', 1],
      ['chapter-event-sd-2', '二渡赤水', 'march-sd2', 1],
      ['chapter-event-sd-4', '四渡赤水', 'march-sd4', 1],
    ] as const;
    for (const [id, title, route, vertex] of shots) {
      const chapter = journeyChapters(plan, 'central').find(
        (c) => c.id === id,
      )!;
      const at = chapter.cues!.find((c) => c[2] === title)![0];
      transport.seek(chapter.start + chapter.duration * at);
      const point = layer.update(2)!.point;
      const [x, z] = projectGeo(
        plan.tracks.find((t) => t.id === route)!.points[vertex]!,
      );
      expect(point.x, title).toBeCloseTo(x);
      expect(point.z, title).toBeCloseTo(z);
    }
    layer.dispose();
  });
  it('shows the final book once on natural film completion, not on seek', () => {
    const t = createJourneyTransport(plan);
    t.cinematic(true);
    const end = journeyChapters(plan, 'central').at(-1)!.end;
    t.seek(end);
    expect(t.read().pendingEventId).toBeNull();
    t.seek(end - 0.01);
    t.play();
    t.advance(1);
    expect(t.read()).toMatchObject({
      playing: false,
      pendingEventId: 'ex-event-jiangtai',
    });
    t.acknowledge();
    t.advance(1);
    expect(t.read().pendingEventId).toBeNull();
  });
  it('can pause on a sidebar postscript, then resume straight into the next narrated chapter', () => {
    const t = createJourneyTransport(plan);
    const [opening, next] = journeyChapters(plan, 'central');
    const last = opening!.cues!.at(-1)!;
    expect(last[6]).toBe('annotation');
    const start = opening!.start + opening!.duration * last[0];
    t.cinematic(true);
    t.seek(start);
    t.tickWallTime(3);
    expect(t.read().time).toBe(start);
    t.play();
    t.tickWallTime(0.35);
    expect(t.read().time).toBeLessThan(next!.start);
    t.tickWallTime(0.5);
    const firstLine = next!.cues![0]!;
    const span = next!.duration * next!.cues![1]![0];
    expect(t.read().time).toBeCloseTo(
      next!.start + (0.3 * span) / narrationSeconds(firstLine[3]),
      6,
    );
    expect(t.read().playing).toBe(true);
    expect(t.read().pendingEventId).toBeNull();
  });
  it('reads spoken lines at narration pace and carries a half-second breath across chapter boundaries at 2×', () => {
    for (const seq of plan.sequences) {
      const t = createJourneyTransport(plan);
      t.sequence(seq.id);
      t.cinematic(true);
      t.speed(2);
      t.play();
      const chapters = journeyChapters(plan, seq.id);
      for (const chapter of chapters) {
        for (const [i, cue] of chapter.cues!.entries()) {
          const end =
            chapter.start + (chapter.cues![i + 1]?.[0] ?? 1) * chapter.duration;
          const handoff =
            chapter !== chapters.at(-1) &&
            i === chapter.cues!.length - 1 &&
            cue[6] === 'annotation';
          t.tickWallTime((handoff ? 0.55 : narrationSeconds(cue[3])) / 2);
          expect(t.read().time, chapter.id).toBeCloseTo(end, 6);
        }
      }
    }
    const long =
      '部队沿着河岸继续行军，前锋在河边寻找渡口，其余各部在身后掩护，准备分批渡河。';
    expect(subtitleAt(long, 0)).not.toBe(long);
    expect(subtitleAt(long, 1)).toMatch(/渡河。$/u);
  });
});
