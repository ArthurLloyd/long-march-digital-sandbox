import type { HistoryDatasetV2 } from '../../shared/contracts';
import { getPublishedDatasetV2 } from '../../shared/utils/validate-dataset';
import { selectForceStateForPhase } from '../history/force-state';

export const ROUTE_LAYERS = [
  { id: 'red_army', label: '红军多主力', color: '#d66155', pattern: 'dashed' },
  {
    id: 'nationalist_army',
    label: '国军围堵态势',
    color: '#75b6da',
    pattern: 'dotted',
  },
  { id: 'event', label: '事件细分路线', color: '#ead19a', pattern: 'dashed' },
  {
    id: 'immersive',
    label: '沉浸局部路径',
    color: '#b5cdb5',
    pattern: 'dashed',
  },
] as const;
/** Validate and filter the complete graph before allowing a real map route. */
export function selectPublishedMapRoutes(
  input: HistoryDatasetV2,
  phaseId: string | null,
) {
  const published = getPublishedDatasetV2(input);
  return selectForceStateForPhase(published, phaseId).entries.flatMap(
    (entry) => {
      const route = entry.route;
      if (
        !route ||
        route.displayMode === 'hidden' ||
        route.evidenceLevel === 'insufficient'
      )
        return [];
      return [
        {
          id: route.id,
          camp: entry.track.camp,
          unitId: entry.track.unitId,
          name: entry.track.name,
          mode: route.displayMode,
          precision: route.spatialPrecision,
          coordinates: route.coordinates,
        },
      ];
    },
  );
}
export type PublishedMapRoute = ReturnType<
  typeof selectPublishedMapRoutes
>[number];

/** Non-geographic topology for exercising four crossing slots. No lon/lat. */
export const ENGINEERING_CROSSINGS = [
  {
    phaseId: 'sd-phase-1',
    label: '一渡',
    red: [
      [12, 72],
      [32, 62],
      [50, 46],
      [66, 35],
    ],
    blue: [
      [85, 16],
      [72, 25],
      [64, 44],
    ],
  },
  {
    phaseId: 'sd-phase-2',
    label: '二渡',
    red: [
      [66, 35],
      [54, 43],
      [38, 58],
      [26, 66],
    ],
    blue: [
      [75, 24],
      [66, 38],
      [57, 53],
    ],
  },
  {
    phaseId: 'sd-phase-3',
    label: '三渡',
    red: [
      [26, 66],
      [40, 53],
      [55, 40],
      [70, 32],
    ],
    blue: [
      [78, 64],
      [66, 52],
      [60, 39],
    ],
  },
  {
    phaseId: 'sd-phase-4',
    label: '四渡',
    red: [
      [70, 32],
      [55, 42],
      [43, 56],
      [36, 80],
    ],
    blue: [
      [80, 18],
      [70, 28],
      [61, 40],
    ],
  },
] as const;
