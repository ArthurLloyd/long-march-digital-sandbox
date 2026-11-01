# Phase C1：沉浸体验调度与本地完成状态开发报告

日期：2026-11-01。C1 调度与浏览器记忆已实现并通过本地完整检查，已创建独立 [Draft PR #6](https://github.com/ArthurLloyd/long-march-digital-sandbox/pull/6)。后续 Chrome 验收已跑通首次体验、完成解锁、刷新记忆及退出返回，并修复地图控件遮挡、取消选择定位和状态切换焦点丢失。正式三维场景、历史内容与媒体/GPU 性能仍待 A/B，本报告不将工程探针称为六个历史专题成品。

## 1. Git 状态

- 工作目录 D:\Project\miniprogram；分支 feat/c1-experience-controller。
- C0 PR #4 在开工和创建 C1 PR 前均通过 GitHub API 核对为 open、未合并，head 仍是 6f384d2b1765a7f4b8d6a7c38743cdf263ce8799；未向它追加 C1 提交。
- C1 [PR #6](https://github.com/ArthurLloyd/long-march-digital-sandbox/pull/6) 是 Draft Stacked PR，base feat/app-shell，head feat/c1-experience-controller，差异只含 C1。
- 代码、测试与接线文档基线为 5fb86bc0f9f27b5d147da402f81ce01192d33f79，已成功推送；报告自身随后单独提交，最终 head 见 PR 及交付消息。
- 后续浏览器验收修复与截图在同一 C1 分支追加提交，本轮 lint/typecheck/format/data/build 及 187 项测试再次通过。沙箱 HTTP 测试 EACCES 后在宿主机重跑同一完整套件通过，未跳过用例；最新提交和 CI 见 PR #6。
- main 与 PR #4 均未自动合并/改写；没有强推、reset、clean、删除或覆盖其他成员修改。阶段 A/B/C/D/E/F 分批提交并推送。

| 提交    | 阶段                                |
| ------- | ----------------------------------- |
| 3672b19 | C1-A 设计、兼容审计与分支规则       |
| aa93f1b | C1-B 发布安全的统一对象路由         |
| bbaf631 | C1-C 运行实例、顺序和互动状态机     |
| 9f37d7b | C1-D 浏览器完成记录与恢复           |
| 5038050 | C1-E App、上下文、等价与工作台接入  |
| ab7a3d5 | C1-F 懒加载、存储版本、非法回调回归 |
| 5fb86bc | 接线、协作与桌面验收证据边界        |

## 2. 实际文件

路径均相对于仓库根目录；C0 既有文件的历史交付不重复计为本轮成果。

| 文件                                                | 用途                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| .github/workflows/ci.yml                            | 增加 stacked base feat/app-shell 的 PR 质量检查                           |
| src/app/App.tsx                                     | 唯一 JSON 输入、发布视图、统一访问、适配器、选择/阶段/书签与设置          |
| src/app/experience/historical-experience-routing.ts | 普通/重点对象路由、发布 bundle、仅拒绝访问的门槛索引                      |
| src/app/experience/historical-experience-reducer.ts | 十二类状态、runId、段落、互动、解释、退出和完成验证                       |
| src/app/experience/interaction-progress.ts          | 五类响应的 ID、完整性、顺序和参考答案检查                                 |
| src/app/experience/use-historical-experience.ts     | 调度 Hook、回调、当前发布保护、加载超时、存储和上下文组合                 |
| src/app/experience/experience-completion-service.ts | 版本化 localStorage、损坏恢复、会话降级、同步、清除代际                   |
| src/app/experience/experience-context.ts            | 相机书签结构及 scene/phase 核对                                           |
| src/app/experience/experience-modules.ts            | 可注入模块签名与实际 A/B 出口发现                                         |
| src/components/experience/ExperienceHost.tsx        | 介绍、互动、反馈、暂停、完成、阅读、错误和等价宿主                        |
| src/components/experience/CompletionSettings.tsx    | 清除记录的明确确认/取消                                                   |
| src/components/layout/SceneViewport.tsx             | 保留旧 props，增加可注入 v2 地图呈现                                      |
| src/components/overlay/ExhibitionContent.tsx        | 人物/地点/专题目录及减少动态说明                                          |
| src/components/overlay/ExhibitionDrawer.tsx         | 复用焦点约束，回调更新不重复重置焦点                                      |
| src/components/ui/ErrorBoundary.tsx                 | 保持旧默认值，允许资料场景使用准确错误文案/布局                           |
| src/features/timeline/use-playback.ts               | 新增幂等 pause，不清选择、不反向启动                                      |
| src/hooks/use-visibility-pause.ts                   | 隐藏/失焦暂停与监听清理                                                   |
| src/styles/historical-experience.css                | 继承原色彩/字体的体验抽屉与状态样式                                       |
| src/tests/experience-routing.test.ts                | 普通/重点/六 ID、版本、撤回和引用准入                                     |
| src/tests/experience-state-machine.test.ts          | 有效顺序、旧实例、空回调、互动与解释、暂停/退出/等价                      |
| src/tests/experience-completion-storage.test.ts     | 刷新、六主题、版本、损坏、读写故障、标签、清除和隔离                      |
| src/tests/historical-experience-flow.test.tsx       | 真实 App 的完整 C1 闭环、四类入口、媒体命令、记录、上下文、失效与加载边界 |
| src/tests/experience-integration.test.tsx           | 保留旧回归；改为明确注入内存样本，关闭断言按新要求保留选中                |
| src/tests/fixtures/c1-sample.ts                     | 合成内容/审核结构工厂，只用于测试与工作台内存                             |
| src/tests/fixtures/c1-driver.ts                     | 通用工程响应及纯引擎驱动，不是历史剧本                                    |
| src/tests/workbench/C1Modules.tsx                   | 明确标注的公开边界探针，不冒充 A/B 成品                                   |
| src/tests/workbench/c1-modules.ts                   | 工程适配器注册                                                            |
| src/tests/workbench/C1Workbench.tsx                 | 真实 App 的隔离 C1 调试及独立开发存储键                                   |
| src/tests/workbench/ContractWorkbench.tsx           | C0 页面增加 C1 入口                                                       |
| src/tests/workbench/main.tsx                        | 按开发 query 独立加载 C0/C1 页面和样式                                    |
| docs/architecture/phase-c1-design.md                | 实施前方案与兼容取舍                                                      |
| docs/architecture/c1-integration-guide.md           | A/B 实际出口、回调顺序、联调与同步说明                                    |
| src/tests/workbench/c1-workbench.css                | 仅开发工作台加载的工程地图控件布局                                        |
| docs/architecture/evidence/c1/                      | 实际 Chrome 截图与三种视口 DOM 宽度测量                                   |
| docs/architecture/phase-c1-desktop-qa.md            | 四条主流程、三种桌面尺寸、修复和证据边界，保留初轮连接错误                |
| docs/architecture/phase-c1-report.md                | 本报告                                                                    |
| docs/architecture/overview.md                       | C1 数据流及与旧阶段的边界                                                 |
| docs/interface-contract.md                          | 运行补充及关闭资料新语义，未改变 C0 schema                                |
| docs/collaboration.md                               | 独立分支、叠加 PR 与后续安全调整 base                                     |
| docs/development.md                                 | C1 工作台启动、隔离与验收入口                                             |

没有修改 src/features/scene、src/features/history、src/data/verified、docs/sources、docs/history-review 或 public/assets/archive。没有更换首页山河/手迹/红金控件、增加依赖或修改锁文件。

## 3. 实际状态机

状态为 idle、intro、loading、playing、paused、awaiting_interaction、equivalent_experience、ready_to_complete、reading、error、unavailable、exit_confirm。

| 转换                                                           | 条件                                      |
| -------------------------------------------------------------- | ----------------------------------------- |
| idle → intro/reading/unavailable                               | 主动对象入口的发布与记录判断              |
| intro/reading/error → loading 或 equivalent_experience         | 用户开始/重播/重试/切换，生成新 runId     |
| loading → playing/paused                                       | 匹配实例真实 ready；已隐藏则保持暂停      |
| playing → awaiting_interaction                                 | 当前已到达段落的合法 cue                  |
| awaiting_interaction → playing/equivalent_experience           | 完整响应、解释确认、用户明确继续          |
| playing → ready_to_complete                                    | 顺序到达最后段、合法终点回调              |
| equivalent_experience → awaiting_interaction/ready_to_complete | 按序真实阅读，保留同样互动与终点          |
| 活跃状态 → paused                                              | 用户暂停、页面隐藏/失焦、打开补充资料     |
| paused → 原有效状态                                            | 用户主动继续                              |
| 活跃状态 → exit_confirm → idle                                 | 请求退出、用户确认，不写完成              |
| exit_confirm → paused/loading/error                            | 取消退出，保留正确恢复目标，不突然播放    |
| ready_to_complete → reading                                    | 全条件校验后用户明确完成，记录通过 schema |
| 活跃状态 → error/unavailable                                   | 资源故障或当前发布内容/脚本失效           |

每次实例包含 experienceId/scriptVersion/runId，当前段落及其到达标记、响应、已确认解释、已完成互动和终点。旧实例、错误脚本、未知/跳跃段落、错误 cue、重复完成和空/错误形状回调被忽略。当前发布视图与存储变化在渲染选择器先行收紧，避免等异步 effect 才隐藏撤回内容。

## 4. 统一对象访问

地图、章节、时间轴手动选择和资料关联均使用 openHistoricalObject；同一回调同步宏观选中。人物和地点可直接读，未知坐标不阻止目录访问。普通专题按已发布内容组织；重点关联经过介绍门槛。自动宏观回放仅改摘要/选择，不调用体验入口。

getPublishedDatasetV2 是所有显示内容及开放资格的来源。为防撤回 manifest 消失后事件退化成普通阅读，仅保留结构合法的产品关联作为拒绝索引，不读取或展示候选正文/素材，不给它发布能力。固定 ID 不产生史实。

普通关闭资料收起并 pause，保留当前选中；显式取消选择和返回首页分别清空。当前生产数据仍为空，没有六个未发布体验的假可用入口。

## 5. 两互动与完成

五类响应均校验当前实例、当前互动、实际类型、已知材料/选项和完整性。观察允许增量但必须看全；listed 顺序有约束；排序完整排列、匹配一一对应、分类覆盖材料、选择项有效。完整答错可读 B 的解释继续，不修改历史。

只有真实顺序终点、两互动完成、两解释确认和主动“完成体验，阅读资料”同时满足，才调用 canCompleteExperience 并生成 completionRecordSchema 合法记录。等待、播放完、故障、后台、退出和减少动态均不自动完成。加载超时只报可恢复错误。

## 6. 浏览器记忆

正式键 long-march.experience-completion.v1；envelope 为 schemaVersion:1、generation、records。records 复用 C0 字段；六个体验按规则版本独立，最多保留每 ID 近期两个版本，总计十二条。只用 isCompletionRecordForExperience 匹配当前 manifest，普通改字不失效。

损坏 JSON/envelope/单项安全忽略；读写拒绝或配额失败时会话记录仍可完成阅读，并显示无法长期保存提示。保存前读盘合并；storage 事件读取当前磁盘，避免迟到 payload 覆盖新记录，尽力修复常见并发，不宣称强事务。

清除必须明确确认，写入新 generation，旧标签不会把清除前的缓存重新合并。长期清除被浏览器拒绝时说明刷新后可能恢复。普通退出、关闭、回首页、重播取消不删除旧记录。开发工作台另用 long-march.development.c1-completion.v1，不解锁正式站点。

## 7. 退出、重播与恢复

未完成退出卸载实例、不写 completed；重播用新 runId，中途退出保留历史完成记录。宏观进出均 pause，不靠 toggle，也不自动恢复播放。

保存选择/phaseId/已有地图书签。书签核对 sceneId、phaseId、scene-local 及有限数值；缺失不虚构。沉浸书签不覆盖地图书签。ExhibitionDrawer 复用 Tab/Esc 和返回焦点逻辑，内部状态变化不会反复重置焦点。

隐藏/失焦暂停演绎与媒体命令，回来主动继续。C 暂停宿主原生媒体并卸载模块；真实 A 仍须按命令控制 Web Audio/动画并清 GPU，不以工程测试代替资源验收。

## 8. 等价流程与适配状态

无 WebGL、资源故障、减少动态或主动选择时，使用已发布 EquivalentExperienceContent 和 B 的 EquivalentExperience/TeachingInteraction。每步须真实阅读，C 才放行下一段；两互动、解释、终点和主动完成不减少，记录 equivalent。

未发布 fallback 或缺组件时如实不可用/禁用，错误不算完成。懒加载有独立 Suspense，等待时仍可退出，等价组件未呈现时不提供提前阅读确认。

当前 A/B 新出口未在本地基线交付，正式数据为空，完整流程使用明确工程适配器验证。A/B 真实组件、剧本、热点/排序 UI 与历史复核仍待接入。

## 9. 工程检查与浏览器

| 检查                             | 实际结果                                                 |
| -------------------------------- | -------------------------------------------------------- |
| npm run lint                     | 通过，无 warning                                         |
| npm run typecheck                | 通过                                                     |
| npm run format:check             | 通过                                                     |
| npm run test                     | 18 个文件、187 项通过；原 C0 136 项保留，新增 51 项      |
| npm run validate:data            | 通过，0 事件/0 路线/0 来源，扩展为空                     |
| npm run build -- --logLevel warn | 通过，包含数据、类型及生产隔离插件                       |
| git diff --check                 | 工作区及 C1 相对 C0 差异通过                             |
| dist 扫描                        | 未发现开发路由、工程探针、模拟审核标记                   |
| GitHub CI                        | 本 PR 独立执行，最终结果见对应 head 的 Checks 与交付消息 |

旧四项资料集成测试保留，输入改为测试内存的合成发布结构，关闭断言按明确的 C1 产品要求改为保留选中；没有删除旧测试、关闭校验或将测试签署写入正式数据。

初轮 Chrome 连接失败保留在 [桌面记录](phase-c1-desktop-qa.md)。随后将仅 loopback 的 Vite 服务启动于宿主机，HTTP 与真实 Chrome 均成功。四条主流程及常规/等价两条完成路径实际跑通；1920×1080、1440×900、1366×768 各有对应状态截图、DOM 宽度测量，无所测状态的水平溢出。修复工程地图按钮被导航覆盖、取消选择按钮定位、开始/继续/完成丢失焦点；完整流程测试增加焦点断言，修复后在浏览器再完整重跑。9 张截图和 JSON 记录已保存，浏览器临时尺寸已恢复。此结论不覆盖正式历史内容、真实 WebGL、Web Audio/GPU、所有长文本或设备性能。

## 10. A/B 联调准备

实际接口及最小回调示例见 [C1 接线说明](c1-integration-guide.md)。A 需交付 ImmersiveExperienceRenderer/可选 LongMarchSceneV2，B 需交付 TeachingInteraction/EquivalentExperience/HistoricalDetailPanel 与经过真人审核的数据。

先以泸定桥验证：用户主动入口→介绍→ready→按序段落→ld-01/ld-02→解释确认/继续→终点→主动完成→刷新直达→重播/退出→回原地图。再验证错误/减少动态等价、记录损坏/禁用/清除、多标签及发布撤回。

工作台运行 npm run dev:contracts，打开终端实际端口的 /__dev/contracts?flow=c1。所有工程内容/审核模拟醒目标注，独立开发键且生产隔离。未自动私信成员。

## 11. 完成范围与待办

已实现并通过自动检查：统一路由、实例状态、五类响应、完成条件、存储、恢复、等价调度、当前发布保护及独立 PR。

仅通过工程模拟：A 渲染回调、B 互动/阅读回调、完整 App 连接；C1 四条主流程已有真实 Chrome 证据。待 A/B：六个真实三维场景、剧本、正文/等价内容、热点与真实操作 UI、媒体/GPU 清理。待真人：史实、空间、素材使用和双人复核。待专项：真实媒体/性能、长正文及其余浏览器故障/偏好场景，具体边界见桌面记录。

没有改写历史、补路线/坐标、代签人类审核；未做手机精修、首页重做、应用封装、付费 AI、账号或云同步。本轮停止于 C1，不自动开展 C2/C3。C0 合并后先安全调整 C1 base，再由用户决定正式集成。
