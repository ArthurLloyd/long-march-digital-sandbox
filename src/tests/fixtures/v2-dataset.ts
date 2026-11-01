import { createDraftDataset } from '../../data/fixtures/draft-dataset';
import {
  normalizeDataset,
  requiredInteractionsFor,
  INTERACTION_TYPE_BY_ID,
  type AssetReference,
  type ExperienceId,
  type HistoryDatasetV2,
  type InteractionDefinition,
} from '../../shared/contracts';

export const DEV_ONLY_MARKER = 'C0-DEV-ONLY-NONHISTORICAL';
export function draftAudit() {
  return {
    reviewStatus: 'draft' as const,
    releaseStatus: 'unpublished' as const,
    reviewedBy: [],
    reviewedAt: null,
    reviews: [],
  };
}
export function emptyV2(): HistoryDatasetV2 {
  return normalizeDataset({ events: [], routes: [], sources: [] });
}
export function draftAsset(): AssetReference {
  return {
    assetId: 'fixture-asset',
    title: `${DEV_ONLY_MARKER} 素材引用，不是真实资源`,
    filePath: '/assets/fixture-no-file.svg',
    creator: '工程测试',
    origin: '合成测试，无历史或授权证明',
    assetType: 'illustration',
    representation: 'artistic_recreation',
    disclosure: '测试艺术占位，非史实',
    rightsStatus: 'unknown',
    rightsNote: '未提供正式素材，不用于发布',
    attribution: '测试程序',
    transformations: [],
    relatedPersonIds: [],
    relatedPlaceIds: [],
    relatedEventIds: [],
    sourceIds: ['fixture-source'],
    ...draftAudit(),
  };
}
export function draftInteraction(
  experienceId: ExperienceId,
  index: number,
): InteractionDefinition {
  const interactionId = requiredInteractionsFor(experienceId)[index]!;
  const interactionType = INTERACTION_TYPE_BY_ID[interactionId];
  const fields = {
    interactionId,
    experienceId,
    segmentId: index === 0 ? 'fixture-s2' : 'fixture-s4',
    prompt: '合成教学操作，不包含真实历史判断',
    required: true as const,
    feedback: '测试反馈',
    explanation: '测试解释，不支持任何史实',
    completionRequirements: {
      requireExplanationAcknowledgement: true as const,
      allowIncorrectWithExplanation: true as const,
    },
    sourceIds: ['fixture-source'],
    ...draftAudit(),
  };
  const materialCount =
    interactionId === 'sd-01'
      ? 4
      : interactionType === 'classify_source'
        ? 3
        : 2;
  const materials = Array.from({ length: materialCount }, (_, i) => ({
    materialId: `fixture-material-${i}`,
    title: `测试材料 ${i}`,
    text: '合成内容，非历史资料',
    contentType: 'teaching_simulation' as const,
    assetIds: [],
    sourceIds: ['fixture-source'],
  }));
  const choices = Array.from({ length: 3 }, (_, i) => ({
    choiceId: `fixture-choice-${i}`,
    text: `合成选项 ${i}`,
  }));
  switch (interactionType) {
    case 'observe_hotspots':
      return {
        ...fields,
        interactionType,
        materials,
        requiredMaterialIds: materials.map((m) => m.materialId),
        visitOrder: interactionId === 'sd-01' ? 'listed' : 'any',
      };
    case 'sort_sequence':
      return {
        ...fields,
        interactionType,
        choices,
        correctOrder: choices.map((c) => c.choiceId),
      };
    case 'evidence_selection':
      return {
        ...fields,
        interactionType,
        choices: choices.slice(0, 2),
        correctChoiceId: choices[0]!.choiceId,
      };
    case 'material_matching':
      return {
        ...fields,
        interactionType,
        materials,
        conclusions: materials.map((_, i) => ({
          conclusionId: `fixture-conclusion-${i}`,
          text: `测试结论 ${i}`,
        })),
        correctPairs: materials.map((m, i) => ({
          materialId: m.materialId,
          conclusionId: `fixture-conclusion-${i}`,
        })),
      };
    case 'classify_source':
      return {
        ...fields,
        interactionType,
        materials,
        correctClassifications: materials.map((m, i) => ({
          materialId: m.materialId,
          category: (
            [
              'primary_source',
              'editorial_summary',
              'artistic_recreation',
            ] as const
          )[i]!,
        })),
      };
  }
}

/** Draft-only synthetic workbench data. No approval records, historical coordinates or production imports. */
export function createDraftV2Dataset(
  experienceId: ExperienceId = 'exp-feiduo-ludingqiao',
): HistoryDatasetV2 {
  const data = normalizeDataset(createDraftDataset());
  const audit = () => ({ sourceIds: ['fixture-source'], ...draftAudit() });
  data.topics = [
    {
      topicId: 'fixture-topic',
      title: `${DEV_ONLY_MARKER} 工程专题`,
      summary: '非历史专题',
      phaseIds: ['fixture-phase'],
      eventIds: ['fixture-event'],
      displayOrder: 0,
      ...audit(),
    },
  ];
  data.phases = [
    {
      phaseId: 'fixture-phase',
      topicId: 'fixture-topic',
      title: '工程阶段',
      timeRange: { start: null, end: null, label: '未知（非历史时间）' },
      timePrecision: 'unknown',
      sequence: 0,
      eventIds: ['fixture-event'],
      ...audit(),
    },
  ];
  data.people = [
    {
      personId: 'fixture-person',
      name: '虚构测试条目（非历史人物）',
      summary: '仅验证结构',
      detail: '不指代真实人物',
      relatedEventIds: ['fixture-event'],
      relatedTopicIds: ['fixture-topic'],
      assetIds: [],
      ...audit(),
    },
  ];
  data.places = [
    {
      placeId: 'fixture-place',
      historicalName: '测试占位（非历史地点）',
      modernName: null,
      placeType: 'modern_reference',
      summary: '非真实位置',
      detail: '未知坐标不补全',
      coordinates: null,
      coordinatePrecision: 'unknown',
      relatedEventIds: ['fixture-event'],
      assetIds: [],
      ...audit(),
    },
  ];
  data.forceTracks = [
    {
      trackId: 'fixture-track',
      unitId: 'fixture-unit',
      name: '虚构测试单位',
      camp: 'other',
      snapshotIds: ['fixture-snapshot'],
      ...audit(),
    },
  ];
  data.forceSnapshots = [
    {
      snapshotId: 'fixture-snapshot',
      trackId: 'fixture-track',
      phaseId: 'fixture-phase',
      coordinates: null,
      coordinatePrecision: 'unknown',
      region: null,
      routeId: null,
      displayMode: 'hidden',
      ...audit(),
    },
  ];
  const requiredInteractionIds = [...requiredInteractionsFor(experienceId)];
  const kinds = [
    'context',
    'observation',
    'process',
    'interaction',
    'conclusion',
  ] as const;
  data.segments = kinds.map((kind, i) => ({
    segmentId: `fixture-s${i + 1}`,
    experienceId,
    kind,
    title: `工程段落 ${i + 1}`,
    text: '此处没有真实历史剧本',
    contentType: 'teaching_simulation',
    presentation: 'text',
    durationSeconds: null,
    interactionIds:
      i === 1
        ? [requiredInteractionIds[0]!]
        : i === 3
          ? [requiredInteractionIds[1]!]
          : [],
    assetIds: [],
    ...audit(),
  }));
  data.interactions = [
    draftInteraction(experienceId, 0),
    draftInteraction(experienceId, 1),
  ];
  data.experiences = [
    {
      experienceId,
      topicId: 'fixture-topic',
      linkedEventIds: ['fixture-event'],
      scriptVersion: 'fixture-only-1',
      completionPolicyVersion: 1,
      segmentIds: data.segments.map((s) => s.segmentId),
      requiredInteractionIds,
      terminalSegmentId: 'fixture-s5',
      fallbackContentId: 'fixture-fallback',
      assetIds: [],
      ...audit(),
    },
  ];
  data.fallbackContents = [
    {
      fallbackContentId: 'fixture-fallback',
      experienceId,
      steps: data.segments.map((s) => ({
        stepId: `step-${s.segmentId}`,
        segmentId: s.segmentId,
        text: '等价内容结构测试，非历史叙事',
        interactionIds: [...s.interactionIds],
        assetIds: [],
      })),
      ...audit(),
    },
  ];
  return data;
}
