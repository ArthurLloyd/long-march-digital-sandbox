import { z } from 'zod';
import type { HistoryDatasetV2 } from '../../../shared/contracts';

const text = z.string().trim().min(1);
const ids = z
  .array(text)
  .min(1)
  .refine((v) => new Set(v).size === v.length, '引用不能重复');
const coordinate = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-85).max(85),
]);
const bounds = z
  .tuple([
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
    z.number().finite(),
  ])
  .refine(
    ([w, s, e, n]) =>
      w >= -180 && e <= 180 && s >= -85 && n <= 85 && w < e && s < n,
    '区域边界无效',
  );
const availability = z.enum(['available', 'withdrawn']);
const precision = z.enum(['approximate', 'schematic']);
const role = z.enum([
  'historical_site_approximation',
  'modern_placename_reference',
  'regional_view_anchor',
]);
const reference = z
  .strictObject({
    referenceId: text,
    title: text,
    url: z
      .url()
      .refine((v) => /^https?:\/\//.test(v), '定位来源只接受 HTTP(S) 链接'),
    publisher: text,
    accessedAt: z.iso.date(),
    coordinateSystem: z.enum(['WGS84', 'not_applicable']),
    coordinates: coordinate.nullable(),
    revision: text,
    license: text,
    kind: z.enum([
      'modern_location',
      'geographic_context',
      'historical_context',
    ]),
    notes: text,
    availability,
  })
  .superRefine((r, ctx) => {
    if (
      r.kind === 'modern_location' &&
      (r.coordinateSystem !== 'WGS84' || !r.coordinates)
    )
      ctx.addIssue({
        code: 'custom',
        message: '现代定位必须提供明确的 WGS84 参考',
      });
    if (
      r.kind !== 'modern_location' &&
      (r.coordinateSystem !== 'not_applicable' || r.coordinates)
    )
      ctx.addIssue({ code: 'custom', message: '文字关系来源不声明测绘坐标' });
  });
const node = z
  .strictObject({
    locationNodeId: text,
    name: text,
    coordinates: coordinate,
    bounds: bounds.nullable(),
    precision,
    anchorRole: role,
    locationReferenceIds: ids,
    availability,
    version: text,
    candidateRouteEndpoint: z.boolean(),
    missingEvidence: z.array(text).min(1),
  })
  .superRefine((n, ctx) => {
    if (
      n.anchorRole === 'regional_view_anchor' &&
      (!n.bounds || n.candidateRouteEndpoint || n.precision !== 'schematic')
    )
      ctx.addIssue({
        code: 'custom',
        message: '区域取景锚点必须为示意区域，不能作为路线端点',
      });
    if (n.bounds && !inside(n.coordinates, n.bounds))
      ctx.addIssue({ code: 'custom', message: '锚点必须在展示范围内' });
  });
const placement = z
  .strictObject({
    placementId: text,
    eventId: text,
    locationNodeId: text,
    regionIds: ids,
    placementKind: z.enum(['point', 'area', 'region_reference']),
    anchorCoordinates: coordinate,
    bounds: bounds.nullable(),
    locationLabel: text,
    displayLabel: text.nullable(),
    precision,
    anchorRole: role,
    historicalSourceIds: ids,
    locationReferenceIds: ids,
    rationale: text,
    limitations: text,
    availability,
    version: text,
  })
  .superRefine((p, ctx) => {
    if ((p.placementKind !== 'point') !== (p.bounds !== null))
      ctx.addIssue({
        code: 'custom',
        message: '点标记不能声明区域；区域标记必须声明范围',
      });
    if (p.bounds && !inside(p.anchorCoordinates, p.bounds))
      ctx.addIssue({ code: 'custom', message: '区域锚点超出展示范围' });
    if (
      (p.anchorRole === 'regional_view_anchor') !==
      (p.placementKind !== 'point')
    )
      ctx.addIssue({ code: 'custom', message: '区域取景锚点不能冒充事件点' });
  });
export const referenceResourceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  references: z.array(reference),
});
export const placementResourceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  version: text,
  coordinateSystem: z.literal('WGS84'),
  availability,
  withdrawnEventIds: z.array(text),
  regions: z.array(
    z.strictObject({
      regionId: text,
      title: text,
      bounds,
      anchorCoordinates: coordinate,
    }),
  ),
  nodes: z.array(node),
  placements: z.array(placement),
});
export type EventPlacement = z.infer<typeof placement>;
export type LocationNode = z.infer<typeof node>;
export type LocationReference = z.infer<typeof reference>;
export type PlacementResource = z.infer<typeof placementResourceSchema>;
export type EventMapResources = {
  positions: PlacementResource;
  references: LocationReference[];
};
export function inside(p: readonly number[], b: readonly number[]) {
  return p[0]! >= b[0]! && p[0]! <= b[2]! && p[1]! >= b[1]! && p[1]! <= b[3]!;
}

/** Independent exhibition information. Never mutate/upgrade the historical dataset. */
export function validateEventMapResources(
  positions: unknown,
  references: unknown,
  dataset: HistoryDatasetV2,
): EventMapResources {
  const p = placementResourceSchema.parse(positions),
    r = referenceResourceSchema.parse(references).references;
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length)
      throw new Error(`${label} ID 重复`);
  };
  unique(
    p.placements.map((v) => v.placementId),
    'placement',
  );
  unique(
    p.nodes.map((v) => v.locationNodeId),
    'locationNode',
  );
  unique(
    p.regions.map((v) => v.regionId),
    'region',
  );
  unique(
    r.map((v) => v.referenceId),
    'reference',
  );
  unique(p.withdrawnEventIds, 'withdrawnEvent');
  const referenceIds = new Set(r.map((v) => v.referenceId));
  const nodes = new Map(p.nodes.map((v) => [v.locationNodeId, v]));
  const regions = new Set(p.regions.map((v) => v.regionId));
  const events = new Map(dataset.events.map((v) => [v.id, v]));
  for (const id of p.withdrawnEventIds)
    if (!events.has(id)) throw new Error(`撤回事件不存在：${id}`);
  for (const region of p.regions)
    if (!inside(region.anchorCoordinates, region.bounds))
      throw new Error('分组锚点不在取景范围内');
  for (const n of p.nodes) {
    for (const id of n.locationReferenceIds)
      if (!referenceIds.has(id)) throw new Error(`定位来源不存在：${id}`);
    if (
      !n.locationReferenceIds.some((id) =>
        r.some(
          (ref) =>
            ref.referenceId === id &&
            ref.kind === 'modern_location' &&
            ref.coordinateSystem === 'WGS84' &&
            ref.coordinates,
        ),
      )
    )
      throw new Error(`地点缺少 WGS84 参考：${n.locationNodeId}`);
    const modern = r.filter(
      (ref) =>
        n.locationReferenceIds.includes(ref.referenceId) &&
        ref.kind === 'modern_location',
    );
    if (n.bounds && modern.some((ref) => !inside(ref.coordinates!, n.bounds!)))
      throw new Error(`展示范围遗漏其定位地名：${n.locationNodeId}`);
    if (
      !n.bounds &&
      !modern.some(
        (ref) =>
          Math.abs(n.coordinates[0] - ref.coordinates![0]) <= 0.002 &&
          Math.abs(n.coordinates[1] - ref.coordinates![1]) <= 0.002,
      )
    )
      throw new Error(`概略点偏离其现代参考：${n.locationNodeId}`);
  }
  for (const item of p.placements) {
    const event = events.get(item.eventId),
      n = nodes.get(item.locationNodeId);
    if (!event || !n) throw new Error(`事件/地点关联失效：${item.placementId}`);
    if (
      JSON.stringify(item.anchorCoordinates) !==
        JSON.stringify(n.coordinates) ||
      JSON.stringify(item.bounds) !== JSON.stringify(n.bounds) ||
      item.anchorRole !== n.anchorRole ||
      item.precision !== n.precision
    )
      throw new Error(`位置与地点节点不一致：${item.placementId}`);
    for (const id of item.regionIds)
      if (!regions.has(id)) throw new Error(`展示区域不存在：${id}`);
    for (const id of item.locationReferenceIds)
      if (!referenceIds.has(id)) throw new Error(`定位来源不存在：${id}`);
    for (const id of item.historicalSourceIds)
      if (
        !dataset.sources.some((s) => s.sourceId === id) ||
        !event.sourceIds.includes(id)
      )
        throw new Error(`历史来源未关联本事件：${id}`);
  }
  return { positions: p, references: r };
}
