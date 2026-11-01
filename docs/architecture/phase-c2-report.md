# Phase C2：历史时钟与沙盘联动开发报告

2026-11-01。C2 可独立开发的阶段时钟、导航、态势筛选、C1 联动和隔离工作台已实现，已创建 [Draft PR #7](https://github.com/ArthurLloyd/long-march-digital-sandbox/pull/7)。217 项测试与工程检查通过；三种桌面尺寸已有主流程证据。新聊天补验已成功 reset viewport，默认 DOM 尺寸为 1280×622；Chrome 与 Edge 原生控制均被 URL 识别限制停止，后台隐藏未验证。用户决定本轮不再验收该项，不再要求人工补测；具体边界及原受阻记录见验收文档。此报告不将工程样本成功当作正式历史体验或真实 A/B 场景完成。

## 1. Git 与依赖

- 工作目录 D:\Project\miniprogram；独立分支 feat/c2-history-orchestration。
- 开工 fetch 并通过 GitHub 核对 C0 #4 open（6f384d2）、C1 #6 Draft/open（e94d29b）、A0 #5 Draft/open（918b7922）；创建 C2 PR 前再次核对，状态和 head 均未变化。
- 从完整 C1 e94d29b5eaf0a244e326ddeb19f9ff7c3f0ec2f0 建立 C2。PR #7 base 为 feat/c1-experience-controller；C1 base 为 feat/app-shell，C0 base 为 main。
- 只推送 C2 分支，没有修改/合并 #4/#5/#6、main 或其他成员分支，没有 reset、clean、force push。
- 浏览器最终代码基线 7f3e1be5b2785f6db90418c223ba4ffdd97769ac；报告、交接和截图随后追加，最新 head 见 PR Checks。

| 提交    | 分批成果                                                         |
| ------- | ---------------------------------------------------------------- |
| 8416c5e | C2-A 依赖审计、状态所有权与设计                                  |
| 82fa3c0 | C2-B 阶段模型/reducer/Hook、8 项测试与工程样本                   |
| de8ec61 | C2-C 专题/实体目录、关联链接、6 项测试                           |
| fec6226 | C2-D 态势/空间投影/图例、7 项测试                                |
| 89a6460 | C2-E App/C1 联动、阶段时间轴、工作台、9 项完整 App 测试、CI base |
| efd524b | C2-F reading→reading 焦点修复及空态工程控件初次移位              |
| 7f3e1be | 空态工程回显最终避让两侧卡片                                     |

## 2. 文件与作用

路径相对于仓库根目录；未将 C0/C1 既有文件全部计作新增成果。

| 文件                                                    | 实际作用                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| src/features/timeline/historical-phase-selectors.ts     | 发布专题模型、内部顺序核对、原始时间精度文本                                 |
| src/features/timeline/historical-phase-reducer.ts       | 专题/阶段/播放状态、合法选择、恢复、末段停止和迟到 tick 防护                 |
| src/features/timeline/use-historical-phase.ts           | 唯一阶段计时 Hook，4 秒展示节奏、禁用/数据变化暂停                           |
| src/features/timeline/PhaseTimeline.tsx                 | 阶段前后、播放、专题重播、阶段选择与主动事件入口                             |
| src/features/timeline/use-playback.ts                   | 向后兼容 enabled，阶段模式不启动旧事件计时器                                 |
| src/features/timeline/index.ts                          | 新控制器与组件的公共出口                                                     |
| src/app/App.tsx                                         | 统一阶段派生、宏观暂停、目录、当前空间输入、上下文及最新回调检查             |
| src/app/history/force-state.ts                          | 当前阶段的单位/样本/原路线选择与图例数据                                     |
| src/app/history/scene-phase-view.ts                     | 当前阶段空间投影、无坐标地点目录保留、可表示对象选择                         |
| src/app/experience/historical-experience-routing.ts     | 仅用于拒绝降级的阶段声明标记；发布权限仍来自原门禁                           |
| src/app/experience/historical-experience-reducer.ts     | 内部上下文兼容增加可选 topicId                                               |
| src/app/experience/use-historical-experience.ts         | 明确阶段入口上下文、宏观切换清理接口；不新增状态机或存储                     |
| src/components/overlay/HistoricalNavigation.tsx         | 专题→阶段→事件树与人物/地点目录                                              |
| src/components/experience/RelatedHistoryLinks.tsx       | 已发布关系链接和地点类型说明，继续走 C1                                      |
| src/components/experience/ExperienceHost.tsx            | 关联组件组合，状态/对象切换时恢复抽屉焦点                                    |
| src/components/layout/ForceLegend.tsx                   | 同源阵营/模式/精度图例和无态势说明                                           |
| src/components/layout/SceneViewport.tsx                 | 兼容的已发布内容空态标记，避免只有事件数量决定场景是否为空                   |
| src/components/overlay/ExhibitionContent.tsx            | 核验空态准确文案                                                             |
| src/styles/historical-orchestration.css                 | 沿用山河/红金风格的阶段信息、抽屉层级、图例和时间轴                          |
| src/tests/fixtures/c2-sample.ts                         | 两个虚构专题、五阶段、抽象点/区域/路线/未知样本，仅测试内存                  |
| src/tests/historical-phase.test.ts                      | 8 项阶段状态/顺序/计时/精度测试                                              |
| src/tests/historical-navigation.test.tsx                | 6 项公开目录、人物、无坐标地点和关联测试                                     |
| src/tests/force-state.test.tsx                          | 7 项当前阶段、缺证、原几何、撤回、空间视图与图例测试                         |
| src/tests/history-orchestration-flow.test.tsx           | 9 项真实 App/C1/公开模块边界集成，含焦点回归                                 |
| src/tests/historical-experience-flow.test.tsx           | 保留 15 项原流程；兼容播放输入明确无阶段，普通关联事件明确纳入阶段，未删断言 |
| src/tests/workbench/C2Workbench.tsx / c2-workbench.css  | 独立 C2 工程页、接线回显、撤回/错误/空态控制与专用样式                       |
| src/tests/workbench/main.tsx / ContractWorkbench.tsx    | 仅开发路由 flow=c2，保留 C0/C1                                               |
| .github/workflows/ci.yml                                | 增加 C1 分支作为 stacked PR base 的质量检查触发                              |
| docs/interface-contract.md                              | C2 运行语义、空间投影与兼容补充，不改 C0 schema/props                        |
| docs/architecture/phase-c2-design.md                    | 实施前方案及分批实际记录                                                     |
| docs/architecture/c2-integration-guide.md               | A/B/C 接线、A0 审计、数据和 Git 交接                                         |
| docs/architecture/phase-c2-desktop-qa.md / evidence/c2/ | 实际流程、16 张带代码提交的截图、清单和工具停止边界                          |
| README.md / docs/development.md / docs/collaboration.md | 开发入口、依赖和安全同步说明                                                 |

没有修改 src/features/scene、src/features/history、src/data/verified、来源/人工复核目录或档案素材；没有新依赖、锁文件改动、字体/山河主视觉重做。

## 3. 唯一宏观时钟

selectedTopicId、activePhaseId、playing、modelKey、revision 由一个 reducer 管理。App 删除旧独立 phaseId state，C1 上下文引用该时钟。Topic.phaseIds 与 phase.topicId/sequence 必须一致，异常拒绝而不排序修复；displayOrder 只影响目录/默认浏览入口，不是跨专题历史顺序。

支持 selectTopic、selectPhase、play、pause、nextPhase、previousPhase、restartTopic、restore、reset。单阶段可看而不可前后/自动播放；空数据禁用；末段立即停止，不跨专题循环。可用专题/阶段序列变化在当前 render 投影合法状态并暂停，普通文字更新不强制重启；旧 tick 的 revision/modelKey 不匹配时拒绝。

每 4 秒只推进一个明确阶段，属于展示节奏。没有用 Date、墙上经过时间、速度、坐标插值或产品编号生成历史。进入资料/体验、失焦/隐藏均调用宏观 pause；自动测试验证后台不累计跳段，真实隐藏项未确认。

阶段声明存在时旧 usePlayback 自动计时被禁用；没有阶段声明时保留旧事件回放。阶段撤回不降级重启旧时钟。完成记录完全独立，阶段/专题重播不清除它。

## 4. 导航与选择

已发布专题在现有抽屉按需展开阶段和事件，展示原时间范围和精度。人物和地点可从当前关联或完整目录访问；未知坐标不删除资料，现代设施类型明确区分。

专题/阶段操作只改变探索，自动播放只改摘要/空间输入。显式打开对象才调用 C1 openHistoricalObject。嵌套事件入口携带明确 topic/phase；正文关联导航保持当前阶段，不按名字/日期猜归属。普通关闭、取消选择、首页、未完成退出保持原有独立语义。

## 5. 部队态势和地图视图

selectForceStateForPhase 只选择当前有效阶段、发布 track/snapshot 和明确路线引用，按原 displayMode 验证已有输入。缺坐标不画点、缺区域不生成区域、缺路线不连线；不插值，不推测国民党军或红军标记，不把数量当兵力。

selectScenePhaseView 为 A 生成只读空间投影，阶段切换即替换旧数组，不残留未来快照。routes 只保留当前 route 模式的直接引用；places 不包含未知地图点；位置未知事件元数据仍可供列表阅读，A 不得定位。完整目录继续用完整发布 catalog，投影不写回、不冒充新的正式闭合数据集。

ForceLegend 从同一选择结果派生阵营、点/区域/路线及精度，空态明确说明。示意说明持续显示。没有 A v2 实现时图例说明图层待接入，不声称已经完成三维绘制。

## 6. C1 联动与兼容

六个体验 ID、十二互动、runId/脚本校验、显式完成、localStorage 服务、等价流程和撤回门禁保持。内部 ExplorationContext 可选 topicId 向后兼容，旧上下文可由明确 phaseId 查所属专题，不猜历史顺序。

进入时保存阶段、对象、合法地图书签和原入口；完成/退出恢复仍发布的上下文并保持暂停。阶段变动清理旧选择和书签，迟到地图/相机回调用最新阶段检查。连续关联资料导航的焦点缺陷已复现并修复。

## 7. 与 A 的实际接入程度

LongMarchSceneV2Props、ForceLayerProps、onObjectSelect、onCameraBookmark 均复用现有契约，模块发现与缺失回退可运行。A0 #5 只导出 v1 地图，独立艺术样板未对接 phase/C1 runId，因此本轮只读审计，没有合并 A0、复制 Three.js 或认证实际 GPU/媒体。完整审计与两个 C 测试 mock 的集成建议见交接说明。

## 8. 与 B 的实际接入程度

只使用 getPublishedDatasetV2 提供的专题、阶段、实体、部队、来源及体验关联。C2 没有录入真实事件、照片、部队位置或真人审核。B 正式内容/剧本/照片及独立复核仍待交付；无数据时合法空态正常运行。

## 9. 测试与工程检查

| 检查                            | 实际结果                                                    |
| ------------------------------- | ----------------------------------------------------------- |
| test                            | 22 文件、217 项全部通过，保留原 C0/C1 187 项，新增 C2 30 项 |
| lint / typecheck / format:check | 全部通过                                                    |
| validate:data                   | 通过，0 事件/0 路线/0 来源，v2 扩展为空                     |
| build                           | 通过，保留数据门禁与生产模块隔离                            |
| git diff --check                | 通过                                                        |
| dist 扫描                       | 未发现工作台路由、C2 工程控件/单位、模拟审核标记            |
| GitHub CI                       | 以 PR #7 最新 head 的 Checks 为准，最终结果补入 PR 描述     |

首次加入连续导航焦点断言时真实失败，修复后 24 项 C1/C2 关联流程通过，随后完整 217 项重跑通过。没有删除旧用例、关闭隔离插件或绕过 HTTP 测试；本机完整套件在已授权的宿主机运行。

2026-11-01 新聊天文档补验后再次通过 lint、typecheck、format:check、validate:data、build 和 git diff --check。测试首轮在沙箱内为 216 通过、1 项本机 HTTP 连接 EACCES；使用受支持的宿主执行权限重跑后，22 文件、217 项全部通过，没有改动测试或应用代码。格式初检发现两份文档排版问题，修正后全仓格式检查通过。

## 10. 桌面证据与修复

三种目标尺寸均实际设置并操作：1440×900 验阶段与 C1 完整闭环，1920×1080 验目录滚动与实体资料，1366×768 验专题切换、空态/错误/撤回及焦点修复。16 张图片的代码提交、真实像素尺寸及证据边界已登记；不以裁切截图高度冒充 viewport。

修复 reading→reading 丢焦、空输入工程控件覆盖诗句/侧卡，并统一节奏说明字号。真实隐藏前提未成功建立；随后 Computer Use 因无法可靠判断 Windows 当前 URL 停止，未继续或换机制控制浏览器。真实后台暂停与 viewport reset 未计完成；已有自动回归不能代替该专项。详见桌面验收。

2026-11-01 新聊天补验基线 50f2bf359559027053a889510ca15d6d68203fe8：显式 viewport reset 成功，DOM 前后均为 1280×622、visible，截图 18 显示原第 3/3 阶段暂停；不将截图尺寸当作视口尺寸。随后选择新清单中的原生 Chrome 窗口时，同一 URL 识别限制再次停止电脑控制，本轮未建立 hidden 前提，没有再控制或绕过。尺寸恢复现已完成，后台暂停继续待人工补验，未发现可归因的应用缺陷。本次只更新验收、报告、设计记录和证据清单/截图，未改运行代码。重新核对 #4/#5/#6 均 open/unmerged，#7 仍 Draft，base/head 分支不变。

2026-11-01 Edge 补验基线 d523a21681ba867e73a91a246ec6f9f31c83f978：网页接口实际完成首页确认到第一阶段暂停，但原生窗口处于最小化；使用已安装技能文档所列正式 API 尝试激活/恢复和读取时，再次触发相同 Windows URL 识别限制，立即停止本轮电脑控制。未开始播放/隐藏测试，未观测 hidden，真实后台暂停继续待人工补验。网页可控不代表原生窗口控制可用；无应用代码修复，未改 A/B、正式数据、依赖或浏览器设置。完整经过追加于桌面验收，不抹去原受阻记录。

Edge 补验记录追加后重新通过 lint、typecheck、format:check、validate:data、build、git diff --check，宿主测试 22 文件、217 项全部通过。本次只追加四份文档/清单，未新增或替换截图；最终 CI 结果更新于 PR #7。

随后用户明确表示“实在不行不要验收这个”，本轮后台隐藏暂停专项据此停止，状态为“未验证，用户选择本轮暂不验收”。不再要求用户人工补测或继续控制尝试，不将本项作为本轮 C2 交付必须等待的事项；不计通过，不认定应用失败。之前的尝试与人工步骤保留审计轨迹，视口恢复及其他结果不变。

## 11. 发布与来源状态

正式数据仍只有 src/data/verified/dataset.json，完全未改。唯一内容授权来自原发布视图；候选 gates/phaseSystem 只收紧访问，不展示候选史料。地方/人物/素材/来源撤回不能通过关联或完成记录重新授权。

工程样本明确为虚构，抽象经纬/局部坐标与 2080/2090 工程日期不指代长征史实，审核结构只在测试内存模拟。没有代签真人、追加假来源、改审计结论或发布未经核验路线。

## 12. 已完成与仍待交付

| 层级                             | 状态                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------- |
| C2 代码、契约消费者和兼容路径    | 已实现并通过工程检查                                                            |
| 开发样本阶段/资料/态势/C1 闭环   | 自动化及上述 Chrome 主流程通过                                                  |
| 真实 A/B v2 场景、部队图层和内容 | 尚未接入，A0 未合并，B 正式数据为空                                             |
| 真人双人史实/空间/素材复核       | 未完成，不由 Codex 代替                                                         |
| 浏览器全部专项                   | 主流程有证据；尺寸已恢复；隐藏暂停未验证、用户决定本轮不验；媒体/GPU/性能未认证 |

## 13. Git 同步与交接

PR #7 保持 Draft，等待 C0、C1 按依赖顺序审查；本轮不合并。A/B 一人一份的原任务书仍有效，本次共用 c2-integration-guide.md 提供实际接线。C0/C1 合并后核对 main 与差异再调整 C2 base；squash 造成重复时使用新分支选择性迁移，不强推。没有自动发送成员私信。

## 14. C3 建议与停止点

后续由用户决定先审 C0/C1，或另行审查 A0 的 v1 基础场景集成。A/B 交付 v2 命名出口与经过真人审核的 B 数据后，再按泸定桥样板复测真实图层、相机、媒体/资源、长正文/人物照片、真实浏览器隐藏和性能。跨专题全局顺序只有在有证据并另行对齐契约后才实施。

本轮停止在 C2，不自动开始手机精修、应用封装、付费 AI、六场景成品扩展或 C3 大规模集成。
