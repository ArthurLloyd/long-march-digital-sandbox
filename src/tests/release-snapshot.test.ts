import { describe, expect, it } from 'vitest';
import raw from '../data/verified/dataset.json';
import { createReleaseSnapshot } from '../shared/utils/release-snapshot';
import {
  createExperienceCatalog,
  resolveHistoricalRoute,
} from '../app/experience/historical-experience-routing';
import { simulatePublishedSample } from './fixtures/c1-sample';
import { createCandidateReviewCatalog } from './workbench/candidate-review-catalog';
import { EXPERIENCE_CATALOG, type CompletionRecord } from '../shared/contracts';

describe('构建发布快照与 deny-only 撤回保护', () => {
  it('全量候选只留下拒绝索引，不携带正文、互动答案或图片路径', () => {
    const snapshot = createReleaseSnapshot(raw);
    expect(snapshot.dataset.events).toHaveLength(0);
    expect(snapshot.dataset.assets).toHaveLength(0);
    expect(snapshot.dataset.interactions).toHaveLength(0);
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('ld-hotspot-banks');
    expect(serialized).not.toContain('桥板被拆除的范围');
    expect(serialized).not.toContain('/assets/archive/');
    expect(snapshot.restrictions.phaseSystem).toBe(true);
    expect(snapshot.restrictions.gates).toContainEqual([
      'event',
      'event-ld',
      'exp-feiduo-ludingqiao',
    ]);
    expect(
      Object.values(snapshot.dataset)
        .filter(Array.isArray)
        .every((a) => a.length === 0),
    ).toBe(true);
  });
  it('撤回体验保留门槛，发布正文不能凭旧记录降级打开', () => {
    const data = simulatePublishedSample();
    const manifest = data.experiences[0]!;
    const record: CompletionRecord = {
      schemaVersion: 1,
      experienceId: manifest.experienceId,
      completionPolicyVersion: 1,
      completedAt: '2026-11-02T00:00:00Z',
      completedInteractionIds: manifest.requiredInteractionIds,
      completionMode: 'equivalent',
    };
    data.experiences[0]!.releaseStatus = 'unpublished';
    const snapshot = createReleaseSnapshot(data);
    expect(snapshot.dataset.events).toHaveLength(1);
    expect(snapshot.dataset.experiences).toHaveLength(0);
    const catalog = createExperienceCatalog(
      snapshot.dataset,
      snapshot.restrictions,
    );
    expect(
      resolveHistoricalRoute(catalog, { kind: 'event', id: 'fixture-event' }, [
        record,
      ]).status,
    ).toBe('unavailable');
    data.events[0]!.releaseStatus = 'unpublished';
    const removed = createReleaseSnapshot(data);
    expect(
      resolveHistoricalRoute(
        createExperienceCatalog(removed.dataset, removed.restrictions),
        { kind: 'event', id: 'fixture-event' },
        [record],
      ).status,
    ).toBe('unavailable');
  });
  it('撤回所有阶段仍声明阶段系统，不激活旧事件自动时钟', () => {
    const data = simulatePublishedSample();
    data.phases.forEach((p) => (p.releaseStatus = 'unpublished'));
    const snapshot = createReleaseSnapshot(data);
    expect(snapshot.dataset.phases).toHaveLength(0);
    expect(
      createExperienceCatalog(snapshot.dataset, snapshot.restrictions)
        .phaseSystem,
    ).toBe(true);
    expect(
      createExperienceCatalog({ events: [], routes: [], sources: [] })
        .phaseSystem,
    ).toBe(false);
  });
  it('隔离候选视图复用六体验映射且不修改任何审核字段', () => {
    const before = JSON.stringify(raw);
    const catalog = createCandidateReviewCatalog(raw);
    expect(catalog.published.experiences).toHaveLength(6);
    for (const entry of EXPERIENCE_CATALOG) {
      const manifest = catalog.published.experiences.find(
        (e) => e.experienceId === entry.experienceId,
      )!;
      expect(manifest).toBeDefined();
      expect(manifest.segmentIds).toHaveLength(5);
      expect(manifest.requiredInteractionIds).toHaveLength(2);
      const equivalent = catalog.published.fallbackContents.find(
        (f) => f.fallbackContentId === manifest.fallbackContentId,
      )!;
      expect(equivalent.steps.map((s) => s.segmentId)).toEqual(
        manifest.segmentIds,
      );
      expect(equivalent.steps.flatMap((s) => s.interactionIds)).toEqual(
        manifest.requiredInteractionIds,
      );
      expect(
        catalog.published.events.some(
          (e) => manifest.linkedEventIds.includes(e.id) && e.detail.length > 0,
        ),
      ).toBe(true);
      expect(manifest.sourceIds.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(raw)).toBe(before);
    expect(
      catalog.published.events.every(
        (e) =>
          e.reviewStatus === 'draft' &&
          e.releaseStatus === 'unpublished' &&
          e.reviews.length === 0,
      ),
    ).toBe(true);
  });
});
