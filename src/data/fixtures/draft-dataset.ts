import type {
  HistoryDataset,
  HistoryEvent,
  RouteFeature,
  SourceReference,
} from '../../shared/contracts';

// Synthetic test material only. These are not historical records or human review results.
const pending = {
  reviewStatus: 'draft',
  releaseStatus: 'unpublished',
  reviewedBy: [],
  reviewedAt: null,
  reviews: [],
} as const;

export function createDraftEvent(): HistoryEvent {
  return {
    id: 'fixture-event',
    title: '测试事件（非史实）',
    dateText: '未知（测试）',
    datePrecision: 'unknown',
    locationName: '未知地点（测试）',
    coordinates: null,
    coordinatePrecision: 'unknown',
    summary: '仅用于自动化验证。',
    detail: '不代表真实人物、事件、地点或日期。',
    sourceIds: ['fixture-source'],
    contentType: 'teaching_simulation',
    ...pending,
    reviewedBy: [],
    reviews: [],
  };
}

export function createDraftRoute(): RouteFeature {
  return {
    id: 'fixture-route',
    name: '测试路线（非史实）',
    coordinates: [],
    sourceIds: ['fixture-source'],
    evidenceLevel: 'insufficient',
    displayMode: 'hidden',
    spatialPrecision: 'unknown',
    ...pending,
    reviewedBy: [],
    reviews: [],
  };
}

export function createDraftSource(): SourceReference {
  return {
    sourceId: 'fixture-source',
    title: '测试来源（非史料）',
    publisherOrAuthor: '测试程序',
    sourceType: 'other',
    urlOrCatalogNumber: 'FIXTURE-NOT-A-CITATION',
    publicationDate: '未知（测试）',
    pageOrSection: '测试段落',
    accessedAt: '2026-10-31',
    supports: ['测试校验流程'],
    limitations: '不支持任何历史事实。',
    rightsNote: '本仓库测试数据。',
    ...pending,
    reviewedBy: [],
    reviews: [],
  };
}

export function createDraftDataset(): HistoryDataset {
  return {
    events: [createDraftEvent()],
    routes: [createDraftRoute()],
    sources: [createDraftSource()],
  };
}
