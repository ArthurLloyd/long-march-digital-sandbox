# C2：历史阶段、资料与沙盘接线说明

2026-11-01。C2 位于 feat/c2-history-orchestration，[Draft PR #7](https://github.com/ArthurLloyd/long-march-digital-sandbox/pull/7) 的 base 为 feat/c1-experience-controller。C0 #4、C1 #6 和 A0 #5 仍未合并；本轮没有修改其分支或自动合并。代码验收基线为 7f3e1be，具体证据见 [桌面验收](phase-c2-desktop-qa.md) 和 [开发报告](phase-c2-report.md)。

## 给 A：输入、图层与相机

继续从 shared/contracts 导入类型，并从 scene/index.ts 导出 LongMarchSceneV2。公共 props 和 C0 schema 没有新增必填字段。C1 的 loadExperienceModules 会发现这个出口；没有出口时 App 保留旧 LongMarchScene 和可用的文字资料，不复制三维实现。

| 输入                    | C2 实际语义                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- |
| phaseId                 | 唯一宏观时钟当前合法阶段；无可选阶段为 null                                         |
| dataset                 | 发布视图的当前阶段空间投影，不是另一份正式 JSON                                     |
| events / dataset.events | 当前阶段 eventIds 对应的已发布事件；可含位置未知条目供列表访问，不能据此绘制假点    |
| dataset.places          | 与当前阶段事件有关且已有坐标的已发布地点；未知地点仍在完整资料目录中                |
| dataset.people          | 明确关联当前专题或阶段事件的已发布人物；人物条目本身不提供虚构位置                  |
| dataset.forceSnapshots  | 只含当前阶段、有效 track 及有效显示输入的快照                                       |
| dataset.forceTracks     | 当前可见单位，snapshotIds 同步收窄到当前阶段；不是新增历史事实                      |
| routes / dataset.routes | 当前 route 模式快照明确引用的发布路线。没有引用就不加载，不将所有公开路线归到本阶段 |
| selection               | 当前空间视图中可表示的 kind + id；视图之外的资料可以阅读，但不伪造地图位置或高亮    |
| cameraBookmark          | 当前阶段、当前场景、scene-local 的合法书签；阶段改变时旧书签不继续传入              |
| playbackProgress        | 专题内阶段序号归一化，仅供 UI/呈现；不是行军轨迹、真实速度或时间                    |

空间投影保留公开来源以及专题/阶段等非空间元数据，可能不再满足整张数据引用图闭合。不能将投影送回 validateDataset 当作正式候选数据，也不能写回 dataset.json。完整资料和 C1 准入仍使用 C 的完整发布 catalog。

内部部队图层可直接使用现有 ForceLayerProps：

```ts
const layer: ForceLayerProps = {
  tracks: props.dataset.forceTracks,
  snapshots: props.dataset.forceSnapshots,
  routes: props.routes,
  activePhaseId: props.phaseId,
};
```

A 应按输入更新/清理旧阶段图层；不能累加前一阶段单位，也不能从另一阶段缓存恢复未来态势。point 只画现有 coordinates，region 只使用现有 region，route 只使用明确引用的原路线。null、hidden、缺少区域或路线均不补造；只有两个地点不连线，不用现代路网补几何。points 路线只画独立地点，不连接。

精度、阵营和可用显示模式由 C 的同源图例说明，示意输入在探索空间持续显示“宏观示意，非真实行军路线”。图例并不证明 A 已绘制图层。A 仍应在自己的视图中遵守模式与精度，不以图标大小/数量代表兵力。

对象点击继续 onObjectSelect({kind,id})，不打开自建全局路由。C 根据最新空间视图拒绝旧阶段对象回调；书签回调也按最新 phaseId 拒绝迟到输入。相机只上报普通数值对象，不传 THREE、DOM 或私有状态；sceneId 由实际 A 场景稳定命名，恢复前再次检查。

实际可交互时报告 ready；资源/渲染失败报告既有 SceneError。阶段更新不是另开历史时钟。A 继续负责自身动画、Web Audio、监听、相机控制和 GPU 的暂停/释放；C 的工程探针不能代替这些验证。

### A0 PR #5 的本轮只读结论

核对提交 918b79225df6a0477081154014136de9ac20bec9：scene/index.ts 只导出 v1 LongMarchScene，未导出 LongMarchSceneV2 或 ImmersiveExperienceRenderer。旧 props 保留，空几何使用艺术展陈；源码包含 RAF、ResizeObserver、监听、controls、几何/材质和 renderer 的清理。

独立《渡》通过 prototype/index.html 运行，不接正式历史完成记录，也不是泸定桥精确复原。A 提供的 M4/GPU/帧率记录不是本机复测结果。本轮未合并、运行或重新认证 A0 的 GPU 性能。

App.test.tsx 与 experience-integration.test.tsx 中的 scene 边界 mock 对隔离 jsdom/GPU 有合理用途；将来单独集成时保留 C1/C2 的新输入、完成与上下文断言，只协调必要 mock，不覆盖整份测试。A0 基础场景是否先集成应另走单独 PR，由用户决定，不将其整个分支并入本 C2 PR。

## 给 B：专题、阶段与资料

1. Topic.phaseIds 是该专题内部的明确顺序；HistoricalPhase.topicId 双向匹配，sequence 在同专题唯一且按 phaseIds 严格递增。sequence 可不连续，不能将不同专题的 sequence 当作全局时间。
2. displayOrder 是目录顺序和默认浏览入口，不是历史时间证据。C2 只在当前专题内部前后/播放/重播，不自动跨专题。若将来需要全局顺序，先另提契约和证据方案，由三方对齐。
3. timeRange.start/end/label 和 timePrecision 原样表达年、月、日、范围或未知；不为适配播放器补日。4 秒只是展陈间隔，不得反推历史时长或行军速度。
4. phase.eventIds 必须属于相应 topic.eventIds。一个事件可以出现在明确给出的多个阶段，目录入口携带明确 topic/phase；资料关联导航不依据标题或日期猜归属。
5. Person.relatedEventIds/relatedTopicIds、Place.relatedEventIds 形成资料目录与关联链接。位置未知仍用 null/unknown，地点类型区分历史发生地、旧址、现代纪念馆、纪念设施和现代对照。现代设施位置不能作为历史发生地证明。
6. 人物图、照片和素材遵守 C0 已有同一人物配对与授权门禁。没有合适真实照片先文字，不用生成图或他人照片替代。C2 不代做真人言行或图像身份核验。
7. ForceSnapshot.phaseId 指向真实阶段，trackId/snapshotIds 双向对应，camp/unitId/name 有来源。SourceReference 应明确支持哪个单位、阶段、位置/区域/路线、精度及局限，不以动画画面反证史实。
8. 坐标统一经纬顺序，未知不补；region 必须已有证据和精度，routeId 必须有正式路线记录。隐藏快照或撤回依赖会触发 C0 的保守依赖闭合，可能连带整条 track；不能由 C2 偷删审核引用来放宽发布。
9. 正式数据入口仍只有 src/data/verified/dataset.json。新候选 draft + unpublished，实际两名不同人员独立复核与许可记录齐全后再发布；机器结构校验不认证真人身份或史实。C2 没有改正式数据。

B 的 HistoricalDetailPanel/TeachingInteraction/EquivalentExperience 保持 C1 签名。onNavigate 输出普通 open_object/open_source/replay_experience 请求。C2 的关联资料包装仍调用同一 C1 入口；未完成重点事件不得由人物/地点关联绕过首次门槛，完成记录也不授权撤回内容。

## 给 C：代码所有权与联动

- features/timeline/use-historical-phase.ts 是宏观入口，reducer 和 selectors 分开。纯模型核对顺序，Hook 只调度单步展示 timer，旧 revision/modelKey 的 tick 被拒绝，末段立即停止。
- App 不再单独 useState 一个 phaseId；从时钟派生。内部 ExplorationContext 兼容增加可选 topicId。嵌套目录的事件显式传入入口阶段；地图/正文关联保留当前阶段，不按名称推断。
- 进入资料/体验、打开抽屉、失焦/隐藏和完成/退出均暂停宏观。返回后不自动继续；restartTopic 只重播当前专题，不清 C1 记录。
- 有阶段声明时只启用阶段时钟。候选中“存在阶段声明”仅作撤回后禁止降级的限制元数据，不提供展示资格。没有阶段声明的兼容数据使用旧 usePlayback，其 enabled 默认 true，App 在阶段模式禁用其自动计时。
- 当前对象继续由 C1 持有。阶段改变时清理旧选择和旧书签；手工关闭保留选择，显式取消和首页操作各自独立。只有可恢复的已发布上下文才恢复相机。
- App 层 force-state/scene-phase-view 负责空间选择；不在 A/B 内部导入 C 的实现。A/B 仍只依赖公共 contracts 和各自模块出口。

## 调试、检查与同步

运行 npm run dev:contracts，打开终端实际端口的 /__dev/contracts?flow=c2。C0/C1 工作台保留。C2 提供两个虚构专题、五个工程阶段、点/区域/路线/未知样本及合法空数据、撤回和非法顺序开关；所有审核结构仅在测试内存模拟。

开发完成键为 long-march.development.c2-completion.v1；与 C1 开发键和正式 long-march.experience-completion.v1 分离。只通过 UI 真实完成测试主线，不能手写记录当浏览器验收。生产构建继续拒绝 workbench/fixtures 模块，产物扫描无工程标记。

执行 lint、typecheck、format:check、test、validate:data、build、git diff --check。当前 217 项通过，C1/C0 187 项保留，新增 C2 30 项。完整浏览器边界和人工待补步骤见验收记录。

A/B 继续在自己的分支开发。C0/C1/C2 依次合并后再核对最新 main；本轮不要求 A/B 把 C2 开发分支混入本人未完成工作。已有修改先提交自己的工作，再 fetch/merge origin/main，不 reset、不强推。若 squash 造成叠加差异重复，由 C 通过新分支选择性迁移 C2 提交，重新检查 base。未自动私信成员。
