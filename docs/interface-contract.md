# 公共接口 v1

唯一入口：`src/shared/contracts/index.ts`。类型从 Zod schema 推导，使用 `import type`；schema 可供 CLI 与测试导入。公共接口、schema、验证器、适配组件和消费者的变更须由 C 协调，并说明兼容／迁移步骤。

## 数据约定

- `HistoryEvent`：id、title、dateText、datePrecision、locationName、coordinates、coordinatePrecision、summary、detail、sourceIds、contentType 及审核字段。日期可以是 day/month/year/range/unknown，禁止把不明日期伪装成精确日期。
- `GeoCoordinate`：`[longitude, latitude]`，WGS84／EPSG:4326，经度 -180…180，纬度 -90…90，单位为度。高程、投影、坐标转换应由 A 记录原始来源、坐标系、精度与处理步骤，不能把 GCJ-02 或本地投影直接混用。
- 未知事件位置使用 `coordinates: null` 与 `coordinatePrecision: unknown`；非 null 必须声明 exact/approximate/schematic。
- `RouteFeature`：id、name、coordinates（坐标数组）、sourceIds、evidenceLevel、displayMode、spatialPrecision 及审核字段。
- `SourceReference`：sourceId、title、publisherOrAuthor、sourceType、urlOrCatalogNumber、publicationDate、pageOrSection、accessedAt、supports、limitations、rightsNote 及审核字段。publicationDate 允许“未知”或历史文本；访问、复核日期为有效 ISO `YYYY-MM-DD`。
- `reviewStatus`：draft / in_review / reviewed / rejected；`releaseStatus`：unpublished / published。候选与发布状态相互独立，reviewed 不会自动发布。
- 公共审核字段：reviewedBy（人员 ID 数组）、reviewedAt（日期或 null）、reviews（HumanReview 数组）。HumanReview 包含 reviewerId、reviewerType: human、decision、reviewedAt、evidenceNote。记录按时间顺序追加；每人的最后一条决定生效。至少两名不同人员最后明确同意，reviewedBy 必须与同意人员集合一致，reviewedAt 不早于任一记录。

## 路线展示矩阵

| evidenceLevel       | 允许模式                | 要求                                                                   |
| ------------------- | ----------------------- | ---------------------------------------------------------------------- |
| documented_geometry | solid / points / hidden | solid 必须 reviewed、有至少两个坐标、有来源、精度 exact 或 approximate |
| confirmed_locations | points / hidden         | 只能独立地点，不可连接为真实路线                                       |
| schematic           | dashed / hidden         | 必须 schematic 精度，界面持续标注“宏观示意，非真实行军路线”            |
| insufficient        | hidden                  | 不得公开绘制                                                           |

无论模式如何，公开数据均须 published、完成双人复核且引用已发布来源。虚线至少两点，地点模式至少一点；隐藏路线不进入场景 props。严禁把地点用算法补成历史几何。

## A：LongMarchScene

从 `src/features/scene/index.ts` 暴露命名导出 `LongMarchScene`，接受 `LongMarchSceneProps`：

```ts
import type { LongMarchSceneProps } from '../../shared/contracts';
// events: readonly HistoryEvent[]
// routes: readonly RouteFeature[]
// activeEventId: string | null
// playbackProgress: number（0..1，节点进度，不是推测路线的依据）
// onEventSelect(eventId: string): void
// onSceneReady(): void
// onSceneError(error: SceneError): void
```

只读输入，不修改数组或记录。空输入不绘制地形事实、路线或虚构事件；无 WebGL 时回调 `webgl_unavailable`；资源错误为 `asset_load_failed`，渲染错误为 `render_failed`。首次可交互后调用 ready，清理资源、监听器与 GPU 对象。C 负责加载／异常／重试容器，A 无需改 App。

## B：HistoryEventPanel

从 `src/features/history/index.ts` 暴露命名导出 `HistoryEventPanel`，接受 `HistoryEventPanelProps`：

```ts
// event: HistoryEvent | null
// sources: readonly SourceReference[]（App 按 event.sourceIds 关联）
// onClose(): void
// teachingState: { mode: 'observe' | 'teaching_simulation'; stepId: string | null }
```

B 管理内容与教学步骤内部逻辑，C 管理选择和容器开关。关闭当前事件清空选中态、暂停播放；重新选择或播放恢复。当前 null 状态显示核验占位。不要从 panel 修改 app 状态或引入自己的全局选择 store。

## 运行时入口

`validateDataset(unknown)` 验证所有候选记录及跨来源关联，出错抛异常；`getPublishedDataset(unknown)` 再过滤 unpublished 和 hidden。`src/data/verified/index.ts` 为 App 提供发布数据。CLI 仅接受 dataset.json 一个入口，新增分片须同步运行时加载与全量校验，不能留下未验证的数据文件。

机器无法证明证据充分或 reviewerId 对应真人；发布还必须完成实际人员在 PR 中的复核流程。
