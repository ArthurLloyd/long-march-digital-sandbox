# Phase 3 · C0：A/B/C 的 v2 接线说明

本说明对应实际公共出口 `src/shared/contracts/index.ts`。C0 仅交付数据、接口、门禁和工作台；新增三维渲染器、教学组件、首体验流程仍由后续任务实现。不得将类型已经存在解释为六个事件已经可播放。

## 1. 三人先同步哪个版本

仓库为 https://github.com/ArthurLloyd/long-march-digital-sandbox 。本次 C0 使用 C 的 `feat/app-shell`，目标 main，等待用户审核，不自动合并。原 PR #3 已结束，新工作使用独立 PR。

PR 合并后，每人先检查工作区，提交自己的改动，再执行：

```powershell
git status
git fetch origin
git switch feat/3d-scene
git merge origin/main
npm ci
npm run typecheck
npm run test
```

B 把分支名换成 `feat/history-system`，C 使用 `feat/app-shell`。已有分支不强制重建，不 reset、不强推。PR 尚未合并时，A/B 可阅读 PR 内接口或在独立检出中试用；不要随意将 C 分支合并进自己的未完成工作。已有方案文档也随 C0 分支提交供统一阅读。

先读根 AGENTS、README、`docs/interface-contract.md`、本说明、`docs/HISTORY_INTEGRITY.md`、六体验统一标准及个人任务书。只从 feature/index.ts 和 shared/contracts 导入公共接口。

## 2. 数据入口与版本：三人共用

正式数据仍只有 `src/data/verified/dataset.json`，B 维护。C0 没有改动它，旧三个空数组仍有效。v2 具体字段见接口文档及对应 schema；不能在 v1 根结构随意加 people 数组。

```ts
import {
  historyDatasetV2Schema,
  normalizeDataset,
} from '../../shared/contracts';
import {
  getPublishedDatasetV2,
  validateDataset,
} from '../../shared/utils/validate-dataset';

// 编辑/CLI：检查全部候选，包括尚未发布的对象。
const candidate = normalizeDataset(validateDataset(input));
// 正式应用：必须使用发布视图，再由 C 分发给 A/B。
const published = getPublishedDatasetV2(input);
// historyDatasetV2Schema 仅验证单层结构，不替代关联和发布门禁。
```

`input` 表示调用方读到的 unknown JSON，上例是 API 用法，不是在模块中另建正式入口。生产消费者不能把 candidate 直接当 published。旧 `validateDataset/getPublishedDataset` 保留 v1/v2 返回形状，App 无需迁移。新适配器从 C 接受发布视图，不反向导入 App。

### 发布依赖及撤回

新对象和段落均复用两名不同真人复核，不能由 AI 填入批准。所有引用先检查存在；发布过滤再检查整条依赖链。素材、来源、互动或段落撤回后，依赖体验也会消失。独立不依赖它的资料可以保留。

目前使用完整依赖闭合策略：父对象引用的必需内容不公开时，父对象整体隐藏，不偷偷删掉引用后继续展示。Topic/Phase 和 Experience/Segment 等有效循环允许一起发布；循环内任何必需对象撤回会一起过滤。部队 track 包含隐藏 snapshot 时也可能整体隐藏，B 应分批明确已可公开范围，不能把该策略误认为缺失数据已经补全。

## 3. 成员 A：地图和演绎接线

### 旧组件可继续开发

`LongMarchScene(LongMarchSceneProps)` 的全部字段不变，原 ready/error 和事件点击继续工作。C0 没有改 A 的 index 或组件实现。

如果提供 v2 地图，可从 `scene/index.ts` 新增命名导出 `LongMarchSceneV2`，参数为 `LongMarchSceneV2Props`。C 后续显式集成，不自动替换正式 App。

```tsx
import type { LongMarchSceneV2Props } from '../../shared/contracts';

export function LongMarchSceneV2(props: LongMarchSceneV2Props) {
  const phase = props.dataset.phases.find((p) => p.phaseId === props.phaseId);
  const snapshots = props.dataset.forceSnapshots.filter(
    (p) => p.phaseId === props.phaseId,
  );
  // A 的实际地形/图层使用 phase、snapshots、places、routes。
  // 标记点击：props.onObjectSelect({ kind: 'place', id: place.placeId })。
  // 不修改输入，不推算缺失位置；此片段仅说明签名，不是成品渲染器。
}
```

C 传入 `dataset`、`phaseId`、`selection`、`cameraBookmark`。A 只画对应阶段已有样本。ForceLayerProps 可给内部图层使用，但不建设第二套历史时钟。

- coordinates 为 null：不绘制假地点；无坐标资料由 C/B 目录访问。
- routeId 不存在于发布 routes：不加载、不补线、不调用现代道路推测。
- schematic 路线持续标注“宏观示意，非真实行军路线”；图标数量不表示兵力。
- CameraBookmark 使用 scene-local 三维坐标；不是经纬度。通过 onCameraBookmark 上报，C 保存；恢复前检查 sceneId、phaseId 及 cameraBookmarkSchema。
- ready 表示真实可交互，不是组件刚挂载；无 WebGL、加载与渲染错误分别回调。卸载时清理 GPU、音频、动画和监听器。

### 沉浸渲染器的稳定命名

A 后续从 `scene/index.ts` 导出 `ImmersiveExperienceRenderer`，参数为 `ImmersiveExperienceProps`。

输入 manifest/segments/assets 由 B 提供、C 发布过滤；command 由 C 持有，含 runId/segmentId/playback/muted/quality/reducedMotion。A 可以实现实时三维、视频片段或混合镜头，不能借此执行内容 JSON 中的脚本。

```ts
const run = {
  experienceId: props.manifest.experienceId,
  scriptVersion: props.manifest.scriptVersion,
  runId: props.command.runId,
};
props.onReady(run);
props.onSegmentReached({ ...run, segmentId });
props.onInteractionCue({ ...run, segmentId, interactionId });
props.onTerminalReached({
  ...run,
  segmentId: props.manifest.terminalSegmentId,
});
props.onCameraBookmark({ ...run, bookmark });
// error: props.onError({ ...run, error: { code, message, retryable } })
// exit: props.onExitRequested(run)
```

回调仅在实际到达时报告，不在 render 函数中调用。interactionCue 交给 C 暂停并呈现 B 组件；A 不记完成、不自动打开正文。C1 校验 runId、脚本、段落和当前状态，拒绝过期实例回调。终点只说明演绎到达，不说明两个互动已完成。

## 4. 成员 B：资料、剧本和互动接线

### 数据生产

Topic.phaseIds 与 HistoricalPhase.topicId 双向对应，phaseIds 按 B 核验的 sequence 排列。E01–E06 不作历史排序；不把 year/month 强制转成某月某日。普通事件正文仍在 HistoryEvent.detail，人物和地点的 detail 是独立正文。

Person.relatedEventIds/relatedTopicIds、Place.relatedEventIds 指向现有对象。人物 assetIds 须与 AssetReference.relatedPersonIds 一致；艺术图同时配同一人的 historical_photo。没有可用照片就先提供文字。地点须区分历史发生地与现代纪念设施，坐标未知可 null。

ForceTrack 表示经过核验的单位；ForceSnapshot 表示一个 phase 中的位置/区域/路线引用。未知不插值，不自动从两点生成路径。sourceIds 登记到实际 SourceReference，sources 及历史对象都从 draft + unpublished 起步，真实双人复核后才发布。

### 编写一个完整体验

1. 从 EXPERIENCE_CATALOG 取固定 experienceId 与两个 requiredInteractionIds，不能自动把常量当史料。
2. 创建对应 Topic、事件和阶段。ExperienceManifest.linkedEventIds 至少一个，且属于 Topic；一个事件只映射一个主体验。
3. 创建至少五段 ExperienceSegment，覆盖 context/observation/process/interaction/conclusion。每段有完整 text、内容性质、来源、素材与审核；艺术演绎不伪造实名人物言行。
4. segmentIds 按演绎顺序；最后一段为 conclusion，并等于 terminalSegmentId。durationSeconds 只是展示节奏，可为 null。
5. 两个 InteractionDefinition 的 segmentId 与段落 interactionIds 双向一致。使用固定类型；不要额外放 action、code 或 eval 字段。
6. 创建 EquivalentExperienceContent，逐段完整覆盖同一主线和互动；不是空白“下一步”流程。fallbackContentId 必须匹配。
7. 素材分别记录 sourceIds、origin、rightsNote、rightsStatus、处理过程和真实/艺术/AI 分类。发布素材必须 cleared，艺术/AI 有 disclosure；构建还检查文件实际存在于 public 内。
8. 运行 validate:data 和全部工程检查，再提交候选和证据 PR。测试审批模拟绝不复制到正式 JSON。

六体验与十二互动的唯一映射在 `experience-catalog.ts`；逐镜头内容标准在 `docs/plans/2026-11-01-experience-standard.md`。先泸定桥，不同时提交六套未经验证的成品。

### 组件边界

旧 HistoryEventPanelProps 不变。后续新增命名导出：

| 导出                  | 参数类型                  | B 的输出                                                                      |
| --------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| HistoricalDetailPanel | HistoricalDetailProps     | onNavigate(open_object/replay_experience/open_source), onClose                |
| TeachingInteraction   | TeachingInteractionProps  | onResponse(interactionId, response), onExplanationAcknowledged(interactionId) |
| EquivalentExperience  | EquivalentExperienceProps | onStepViewed(stepId)                                                          |

TeachingInteraction 的 response 是由 interactionType 区分的普通数据。只报告用户操作，不修改史实、地图、App 或完成记录。feedback/explanation 来自审核数据；读解释并明确确认后回调。答错允许解释后继续，不修改真实历史结果。

HistoricalDetailPanel 的 detail 通过 kind 区分 event/person/place/topic，来源与素材由 C 分发。EquivalentExperience 只报告阅读步骤，必要互动仍用同一 TeachingInteraction，不私建完成判定。

## 5. 成员 C：C1 能使用哪些基础

- `getPublishedDatasetV2`：先发布过滤再找体验；本地完成记录不能解锁撤回内容。
- `completionRecordSchema`：严格结构和版本，completedAt 是用户时间；C0 不读写 localStorage。
- `isCompletionRecordForExperience`：核对事件、规则版本与两个必要互动。普通剧本文字修订不自动重置记录。
- `canCompleteExperience`：纯条件检查，要求终点、两次互动、解释确认、主动完成及 ID/规则一致。不能证明回调真实，C1 必须维护自己的状态。
- HistoricalObjectSelection / ExperienceNavigationRequest：收口各入口；C 只维护一份宏观 phase 和一份独立演绎状态。
- CameraBookmark / RendererRun：保留地图上下文，按 runId 隔离体验实例。

C1 再实现首次门槛、存储/损坏恢复、多标签同步、退出/重播、暂停、错误降级和焦点恢复。C0 不改变旧关闭资料清空选择的行为，不改变首页主动确认。

## 6. 隔离开发工作台

```powershell
npm run dev:contracts
```

打开终端给出的本机地址加 `/__dev/contracts`。入口通过仅 serve 的 Vite 插件提供，不写入正式 App。所有样本都是合成、draft + unpublished、无签署，不能复制成正式数据。

- A 地图：默认挂载原 LongMarchScene；导出 LongMarchSceneV2 后自动使用新签名。可切换 phase 输入、观察选择、ready/error 和相机日志。
- A 演绎：导出 ImmersiveExperienceRenderer 后可手动选择段落、播放/暂停并查看回调。没有实现时显示缺少组件，不伪装成完成。
- B 资料：默认挂载现有 HistoryEventPanel；导出 HistoricalDetailPanel 后可切换事件、人物、地点和专题，工程正文与来源明确标为非史实。
- B 等价图文：导出 EquivalentExperience 后可查看工程步骤与 onStepViewed 回调。
- B 互动：导出 TeachingInteraction 后可切换六类工程样本及十二互动，观察操作与解释确认回调。
- JSON 编辑器：执行真实 validateDataset 后应用，只接受无签署草稿。修改不写磁盘；错误保留原输入。

工作台只提供输入控制和日志，没有正式 C1 状态机、完成服务或生产发布开关。新增组件自动发现仅供本地工作台，正式 App 的 v2 集成须 C 单独提交。

生产构建的 `productionIsolationPlugin` 检查 chunk 的模块 ID；fixtures/tests/workbench 被意外导入即失败。测试包含实际 Vite 负向构建，正常 build 验证正式入口。不要关闭该检查来接入未审核样本。

## 7. 每批交付检查

运行 lint、typecheck、format:check、test、validate:data、build 和 git diff --check。PR 说明接口、来源/审核、素材、实际截图或录屏、设备证据、缺口。C0 的 DOM/门禁测试不能代替 A 的真实 WebGL、视频质量或性能测试；机器通过也不能代替真人复核。
