import { z } from 'zod';
import { auditedFields, idListSchema, nonempty } from './primitives';

export const assetPathSchema = nonempty.refine(
  (path) =>
    /^\/assets\/[A-Za-z0-9_./\-\u3400-\u9fff]+$/.test(path) &&
    path
      .split('/')
      .slice(2)
      .every((part) => part !== '' && part !== '.' && part !== '..'),
  '素材必须是 /assets/ 下无查询、编码或父目录逃逸的本地路径',
);
export const assetReferenceSchema = z
  .strictObject({
    assetId: nonempty,
    title: nonempty,
    filePath: assetPathSchema,
    creator: nonempty,
    origin: nonempty,
    assetType: z.enum([
      'historical_photo',
      'contemporary_photo',
      'archive_scan',
      'illustration',
      'ai_recreation',
      'model_3d',
      'audio',
      'video',
      'map',
      'terrain',
    ]),
    representation: z.enum([
      'historical_document',
      'contemporary_record',
      'artistic_recreation',
      'ai_recreation',
    ]),
    disclosure: nonempty.nullable(),
    rightsStatus: z.enum(['unknown', 'restricted', 'cleared']),
    rightsNote: nonempty,
    attribution: nonempty,
    transformations: z.array(nonempty),
    relatedPersonIds: idListSchema,
    relatedPlaceIds: idListSchema,
    relatedEventIds: idListSchema,
    ...auditedFields,
  })
  .superRefine((asset, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (
      ['historical_photo', 'archive_scan'].includes(asset.assetType) &&
      asset.representation !== 'historical_document'
    )
      fail(
        '历史照片和档案必须声明 historical_document，不能以艺术或 AI 图冒充',
      );
    if (
      asset.assetType === 'ai_recreation' &&
      asset.representation !== 'ai_recreation'
    )
      fail('AI 素材必须明确声明 ai_recreation');
    if (
      ['artistic_recreation', 'ai_recreation'].includes(asset.representation) &&
      asset.disclosure === null
    )
      fail('艺术或 AI 再现必须提供展示标注');
    if (asset.releaseStatus === 'published' && asset.rightsStatus !== 'cleared')
      fail('正式素材必须有已确认的发布权利');
  });
export type AssetReference = z.infer<typeof assetReferenceSchema>;
