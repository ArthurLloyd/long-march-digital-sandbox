import { z } from 'zod';

// Product identifiers only: no historical data, chronology or publication approval.
export const EXPERIENCE_IDS = [
  'exp-zunyi-conference',
  'exp-sidu-chishui',
  'exp-qiaodu-jinshajiang',
  'exp-feiduo-ludingqiao',
  'exp-crossing-snow-mountains',
  'exp-crossing-grasslands',
] as const;
export const INTERACTION_IDS = [
  'zy-01',
  'zy-02',
  'sd-01',
  'sd-02',
  'js-01',
  'js-02',
  'ld-01',
  'ld-02',
  'sn-01',
  'sn-02',
  'gr-01',
  'gr-02',
] as const;
export const experienceIdSchema = z.enum(EXPERIENCE_IDS);
export const interactionIdSchema = z.enum(INTERACTION_IDS);
export type ExperienceId = z.infer<typeof experienceIdSchema>;
export type InteractionId = z.infer<typeof interactionIdSchema>;
export const EXPERIENCE_CATALOG = [
  {
    productCode: 'E01',
    title: '遵义会议',
    experienceId: EXPERIENCE_IDS[0],
    requiredInteractionIds: ['zy-01', 'zy-02'],
  },
  {
    productCode: 'E02',
    title: '四渡赤水',
    experienceId: EXPERIENCE_IDS[1],
    requiredInteractionIds: ['sd-01', 'sd-02'],
  },
  {
    productCode: 'E03',
    title: '巧渡金沙江',
    experienceId: EXPERIENCE_IDS[2],
    requiredInteractionIds: ['js-01', 'js-02'],
  },
  {
    productCode: 'E04',
    title: '飞夺泸定桥',
    experienceId: EXPERIENCE_IDS[3],
    requiredInteractionIds: ['ld-01', 'ld-02'],
  },
  {
    productCode: 'E05',
    title: '翻越雪山',
    experienceId: EXPERIENCE_IDS[4],
    requiredInteractionIds: ['sn-01', 'sn-02'],
  },
  {
    productCode: 'E06',
    title: '穿越草地',
    experienceId: EXPERIENCE_IDS[5],
    requiredInteractionIds: ['gr-01', 'gr-02'],
  },
] as const satisfies readonly {
  productCode: string;
  title: string;
  experienceId: ExperienceId;
  requiredInteractionIds: readonly [InteractionId, InteractionId];
}[];
export const INTERACTION_TYPE_BY_ID = {
  'zy-01': 'observe_hotspots',
  'zy-02': 'classify_source',
  'sd-01': 'observe_hotspots',
  'sd-02': 'evidence_selection',
  'js-01': 'observe_hotspots',
  'js-02': 'material_matching',
  'ld-01': 'observe_hotspots',
  'ld-02': 'sort_sequence',
  'sn-01': 'observe_hotspots',
  'sn-02': 'evidence_selection',
  'gr-01': 'observe_hotspots',
  'gr-02': 'evidence_selection',
} as const satisfies Record<InteractionId, string>;
export function requiredInteractionsFor(
  experienceId: ExperienceId,
): readonly InteractionId[] {
  return EXPERIENCE_CATALOG.find(
    (entry) => entry.experienceId === experienceId,
  )!.requiredInteractionIds;
}
