import { describe, expect, it } from 'vitest';
import {
  createExperienceCatalog,
  resolveHistoricalRoute,
} from '../app/experience/historical-experience-routing';
import { simulatePublishedSample } from './fixtures/c1-sample';
import {
  EXPERIENCE_IDS,
  type CompletionRecord,
  type HistoricalObjectSelection,
} from '../shared/contracts';

describe('C1 唯一对象路由与发布准入', () => {
  it.each(['event', 'person', 'place', 'topic'] as const)(
    '普通 %s 已发布即可阅读，无坐标地点也能访问',
    (kind) => {
      const data = simulatePublishedSample();
      data.experiences = [];
      data.segments = [];
      data.interactions = [];
      data.fallbackContents = [];
      const selection: HistoricalObjectSelection = {
        kind,
        id: `fixture-${kind}`,
      };
      expect(
        resolveHistoricalRoute(createExperienceCatalog(data), selection, [])
          .status,
      ).toBe('reading');
    },
  );
  it.each(EXPERIENCE_IDS)('每个重点体验独立判定：%s', (id) => {
    const data = simulatePublishedSample(id);
    const manifest = data.experiences[0]!;
    const record: CompletionRecord = {
      schemaVersion: 1,
      experienceId: id,
      completionPolicyVersion: 1,
      completedAt: '2026-11-01T00:00:00Z',
      completedInteractionIds: manifest.requiredInteractionIds,
      completionMode: '3d',
    };
    const catalog = createExperienceCatalog(data);
    const selection = { kind: 'event' as const, id: 'fixture-event' };
    expect(resolveHistoricalRoute(catalog, selection, []).status).toBe('intro');
    expect(resolveHistoricalRoute(catalog, selection, [record]).status).toBe(
      'reading',
    );
    expect(
      resolveHistoricalRoute(catalog, selection, [
        { ...record, completionPolicyVersion: 2 },
      ]).status,
    ).toBe('intro');
  });
  it('未发布/撤回体验不能退化成普通阅读，也不能被旧完成记录解锁', () => {
    const data = simulatePublishedSample();
    const manifest = data.experiences[0]!;
    const record: CompletionRecord = {
      schemaVersion: 1,
      experienceId: manifest.experienceId,
      completionPolicyVersion: 1,
      completedAt: '2026-11-01T00:00:00Z',
      completedInteractionIds: manifest.requiredInteractionIds,
      completionMode: '3d',
    };
    data.experiences[0]!.releaseStatus = 'unpublished';
    const result = resolveHistoricalRoute(
      createExperienceCatalog(data),
      { kind: 'event', id: 'fixture-event' },
      [record],
    );
    expect(result.status).toBe('unavailable');
    expect(JSON.stringify(result)).not.toContain('不代表真实人物');
    data.events[0]!.releaseStatus = 'unpublished';
    expect(
      resolveHistoricalRoute(
        createExperienceCatalog(data),
        { kind: 'event', id: 'fixture-event' },
        [record],
      ).status,
    ).toBe('unavailable');
  });
  it('无效引用关闭访问，来源撤回不泄露素材或正文', () => {
    const data = simulatePublishedSample();
    data.people[0]!.relatedEventIds.push('missing');
    expect(createExperienceCatalog(data).error).not.toBeNull();
    const withdrawn = simulatePublishedSample();
    withdrawn.sources[0]!.releaseStatus = 'unpublished';
    expect(
      resolveHistoricalRoute(
        createExperienceCatalog(withdrawn),
        { kind: 'person', id: 'fixture-person' },
        [],
      ).status,
    ).toBe('unavailable');
  });
});
