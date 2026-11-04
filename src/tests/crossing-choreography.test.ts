import { expect, it } from 'vitest';
import {
  subtitleAt,
  tongziHandoff,
} from '../shared/content/journey-screenplay';
import * as THREE from 'three';
import raw from '../data/verified/dataset.json';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import { createMarchLayer } from '../app/landscape/march-layer';
import { createJourneyTransport, journeyChapters } from '../features/timeline';
import { projectGeo } from '../app/landscape/geography';

const { plan } = createJourneyContent(raw, 'exhibition');

it('shows the feint before the westward pursuit and the eastward return, including on rewind', () => {
  const transport = createJourneyTransport(plan);
  const march = createMarchLayer(new THREE.Scene(), () => 0);
  march.setTransport(transport);
  transport.cinematic(true);
  const chapters = journeyChapters(plan, 'central');
  const observe = (
    id: string,
    title: string,
    through: number,
    unit: string,
  ) => {
    const chapter = chapters.find((c) => c.id === 'chapter-event-' + id)!;
    const cues = chapter.cues!;
    const i = cues.findIndex((c) => c[2] === title);
    const start = cues[i]![0],
      end = cues[i + 1]?.[0] ?? 1;
    transport.seek(
      chapter.start + chapter.duration * (start + (end - start) * through),
    );
    transport.unit(unit);
    const selected = march.update(2)!;
    return {
      track: selected.track.id,
      x: selected.point.x,
      z: selected.point.z,
    };
  };
  try {
    const feint = observe('sd-3', '古蔺方向', 0.8, 'diversion');
    const pursue = observe('sd-3', '追兵压向河西', 0.8, 'nationalist-blockade');
    expect(feint.track).toBe('film-feint');
    expect(pursue.track).toBe('march-blue-sd4-chuan');
    const laterFeint = observe('sd-4', '佯动与折返', 0.5, 'diversion');
    expect(laterFeint.x).toBeLessThan(feint.x);
    const redA = observe('sd-4', '佯动与折返', 0.2, 'central-red');
    const redB = observe('sd-4', '佯动与折返', 0.8, 'central-red');
    expect(redB.track).toBe('march-sd4');
    expect(redB.x).toBeGreaterThan(redA.x);
    expect(
      observe('sd-3', '追兵压向河西', 0.8, 'nationalist-blockade'),
    ).toEqual(pursue);
  } finally {
    march.dispose();
  }
});

it('continues from Yudu, Erlang and Jiaoping on the next registered segment without jumping back at the cut', () => {
  const transport = createJourneyTransport(plan);
  const march = createMarchLayer(new THREE.Scene(), () => 0);
  march.setTransport(transport);
  transport.cinematic(true);
  try {
    for (const [chapterId, nextId] of [
      ['chapter-ex-event-yudu-crossing', 'march-yudu-blockades'],
      ['chapter-event-sd-4', 'march-jinsha'],
      ['chapter-event-js', 'march-anshunchang'],
    ]) {
      const chapter = journeyChapters(plan, 'central').find(
        (c) => c.id === chapterId,
      )!;
      const route = plan.tracks.find((t) => t.id === nextId)!;
      const [bankX, bankZ] = projectGeo(route.points[0]!);
      transport.seek(chapter.end - 1e-5);
      const selected = march.update(2)!;
      const last = selected.point.clone();
      expect(selected.track.id).toBe(nextId);
      expect(Math.hypot(last.x - bankX, last.z - bankZ)).toBeGreaterThan(0.01);
      transport.seek(chapter.end);
      const first = march.update(2)!;
      expect(first.track.id).toBe(nextId);
      expect(first.point.distanceTo(last)).toBeLessThan(1e-5);
    }
  } finally {
    march.dispose();
  }
});

it('keeps unconfirmed orders off the marching map and retains northern pressure through the Zhaxi cut', () => {
  const transport = createJourneyTransport(plan);
  const scene = new THREE.Scene(),
    layer = createMarchLayer(scene, () => 0);
  layer.setTransport(transport);
  transport.cinematic(true);
  const chapters = journeyChapters(plan, 'central');
  const first = chapters.find((c) => c.id === 'chapter-event-sd-1')!;
  const jinsha = chapters.find((c) => c.id === 'chapter-event-js')!;
  const node = (id: string) =>
    scene.getObjectByName(id) as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.ShaderMaterial
    >;
  const seek = (time: number) => {
    transport.seek(time);
    layer.update(2);
  };
  try {
    for (const [chapter, reported] of [
      [first, 'march-blue1'],
      [jinsha, 'enemy-map-jinsha-return'],
    ] as const) {
      for (const p of [0.1, 0.5, 0.88, 0.99]) {
        seek(chapter.start + chapter.duration * p);
        expect(node(reported + ':film-trail').visible).toBe(false);
        expect(node(reported + ':film-front').visible).toBe(false);
      }
    }
    seek(first.end - 0.00001);
    const northern = node('march-blue-sd1-north:film-front');
    expect(northern.visible).toBe(true);
    const last = northern.position.clone();
    const [zx, zz] = projectGeo(
      plan.tracks.find((t) => t.id === 'march-sd1')!.points.at(-1)!,
    );
    expect(Math.hypot(last.x - zx, last.z - zz)).toBeGreaterThan(0.01);
    expect(
      node('march-blue-sd1-flank:film-front').material.uniforms.resting!.value,
    ).toBe(1);
    seek(first.end);
    expect(northern.visible).toBe(true);
    expect(northern.position.distanceTo(last)).toBeLessThan(0.001);
    expect(northern.material.uniforms.resting!.value).toBe(1);
    seek(first.start + first.duration * first.cues![1]![0] + 0.0001);
    expect(northern.visible).toBe(false);
    expect(
      node('march-blue-sd1-flank:film-front').material.uniforms.resting!.value,
    ).toBe(0);
  } finally {
    layer.dispose();
  }
});

it('separates the Tongzi relief from the southbound main force in time and in screen space', () => {
  const transport = createJourneyTransport(plan),
    scene = new THREE.Scene();
  const layer = createMarchLayer(scene, () => 0);
  const chapter = journeyChapters(plan, 'central').find(
    (c) => c.id === 'chapter-event-sd-2',
  )!;
  const from = chapter.cues![3]![0],
    to = chapter.cues![4]![0];
  const seek = (f: number) => {
    transport.seek(chapter.start + chapter.duration * (from + (to - from) * f));
    return layer.update(2)!.point.clone();
  };
  const camera = new THREE.PerspectiveCamera(43, 2, 0.01, 100);
  layer.setTransport(transport);
  transport.cinematic(true);
  try {
    const node = scene.getObjectByName(
      'march-blue-sd2-qian:film-front',
    ) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
    const r0 = seek(0.05),
      q0 = node.position.clone();
    const r1 = seek(0.4);
    expect(q0.distanceTo(node.position)).toBeGreaterThan(0.05);
    expect(r0.distanceTo(r1)).toBeLessThan(0.00001);
    const caption = chapter.cues![3]![3];
    expect(subtitleAt(caption, tongziHandoff - 0.01)).toContain('赶来增援');
    expect(subtitleAt(caption, tongziHandoff + 0.01)).toContain('红军向');
    const r2 = seek(tongziHandoff + 0.01),
      q2 = node.position.clone();
    const r3 = seek(0.85);
    expect(q2.distanceTo(node.position)).toBeLessThan(0.00001);
    expect(r2.distanceTo(r3)).toBeGreaterThan(0.05);
    expect(node.material.uniforms.resting!.value).toBe(1);
    camera.position.copy(q2).add(new THREE.Vector3(0, 2, 0.8));
    camera.lookAt(q2);
    camera.updateMatrixWorld();
    const label = layer
      .projections(camera, 1400, 700)
      .find((m) => m.id === 'march:march-blue-sd2-qian')!;
    const p = q2.clone().project(camera);
    expect(
      Math.hypot(label.x - (p.x + 1) * 700, label.y - (1 - p.y) * 350),
    ).toBeCloseTo(node.material.uniforms.lane!.value, 5);
    expect(seek(0.05)).toEqual(r0);
    expect(node.position).toEqual(q0);
  } finally {
    layer.dispose();
  }
});
