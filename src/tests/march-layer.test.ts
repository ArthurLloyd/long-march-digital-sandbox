import * as THREE from 'three';
import { expect, it } from 'vitest';
import { createMarchLayer } from '../app/landscape/march-layer';
import {
  createJourneyTransport,
  sampleTrack,
  type JourneyPlan,
} from '../features/timeline/journey';
import { projectGeo } from '../app/landscape/geography';
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
  expect(selected.point.y).toBeCloseTo(0.465);
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
    if (vertices.getZ(i) < -0.099)
      expect(Math.abs(vertices.getX(i))).toBeLessThan(0.001);
  layer.dispose();
  expect(scene.children).toHaveLength(0);
});
