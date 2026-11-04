import * as THREE from 'three';
import { expect, it } from 'vitest';
import { createMarchLayer } from '../app/landscape/march-layer';
import {
  createJourneyTransport,
  journeyChapters,
  sampleTrack,
  type JourneyPlan,
} from '../features/timeline/journey';
import { projectGeo } from '../app/landscape/geography';
import { MARCH_PRESENTATION } from '../app/landscape/march-presentation';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import dataset from '../data/verified/dataset.json';
const plan: JourneyPlan = {
  key: 'memory-geometry-test',
  sequences: [{ id: 'central', title: '工程样本', chapterIds: ['a'] }],
  chapters: [
    {
      id: 'a',
      title: '工程样本',
      dateText: '工程演示',
      regionId: 'chishui',
      topicId: null,
      phaseId: null,
      eventIds: ['e'],
      duration: 100,
      arrival: 0.95,
    },
  ],
  tracks: [
    {
      id: 't',
      chapterId: 'a',
      unitId: 'central-red',
      unitName: '工程箭头',
      camp: 'red_army',
      points: [
        [105, 28],
        [105.01, 28],
        [106, 28],
      ],
      sourceIds: ['engineering-source'],
      evidenceType: 'sourced_strategic_direction',
      precision: 'schematic',
      limitations: '隔离内存工程样本',
      dateText: '工程演示',
    },
  ],
};
it('renders a forward arrow and reveals the line to the same sampled pose even with unequal segments', () => {
  const scene = new THREE.Scene(),
    layer = createMarchLayer(scene, () => 0.4),
    t = createJourneyTransport(plan);
  layer.setTransport(t);
  t.seek(50);
  const selected = layer.update(1)!;
  const [x, z] = projectGeo(sampleTrack(plan.tracks[0]!, 0.5)!.coordinates);
  expect(selected.point.x).toBeCloseTo(x);
  expect(selected.point.y).toBeCloseTo(0.4 + MARCH_PRESENTATION.floatingLift);
  expect(selected.point.z).toBeCloseTo(z);
  const group = scene.children[0]!,
    line = group.children.find((o) => o instanceof THREE.Line) as THREE.Line,
    arrow = group.children.find((o) => o instanceof THREE.Mesh) as THREE.Mesh;
  const position = line.geometry.getAttribute('position'),
    tip = line.geometry.drawRange.count - 1;
  expect(position.getX(tip)).toBeCloseTo(x);
  expect(position.getZ(tip)).toBeCloseTo(z);
  const direction = new THREE.Vector3(0, 0, 1).applyEuler(arrow.rotation);
  expect(direction.dot(selected.direction)).toBeCloseTo(1);
  t.seek(70);
  layer.update(1);
  const first = arrow.position.clone();
  t.seek(30);
  layer.update(1);
  t.seek(70);
  layer.update(1);
  expect(arrow.position.toArray()).toEqual(first.toArray());
  layer.dispose();
  expect(scene.children).toHaveLength(0);
});
it('does not follow a different army when the selected unit has no route in the chapter', () => {
  const scene = new THREE.Scene(),
    layer = createMarchLayer(scene, () => 0),
    t = createJourneyTransport(plan);
  layer.setTransport(t);
  t.unit('nationalist-blockade');
  expect(layer.update(1)).toBeNull();
  const childCount = scene.children[0]!.children.length;
  layer.setTransport(t);
  expect(scene.children[0]!.children).toHaveLength(childCount);
  layer.dispose();
});

it('draws the branch arrow at rest and keeps its geographic tip with each narrated stage on replay', () => {
  const { plan } = createJourneyContent(dataset, 'exhibition');
  const transport = createJourneyTransport(plan);
  const scene = new THREE.Scene();
  const layer = createMarchLayer(scene, () => 0);
  layer.setTransport(transport);
  transport.sequence('red25');
  transport.cinematic(true);
  for (const chapter of journeyChapters(plan, 'red25')) {
    const track = plan.tracks.find(
      (t) => t.chapterId === chapter.id && t.sequenceIds?.includes('red25'),
    )!;
    const cues = chapter.cues!;
    for (const index of [0, 1, 2, 0]) {
      transport.seek(chapter.start + chapter.duration * cues[index]![0]);
      const selected = layer.update(1)!;
      expect(selected.track.id).toBe(track.id);
      expect(scene.getObjectByName(track.id + ':film-front')?.visible).toBe(
        true,
      );
      if (index === 1 && track.points.length === 2) continue;
      const [x, z] = projectGeo(
        track.points[Math.min(index, track.points.length - 1)]!,
      );
      expect(selected.point.x).toBeCloseTo(x);
      expect(selected.point.z).toBeCloseTo(z);
    }
  }
  layer.dispose();
});

it('keeps the full dashed corridor separate from the travelled trail and uses a narrow pointed tail', () => {
  const scene = new THREE.Scene(),
    layer = createMarchLayer(scene, () => 0);
  const p: JourneyPlan = {
    ...plan,
    key: 'regional-memory',
    tracks: [{ ...plan.tracks[0]!, presentation: 'regional_transfer' }],
  };
  const t = createJourneyTransport(p);
  layer.setTransport(t);
  t.seek(50);
  expect(layer.update(5)!.transferring).toBe(true);
  const group = scene.children[0]!;
  const lines = group.children.filter(
    (o) => o instanceof THREE.Line,
  ) as THREE.Line[];
  expect(lines).toHaveLength(2);
  expect(lines[0]!.geometry).not.toBe(lines[1]!.geometry);
  expect(lines[0]!.geometry.drawRange.count).toBeLessThan(
    lines[1]!.geometry.getAttribute('position').count,
  );
  const arrow = group.children.find(
    (o) => o instanceof THREE.Mesh,
  ) as THREE.Mesh;
  arrow.geometry.computeBoundingBox();
  const size = arrow.geometry.boundingBox!.getSize(new THREE.Vector3());
  expect(size.z / size.x).toBeGreaterThan(3);
  const vertices = arrow.geometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++)
    if (vertices.getZ(i) < -0.239)
      expect(Math.abs(vertices.getX(i))).toBeLessThan(0.001);
  layer.dispose();
  expect(scene.children).toHaveLength(0);
});

it('keeps the same tip-anchored suspended glyph in custom and default follow views without allocating new scene objects', () => {
  const scene = new THREE.Scene(),
    layer = createMarchLayer(scene, () => 0.4),
    t = createJourneyTransport(plan);
  layer.setTransport(t);
  t.seek(50);
  layer.update(3);
  const group = scene.children[0]!,
    count = group.children.length;
  const mesh = group.children.find(
    (o) => o instanceof THREE.Mesh,
  ) as THREE.Mesh;
  const geometry = mesh.geometry;
  for (const mode of ['follow', 'free', 'overview', 'follow'] as const) {
    t.camera(mode);
    const selected = layer.update(3)!;
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.position.toArray()).toEqual(selected.point.toArray());
    expect(mesh.position.y).toBeCloseTo(0.4 + MARCH_PRESENTATION.floatingLift);
    const vertices = mesh.geometry.getAttribute('position');
    let tipCount = 0;
    for (let i = 0; i < vertices.count; i++)
      if (Math.abs(vertices.getZ(i)) < 1e-6) {
        expect(Math.abs(vertices.getX(i))).toBeLessThan(1e-6);
        tipCount++;
      }
    expect(tipCount).toBeGreaterThan(0);
    expect(group.children).toHaveLength(count);
  }
  layer.dispose();
  expect(scene.children).toHaveLength(0);
});

it('电影行迹按已走距离显露；倒拖和暂停重建同一前锋，下一章只保留走过的线', () => {
  const battle: JourneyPlan = {
    ...plan,
    key: 'film-ink',
    sequences: [{ id: 'central', title: '工程演示', chapterIds: ['a', 'b'] }],
    chapters: [
      {
        ...plan.chapters[0]!,
        cues: [
          [0, 'wide', '集结', '部队从这里出发。'],
          [0.28, 'advance', '行军', '前锋继续向渡口行进。'],
          [0.87, 'resolve', '回望', '到达渡口。'],
        ],
      },
      { ...plan.chapters[0]!, id: 'b' },
    ],
  };
  const scene = new THREE.Scene(),
    layer = createMarchLayer(scene, () => 0.4),
    t = createJourneyTransport(battle);
  layer.setTransport(t);
  t.cinematic(true);
  const trail = scene.getObjectByName('t:film-trail') as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.ShaderMaterial
  >;
  const front = scene.getObjectByName('t:film-front') as THREE.Mesh;
  const frame = (time: number) => {
    t.seek(time);
    layer.update(3.5);
    return {
      pos: front.position.toArray(),
      head: trail.material.uniforms.head!.value as number,
      count: trail.geometry.drawRange.count,
    };
  };
  const earlier = frame(10);
  expect(earlier.head).toBeGreaterThan(0);
  const later = frame(55);
  expect(later.count).toBeGreaterThan(earlier.count);
  expect(frame(10)).toEqual(earlier);
  expect(frame(55)).toEqual(later);
  expect(front.visible).toBe(true);
  expect(scene.getObjectByName('t:arrow')!.visible).toBe(false);
  t.tickWallTime(2);
  layer.update(3.5);
  expect(front.position.toArray()).toEqual(later.pos);
  frame(110);
  expect(front.visible).toBe(false);
  expect(trail.visible).toBe(true);
  expect(trail.material.uniforms.archived!.value).toBe(1);
  expect(trail.material.uniforms.head!.value).toBe(1);
  frame(10);
  expect(trail.material.uniforms.archived!.value).toBe(0);
  layer.setCamps(['nationalist_army']);
  layer.update(3.5);
  expect(front.visible || trail.visible).toBe(false);
  layer.dispose();
});
