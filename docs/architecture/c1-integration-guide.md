# C1：沉浸体验调度接入说明

基线为 C0 `6f384d2`，独立分支为 `feat/c1-experience-controller`。C0 PR #4 未合并时，C1 使用以 feat/app-shell 为 base 的 Draft Stacked PR，不改 PR #4、不自动合并。

## 实际导出与分工

- `useHistoricalExperience`：src/app/experience/use-historical-experience.ts，由 C 的 App 使用。
- `ExperienceHost`：src/components/experience/ExperienceHost.tsx，组合介绍、渲染、互动、反馈、完成、阅读、退出与等价内容。
- `createExperienceCatalog`、`resolveHistoricalRoute`：发布视图与统一准入。
- `historicalExperienceReducer`、`completionForState`：运行和显式完成校验。
- `CompletionStore`：浏览器记录，复用 C0 CompletionRecord schema。
- `ExperienceModules`、`loadExperienceModules`：应用层可注入适配器，动态发现实际场景出口，缺失不造同名实现。

A/B 仍只从 shared/contracts/index.ts 导入类型，经各自 feature/index.ts 导出组件，不反向依赖 app。C0 数据 schema 和 A/B props 未修改。

## A 如何接线

从 scene/index.ts 导出 `ImmersiveExperienceRenderer(ImmersiveExperienceProps)`；可另导出 `LongMarchSceneV2(LongMarchSceneV2Props)`。C 已提供接入点，没有替 A 制作场景。

```ts
const run = {
  experienceId: props.manifest.experienceId,
  scriptVersion: props.manifest.scriptVersion,
  runId: props.command.runId,
};
// 在实际准备/到达时回调，不在 render 中直接调用。
props.onReady(run);
props.onSegmentReached({ ...run, segmentId });
props.onInteractionCue({ ...run, segmentId, interactionId });
props.onTerminalReached({
  ...run,
  segmentId: props.manifest.terminalSegmentId,
});
props.onCameraBookmark({ ...run, bookmark });
props.onError({
  ...run,
  error: { code: 'asset_load_failed', message, retryable: true },
});
props.onExitRequested(run);
```

上例说明真实接口名称，不是成品渲染代码。每次开始/重播/重试/切换等价流程都有新 runId，旧事件不能改写为新 ID。

command.segmentId 从首段开始。先报告当前段实际到达，再按 manifest.segmentIds 相邻推进；不能跳段。到达当前段后再发其 interactionCue，C 暂停 command.playback 并打开互动；必要互动、解释确认及用户“继续主线”完成后才恢复。终点只报告实际到达，不直接保存完成。

paused/muted/reducedMotion 必须同步控制动画与媒体。前台恢复不自动播放。A 卸载须清理音频、Web Audio、监听、定时器和 GPU；C 会卸载渲染器并暂停宿主内原生 audio/video，不能代替 A 清理外部资源。

地图对象点击统一交给 onObjectSelect；phaseId 由 C 提供，不从 0～1 进度生成地理位置。地图与沉浸书签分开；CameraBookmark 只用 scene-local 普通数据，C 核对 sceneId/phaseId/坐标系/有限数值。未提供书签时不虚构镜头。

## B 如何接线

保留旧 HistoryEventPanel，可新增 `HistoricalDetailPanel(HistoricalDetailProps)`、`TeachingInteraction(TeachingInteractionProps)`、`EquivalentExperience(EquivalentExperienceProps)`。

- Teaching.onResponse：观察可增量报告 visitedMaterialIds，其余类型在真实提交完整尝试后报告。类型、材料、选项须匹配当前定义。
- observe_hotspots 看全材料；listed 按 requiredMaterialIds 顺序。sort_sequence 完整排列；material_matching 完整一一对应；classify_source 覆盖全部材料；evidence_selection 是合法选项。
- 完整但答错的尝试可看审核反馈/解释后继续，不改变历史。缺项或非法 ID 不可确认解释。
- onExplanationAcknowledged 仅在用户明确读过解释后报告。C 也呈现 B 的反馈文本和统一确认按钮；确认后仍需主动“继续主线”。
- Equivalent 使用 activeStepId，B 提供可访问的阅读确认操作，真实阅读后 onStepViewed，C 再允许下一段。两个互动仍使用同一 Teaching；到最后仍需主动完成。懒加载尚未呈现正文时没有提前确认阅读的入口。
- Details.onNavigate 使用 open_object/open_source/replay_experience。关联事件经过同一门槛并同步宏观选择；体验内补充资料暂停主线，关闭后主动继续。

来源、正文、素材、剧本和解释均由 B 提供并完成人工发布审核。C 不代写真实人物言行、史实或批准。

## 准入与撤回

正式内容只来自 getPublishedDatasetV2。唯一正式 JSON 仍是 src/data/verified/dataset.json，C 未修改 B 数据或审核。

C0 过滤后撤回的 manifest 会消失，C1 因而保留经过结构验证的产品关联作为仅拒绝访问的门槛索引，防止事件错误降级为普通阅读。该索引不展示候选内容，也不提供开放凭证；六个固定 ID 不自动创建事件。撤回保留关联与审计轨迹，不用删除全部声明来取消门槛。兼容分析见 phase-c1-design.md。

运行中发布失效、scriptVersion 或规则变化会终止实例；本地记录不解锁撤回内容。阅读和补充浮层也重新检查当前发布视图。公共 schema 不变。

## 浏览器记录与上下文

正式键为 `long-march.experience-completion.v1`。envelope 为 `{schemaVersion:1,generation,records}`；每条复用 C0 CompletionRecord。只接受六个体验，每个最多保留最近两个规则版本，总计十二条，避免错误版本阻塞重做。只有当前 manifest 的匹配版本有效，普通改字不重置。

保存前读盘合并，storage 事件读最新磁盘，尽力修复常见并发；没有强事务保证。清除需用户确认，更新 generation 防旧缓存复活。损坏项忽略；读写拒绝保留会话进度，长期清除失败明确提示可能恢复。

进入先 pause 宏观播放；退出/完成后仍暂停。保留进入对象、phaseId、合法地图书签及原入口焦点。关闭资料只收起，显式取消选择和返回首页分别清空。usePlayback.pause() 是向后兼容新增方法。

## 泸定桥联调步骤

1. B 提交完整审核候选：事件/专题/阶段、五类段落、ld-01/ld-02、反馈/解释、等价主线、正文和素材。未经真人双人复核不发布。
2. A 提交上述命名出口，按“当前段到达→互动暂停→用户继续→下一段→终点”协议运行。
3. C 先在隔离环境验回调、错误和媒体控制，再接入真实发布数据。
4. 验证四种主动入口、首次退出、两互动与解释、主动完成、刷新直达、重播退出、另一个体验、清除/损坏/禁用存储、多标签及内容撤回。
5. 验证原选择/阶段/书签/焦点和宏观暂停，最后做真人史实、素材及真实 WebGL/桌面性能验收。

## 工作台与 Git 同步

运行 `npm run dev:contracts`，在终端实际端口打开 `/__dev/contracts?flow=c1`。C0 工作台也有链接。C1 使用真实 App/控制器及明确标注的工程适配器，审核结构仅在测试内存模拟，不代表成品视频或真人审核。

开发键为 `long-march.development.c1-completion.v1`，不会解锁正式展馆。生产模块隔离插件保持开启。首次/完成/刷新/退出的 Chrome 实测、三种桌面尺寸、截图及后续专项见 [验收记录](phase-c1-desktop-qa.md)，其中保留初轮连接错误供追溯。

C0 合并后由 C 重新检查 C1 base。若 squash 造成重复 C0 差异，用新分支选择性 cherry-pick C1 提交，不强推共享分支。A/B 只在各自分支提交本人工作并 merge 最新 origin/main；C1 仍为 Draft 时不宣称已进入 main。不得自动私信成员。
