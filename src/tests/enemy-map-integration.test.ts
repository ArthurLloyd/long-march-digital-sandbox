import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import raw from '../data/verified/dataset.json';
import additions from '../app/exhibition/data/enemy-map-additions.json';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import { createMarchLayer } from '../app/landscape/march-layer';
import { projectGeo } from '../app/landscape/geography';
import {
  createJourneyTransport,
  journeyChapters,
  journeyTrackProgress,
  sampleJourney,
  sampleTrack,
} from '../features/timeline/journey';
import { getPublishedDatasetV2 } from '../shared/utils/validate-dataset';

function setup() {
  const content = createJourneyContent(raw, 'exhibition');
  const transport = createJourneyTransport(content.plan);
  const scene = new THREE.Scene();
  const layer = createMarchLayer(scene, () => 2);
  layer.setTransport(transport);
  const group = scene.children[0]!;
  return {
    content,
    transport,
    scene,
    layer,
    group,
    seek(id: string, progress: number) {
      const c = journeyChapters(content.plan, 'central').find(
        (c) => c.id === id,
      )!;
      expect(c, id).toBeTruthy();
      transport.seek(c.start + c.duration * progress);
      return layer.update(3);
    },
    object(id: string, kind = 'deployment') {
      return group.getObjectByName(`enemy-map-${id}:${kind}`)!;
    },
  };
}

describe('敌军态势直接接入共享地图', () => {
  it('给有依据的章节显示真实 Three.js 部署符号或蓝色动向线，切章移除上一章显示', () => {
    const a = setup();
    const cases = [
      ['chapter-ex-event-ruijin', 'xinfeng', 0.2],
      ['chapter-ex-event-blockades', 'blockades-yizhang', 0.6],
      ['chapter-ex-event-xiangjiang', 'xiangjiang-xingan', 0.6],
      ['chapter-ex-event-liping', 'liping-jingzhou', 0.6],
      ['chapter-event-js', 'jinsha-kunming', 0.6],
      ['chapter-event-anshunchang', 'anshun', 0.6],
      ['chapter-event-ld', 'luding', 0.6],
      ['chapter-event-sn', 'snow-lushan', 0.2],
      ['chapter-event-gr', 'grass-baozuo', 0.7],
      ['chapter-ex-event-lazikou', 'lazikou', 0.6],
      ['chapter-ex-event-wuqi', 'wuqi', 0.6],
      ['chapter-ex-event-huining', 'reunion', 0.6],
    ] as const;
    let previous: THREE.Object3D | undefined;
    const childCount = a.group.children.length;
    for (const [chapter, id, progress] of cases) {
      a.seek(chapter, progress);
      const object = a.object(id);
      expect(object.visible, id).toBe(true);
      expect(object.position.y).toBeGreaterThan(2);
      if (previous) expect(previous.visible).toBe(false);
      previous = object;
      expect(a.group.children).toHaveLength(childCount);
    }
    a.layer.dispose();
    expect(a.scene.children).toHaveLength(0);
  });

  it('追击箭头随唯一时钟运动，暂停保持位置，seek 回退无滞后或残留线段', () => {
    const a = setup();
    const id = 'xiangjiang-jiahe';
    a.seek('chapter-ex-event-xiangjiang', 0.25);
    const arrow = a.object(id, 'arrow');
    const line = a.object(id, 'active-blue') as Line2;
    const start = arrow.position.clone();
    expect(line.visible).toBe(true);
    expect(line.material.dashed).toBe(true);
    const count = line.geometry.instanceCount;
    a.transport.tickWallTime(5);
    a.layer.update(3);
    expect(arrow.position).toEqual(start);
    a.transport.play();
    a.transport.tickWallTime(0.25);
    a.layer.update(3);
    expect(arrow.position.distanceTo(start)).toBeGreaterThan(0);
    a.seek('chapter-ex-event-xiangjiang', 0.75);
    expect(line.geometry.instanceCount).toBeGreaterThan(count);
    a.seek('chapter-ex-event-xiangjiang', 0.25);
    expect(arrow.position.distanceTo(start)).toBeLessThan(1e-9);
    expect(line.geometry.instanceCount).toBe(count);
    a.layer.dispose();
  });

  it('驻防点不生成来路，按时间窗口出现和退出；回援命令没有移动箭头', () => {
    const a = setup();
    a.seek('chapter-event-sn', 0.1);
    const node = a.object('snow-lushan');
    const p = node.position.clone();
    a.seek('chapter-event-sn', 0.25);
    expect(node.position).toEqual(p);
    expect(a.object('snow-lushan', 'active-blue')).toBeUndefined();
    expect(node).toBeInstanceOf(THREE.Mesh);
    a.seek('chapter-event-sn', 0.6);
    expect(node.visible).toBe(false);
    a.seek('chapter-event-js', 0.5);
    expect(a.object('jinsha-return', 'arrow').visible).toBe(false);
    expect(a.object('jinsha-return', 'active-blue').visible).toBe(true);
    a.layer.dispose();
  });

  it('原有红蓝开关作用于全部行军层和标签，重新打开不更改时间或位置', () => {
    const a = setup();
    a.seek('chapter-ex-event-xiangjiang', 0.6);
    const before = a.transport.read();
    const red = a.group.children.filter(
      (o) =>
        o.visible &&
        o.name.endsWith(':arrow') &&
        !o.name.startsWith('enemy-map-'),
    );
    expect(red.length).toBeGreaterThan(0);
    const blue = a.object('xiangjiang-jiahe', 'arrow');
    const p = blue.position.clone();
    a.layer.setCamps(['red_army']);
    a.layer.update(3);
    expect(blue.visible).toBe(false);
    expect(a.object('xiangjiang-xingan').visible).toBe(false);
    expect(a.object('xiangjiang-jiahe', 'active-blue').visible).toBe(false);
    expect(red.every((o) => o.visible)).toBe(true);
    const camera = new THREE.PerspectiveCamera(45, 1.5, 0.01, 100);
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 2, 0);
    camera.updateMatrixWorld();
    expect(
      a.layer
        .projections(camera, 1200, 800)
        .filter((p) => p.id.startsWith('march:enemy-map-'))
        .every((p) => !p.visible),
    ).toBe(true);
    a.layer.setCamps(['red_army', 'nationalist_army']);
    a.layer.update(3);
    expect(blue.visible).toBe(true);
    expect(blue.position).toEqual(p);
    expect(a.transport.read()).toBe(before);
    a.layer.dispose();
  });

  it('单点使用出处原值采样；窗口内移动与地面投影相同，切换地形重新贴合', () => {
    const a = setup();
    for (const t of a.content.plan.tracks.filter((t) =>
      t.id.startsWith('enemy-map-'),
    )) {
      if (t.evidenceType === 'sourced_deployment') {
        expect(sampleTrack(t, 0)).toEqual(sampleTrack(t, 1));
        expect(t.points).toHaveLength(1);
      } else if (t.motionWindow) {
        const c = journeyChapters(a.content.plan, 'central').find(
          (c) => c.id === t.chapterId,
        )!;
        const progress = (t.motionWindow[0] + t.motionWindow[1]) / 2;
        a.seek(t.chapterId, progress);
        const frame = sampleJourney(
          a.content.plan,
          'central',
          c.start + c.duration * progress,
        );
        const pose = sampleTrack(t, journeyTrackProgress(t, frame))!;
        const [x, z] = projectGeo(pose.coordinates);
        const glyph = a.group.getObjectByName(`${t.id}:arrow`)!;
        expect(glyph.position.x).toBeCloseTo(x, 8);
        expect(glyph.position.z).toBeCloseTo(z, 8);
      }
    }
    const geometry = (a.object('wuqi') as THREE.Mesh).geometry;
    const disposed = vi.spyOn(geometry, 'dispose');
    a.layer.drape();
    a.layer.dispose();
    expect(disposed).toHaveBeenCalledOnce();
  });

  it('新来源保持 draft，逐点参考可追溯，正式发布数据与 B 原始审核完全不变', () => {
    const before = JSON.stringify(raw);
    const content = createJourneyContent(raw, 'exhibition');
    expect(additions.tracks).toHaveLength(25);
    expect(
      content.plan.tracks.filter((t) => t.camp === 'nationalist_army'),
    ).toHaveLength(36);
    for (const source of additions.sources)
      expect(source).toMatchObject({
        reviewStatus: 'draft',
        releaseStatus: 'unpublished',
        reviewedBy: [],
        reviews: [],
      });
    for (const t of additions.tracks) {
      expect(t.precision).toBe('schematic');
      t.locationReferenceIds.forEach((id, i) =>
        expect(
          content.map.resources.references.find((r) => r.referenceId === id)!
            .coordinates,
        ).toEqual(t.points[i]),
      );
      t.sourceIds.forEach((id) =>
        expect(content.dataset.sources.some((s) => s.sourceId === id)).toBe(
          true,
        ),
      );
    }
    expect(getPublishedDatasetV2(content.dataset)).toEqual(
      getPublishedDatasetV2(raw),
    );
    expect(JSON.stringify(raw)).toBe(before);
  });
});
