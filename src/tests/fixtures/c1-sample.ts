import { createDraftV2Dataset } from './v2-dataset';
import type { ExperienceId, HistoryDatasetV2 } from '../../shared/contracts';

/** Synthetic review structures exist only in test/workbench memory, never genuine human approvals. */
export function simulatePublishedSample(
  id: ExperienceId = 'exp-feiduo-ludingqiao',
): HistoryDatasetV2 {
  const data = createDraftV2Dataset(id);
  for (const [key, records] of Object.entries(data)) {
    if (key === 'schemaVersion') continue;
    for (const record of records as HistoryDatasetV2['events']) {
      record.reviewStatus = 'reviewed';
      record.releaseStatus = 'published';
      record.reviewedBy = ['simulation-only-a', 'simulation-only-b'];
      record.reviewedAt = '2026-11-01';
      record.reviews = record.reviewedBy.map((reviewerId) => ({
        reviewerId,
        reviewerType: 'human',
        decision: 'approved',
        reviewedAt: '2026-11-01',
        evidenceNote: '自动测试内存结构，非真人审核，不得复制进正式数据',
      }));
    }
  }
  return data;
}
