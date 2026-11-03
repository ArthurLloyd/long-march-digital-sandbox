import { describe, expect, it } from 'vitest';
import {
  createJourneyTransport,
  journeyChapters,
  sampleJourney,
  journeyTrackProgress,
  sampleTrack,
  type JourneyPlan,
} from '../features/timeline/journey';
import dataset from '../data/verified/dataset.json';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import { getPublishedDatasetV2 } from '../shared/utils/validate-dataset';
const plan: JourneyPlan = {
  key: 'transport-test',
  sequences: [{ id: 'main', title: '测试序列', chapterIds: ['one', 'two'] }],
  chapters: [
    {
      id: 'one',
      title: '第一章',
      dateText: '未知',
      regionId: 'test',
      topicId: null,
      phaseId: null,
      eventIds: ['e1'],
      duration: 10,
      arrival: 0.5,
    },
    {
      id: 'two',
      title: '第二章',
      dateText: '未知',
      regionId: 'test',
      topicId: null,
      phaseId: null,
      eventIds: ['e2'],
      duration: 10,
      arrival: 0.5,
    },
  ],
  tracks: [
    {
      id: 'red',
      chapterId: 'one',
      unitId: 'central-red',
      unitName: '内存工程单位',
      camp: 'red_army',
      points: [
        [105, 28],
        [106, 28],
        [105, 28],
      ],
      sourceIds: ['memory-only'],
      evidenceType: 'sourced_strategic_direction',
      precision: 'schematic',
      limitations: '内存工程样本，不发布',
      dateText: '未知',
    },
  ],
};

it('accepts the closer follow endpoint without changing march time or mode', () => {
  const t = createJourneyTransport(plan);
  t.seek(2);
  t.camera('free');
  t.distance(0.5);
  expect(t.read()).toMatchObject({
    distance: 0.5,
    time: 2,
    camera: 'free',
    playing: false,
  });
  t.distance(0.1);
  expect(t.read().distance).toBe(0.5);
  t.distance(10);
  expect(t.read().distance).toBe(2.5);
});

it('manual story reading counts as seen without moving time or writing completion', () => {
  const t = createJourneyTransport(plan);
  t.visit('e1');
  expect(t.read().time).toBe(0);
  expect(t.read().seen).toEqual(['e1']);
  t.play();
  t.advance(6);
  expect(t.read().pendingEventId).toBeNull();
  t.restart();
  t.play();
  t.advance(6);
  expect(t.read().pendingEventId).toBe('e1');
});
describe('统一C2连续行军扩展', () => {
  it('高倍速停在最早未呈现事件，不越过多个节点', () => {
    const t = createJourneyTransport(plan);
    t.speed(4);
    t.play();
    t.advance(10);
    expect(t.read()).toMatchObject({
      time: 5,
      pendingEventId: 'e1',
      playing: false,
    });
    t.acknowledge();
    t.play();
    t.advance(10);
    expect(t.read()).toMatchObject({
      time: 15,
      pendingEventId: 'e2',
      playing: false,
    });
  });
  it('暂停后不位移，关闭事件后继续不会重复弹出', () => {
    const t = createJourneyTransport(plan);
    t.play();
    t.advance(5);
    t.advance(6);
    expect(t.read().time).toBe(5);
    t.acknowledge();
    t.play();
    t.advance(1);
    expect(t.read()).toMatchObject({ time: 6, pendingEventId: null });
  });
  it('seek不补弹跨过的故事，回退和重复采样一致', () => {
    const t = createJourneyTransport(plan);
    const poses = [];
    for (const time of [2, 7, 3, 7]) {
      t.seek(time);
      expect(t.read().pendingEventId).toBeNull();
      const s = sampleJourney(plan, 'main', t.read().time);
      poses.push(sampleTrack(s.tracks[0]!, s.progress));
    }
    expect(poses[1]).toEqual(poses[3]);
  });
  it('倍速和镜头切换不改变某一时刻的部队位置', () => {
    const t = createJourneyTransport(plan);
    t.seek(7);
    const sample = sampleTrack(
      plan.tracks[0]!,
      sampleJourney(plan, 'main', 7).progress,
    );
    t.speed(4);
    t.camera('follow');
    t.unit('nationalist-blockade');
    expect(t.read().time).toBe(7);
    expect(
      sampleTrack(plan.tracks[0]!, sampleJourney(plan, 'main', 7).progress),
    ).toEqual(sample);
  });
  it('折返由章节和时间确定，不按最近空间点猜阶段', () => {
    expect(sampleTrack(plan.tracks[0]!, 0)?.coordinates).toEqual(
      sampleTrack(plan.tracks[0]!, 1)?.coordinates,
    );
    expect(sampleJourney(plan, 'main', 2).chapter?.id).toBe('one');
    expect(sampleJourney(plan, 'main', 12).chapter?.id).toBe('two');
  });
  it('恢复体验前状态保持暂停，保存序列、单位、镜头与进度', () => {
    const t = createJourneyTransport(plan);
    t.seek(7);
    t.camera('follow');
    t.speed(2);
    t.play();
    const saved = { ...t.read() };
    t.seek(18);
    t.camera('free');
    t.restore(saved);
    expect(t.read()).toMatchObject({
      time: 7,
      camera: 'follow',
      speed: 2,
      playing: false,
    });
  });
  it('重播重置本轮事件记录；同一位置多个事件依次暂停', () => {
    const p = {
      ...plan,
      chapters: [
        { ...plan.chapters[0]!, eventIds: ['e1', 'other'] },
        plan.chapters[1]!,
      ],
    };
    const t = createJourneyTransport(p);
    t.play();
    t.advance(8);
    t.acknowledge();
    t.play();
    t.advance(1);
    expect(t.read().pendingEventId).toBe('other');
    t.restart();
    expect(t.read().seen).toEqual([]);
    t.play();
    t.advance(8);
    expect(t.read().pendingEventId).toBe('e1');
  });
  it('章节索引独立缓存，每个时间段起终点连续且无重排', () => {
    const chapters = journeyChapters(plan, 'main');
    expect(chapters.map((c) => [c.start, c.end])).toEqual([
      [0, 10],
      [10, 20],
    ]);
    expect(journeyChapters(plan, 'main')).toBe(chapters);
  });
});
describe('真实补充内容与原始审核隔离', () => {
  it('保留B原始对象和审核记录，补齐出发、会师及独立分支', () => {
    const before = JSON.stringify(dataset);
    const c = createJourneyContent(dataset, 'exhibition');
    expect(JSON.stringify(dataset)).toBe(before);
    expect(c.dataset.events.slice(0, dataset.events.length)).toEqual(
      dataset.events,
    );
    expect(c.dataset.events).toHaveLength(30);
    expect(c.plan.chapters).toHaveLength(30);
    expect(c.plan.sequences).toHaveLength(3);
    for (const event of c.supplement.events)
      expect(event).toMatchObject({
        coordinates: null,
        coordinatePrecision: 'unknown',
        reviewStatus: 'draft',
        releaseStatus: 'unpublished',
        reviews: [],
      });
  });
  it('战略轨道具备逐点定位来源和时间范围，strict不因此增加发布数据', () => {
    const c = createJourneyContent(dataset, 'exhibition');
    expect(c.plan.tracks).toHaveLength(27);
    expect(c.plan.tracks.some((t) => t.camp === 'nationalist_army')).toBe(true);
    for (const t of c.supplement.tracks) {
      expect(t.points).toHaveLength(t.locationReferenceIds.length);
      expect(t.precision).toBe('schematic');
      expect(t.sourceIds.length).toBeGreaterThan(0);
      expect(t.dateText).toBeTruthy();
    }
    expect(getPublishedDatasetV2(c.dataset).events).toEqual(
      getPublishedDatasetV2(dataset).events,
    );
    expect(getPublishedDatasetV2(c.dataset).routes).toHaveLength(0);
  });
  it('会宁、将台堡、吴起、甘泉分别登记；永坪日期差异保留来源', () => {
    const c = createJourneyContent(dataset, 'exhibition');
    const ids = [
      'ex-event-huining',
      'ex-event-jiangtai',
      'ex-event-wuqi',
      'ex-event-ganquan',
    ];
    expect(
      ids
        .map((id) => c.dataset.events.find((e) => e.id === id)?.locationName)
        .filter(Boolean),
    ).toHaveLength(4);
    const y = c.dataset.events.find((e) => e.id === 'ex-event-yongping')!;
    expect(y.dateText).toContain('中旬');
    expect(y.detail).toContain('15日');
    expect(y.detail).toContain('16日');
    expect(y.detail).toContain('18日');
    expect(c.supplement.people.every((p) => p.reviews.length === 0)).toBe(true);
  });
});

it('maps one wall second at displayed 1x to the former four-times progress without changing historical data', () => {
  const t = createJourneyTransport(plan);
  t.play();
  t.tickWallTime(1);
  expect(t.read().time).toBe(4);
  t.speed(0.5);
  t.tickWallTime(0.25);
  expect(t.read().time).toBe(4.5);
  expect(plan.chapters[0]!.dateText).toBe('未知');
});

it('covers every change of geographic region in the main itinerary with a sourced incoming track', () => {
  const c = createJourneyContent(dataset, 'exhibition');
  const chapters = journeyChapters(c.plan, 'central');
  for (let i = 1; i < chapters.length; i++) {
    const current = chapters[i]!,
      previous = chapters[i - 1]!;
    if (current.regionId === previous.regionId) continue;
    const sampled = sampleJourney(c.plan, 'central', current.start);
    expect(
      sampled.tracks.some((t) => t.presentation === 'regional_transfer'),
      current.id,
    ).toBe(true);
  }
});

it('regional transfers show overview, move along their own source vertices and arrive exactly before the story cue', () => {
  const c = createJourneyContent(dataset, 'exhibition');
  for (const chapter of journeyChapters(c.plan, 'central')) {
    const start = sampleJourney(c.plan, 'central', chapter.start);
    for (const track of start.tracks.filter(
      (t) => t.presentation === 'regional_transfer',
    )) {
      expect(start.stage).toBe('overview');
      expect(journeyTrackProgress(track, start)).toBe(0);
      const moving = sampleJourney(
        c.plan,
        'central',
        chapter.start + chapter.duration * 0.5,
      );
      expect(moving.stage).toBe('transit');
      expect(journeyTrackProgress(track, moving)).toBeGreaterThan(0);
      const arrived = sampleJourney(
        c.plan,
        'central',
        chapter.start + chapter.duration * chapter.arrival,
      );
      expect(arrived.stage).toBe('local');
      const position = sampleTrack(
        track,
        journeyTrackProgress(track, arrived),
      )!.coordinates;
      position.forEach((coordinate, i) =>
        expect(coordinate).toBeCloseTo(track.points.at(-1)![i]!, 9),
      );
    }
  }
});

it('does not borrow the central army route when the red twenty-fifth army sequence reaches the shared meeting chapter', () => {
  const c = createJourneyContent(dataset, 'exhibition');
  const chapter = journeyChapters(c.plan, 'red25').find(
    (c) => c.id === 'chapter-ex-event-ganquan',
  )!;
  expect(sampleJourney(c.plan, 'red25', chapter.start).tracks).toHaveLength(0);
});
