import { z } from 'zod';
import { auditedFields, idListSchema, nonempty } from './primitives';

export const topicSchema = z.strictObject({
  topicId: nonempty,
  title: nonempty,
  summary: nonempty,
  phaseIds: idListSchema,
  eventIds: idListSchema,
  displayOrder: z.number().int().nonnegative(),
  ...auditedFields,
});
export type Topic = z.infer<typeof topicSchema>;
