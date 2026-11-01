import type { HistoryDatasetV2 } from '../../shared/contracts';
import type { PhaseClockModel } from '../../features/timeline';
import type { GeoBounds } from './geography';

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
export type ImmersiveSlotId = 'luding' | 'snow' | 'zunyi';
export interface PanoramaStep {
  phaseId: string;
  eventId: string | null;
  title: string;
  timeLabel: string;
  region: RegionId;
  immersive: ImmersiveSlotId | null;
  coordinates: null;
}
export interface PanoramaNode {
  id: RegionId;
  title: string;
  phaseId: string;
  immersive: ImmersiveSlotId | null;
}
export function nodeKind(node: PanoramaNode): 'major' | 'immersive' | 'place' {
  return node.immersive
    ? 'immersive'
    : node.id === 'ruijin'
      ? 'place'
      : 'major';
}
export const PANORAMA_NODES: readonly PanoramaNode[] = [
  { id: 'ruijin', title: '瑞金出发', phaseId: 'slot-ruijin', immersive: null },
  { id: 'zunyi', title: '遵义会议', phaseId: 'zy-phase', immersive: 'zunyi' },
  { id: 'chishui', title: '四渡赤水', phaseId: 'sd-phase-1', immersive: null },
  { id: 'jinsha', title: '巧渡金沙江', phaseId: 'js-phase', immersive: null },
  {
    id: 'luding',
    title: '飞夺泸定桥',
    phaseId: 'ld-phase',
    immersive: 'luding',
  },
  { id: 'snow', title: '翻越雪山', phaseId: 'sn-phase', immersive: 'snow' },
  { id: 'grass', title: '穿越草地', phaseId: 'gr-phase', immersive: null },
  {
    id: 'reunion',
    title: '陕甘会师观察',
    phaseId: 'slot-reunion',
    immersive: null,
  },
];
/** Only selects original candidate metadata; never creates or alters approvals. */
export function createPanoramaNavigation(candidate: HistoryDatasetV2) {
  const order = [
    'slot-ruijin',
    'zy-phase',
    'sd-phase-1',
    'sd-phase-2',
    'sd-phase-3',
    'sd-phase-4',
    'js-phase',
    'ld-phase',
    'sn-phase',
    'gr-phase',
    'slot-reunion',
  ];
  const steps: PanoramaStep[] = order.map((phaseId) => {
    const phase = candidate.phases.find((p) => p.phaseId === phaseId);
    const specificEvents: Record<string, string> = {
      'sd-phase-1': 'event-sd-1',
      'sd-phase-2': 'event-sd-2',
      'sd-phase-3': 'event-sd-3',
      'sd-phase-4': 'event-sd-4',
    };
    const specificEvent = specificEvents[phaseId];
    const eventId = specificEvent
      ? phase?.eventIds.includes(specificEvent)
        ? specificEvent
        : null
      : (phase?.eventIds[0] ?? null);
    const node =
      PANORAMA_NODES.find((n) => n.phaseId === phaseId) ?? PANORAMA_NODES[2]!;
    return {
      phaseId,
      eventId,
      title: phase?.title.replace('资料阶段', '') ?? node.title,
      timeLabel: phase?.timeRange.label ?? '技术入口 · 时间与史料待 B 复核',
      region: node.id,
      immersive: node.immersive,
      coordinates: null,
    };
  });
  const clockModel: PhaseClockModel = {
    topics: [{ topicId: 'panorama-navigation' }],
    orders: new Map([
      [
        'panorama-navigation',
        steps.map((step, sequence) => ({
          phaseId: step.phaseId,
          topicId: 'panorama-navigation',
          sequence,
        })),
      ],
    ]),
    key: JSON.stringify(order),
    error: null,
  };
  return { steps, clockModel };
}
export const SLOT_EXPERIENCE_IDS = {
  luding: 'exp-feiduo-ludingqiao',
  snow: 'exp-crossing-snow-mountains',
  zunyi: 'exp-zunyi-conference',
} as const;
