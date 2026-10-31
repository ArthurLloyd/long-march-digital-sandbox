import { z } from 'zod';
import {
  auditedFields,
  idListSchema,
  nonempty,
  validDateToken,
} from './primitives';

export const historicalPhaseSchema = z
  .strictObject({
    phaseId: nonempty,
    topicId: nonempty,
    title: nonempty,
    timeRange: z.strictObject({
      start: nonempty.nullable(),
      end: nonempty.nullable(),
      label: nonempty,
    }),
    timePrecision: z.enum(['day', 'month', 'year', 'range', 'unknown']),
    sequence: z.number().int().nonnegative(),
    eventIds: idListSchema,
    ...auditedFields,
  })
  .superRefine((phase, ctx) => {
    const { start, end } = phase.timeRange;
    let valid =
      phase.timePrecision === 'unknown'
        ? start === null && end === null
        : start !== null &&
          end !== null &&
          validDateToken(start) &&
          validDateToken(end) &&
          start.length === end.length &&
          start <= end;
    if (valid && start !== null && end !== null) {
      if (phase.timePrecision === 'day')
        valid = start.length === 10 && start === end;
      if (phase.timePrecision === 'month') valid = start.length === 7;
      if (phase.timePrecision === 'year') valid = start.length === 4;
    }
    if (!valid)
      ctx.addIssue({
        code: 'custom',
        path: ['timeRange'],
        message: '历史时间范围与精度不一致或顺序非法；未知不得补造日期',
      });
  });
export type HistoricalPhase = z.infer<typeof historicalPhaseSchema>;
