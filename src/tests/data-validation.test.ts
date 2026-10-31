import { describe, expect, it } from 'vitest';
import {
  createDraftDataset,
  createDraftEvent,
} from '../data/fixtures/draft-dataset';
import {
  coordinateSchema,
  historyEventSchema,
  type HistoryDataset,
} from '../shared/contracts';
import {
  getPublishedDataset,
  validateDataset,
} from '../shared/utils/validate-dataset';

// In-memory positive-path simulation of the review gate. Never stored as reviewed data.
function simulatePublication(data: HistoryDataset): HistoryDataset {
  for (const record of [...data.events, ...data.routes, ...data.sources]) {
    record.reviewStatus = 'reviewed';
    record.releaseStatus = 'published';
    record.reviewedBy = ['test-human-a', 'test-human-b'];
    record.reviewedAt = '2026-10-31';
    record.reviews = record.reviewedBy.map((reviewerId) => ({
      reviewerId,
      reviewerType: 'human',
      decision: 'approved',
      reviewedAt: '2026-10-31',
      evidenceNote: '仅自动测试分支，不是真实人工审核。',
    }));
  }
  return data;
}

describe('历史数据校验', () => {
  it('接受明确标注的有效草稿记录与空数据集', () => {
    expect(historyEventSchema.safeParse(createDraftEvent()).success).toBe(true);
    expect(validateDataset(createDraftDataset()).events).toHaveLength(1);
    expect(validateDataset({ events: [], routes: [], sources: [] })).toEqual({
      events: [],
      routes: [],
      sources: [],
    });
  });
  it.each([
    [181, 0],
    [-181, 0],
    [0, 91],
    [0, -91],
    [NaN, 0],
    [Infinity, 0],
  ])('拒绝非法坐标 %s, %s', (longitude, latitude) => {
    expect(coordinateSchema.safeParse([longitude, latitude]).success).toBe(
      false,
    );
  });
  it('允许未知坐标，拒绝伪造精度', () => {
    const event = createDraftEvent();
    event.coordinatePrecision = 'exact';
    expect(historyEventSchema.safeParse(event).success).toBe(false);
  });
  it('拒绝缺失来源的正式历史事实', () => {
    const data = simulatePublication(createDraftDataset());
    data.events[0]!.contentType = 'historical_fact';
    data.events[0]!.sourceIds = [];
    expect(() => validateDataset(data)).toThrow('缺失来源');
  });
  it('拒绝无法解析的来源关联', () => {
    const data = createDraftDataset();
    data.sources = [];
    expect(() => validateDataset(data)).toThrow('不存在');
  });
  it.each(['events', 'routes', 'sources'] as const)(
    '拒绝 %s 中的重复 ID',
    (key) => {
      const data = createDraftDataset();
      if (key === 'events') data.events.push(structuredClone(data.events[0]!));
      if (key === 'routes') data.routes.push(structuredClone(data.routes[0]!));
      if (key === 'sources')
        data.sources.push(structuredClone(data.sources[0]!));
      expect(() => validateDataset(data)).toThrow('ID 重复');
    },
  );
  it('拒绝非法审核状态与多余字段', () => {
    expect(
      historyEventSchema.safeParse({
        ...createDraftEvent(),
        reviewStatus: 'auto_approved',
      }).success,
    ).toBe(false);
    expect(
      historyEventSchema.safeParse({ ...createDraftEvent(), invented: true })
        .success,
    ).toBe(false);
  });
  it('未经审核的路线不能显示为历史实线', () => {
    const data = createDraftDataset();
    Object.assign(data.routes[0]!, {
      coordinates: [
        [0, 0],
        [1, 1],
      ],
      evidenceLevel: 'documented_geometry',
      spatialPrecision: 'approximate',
      displayMode: 'solid',
    });
    expect(() => validateDataset(data)).toThrow('实线');
  });
  it('仅确认历史地点不能连成路线', () => {
    const data = createDraftDataset();
    Object.assign(data.routes[0]!, {
      coordinates: [
        [0, 0],
        [1, 1],
      ],
      evidenceLevel: 'confirmed_locations',
      spatialPrecision: 'approximate',
      displayMode: 'dashed',
    });
    expect(() => validateDataset(data)).toThrow('不能连接');
  });
  it('拒绝单人重复签署与 AI 签署', () => {
    const data = simulatePublication(createDraftDataset());
    data.events[0]!.reviews[1]!.reviewerId = 'test-human-a';
    expect(() => validateDataset(data)).toThrow('两名不同人员');
    const event = createDraftEvent();
    expect(
      historyEventSchema.safeParse({
        ...event,
        reviews: [
          {
            reviewerId: 'ai',
            reviewerType: 'ai',
            decision: 'approved',
            reviewedAt: '2026-10-31',
            evidenceNote: 'fake',
          },
        ],
      }).success,
    ).toBe(false);
  });
  it('正式内容不得引用待审核来源', () => {
    const data = simulatePublication(createDraftDataset());
    data.sources[0]!.releaseStatus = 'unpublished';
    expect(() => validateDataset(data)).toThrow('尚未完成发布核验');
  });
  it('缺少人工记录不能以 reviewed 发布', () => {
    const data = simulatePublication(createDraftDataset());
    data.events[0]!.reviews = [];
    expect(() => validateDataset(data)).toThrow('两名不同人员');
  });
  it('发布入口过滤草稿和隐藏路线', () => {
    expect(getPublishedDataset(createDraftDataset())).toEqual({
      events: [],
      routes: [],
      sources: [],
    });
    const data = simulatePublication(createDraftDataset());
    expect(getPublishedDataset(data).events).toHaveLength(1);
    expect(getPublishedDataset(data).routes).toHaveLength(0);
  });
  it('已审核且有来源几何的实线可通过发布门禁', () => {
    const data = simulatePublication(createDraftDataset());
    Object.assign(data.routes[0]!, {
      coordinates: [
        [0, 0],
        [1, 1],
      ],
      evidenceLevel: 'documented_geometry',
      spatialPrecision: 'approximate',
      displayMode: 'solid',
    });
    expect(getPublishedDataset(data).routes).toHaveLength(1);
  });
  it('撤回同意后不得继续发布', () => {
    const data = simulatePublication(createDraftDataset());
    data.events[0]!.reviews.push({
      ...data.events[0]!.reviews[0]!,
      decision: 'changes_requested',
    });
    expect(() => validateDataset(data)).toThrow('两名不同人员');
  });
  it('仍有未解决的复核异议时不能发布', () => {
    const data = simulatePublication(createDraftDataset());
    data.events[0]!.reviews.push({
      ...data.events[0]!.reviews[0]!,
      reviewerId: 'test-human-c',
      decision: 'changes_requested',
    });
    expect(() => validateDataset(data)).toThrow('两名不同人员');
  });
  it('拒绝倒序审核记录覆盖新结论', () => {
    const data = simulatePublication(createDraftDataset());
    data.events[0]!.reviews.push({
      ...data.events[0]!.reviews[0]!,
      reviewedAt: '2026-10-30',
    });
    expect(() => validateDataset(data)).toThrow('时间顺序');
  });
});
