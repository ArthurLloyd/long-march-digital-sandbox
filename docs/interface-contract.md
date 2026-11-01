# 公共接口 v1 / v2（Phase 3 · C0）

## C1 运行补充

公共 schema 和 A/B props 保持 C0 不变。C 的 useHistoricalExperience/ExperienceHost 现提供独立运行状态机、唯一对象入口、runId 防护、五类响应、解释确认、显式完成、浏览器记忆和退出/重播/等价调度，见 [C1 接线说明](architecture/c1-integration-guide.md)。A/B 的正式三维成品与史料仍待交付和审核。

usePlayback 新增兼容的 pause()。普通关闭正文只暂停并收起，保留选中，显式取消选择/返回首页才清空。产品关联的候选索引仅用于拒绝撤回体验被当普通事件打开，不提供任何发布资格或候选内容。下方 C0 设计和旧版附录的状态语义以此 C1 补充为准。

以下 C0 设计先于实现确定兼容方式；后附的 v1 说明继续适用于旧数据与旧组件。C0 只建设契约、验证、发布过滤和隔离调试，不实现正式体验状态机。

## v2 兼容分析

- 保留 HistoryEvent、RouteFeature、SourceReference、HistoryDataset（旧版类型）、LongMarchSceneProps、HistoryEventPanelProps，旧组件不增加必填参数。
- 无 schemaVersion 且仅有 events/routes/sources 为 v1；显式 schemaVersion: 2 为 v2。两个版本均为严格结构，未知字段或版本拒绝。
- v2 必须提供旧三个集合及 topics/phases/people/places/forceTracks/forceSnapshots/experiences/segments/interactions/fallbackContents/assets 数组；暂缺内容填 []，不强迫 B 补造资料。
- historyDatasetSchema 接受两个版本，historyDatasetV1Schema/historyDatasetV2Schema 可分别校验。VersionedHistoryDataset 是联合类型。
- validateDataset/getPublishedDataset 保持输入版本的返回形状，旧三个空数组仍原样有效。normalizeDataset 将已验证 v1 归一化为内存 v2 空扩展；getPublishedDatasetV2 提供统一发布视图，不写正式 JSON。
- 正式入口仍是 B 管理的 src/data/verified/dataset.json，C0 不改动它或 A/B 实现。现有 App 继续读取共同的三个数组。

```json
{
  "schemaVersion": 2,
  "events": [],
  "routes": [],
  "sources": [],
  "topics": [],
  "phases": [],
  "people": [],
  "places": [],
  "forceTracks": [],
  "forceSnapshots": [],
  "experiences": [],
  "segments": [],
  "interactions": [],
  "fallbackContents": [],
  "assets": []
}
```

## 新增模型及实际字段约定

所有正式历史对象，包括段落、素材、等价内容，追加原有共同审核字段和 sourceIds。ID 在所属集合内唯一，引用数组不重复。所有引用即使处于草稿也须存在。

reviewerId 使用稳定 GitHub 登录名，比较时忽略大小写；同一登录名变更大小写不能计为第二位人员。机器仍不能验证真实身份或识别任意别名。

| 类型 / 集合                                    | 业务字段                                                                                                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topic / topics                                 | topicId, title, summary, phaseIds, eventIds, displayOrder                                                                                                                                    |
| HistoricalPhase / phases                       | phaseId, topicId, title, timeRange, timePrecision, sequence, eventIds                                                                                                                        |
| HistoricalPerson / people                      | personId, name, summary, detail, relatedEventIds, relatedTopicIds, assetIds                                                                                                                  |
| HistoricalPlace / places                       | placeId, historicalName, modernName（可 null）, placeType, summary, detail, coordinates, coordinatePrecision, relatedEventIds, assetIds                                                      |
| ForceTrack / forceTracks                       | trackId, unitId, name, camp（red_army/nationalist_army/other）, snapshotIds                                                                                                                  |
| ForceSnapshot / forceSnapshots                 | snapshotId, trackId, phaseId, coordinates, coordinatePrecision, region（可 null）, routeId（可 null）, displayMode（point/region/route/hidden）                                              |
| ExperienceManifest / experiences               | experienceId, topicId, linkedEventIds, scriptVersion, completionPolicyVersion, segmentIds, requiredInteractionIds, terminalSegmentId, fallbackContentId, assetIds                            |
| ExperienceSegment / segments                   | segmentId, experienceId, kind, title, text, contentType, presentation, durationSeconds（可 null）, interactionIds, assetIds                                                                  |
| InteractionDefinition / interactions           | interactionId, experienceId, segmentId, interactionType, prompt, required, feedback, explanation, completionRequirements，加各类型专属字段                                                   |
| EquivalentExperienceContent / fallbackContents | fallbackContentId, experienceId, steps                                                                                                                                                       |
| AssetReference / assets                        | assetId, title, filePath, creator, origin, assetType, representation, disclosure, rightsStatus, rightsNote, attribution, transformations, relatedPersonIds, relatedPlaceIds, relatedEventIds |

timeRange 为 `{ start: string | null, end: string | null, label: string }`。day 使用有效 YYYY-MM-DD 且两端相等；month 使用 YYYY-MM；year 使用 YYYY；range 使用同粒度日期端点；unknown 两端 null。开始不得晚于结束，不补造缺失日月。

同一 Topic 内 sequence 是唯一非负整数，phaseIds 必须按 sequence 排列，阶段和专题双向归属，阶段事件属于专题。不同专题可有重叠时间。E01–E06 是产品编号，不参与历史排序。段落秒数只表示演绎节奏，与历史时钟分离。

placeType 区分 historical_event_site/historical_site/modern_museum/memorial/modern_reference。坐标仍为 WGS84 [经度,纬度]，未知 null；现代纪念馆不等于历史发生地。

人物 assetIds 中素材必须声明该人物。艺术人物图必须配对同一人物的 historical_photo，否则先提供文字条目。素材的反向人物、地点、事件引用均检查存在性。

ForceTrack 与 snapshotIds 双向一致，同一 track/phase 最多一个样本。region 为 `{ coordinates: GeoCoordinate[], precision: exact | approximate | schematic }`，至少三点，仅表达有据区域，不计算边界。point/region/route 模式须有对应输入，未知可 hidden；无证据不连线、不推算位置。

素材 filePath 仅接受 /assets/ 下的本地路径，拒绝 URL、查询、父目录或编码逃逸。assetType 为 historical_photo/contemporary_photo/archive_scan/illustration/ai_recreation/model_3d/audio/video/map/terrain；representation 为 historical_document/contemporary_record/artistic_recreation/ai_recreation。照片及档案须为 historical_document，AI 类型须为 ai_recreation，艺术及 AI 再现须有 disclosure。rightsStatus 为 unknown/restricted/cleared；published 素材须 cleared，保留来源、权利说明与加工记录。结构通过不能证明授权真实。

段落 kind 为 context/observation/process/interaction/conclusion，体验至少覆盖五类，terminalSegmentId 必须是最后一段且为 conclusion。presentation 为 3d/video/mixed/text。文本是内容，不是脚本代码。等价 steps 为 `{ stepId, segmentId, text, interactionIds, assetIds }[]`，按同一 segmentIds 顺序完整覆盖同一互动。manifest/segment/interaction 必须双向一致。一个事件最多映射一个主体验，关联事件须属于体验专题。

## 六个产品常量与声明式互动

EXPERIENCE_CATALOG 只表达产品约定，没有审核或 published 字段，不自动写入 dataset。ExperienceId/InteractionId 从常量推导。

| 编号 | experienceId                | 必要互动 / interactionType                                      |
| ---- | --------------------------- | --------------------------------------------------------------- |
| E01  | exp-zunyi-conference        | zy-01 observe_hotspots；zy-02 classify_source                   |
| E02  | exp-sidu-chishui            | sd-01 observe_hotspots（listed 顺序）；sd-02 evidence_selection |
| E03  | exp-qiaodu-jinshajiang      | js-01 observe_hotspots；js-02 material_matching                 |
| E04  | exp-feiduo-ludingqiao       | ld-01 observe_hotspots；ld-02 sort_sequence                     |
| E05  | exp-crossing-snow-mountains | sn-01 observe_hotspots；sn-02 evidence_selection                |
| E06  | exp-crossing-grasslands     | gr-01 observe_hotspots；gr-02 evidence_selection                |

manifest 恰有对应两个必要互动，各自 required: true。四渡赤水一个完成记录，雪山和草地分开。本版只接受上述十二个互动，扩展需协调契约。完整内容要求见 docs/plans/2026-11-01-experience-standard.md。

共同 completionRequirements 为 `{ requireExplanationAcknowledgement: true, allowIncorrectWithExplanation: true }`。

- observe_hotspots：materials、requiredMaterialIds、visitOrder（any/listed）。material 含 materialId/title/text/contentType/assetIds/sourceIds，必看项必须存在。
- sort_sequence：choices（choiceId/text）、correctOrder，完整排列；ld-02 恰好三项。
- evidence_selection：choices、correctChoiceId，两项，正确项存在。
- material_matching：两份 materials、两条 conclusions（conclusionId/text）、correctPairs（materialId/conclusionId），完整一一配对。
- classify_source：三份 materials、correctClassifications（materialId/category），完整覆盖三类；category 为 primary_source/editorial_summary/artistic_recreation。

严格拒绝未知 action/script/code 字段；不执行 eval，不将字符串作为 HTML 或 JavaScript。互动只影响学习反馈，不改变历史。

## 验证、发布与撤回

validateDataset 检查严格结构、唯一 ID、审核、全部引用、双向归属、阶段顺序、素材人物关联、固定互动、剧本与降级覆盖；返回相同版本，出错抛异常。

v1 保留已发布内容引用未发布来源时报错的旧行为。v2 为支持撤回，允许依赖存在但处于 unpublished；这不构成显示资格。单条 published/reviewed 记录本身仍须满足原有双人复核与来源非空规则。

发布过滤从本地门禁合格的 reviewed + published 对象开始，按依赖图反复移除依赖不在发布视图的对象直到稳定，覆盖来源、专题、阶段、事件、人物素材、部队、剧本、互动、等价内容及材料内引用。有效循环关系可以发布，任一必需项撤回则闭合过滤。隐藏路线和态势视为不可显示依赖。保留无关已发布内容，不删引用来掩盖缺项，不改原始数据或审核记录。

本地完成记录不传入发布过滤器，不能解锁撤回内容。机器只验证结构，不能认证史实、真人身份或授权。

## 完成记录（C1 使用，C0 不存储）

CompletionRecord 为 `{ schemaVersion: 1, experienceId, completionPolicyVersion, completedAt, completedInteractionIds, completionMode }`。规则版本是正整数，时间为含时区 ISO 时间，mode 为 3d/video/equivalent。两个互动必须属于该体验且无重复。

completionRecordSchema 验证结构；isCompletionRecordForExperience 验证 ID、版本和必要互动。CompletionEvidence/canCompleteExperience 是纯数据判断：终点已到、互动及解释确认齐全、主动完成请求、ID/版本一致才通过。不能证明真实回调发生，C1 仍须维护运行状态。C0 不做计时器、存储或状态机。

## v2 模块接口（独立于 v1）

| 接口                           | 提供 / 消费    | 语义                                                                                   |
| ------------------------------ | -------------- | -------------------------------------------------------------------------------------- |
| HistoricalObjectSelection      | A/B → C        | kind: event/person/place/topic 与稳定 id                                               |
| HistoricalPhaseControllerProps | B 内容、C 状态 | phases, activePhaseId, playing, onPhaseChange, onPlayingChange                         |
| ForceLayerProps                | C → A          | tracks, snapshots, routes, activePhaseId，无推算方法                                   |
| LongMarchSceneV2Props          | C → A          | 保留 v1，增加 dataset/phaseId/selection/cameraBookmark/onObjectSelect/onCameraBookmark |
| ImmersiveExperienceProps       | C → A          | manifest, segments, assets, command, ImmersiveRendererCallbacks                        |
| TeachingInteractionProps       | C → B          | interaction, response, explanationAcknowledged, onResponse, onExplanationAcknowledged  |
| HistoricalDetailProps          | C → B          | detail（带 kind 的对象）、sources、assets、onNavigate、onClose                         |
| EquivalentExperienceProps      | C → B          | content, activeStepId, onStepViewed；互动使用 TeachingInteractionProps                 |

CameraBookmark 为 `{ sceneId, coordinateSystem: 'scene-local', position: [x,y,z], target: [x,y,z], zoom, phaseId }`，不是历史经纬度；A 检查场景一致后恢复，C 保存普通数据。

command 含 runId/segmentId/playback（playing/paused）/muted/quality（low/medium/high）/reducedMotion。回调 onReady/onError/onSegmentReached/onInteractionCue/onTerminalReached/onExitRequested/onCameraBookmark。演绎回调含 experienceId/scriptVersion/runId，段落和互动另含 segmentId/interactionId；C1 用 runId 拒绝迟到回调。终点不等于完成。

InteractionResponse 按 interactionType 区分 visitedMaterialIds/orderedChoiceIds/selectedChoiceId/pairs/classifications。B 上报操作，C 持有状态。ExperienceNavigationRequest 为 open_object/replay_experience/open_source 的普通数据联合。A/B 不传 THREE、DOM、React 对象，不依赖 app 或彼此内部文件。

## 隔离开发

/__dev/contracts 由仅 serve 的 Vite 中间件提供，入口在 src/tests/workbench/，不从 App/main 导入。样本 draft + unpublished，无真人审核记录，标明非史实。可测试旧模块、阶段输入、JSON 校验与回调；新增渲染／教学组件按接线说明发现。

生产构建检查实际 chunk module IDs，含 fixtures/tests/workbench 即失败；自动测试故意引入样本的拒绝路径，正式 build 验证正常路径。validate:data 还检查发布视图中的素材文件存在于 public 内，拒绝缺失文件或符号链接越界。接线说明见 docs/architecture/v2-integration-guide.md。

## 附录：保留的 v1 接口与规则

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

B 管理内容与教学步骤内部逻辑，C 管理选择和容器开关。C1 关闭当前事件收起正文并暂停播放，保留选中；显式取消选择或返回首页才清空。当前 null 状态显示核验占位。不要从 panel 修改 app 状态或引入自己的全局选择 store。

## 运行时入口

`validateDataset(unknown)` 验证所有候选记录及跨来源关联，出错抛异常；`getPublishedDataset(unknown)` 再过滤 unpublished 和 hidden。`src/data/verified/index.ts` 为 App 提供发布数据。CLI 仅接受 dataset.json 一个入口，新增分片须同步运行时加载与全量校验，不能留下未验证的数据文件。

机器无法证明证据充分或 reviewerId 对应真人；发布还必须完成实际人员在 PR 中的复核流程。
