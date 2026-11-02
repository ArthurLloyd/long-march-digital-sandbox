import type { GeoBounds } from './geography';

/** Technical camera windows, never historical event positions or routes. */
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

/** Contemporary geographic views, without dates, forces or historical claims. */
export const GEOGRAPHIC_VIEWS = [
  { id: 'ruijin', title: '赣南丘陵' },
  { id: 'zunyi', title: '黔北山地' },
  { id: 'chishui', title: '赤水河谷' },
  { id: 'jinsha', title: '金沙江流域' },
  { id: 'luding', title: '大渡河谷' },
  { id: 'snow', title: '川西高山' },
  { id: 'grass', title: '川西高原' },
  { id: 'reunion', title: '陕甘丘陵' },
] as const satisfies readonly { id: RegionId; title: string }[];
