import type { ModernGeoBounds as GeoBounds } from '../../../shared/contracts';

/** Camera study windows, NOT event coordinates, routes or administrative bounds. */
export const REGIONS = {
  ruijin: [114.5, 24.5, 117, 27.3],
  zunyi: [105.8, 26.8, 107.6, 28.4],
  chishui: [105.4, 27, 106.9, 28.9],
  jinsha: [101.3, 25.5, 103.4, 27.6],
  luding: [101.7, 29.3, 102.7, 30.5],
  snow: [101.9, 30.4, 103.2, 32],
  grass: [102, 32, 103.8, 34.6],
  reunion: [104.2, 35.1, 108.8, 37.3],
} satisfies Record<string, GeoBounds>;
export type RegionId = keyof typeof REGIONS;

export const ATLAS_REGIONS = [
  { id: 'ruijin', title: '瑞金周边' },
  { id: 'zunyi', title: '遵义周边' },
  { id: 'chishui', title: '赤水流域' },
  { id: 'jinsha', title: '金沙江谷地' },
  { id: 'luding', title: '泸定河谷' },
  { id: 'snow', title: '川西雪山' },
  { id: 'grass', title: '川西北草地' },
  { id: 'reunion', title: '陕甘地区' },
] as const satisfies readonly { id: RegionId; title: string }[];
