import { describe, expect, it } from 'vitest';
import {
  EXPERIENCE_CATALOG,
  EXPERIENCE_IDS,
  INTERACTION_IDS,
  assetReferenceSchema,
  completionRecordSchema,
  canCompleteExperience,
  historyDatasetSchema,
  historyDatasetV2Schema,
  interactionDefinitionSchema,
  isCompletionRecordForExperience,
  requiredInteractionsFor,
  type CompletionRecord,
  type HistoryDatasetV2,
} from '../shared/contracts';
import {
  getPublishedDataset,
  getPublishedDatasetV2,
  validateDataset,
} from '../shared/utils/validate-dataset';
import {
  createDraftV2Dataset,
  draftAsset,
  draftInteraction,
  emptyV2,
} from './fixtures/v2-dataset';
import type { ReviewableRecord } from '../shared/contracts/primitives';

// In-memory gate simulation only. Never persisted, exported by the workbench, or represented as human review.
function simulateReviewed(data: HistoryDatasetV2) {
  for (const [key, records] of Object.entries(data)) {
    if (key === 'schemaVersion') continue;
    for (const record of records as ReviewableRecord[]) {
      record.reviewStatus = 'reviewed';
      record.releaseStatus = 'published';
      record.reviewedBy = ['test-only-person-a', 'test-only-person-b'];
      record.reviewedAt = '2026-11-01';
      record.reviews = record.reviewedBy.map((reviewerId) => ({
        reviewerId,
        reviewerType: 'human',
        decision: 'approved',
        reviewedAt: '2026-11-01',
        evidenceNote: '仅内存测试，不是真实人员审核',
      }));
      if ('rightsStatus' in record) record.rightsStatus = 'cleared';
    }
  }
  return data;
}
function completion(data = createDraftV2Dataset()): CompletionRecord {
  const manifest = data.experiences[0]!;
  return {
    schemaVersion: 1,
    experienceId: manifest.experienceId,
    completionPolicyVersion: 1,
    completedAt: '2026-11-01T12:00:00+08:00',
    completedInteractionIds: [...manifest.requiredInteractionIds],
    completionMode: '3d',
  };
}

describe('版本、产品常量与真实旧调用兼容', () => {
  it('保留 v1 返回形状，并为新消费者提供空 v2 视图', () => {
    const old = { events: [], routes: [], sources: [] };
    expect(validateDataset(old)).toEqual(old);
    expect(getPublishedDataset(old)).toEqual(old);
    expect(getPublishedDatasetV2(old)).toEqual(emptyV2());
    expect(validateDataset(emptyV2())).toEqual(emptyV2());
  });
  it.each([0, 1, 3, '2', null])('拒绝版本 %s', (schemaVersion) => {
    expect(
      historyDatasetSchema.safeParse({ ...emptyV2(), schemaVersion }).success,
    ).toBe(false);
  });
  it('拒绝无版本扩展、未知根字段及嵌套可执行字段', () => {
    expect(
      historyDatasetSchema.safeParse({
        events: [],
        routes: [],
        sources: [],
        people: [],
      }).success,
    ).toBe(false);
    expect(
      historyDatasetSchema.safeParse({ ...emptyV2(), script: 'alert(1)' })
        .success,
    ).toBe(false);
    const data = createDraftV2Dataset();
    expect(
      interactionDefinitionSchema.safeParse({
        ...data.interactions[0],
        action: 'eval()',
      }).success,
    ).toBe(false);
  });
  it.each(EXPERIENCE_IDS)('六类草稿脚本可独立验证：%s', (id) => {
    expect(validateDataset(createDraftV2Dataset(id))).toEqual(
      createDraftV2Dataset(id),
    );
    expect(getPublishedDatasetV2(createDraftV2Dataset(id)).experiences).toEqual(
      [],
    );
  });
  it('固定产品 ID 唯一且不携带发布或历史顺序', () => {
    expect(new Set(EXPERIENCE_IDS).size).toBe(6);
    expect(new Set(INTERACTION_IDS).size).toBe(12);
    expect(
      EXPERIENCE_CATALOG.flatMap((r) => [...r.requiredInteractionIds]).sort(),
    ).toEqual([...INTERACTION_IDS].sort());
    expect(
      EXPERIENCE_CATALOG.every(
        (r) =>
          r.requiredInteractionIds.length === 2 &&
          !('sequence' in r) &&
          !('releaseStatus' in r),
      ),
    ).toBe(true);
    expect(requiredInteractionsFor('exp-sidu-chishui')).toEqual([
      'sd-01',
      'sd-02',
    ]);
    expect(EXPERIENCE_IDS[4]).not.toBe(EXPERIENCE_IDS[5]);
    expect(getPublishedDatasetV2(emptyV2()).experiences).toHaveLength(0);
  });
  it.each(['topics', 'phases', 'experiences', 'interactions'] as const)(
    '拒绝 %s 重复 ID',
    (key) => {
      const data = createDraftV2Dataset();
      // Runtime duplicate deliberately constructed without weakening the shared types.
      const input = {
        ...data,
        [key]: [...data[key], structuredClone(data[key][0])],
      };
      expect(() => validateDataset(input)).toThrow('ID 重复');
    },
  );
});

describe('关联完整性与历史空间语义', () => {
  const mutations: [string, (data: HistoryDatasetV2) => void][] = [
    [
      '专题阶段',
      (d) => {
        d.topics[0]!.phaseIds.push('missing');
      },
    ],
    [
      '专题事件',
      (d) => {
        d.topics[0]!.eventIds.push('missing');
      },
    ],
    [
      '阶段专题',
      (d) => {
        d.phases[0]!.topicId = 'missing';
      },
    ],
    [
      '人物事件',
      (d) => {
        d.people[0]!.relatedEventIds.push('missing');
      },
    ],
    [
      '人物专题',
      (d) => {
        d.people[0]!.relatedTopicIds.push('missing');
      },
    ],
    [
      '地点事件',
      (d) => {
        d.places[0]!.relatedEventIds.push('missing');
      },
    ],
    [
      '部队阶段',
      (d) => {
        d.forceSnapshots[0]!.phaseId = 'missing';
      },
    ],
    [
      '部队路线',
      (d) => {
        d.forceSnapshots[0]!.routeId = 'missing';
      },
    ],
    [
      '体验互动',
      (d) => {
        d.interactions = [];
      },
    ],
    [
      '段落',
      (d) => {
        d.segments.pop();
      },
    ],
    [
      '降级内容',
      (d) => {
        d.fallbackContents = [];
      },
    ],
    [
      '素材人物',
      (d) => {
        const asset = draftAsset();
        asset.relatedPersonIds = ['missing'];
        d.assets.push(asset);
      },
    ],
    [
      '材料素材',
      (d) => {
        const interaction = d.interactions[0]!;
        if ('materials' in interaction)
          interaction.materials[0]!.assetIds.push('missing');
      },
    ],
    [
      '材料来源',
      (d) => {
        const interaction = d.interactions[0]!;
        if ('materials' in interaction)
          interaction.materials[0]!.sourceIds.push('missing');
      },
    ],
  ];
  it.each(mutations)('拒绝不存在的%s引用', (_, mutate) => {
    const data = createDraftV2Dataset();
    mutate(data);
    expect(() => validateDataset(data)).toThrow('不存在');
  });
  it('拒绝错误经纬度与未知精度伪装', () => {
    const data = createDraftV2Dataset();
    data.places[0]!.coordinates = [181, 30];
    data.places[0]!.coordinatePrecision = 'exact';
    expect(historyDatasetV2Schema.safeParse(data).success).toBe(false);
    data.places[0]!.coordinates = null;
    expect(historyDatasetV2Schema.safeParse(data).success).toBe(false);
  });
  it('阶段 sequence 必须唯一且按专题数组排序，不按产品 ID 排序', () => {
    const data = createDraftV2Dataset('exp-crossing-grasslands');
    data.phases.push({
      ...structuredClone(data.phases[0]!),
      phaseId: 'fixture-phase-2',
    });
    data.topics[0]!.phaseIds.push('fixture-phase-2');
    expect(() => validateDataset(data)).toThrow('sequence');
    data.phases[1]!.sequence = 1;
    expect(() => validateDataset(data)).not.toThrow();
    data.topics[0]!.phaseIds.reverse();
    expect(() => validateDataset(data)).toThrow('sequence');
  });
  it.each([
    ['unknown', '1935', '1935'],
    ['day', '1935-02-30', '1935-02-30'],
    ['range', '1935-02', '1935-01'],
    ['year', '1935-01-01', '1935-12-31'],
  ])('拒绝不实时间精度/范围 %s %s %s', (timePrecision, start, end) => {
    const data = createDraftV2Dataset();
    expect(
      historyDatasetV2Schema.safeParse({
        ...data,
        phases: [
          {
            ...data.phases[0],
            timePrecision,
            timeRange: { start, end, label: '测试' },
          },
        ],
      }).success,
    ).toBe(false);
  });
  it('支持年/月精度，保留未知坐标与隐藏态势且不补线', () => {
    const data = createDraftV2Dataset();
    Object.assign(data.phases[0]!, {
      timePrecision: 'year',
      timeRange: {
        start: '1935',
        end: '1935',
        label: '测试年份，不是史实记录',
      },
    });
    const before = JSON.stringify(data);
    expect(() => validateDataset(data)).not.toThrow();
    getPublishedDatasetV2(data);
    expect(JSON.stringify(data)).toBe(before);
    expect(data.forceSnapshots[0]!.coordinates).toBeNull();
    expect(data.routes[0]!.coordinates).toEqual([]);
  });
  it('拒绝跨体验互动和不完整等价主线', () => {
    const data = createDraftV2Dataset();
    data.interactions[0]!.segmentId = 'fixture-s1';
    expect(() => validateDataset(data)).toThrow('归属');
    const fallback = createDraftV2Dataset();
    fallback.fallbackContents[0]!.steps.reverse();
    expect(() => validateDataset(fallback)).toThrow('完整覆盖');
  });
});

describe('声明式互动与素材身份', () => {
  it('拒绝错误完整排列、跨体验 ID 与伪造正确选项', () => {
    const order = draftInteraction('exp-feiduo-ludingqiao', 1);
    expect(
      interactionDefinitionSchema.safeParse({
        ...order,
        correctOrder: ['fixture-choice-0', 'fixture-choice-0', 'missing'],
      }).success,
    ).toBe(false);
    expect(
      interactionDefinitionSchema.safeParse({
        ...order,
        experienceId: 'exp-zunyi-conference',
      }).success,
    ).toBe(false);
    expect(
      interactionDefinitionSchema.safeParse({
        ...draftInteraction('exp-sidu-chishui', 1),
        correctChoiceId: 'missing',
      }).success,
    ).toBe(false);
  });
  it('拒绝不完整配对、分类和缺失观察材料', () => {
    expect(
      interactionDefinitionSchema.safeParse({
        ...draftInteraction('exp-qiaodu-jinshajiang', 1),
        correctPairs: [
          { materialId: 'fixture-material-0', conclusionId: 'missing' },
        ],
      }).success,
    ).toBe(false);
    expect(
      interactionDefinitionSchema.safeParse({
        ...draftInteraction('exp-zunyi-conference', 1),
        correctClassifications: [],
      }).success,
    ).toBe(false);
    expect(
      interactionDefinitionSchema.safeParse({
        ...draftInteraction('exp-sidu-chishui', 0),
        visitOrder: 'any',
      }).success,
    ).toBe(false);
  });
  it.each([
    '/assets/../secret.png',
    '/assets/%2e%2e/secret.png',
    'https://example.com/a.png',
    'javascript:alert(1)',
    '/assets/a.png?q=1',
    '/assets/a\\b.png',
  ])('拒绝素材路径 %s', (filePath) => {
    expect(
      assetReferenceSchema.safeParse({ ...draftAsset(), filePath }).success,
    ).toBe(false);
  });
  it('人物图必须属于同一人，艺术图必须配对真实照片', () => {
    const data = createDraftV2Dataset();
    const asset = draftAsset();
    data.assets.push(asset);
    data.people[0]!.assetIds = [asset.assetId];
    expect(() => validateDataset(data)).toThrow('人物素材关联');
    asset.relatedPersonIds = ['fixture-person'];
    expect(() => validateDataset(data)).toThrow('真实历史照片');
    data.assets.push({
      ...structuredClone(asset),
      assetId: 'fixture-photo',
      assetType: 'historical_photo',
      representation: 'historical_document',
      disclosure: null,
    });
    data.people[0]!.assetIds.push('fixture-photo');
    expect(() => validateDataset(data)).not.toThrow();
  });
  it('AI 画面不得标成历史照片，缺标注或权利未清不得发布', () => {
    const asset = draftAsset();
    expect(
      assetReferenceSchema.safeParse({
        ...asset,
        assetType: 'historical_photo',
        representation: 'ai_recreation',
      }).success,
    ).toBe(false);
    expect(
      assetReferenceSchema.safeParse({ ...asset, disclosure: null }).success,
    ).toBe(false);
    expect(
      assetReferenceSchema.safeParse({ ...asset, releaseStatus: 'published' })
        .success,
    ).toBe(false);
  });
});

describe('v2 双人门禁、传递依赖与撤回', () => {
  it('同一登录名更改大小写不能计为两个复核人员', () => {
    const data = simulateReviewed(createDraftV2Dataset());
    const person = data.people[0]!;
    person.reviewedBy = ['test-only-person-a', 'TEST-ONLY-PERSON-A'];
    person.reviews[1]!.reviewerId = 'TEST-ONLY-PERSON-A';
    expect(() => validateDataset(data)).toThrow('两名不同人员');
  });
  it('有效审核循环关系可发布，草稿无内容泄露', () => {
    const draft = createDraftV2Dataset();
    expect(getPublishedDatasetV2(draft)).toEqual(emptyV2());
    const published = getPublishedDatasetV2(simulateReviewed(draft));
    expect(published.experiences).toHaveLength(1);
    expect(published.segments).toHaveLength(5);
    expect(published.interactions).toHaveLength(2);
    expect(published.forceSnapshots).toHaveLength(0);
  });
  it.each([
    'people',
    'places',
    'forceTracks',
    'forceSnapshots',
    'experiences',
    'segments',
    'interactions',
    'fallbackContents',
    'topics',
    'phases',
  ] as const)('拒绝 %s 以 published 绕过人工审核', (key) => {
    const data = createDraftV2Dataset();
    data[key][0]!.releaseStatus = 'published';
    expect(() => validateDataset(data)).toThrow('两名不同人员');
  });
  it('新增素材同样不能绕过人工审核', () => {
    const data = createDraftV2Dataset();
    data.assets.push({
      ...draftAsset(),
      releaseStatus: 'published',
      rightsStatus: 'cleared',
    });
    expect(() => validateDataset(data)).toThrow('两名不同人员');
  });
  it('拒绝缺失来源、重复签署和未解决异议，不声称验证真人身份', () => {
    const data = simulateReviewed(createDraftV2Dataset());
    data.experiences[0]!.sourceIds = [];
    expect(() => validateDataset(data)).toThrow('缺失来源');
    const duplicate = simulateReviewed(createDraftV2Dataset());
    duplicate.people[0]!.reviews[1]!.reviewerId = 'test-only-person-a';
    expect(() => validateDataset(duplicate)).toThrow('两名不同人员');
    const disputed = simulateReviewed(createDraftV2Dataset());
    disputed.phases[0]!.reviews.push({
      ...disputed.phases[0]!.reviews[0]!,
      reviewerId: 'test-only-person-c',
      decision: 'changes_requested',
    });
    expect(() => validateDataset(disputed)).toThrow('两名不同人员');
    const ai = createDraftV2Dataset();
    expect(
      historyDatasetV2Schema.safeParse({
        ...ai,
        people: [
          {
            ...ai.people[0],
            reviews: [
              {
                reviewerId: 'AI',
                reviewerType: 'ai',
                decision: 'approved',
                reviewedAt: '2026-11-01',
                evidenceNote: '伪签署',
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
  it.each([
    'topics',
    'phases',
    'interactions',
    'segments',
    'fallbackContents',
    'sources',
  ] as const)('撤回 %s 使依赖体验闭合过滤，原记录不被改写', (key) => {
    const data = simulateReviewed(createDraftV2Dataset());
    data[key][0]!.releaseStatus = 'unpublished';
    const before = JSON.stringify(data);
    const published = getPublishedDatasetV2(data);
    expect(published.experiences).toHaveLength(0);
    expect(published.interactions).toHaveLength(0);
    expect(JSON.stringify(data)).toBe(before);
  });
  it('间接素材引用撤回会阻止体验，但保留无关正式资料', () => {
    const data = createDraftV2Dataset();
    data.assets.push(draftAsset());
    const interaction = data.interactions[0]!;
    if ('materials' in interaction)
      interaction.materials[0]!.assetIds = ['fixture-asset'];
    simulateReviewed(data);
    data.assets[0]!.releaseStatus = 'unpublished';
    const published = getPublishedDatasetV2(data);
    expect(published.assets).toHaveLength(0);
    expect(published.experiences).toHaveLength(0);
    expect(published.events).toHaveLength(1);
  });
  it('存在完成记录不能使撤回体验重新发布', () => {
    const data = simulateReviewed(createDraftV2Dataset());
    const record = completion(data);
    expect(isCompletionRecordForExperience(record, data.experiences[0]!)).toBe(
      true,
    );
    data.experiences[0]!.releaseStatus = 'unpublished';
    expect(
      getPublishedDatasetV2(data).experiences.find(
        (r) => r.experienceId === record.experienceId,
      ),
    ).toBeUndefined();
  });
  it('可见态势仅依赖已发布路线，隐藏路线不被绘制或推断', () => {
    const data = simulateReviewed(createDraftV2Dataset());
    data.forceSnapshots[0]!.displayMode = 'route';
    data.forceSnapshots[0]!.routeId = data.routes[0]!.id;
    expect(getPublishedDatasetV2(data).forceSnapshots).toHaveLength(0);
    Object.assign(data.routes[0]!, {
      coordinates: [
        [0, 0],
        [1, 1],
      ],
      evidenceLevel: 'schematic',
      spatialPrecision: 'schematic',
      displayMode: 'dashed',
    });
    expect(getPublishedDatasetV2(data).forceSnapshots).toHaveLength(1);
    data.routes[0]!.releaseStatus = 'unpublished';
    expect(getPublishedDatasetV2(data).forceSnapshots).toHaveLength(0);
  });
});

describe('未来 C1 使用的纯完成契约', () => {
  it('支持三种方式，损坏或未知版本/重复互动可安全拒绝', () => {
    for (const completionMode of ['3d', 'video', 'equivalent'])
      expect(
        completionRecordSchema.safeParse({ ...completion(), completionMode })
          .success,
      ).toBe(true);
    for (const patch of [
      { schemaVersion: 2 },
      { completionPolicyVersion: 0 },
      { completedAt: '1935' },
      { completedInteractionIds: ['ld-01', 'ld-01'] },
    ])
      expect(
        completionRecordSchema.safeParse({ ...completion(), ...patch }).success,
      ).toBe(false);
  });
  it('规则版本与事件必须匹配，普通脚本文字改动不使记录失效', () => {
    const manifest = createDraftV2Dataset().experiences[0]!;
    expect(
      isCompletionRecordForExperience(completion(), {
        ...manifest,
        scriptVersion: 'typo-fix',
      }),
    ).toBe(true);
    expect(
      isCompletionRecordForExperience(completion(), {
        ...manifest,
        completionPolicyVersion: 2,
      }),
    ).toBe(false);
    expect(
      isCompletionRecordForExperience(
        { ...completion(), experienceId: 'exp-crossing-grasslands' },
        manifest,
      ),
    ).toBe(false);
  });
  it('必须终点、互动、解释与主动完成齐全；不接受超时等额外通关字段', () => {
    const manifest = createDraftV2Dataset().experiences[0]!;
    const evidence = {
      experienceId: manifest.experienceId,
      completionPolicyVersion: 1,
      terminalReached: true,
      completedInteractionIds: manifest.requiredInteractionIds,
      acknowledgedExplanationIds: manifest.requiredInteractionIds,
      completionRequested: true,
    };
    expect(canCompleteExperience(manifest, evidence)).toBe(true);
    for (const patch of [
      { terminalReached: false },
      { completionRequested: false },
      { completedInteractionIds: ['ld-01'] },
      { acknowledgedExplanationIds: [] },
      { completionPolicyVersion: 0 },
      { timedOut: true },
      { webglFailed: true },
    ])
      expect(canCompleteExperience(manifest, { ...evidence, ...patch })).toBe(
        false,
      );
  });
});
