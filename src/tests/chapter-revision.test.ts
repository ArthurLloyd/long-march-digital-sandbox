import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import raw from '../data/verified/dataset.json';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import {
  createJourneyTransport,
  journeyChapters,
  sampleJourney,
} from '../features/timeline/journey';
import { createMarchLayer } from '../app/landscape/march-layer';
import { createChapterLandmark } from '../app/landscape/chapter-landmark';
import { eventTerrainBounds } from '../app/landscape/event-terrain';
import provenance from '../app/landscape/data/event-terrain/provenance.json';
import {
  eventNarrative,
  teachingKnowledge,
  readingCopy,
} from '../app/exhibition/story-display';
import { projectGeo } from '../app/landscape/geography';
import { layoutMovingMapLabels } from '../app/landscape/event-marker-layout';

const content = () => createJourneyContent(raw, 'exhibition');
function map() {
  const c = content(),
    t = createJourneyTransport(c.plan),
    scene = new THREE.Scene(),
    layer = createMarchLayer(scene, () => 1);
  layer.setTransport(t);
  return {
    c,
    t,
    scene,
    layer,
    seek(id: string, p = 0.55) {
      const s = c.plan.sequences.find((s) => s.chapterIds.includes(id))!;
      t.sequence(s.id);
      const chapter = journeyChapters(c.plan, s.id).find((c) => c.id === id)!;
      t.seek(chapter.start + chapter.duration * p);
      layer.update(2);
    },
    visible() {
      const objects: THREE.Object3D[] = [];
      scene.traverseVisible((o) => {
        if (o instanceof THREE.Mesh) objects.push(o);
      });
      return objects;
    },
  };
}

it('keeps every chapter readable in exploration and draws enemy formations only from registered geographic tracks', () => {
  const a = map();
  for (const chapter of a.c.plan.chapters) {
    a.seek(chapter.id);
    const stage = a.c.campaign.stages.find((s) =>
      s.chapterIds.includes(chapter.id),
    )!;
    const meshes = a.visible() as THREE.Mesh[];
    const red = meshes.filter(
      (m) =>
        (m.material as THREE.MeshBasicMaterial).color?.getHex() === 0xdc4c48 ||
        (m.material as THREE.MeshBasicMaterial).color?.getHex() === 0xf26357,
    );
    expect(red.length, chapter.id).toBeGreaterThan(0);
    expect(stage).toBeDefined();
    const blueGlyphs = meshes.filter((m) =>
      [0x669ad4, 0x71baff].includes(
        (m.material as THREE.MeshBasicMaterial).color?.getHex(),
      ),
    );
    for (const glyph of blueGlyphs.filter(
      (g) => g.name.endsWith(':arrow') || g.name.startsWith('formation:'),
    )) {
      expect(
        a.c.plan.tracks.some(
          (t) =>
            t.camp === 'nationalist_army' && glyph.name === t.id + ':arrow',
        ),
        glyph.name,
      ).toBe(true);
    }
    expect(
      a.c.plan.formations?.some(
        (u) => u.chapterId === chapter.id && u.camp === 'nationalist_army',
      ),
    ).toBe(false);
  }
  a.layer.dispose();
  expect(a.scene.children).toHaveLength(0);
});

it('Yudu has seven individually named moving arrows and removes the old held primary arrow; pause and seek are deterministic', () => {
  const a = map();
  a.seek('chapter-ex-event-yudu-assembly', 0.1);
  const units = a.c.plan.formations!.filter(
    (f) =>
      f.chapterId === 'chapter-ex-event-yudu-assembly' && f.camp === 'red_army',
  );
  expect(units.map((u) => u.unitName)).toEqual([
    '红一军团',
    '红三军团',
    '红五军团',
    '红八军团',
    '红九军团',
    '军委纵队',
    '中央纵队',
  ]);
  const first = a.scene.getObjectByName(units[0]!.id)!;
  const p = first.position.clone();
  expect(units.every((u) => a.scene.getObjectByName(u.id)!.visible)).toBe(true);
  expect(a.scene.getObjectByName('march-ruijin-yudu:arrow')!.visible).toBe(
    false,
  );
  a.t.tickWallTime(3);
  a.layer.update(2);
  expect(first.position).toEqual(p);
  a.seek('chapter-ex-event-yudu-assembly', 0.5);
  expect(first.position.distanceTo(p)).toBeGreaterThan(0.01);
  a.seek('chapter-ex-event-yudu-assembly', 0.1);
  expect(first.position.distanceTo(p)).toBeLessThan(1e-9);
  a.seek('chapter-event-zy');
  expect(first.visible).toBe(false);
  a.layer.dispose();
});

it('hands all seven gathered columns into Yudu night crossing at their exact previous positions and releases them in batches', () => {
  const a = map();
  a.t.cinematic(true);
  const assembly = 'chapter-ex-event-yudu-assembly',
    crossing = 'chapter-ex-event-yudu-crossing';
  const units = a.c.plan.formations!.filter((f) => f.chapterId === assembly);
  const fronts = units.map((u) =>
    a.scene.getObjectByName(u.id + ':formation-front')!,
  );
  a.seek(assembly, 0.99);
  expect(fronts).toHaveLength(7);
  const arrived = fronts.map((f) => f.position.clone());
  const verify = (shown: number) => {
    expect(fronts.filter((f) => f.visible)).toHaveLength(shown);
    for (const [i, front] of fronts.entries())
      expect(front.position.distanceTo(arrived[i]!)).toBeLessThan(1e-8);
  };
  a.seek(crossing, 0);
  verify(7);
  a.seek(crossing, 0.42);
  verify(4);
  a.seek(crossing, 0.9);
  verify(0);
  a.seek(crossing, 0.42);
  verify(4);
  a.seek(assembly, 0.4);
  expect(fronts[0]!.position.distanceTo(arrived[0]!)).toBeGreaterThan(0.05);
  a.layer.dispose();
});

it('keeps meeting parties at their recorded event sites instead of simulating a march with no path', () => {
  const a = map();
  a.t.cinematic(true);
  for (const chapter of a.c.plan.chapters) {
    const held = a.c.plan.formations!.filter(
      (f) => f.action === 'hold' && f.chapterId === chapter.id,
    );
    for (const progress of [0.1, 0.5, 0.9]) {
      a.seek(chapter.id, progress);
      for (const u of held) {
        const flag = a.scene.getObjectByName(u.id)!;
        const [x, z] = projectGeo(u.anchor);
        expect(flag.visible, u.unitName).toBe(true);
        expect(flag.position.x).toBeCloseTo(x);
        expect(flag.position.z).toBeCloseTo(z);
      }
    }
  }
  a.layer.dispose();
});

it('reunion retains the receiving First Front and Fourth Front at Huining while the Second Front approaches Jiangtai', () => {
  const a = map();
  a.seek('chapter-ex-event-huining', 0.9);
  expect(a.c.plan.tracks.find((t) => t.id === 'march-huining')!.unitId).toBe(
    'red-fourth-front',
  );
  a.seek('chapter-ex-event-jiangtai', 0.9);
  expect(a.scene.getObjectByName('march-jiangtai:arrow')!.visible).toBe(true);
  const fourth = a.c.plan.formations!.find(
    (u) => u.id === 'formation:red-fourth-after-huining',
  )!;
  expect(a.scene.getObjectByName(fourth.id)!.visible).toBe(true);
  expect(fourth.unitId).toBe('red-fourth-front');
  expect(fourth.unitName).toContain('会宁会师后');
  expect(
    a.c.plan.formations!.some(
      (u) =>
        u.chapterId === 'chapter-ex-event-jiangtai' &&
        u.unitId === 'red-first-front',
    ),
  ).toBe(true);
  a.t.unit('red-fourth-front');
  a.layer.update(2);
  expect(a.scene.getObjectByName('march-jiangtai:arrow')!.visible).toBe(true);
  a.layer.setCamps(['red_army']);
  a.layer.update(2);
  expect(
    a
      .visible()
      .some(
        (o) =>
          o.name.startsWith('formation:') &&
          a.c.plan.formations!.find((u) => u.id === o.name)?.camp ===
            'nationalist_army',
      ),
  ).toBe(false);
  a.layer.dispose();
});

it('the seven converging Yudu unit labels stay distinct and near their own arrow tips', () => {
  const a = map();
  a.seek('chapter-ex-event-yudu-assembly', 0.9);
  const anchor = a.c.plan.formations!.find(
    (f) => f.chapterId === 'chapter-ex-event-yudu-assembly',
  )!.anchor;
  const [x, z] = projectGeo(anchor),
    camera = new THREE.PerspectiveCamera(45, 1920 / 900, 0.01, 100);
  camera.position.set(x + 0.3, 2.7, z + 2);
  camera.lookAt(x, 1, z);
  camera.updateMatrixWorld();
  const markers = a.layer
    .projections(camera, 1920, 900)
    .filter((m) => m.id.includes('chapter-ex-event-yudu-assembly:red_army'));
  expect(markers).toHaveLength(7);
  const sizes = new Map(markers.map((m) => [m.id, { width: 80, height: 28 }]));
  const labels = layoutMovingMapLabels(
    markers,
    { width: 1920, height: 900 },
    sizes,
    [],
  );
  expect(labels.filter((l) => l.visible)).toHaveLength(7);
  for (const label of labels)
    expect(
      Math.hypot(label.labelX - label.x, label.labelY - label.y),
    ).toBeLessThan(140);
  a.layer.dispose();
});

it('separate crossings keep distinguishable route names and no same-unit duplicate geometry is introduced', () => {
  const c = content();
  const routes = c.plan.tracks.filter(
    (t) => t.chapterId === 'chapter-event-sd-4' && t.camp === 'red_army',
  );
  expect(routes.map((t) => t.unitName)).toEqual([
    '中央红军·二郎滩东渡',
    '中央红军·太平渡东渡',
  ]);
  const keys = c.plan.tracks.map((t) =>
    JSON.stringify([t.chapterId, t.unitId, t.points]),
  );
  expect(new Set(keys).size).toBe(keys.length);
  const chapter = journeyChapters(c.plan, 'central').find(
    (c) => c.id === 'chapter-event-sd',
  )!;
  for (const f of [0, 0.2, 0.6])
    expect(
      sampleJourney(c.plan, 'central', chapter.start + chapter.duration * f)
        .stage,
    ).toBe('local');
});

it('every acquired modern terrain window has real varied elevations and verified byte provenance, including Wuqi and Ganquan', () => {
  expect(provenance.outputs).toHaveLength(11);
  for (const out of provenance.outputs) {
    const bytes = readFileSync(
      `src/app/landscape/data/event-terrain/${out.file}`,
    );
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(out.sha256);
    const field = JSON.parse(bytes.toString());
    expect(field.heights.length).toBe(field.cols * field.rows);
    expect(new Set(field.heights).size).toBeGreaterThan(100);
  }
  for (const id of [
    'ex-event-wuqi',
    'ex-event-ganquan',
    'ex-event-huining',
    'ex-event-lazikou',
    'ex-event-red25-start',
  ]) {
    const e = content().map.entries.find((e) => e.eventId === id)!;
    expect(eventTerrainBounds(e.anchorCoordinates), id).not.toBeNull();
  }
});

it('the original landmark sits on the shared terrain, changes position on chapter change, and releases its resources', () => {
  const scene = new THREE.Scene();
  let height = 2;
  const landmark = createChapterLandmark(scene, () => height);
  landmark.set([108.175933, 36.927216]);
  landmark.update(2);
  const [x, z] = projectGeo([108.175933, 36.927216]);
  expect(landmark.root.position.x).toBeCloseTo(x);
  expect(landmark.root.position.z).toBeCloseTo(z);
  expect(landmark.root.position.y).toBeGreaterThan(2);
  height = 4;
  landmark.update(2);
  expect(landmark.root.position.y).toBeGreaterThan(4);
  const dispose = vi.spyOn(
    (landmark.root.children[0] as THREE.Mesh).geometry,
    'dispose',
  );
  landmark.set(null);
  expect(landmark.root.visible).toBe(false);
  landmark.dispose();
  expect(dispose).toHaveBeenCalledOnce();
  expect(scene.children).toHaveLength(0);
});

it('all ordinary event reading is free of implementation warnings and task gates while original B records are untouched', () => {
  const before = JSON.stringify(raw),
    c = content();
  for (const event of c.dataset.events) {
    const prose = eventNarrative(event),
      knowledge = teachingKnowledge(event, c.dataset, prose);
    const full = [...prose, ...knowledge.paragraphs].join('');
    expect(full, event.id).not.toMatch(
      /不能把.*画|不能移作|本章|本页|本体验|通关|我已阅读本段|src-[a-z]|明确完成按钮/,
    );
  }
  const huining = eventNarrative(
    c.dataset.events.find((e) => e.id === 'ex-event-huining')!,
  ).join('');
  expect(huining).toContain('1936年10月9日');
  expect(huining).toContain('红二方面军继续北上');
  expect(
    readingCopy('10月9日会师。因此不能把三支主力都画成当天同时出现在会宁。'),
  ).toBe('10月9日会师。');
  expect(JSON.stringify(raw)).toBe(before);
});
