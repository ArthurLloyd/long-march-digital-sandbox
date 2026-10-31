import { z } from 'zod';
import { reviewFields } from './data';

export const nonempty = z.string().trim().min(1);
export const idListSchema = z
  .array(nonempty)
  .refine((ids) => new Set(ids).size === ids.length, '引用 ID 不得重复');
export const positiveVersionSchema = z.number().int().positive();
export const contentTypeSchema = z.enum([
  'historical_fact',
  'editorial_summary',
  'artistic_recreation',
  'teaching_simulation',
]);
export const auditedFields = { sourceIds: idListSchema, ...reviewFields };
export const reviewableSchema = z.strictObject(reviewFields);
export type ReviewableRecord = z.infer<typeof reviewableSchema>;

export function sameIds(a: readonly string[], b: readonly string[]) {
  return (
    a.length === b.length &&
    new Set(a).size === a.length &&
    a.every((id) => b.includes(id))
  );
}

export function validDateToken(value: string) {
  if (/^\d{4}$/.test(value)) return Number(value) > 0;
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    return Number(value.slice(0, 4)) > 0;
  return z.iso.date().safeParse(value).success;
}
