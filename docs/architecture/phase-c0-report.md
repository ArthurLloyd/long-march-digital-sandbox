# Phase C0：共享契约 v2 与历史发布门禁开发报告

日期：2026-11-01。结论：C0 的契约、验证、发布过滤、隔离接线和自动化检查已完成，已创建 [PR #4](https://github.com/ArthurLloyd/long-march-digital-sandbox/pull/4)，等待用户审核，未合并 main。此报告不表示六个互动场景或 C1 已完成。

## 1. Git 与实施范围

- 工作目录：`D:\Project\miniprogram`；分支：`feat/app-shell`。
- origin：`https://github.com/ArthurLloyd/long-march-digital-sandbox.git`。
- 开始时工作区干净；已 fetch origin 并 merge origin/main，结果 Already up to date。
- main 基线：`417d02e76f86d24d255e17b3e77d8f7c381ecea4`，原 PR #3 已结束。
- 代码、测试及接线文档基线：`862b2face8ca266b06425b6663de7621eadebc12`，已推送。报告自身随后单独提交，最终 head 以 PR 为准。
- 新 PR：[feat(contract): establish v2 historical experience contracts](https://github.com/ArthurLloyd/long-march-digital-sandbox/pull/4)，base main，head feat/app-shell。
- 未修改 A/B 的场景、历史模块、正式 JSON、来源登记、真人审核结论或档案素材；没有新增依赖或改锁文件。

分阶段提交：

| 提交    | 内容                                       |
| ------- | ------------------------------------------ |
| fc07422 | 先定义 v2 设计、兼容与发布规则             |
| 7ff426b | 严格 schema、产品 ID、完成数据及模块 props |
| 86368c5 | 关联图、传递发布/撤回及素材文件门禁        |
| 6b4d660 | 隔离工作台、测试、构建隔离                 |
| 862b2fa | 同步接口设计和 A/B/C 接线文档              |

本 PR 还携带之前已经完成、尚未合并的 `f9baefe` 计划文档，作为本轮六体验标准的依据；没有将其他成员的未提交工作混入。

## 2. 实际修改文件

下表列出本轮全部文件；路径均相对于仓库根目录。

| 文件                                       | 修改内容与原因                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| src/shared/contracts/data.ts               | 导出原审核字段，保留旧对象及 HistoryDataset，旧根 schema 明确命名为 historyDatasetV1Schema |
| src/shared/contracts/index.ts              | 唯一公共出口，导出 v1/v2、schema 与模块类型                                                |
| src/shared/contracts/primitives.ts         | 共同审核字段、唯一引用列表、内容分类、规则版本及时间 token                                 |
| src/shared/contracts/dataset.ts            | 显式 v2 严格根、联合 schema 与内存归一化                                                   |
| src/shared/contracts/experience-catalog.ts | 固定六个体验、十二互动、产品编号与类型映射                                                 |
| src/shared/contracts/topics.ts             | Topic                                                                                      |
| src/shared/contracts/phases.ts             | HistoricalPhase、时间范围/精度验证                                                         |
| src/shared/contracts/entities.ts           | 人物、地点、现代/历史类别与坐标精度                                                        |
| src/shared/contracts/forces.ts             | 部队、阶段快照、区域/路线/隐藏模式                                                         |
| src/shared/contracts/assets.ts             | 本地路径、素材性质、标注与权利规则                                                         |
| src/shared/contracts/experiences.ts        | 体验、五类段落、明确终点、等价步骤                                                         |
| src/shared/contracts/interactions.ts       | 五类严格声明式互动及响应结构                                                               |
| src/shared/contracts/completion.ts         | 完成记录、完成证据与纯校验函数，无存储                                                     |
| src/shared/contracts/modules-v2.ts         | A/B/C props、选择、相机、实例回调与导航类型                                                |
| src/shared/utils/validate-dataset.ts       | 兼容验证、双人门禁、大小写去重、发布闭包                                                   |
| src/shared/utils/dataset-graph.ts          | 验证和发布共用同一引用图，防规则分叉                                                       |
| src/shared/utils/validate-v2-relations.ts  | 双向归属、阶段、主体验、人物素材、降级覆盖                                                 |
| scripts/validate-data.ts                   | 同时支持 v1/v2，汇报扩展集合，调用正式素材检查                                             |
| scripts/validate-published-assets.ts       | 发布素材文件存在及 public 真实目录边界检查                                                 |
| scripts/contract-workbench.ts              | 仅 serve 的开发 HTML 与生产模块图检查插件                                                  |
| vite.config.ts                             | 接入开发工作台和实际构建隔离检查                                                           |
| package.json                               | 新增 dev:contracts，未改变依赖                                                             |
| src/tests/fixtures/v2-dataset.ts           | 无签署、未发布、明确非史实的合成工程样本                                                   |
| src/tests/workbench/ContractWorkbench.tsx  | A/B 旧组件及可选 v2 导出接线、输入控制和日志                                               |
| src/tests/workbench/main.tsx               | 独立开发入口，不被正式 main/App 导入                                                       |
| src/tests/workbench/workbench.css          | 工作台基础可读样式，不影响正式页面                                                         |
| src/tests/v2-contracts.test.ts             | 版本、ID、关联、门禁、撤回、素材、完成契约                                                 |
| src/tests/module-contracts.test.ts         | 旧 props 兼容、新接口、普通数据及实际导入图无环                                            |
| src/tests/build-isolation.test.ts          | 真实 HTTP 开发入口、真实 Vite 负向构建、素材文件检查                                       |
| src/tests/contract-workbench.test.tsx      | 旧模块挂载、阶段输入、非法/非草稿 JSON 拒绝                                                |
| src/tests/workbench-v2.test.tsx            | 以公开边界探针验证未来 A/B 接线，不冒充真实渲染验收                                        |
| docs/interface-contract.md                 | 实施前设计及最终字段、迁移、门禁、接口说明                                                 |
| docs/architecture/v2-integration-guide.md  | A/B/C 各自可执行的导入、回调、同步与调试步骤                                               |
| docs/architecture/overview.md              | 说明 v2 数据流、两个时钟和 C0 边界                                                         |
| docs/collaboration.md                      | 新 PR 与三人接线、合并后同步要求                                                           |
| docs/development.md                        | 工作台命令、回环测试与素材检查说明                                                         |
| docs/architecture/phase-c0-report.md       | 本轮实际结果、证据边界与后续事项                                                           |

之前计划提交中的六份文件为 `docs/plans/README.md`、`2026-11-01-master-plan.md`、`2026-11-01-experience-standard.md`、`2026-11-01-member-a-scene.md`、`2026-11-01-member-b-history.md`、`2026-11-01-member-c-integration.md`。

## 3. 实际数据结构与类型

v1 仍为：

```json
{ "events": [], "routes": [], "sources": [] }
```

v2 为：

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

新增历史对象均追加 sourceIds、reviewStatus、releaseStatus、reviewedBy、reviewedAt、reviews。SourceReference 保留旧字段；CompletionRecord 不属于史料，不加审核字段。

| 类型                        | 业务字段                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Topic                       | topicId/title/summary/phaseIds/eventIds/displayOrder                                                                                                                           |
| HistoricalPhase             | phaseId/topicId/title/timeRange{start,end,label}/timePrecision/sequence/eventIds                                                                                               |
| HistoricalPerson            | personId/name/summary/detail/relatedEventIds/relatedTopicIds/assetIds                                                                                                          |
| HistoricalPlace             | placeId/historicalName/modernName/placeType/summary/detail/coordinates/coordinatePrecision/relatedEventIds/assetIds                                                            |
| ForceTrack                  | trackId/unitId/name/camp/snapshotIds                                                                                                                                           |
| ForceSnapshot               | snapshotId/trackId/phaseId/coordinates/coordinatePrecision/region/routeId/displayMode                                                                                          |
| ExperienceManifest          | experienceId/topicId/linkedEventIds/scriptVersion/completionPolicyVersion/segmentIds/requiredInteractionIds/terminalSegmentId/fallbackContentId/assetIds                       |
| ExperienceSegment           | segmentId/experienceId/kind/title/text/contentType/presentation/durationSeconds/interactionIds/assetIds                                                                        |
| InteractionDefinition       | interactionId/experienceId/segmentId/interactionType/prompt/required/feedback/explanation/completionRequirements，及材料/选项/配对等类型字段                                   |
| EquivalentExperienceContent | fallbackContentId/experienceId/steps{stepId,segmentId,text,interactionIds,assetIds}                                                                                            |
| AssetReference              | assetId/title/filePath/creator/origin/assetType/representation/disclosure/rightsStatus/rightsNote/attribution/transformations/relatedPersonIds/relatedPlaceIds/relatedEventIds |
| CompletionRecord            | schemaVersion:1/experienceId/completionPolicyVersion/completedAt/completedInteractionIds/completionMode                                                                        |

全部枚举和互动专属字段见 [接口契约](../interface-contract.md)，对应实际 Zod 类型。未知字段拒绝；普通文本不作为代码或 HTML 执行。

## 4. v1 兼容与新模块边界

- HistoryDataset 仍指旧三个数组；VersionedHistoryDataset 为联合；HistoryDatasetV2 为扩展结构。
- validateDataset/getPublishedDataset 保持原输入版本返回形状，不强制 B 迁移 JSON。
- normalizeDataset/getPublishedDatasetV2 为新消费者补空扩展，不自动填史料。
- LongMarchSceneProps/HistoryEventPanelProps 未改，旧 App 和组件均通过构建及原有交互测试。
- 正式 App、首页、进入确认、时间轴和抽屉行为本轮未修改。
- 新增 LongMarchSceneV2Props、HistoricalPhaseControllerProps、HistoricalObjectSelection、ForceLayerProps、ImmersiveExperienceProps、ImmersiveRendererCallbacks、TeachingInteractionProps、HistoricalDetailProps、EquivalentExperienceProps、ExperienceNavigationRequest、CameraBookmark。
- A 消费阶段和 command，B 提供审核内容及教学操作，C 拥有阶段/体验状态。回调使用 experienceId/scriptVersion/runId，避免未来旧实例回调串入新体验。
- CameraBookmark 使用 scene-local 普通三维数据，不是历史位置，也不传 THREE/DOM/React 对象。

## 5. 发布、审核与撤回

继承原有双人审核：两名不同稳定登录名最后明确同意、无未解决异议、日期和声明一致、记录有序。比较登录名忽略大小写。机器不能证明两名账号是真人、史料真实或素材授权充分；本次没有写入真人签署。

严格验证所有候选引用和唯一 ID、专题阶段双向归属、阶段顺序、人物素材对应、部队快照、主体验唯一映射、五类段落、两个必要互动、明确终点及完整等价脚本。

v1 保留正式内容引用未发布来源时报错。v2 支持存在但已撤回的依赖，通过共享依赖图迭代过滤。公开视图只保留 reviewed + published 且整个必需依赖闭合的对象。素材、来源、互动或段落撤回时相关体验关闭；无关资料保留。旧完成记录不参与发布判断。

人物没有可用真实照片时保留文字；配艺术图时须同时有同一人物的真实历史照片。素材限制本地 /assets/ 路径，艺术/AI 要有标注，published 必须声明 cleared；构建再检查实际文件存在且不越出 public。机器校验不构成历史或法律认证。

本版发布策略保守：父对象任一必需引用不可公开时整体隐藏，包括引用 hidden 快照的部队 track。不会自动裁掉引用、猜坐标或重写审核结论。后续若调整为可分批展示关系，须另提公共契约 PR。

## 6. 六体验与十二互动

| 编号 | experienceId                | 必要互动      |
| ---- | --------------------------- | ------------- |
| E01  | exp-zunyi-conference        | zy-01 / zy-02 |
| E02  | exp-sidu-chishui            | sd-01 / sd-02 |
| E03  | exp-qiaodu-jinshajiang      | js-01 / js-02 |
| E04  | exp-feiduo-ludingqiao       | ld-01 / ld-02 |
| E05  | exp-crossing-snow-mountains | sn-01 / sn-02 |
| E06  | exp-crossing-grasslands     | gr-01 / gr-02 |

固定映射位于 EXPERIENCE_CATALOG；无审核或发布字段，不自动进入正式集合。四渡赤水共用记录，雪山/草地分开；产品编号不作历史顺序。开发仍以泸定桥先打样。

## 7. 实际验证结果

| 检查                   | 结果                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| npm run lint           | 通过                                                             |
| npm run typecheck      | 通过                                                             |
| npm run format:check   | 通过                                                             |
| npm run test           | 14 个文件、136 项通过；原有 50 项保留，新增 86 项                |
| npm run validate:data  | 通过；正式 0 事件 / 0 路线 / 0 来源，v2 扩展均为空               |
| npm run build          | 通过；最终以 --logLevel warn 再次验证，含数据门禁及生产隔离插件  |
| git diff --check       | 通过                                                             |
| dist 额外文本/文件扫描 | 未发现工作台、fixtures 文件、DEV_ONLY_MARKER 或测试事件/来源标记 |

测试涵盖版本、未知字段、非法日期/坐标、重复 ID、缺失引用、审核、撤回闭包、素材身份/文件、六类型互动、完成证据、旧 App 回归和模块边界。

工作台测试实际通过本机 HTTP 取得独立入口；负向构建故意将 fixture 作为 Vite 入口，真实触发生产隔离失败。v2 接线使用明确的公开边界探针，不冒充 A/B 已实现的组件。

首次受限沙箱阻止回环 HTTP（EACCES），经授权执行完整测试后通过，未跳过断言。检查过程发现的未使用导入、测试清理语法和格式问题已修复。GitHub CI 独立在 PR Checks 中执行，最终状态以 PR 对应提交和本次交付消息为准。

## 8. A/B 怎样使用

先读 [v2 接线说明](v2-integration-guide.md) 和 [接口契约](../interface-contract.md)。

- A：原 LongMarchScene 继续工作。可新增 LongMarchSceneV2 和 ImmersiveExperienceRenderer；读取发布阶段/部队/地点/路线，按 runId 上报段落、互动 cue、终点和书签，未知位置隐藏。
- B：原 HistoryEventPanel 继续工作。编写严格 v2 对象、段落和两互动；可新增 HistoricalDetailPanel、TeachingInteraction、EquivalentExperience，输出普通操作/导航请求。
- C：正式接入前调用 getPublishedDatasetV2；后续用 completionRecordSchema/isCompletionRecordForExperience/canCompleteExperience 构建状态机，不能仅凭本地记录开放撤回内容。

执行 `npm run dev:contracts` 打开本机 `/__dev/contracts`。样本无签署且为 draft + unpublished；可手动切阶段、段落、播放状态、资料类型、互动、相机书签和 JSON 输入，查看日志，不保存正式完成记录。缺少新导出时明确提示。

PR 合并后，A/B 在各自分支先提交本人工作，再 fetch origin、merge origin/main、npm ci，按说明执行检查。当前仅创建 PR，不能通知他们 main 已包含 C0。

## 9. 未实施内容与验收边界

没有制作六个完整三维场景、泸定桥成品、正式互动 UI、历史阶段播放器、首体验状态机、完整 localStorage 服务、账号、云同步、付费 AI 或商业地图。未自动继续 C1。

没有导入真实地形、人物照片或发布历史数据，没有代替人类复核。未开展真实 WebGL/AI 视频画质、手机设备性能或本轮浏览器视觉截图验收；C0 的 DOM 和门禁测试不能代替它们。现有页面的自动回归通过。

## 10. C1 的下一步计划

在用户审核 C0 并完成接口对齐后，单独实现统一对象路由与首次门槛、体验状态机、两互动与解释确认、显式完成按钮、浏览器记录与损坏/禁用恢复、重播、退出和地图书签/焦点恢复，以及无 WebGL 或减少动态时的等价流程。

与 A/B 的泸定桥样板先走通完整闭环，再扩展其他五个。宏观时钟不自动弹出体验，体验退出后仍由用户主动继续。该计划不是本轮已实现功能。
