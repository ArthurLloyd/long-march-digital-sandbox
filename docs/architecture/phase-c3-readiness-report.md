# C3-A 最新同步、CI 修复与模块集成准备

日期：2026-11-02（Asia/Shanghai）。本轮是候选审核、独立预演与接线准备；未合并 PR、未公开部署、未启动正式 C3 大规模集成。原生浏览器后台隐藏暂停按用户要求跳过，仍为未验证。

## 结论与当前基线

main / origin/main 均为 `cbbc916bd3fe4698c6fe2eb61e8bb3bd2c9dde25`。最新 main CI 仍失败，因为修复尚未合并：[main CI](https://github.com/ArthurLloyd/long-march-digital-sandbox/actions/runs/41323493008)。

最小修复 [PR #13](https://github.com/ArthurLloyd/long-march-digital-sandbox/pull/13) 已提交且 CI 成功，等待人工审核。不能把该 PR 的成功写作 main 已恢复。正式 `feat/c3-desktop-integration` 尚未建立；须先经用户批准合并 #13、重新同步并验证 main，再建立该分支。本轮接口测试保存在独立审核分支，不改 App 生产行为。

| 对象             | 实际 SHA / 状态                                                                                                | 审核结论                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #10 B 候选导入   | Head `23e58371118e89df2eb268e75a6feee9c406827f`；已合并 `8c19177b6582129a1ca691da5818862f7d4e7c77`             | B 文件范围内新增内容；旧 App 按钮断言未适配 v2，原 CI 失败                                                                                                               |
| #11 按钮断言更新 | Head `63294bfe2c008277a9d75937eea211131abac1c4`；已合并为当前 main                                             | 保留三个 disabled 断言，仅改为 C2 阶段按钮名称；两处排版导致 Prettier 失败                                                                                               |
| #13 CI 修复      | `3fc70c5820277770b4feb5308ba9327251e40482`；OPEN                                                               | 只格式化 App.test.tsx 两处断言；[CI 成功](https://github.com/ArthurLloyd/long-march-digital-sandbox/actions/runs/41326780814)                                            |
| #12 A 区域沙盘   | 初始 `c213d683d4e8a401cec5b7ff61ec058ba6b7658b`，审查中更新为 `9afccd024f5aba6da53d27f86186a98be2a63e06`；OPEN | 最新 [CI 成功](https://github.com/ArthurLloyd/long-march-digital-sandbox/actions/runs/41327776781)，262 项；可作为独立开发演示进入人工合并评审，不能标为正式 C3 接线完成 |

#12 更新提交同步 main，并应用与 #13 相同的格式修复；A 的场景代码未发生新变化。最新 #12 文件树与先前本地组合预演 `bb0a3b3ed9288beabb78ecf607e1882cbdff7475` 完全一致（git diff 为空）。审查未改写、推送或删除 A/B 分支。

## CI 修复与工程检查

初始工作区干净。本地 main 从 `78c315a` 使用 fast-forward 同步至 `cbbc916`，随后建立用户指定 `fix/ci-history-import`。仅运行 `npx prettier --write src/tests/App.test.tsx`；未运行全仓写格式命令、未删断言、未改 C2 逻辑、未修改发布字段。

下表每行均实际执行 lint、typecheck、format:check、test、validate:data、build、git diff --check，全部成功。测试数对应真实树，不能互相替代。

| 检查树                                                     | 文件 / 测试 | 范围                                                  |
| ---------------------------------------------------------- | ----------- | ----------------------------------------------------- |
| #13 `3fc70c5`                                              | 27 / 258    | 最新 main + 最小格式修复                              |
| #12 初始 Head `c213d68`                                    | 26 / 236    | 基于旧 `78c315a`，不含 B 新交付，不能视作最新组合验收 |
| 组合预演 `bb0a3b3`                                         | 28 / 262    | 初始 A + 最新 B/C + #13，自动合并无冲突               |
| 审核测试提交 `8d1ba7036450c927a0c220fd6beff337ff01983e`    | 28 / 260    | #13 + 两项真实 B/C1 接口测试，不含 A 区域沙盘         |
| 最新 A 组合审核 `47afee3b9c14c80ddbc5911f1b6634c5b081f408` | 29 / 264    | 最新 #12 `9afccd0` + 同两项接口测试                   |

PR #12 独立工作树位于 `artifacts/browser/c3-pr12`（已有忽略目录内）；本地分支 `codex/c3-pr12-latest-audit`，未推送。命令日志保存在 `artifacts/browser/c3-checks*`。新增接口测试位于 `src/tests/c3-history-module-compatibility.test.tsx`，生产隔离检查通过。

独立工作树 npm ci 成功，报告既有 12 项 moderate 依赖问题，本轮未升级依赖。构建保留 >500 kB chunk 提示；jsdom 无 WebGL 的提示不作为 GPU 验收。浏览器初次加载 A 时出现 Vite `Outdated Optimize Dep`，重启本任务开发服务并用 `--force` 重建开发缓存后恢复，没有改动 A 源码或工程配置。

## B 内容、审核与素材

已读取 B-START-HERE、B-DELIVERY、B-CHECKS、ld-content-pack、B-SPATIAL-HANDOFF、B-SOURCE-REGISTER、history 公共出口及 dataset；同时核对人物素材说明与空间缺口表。

| 集合                                  | 实际候选数量 | 正式发布视图 |
| ------------------------------------- | -----------: | -----------: |
| events / routes / sources             |  12 / 0 / 23 |       全部 0 |
| topics / phases                       |        6 / 9 |       全部 0 |
| people / places                       |        6 / 8 |       全部 0 |
| forceTracks / forceSnapshots          |        6 / 9 |       全部 0 |
| experiences / segments / interactions |  6 / 30 / 12 |       全部 0 |
| fallbackContents / assets             |       6 / 10 |       全部 0 |

全部候选仍为 draft/unpublished，真人 reviews 共 0 条。六个固定体验 ID 与十二互动保持契约对应；各体验五段及一份等价内容均存在，结构与双向引用校验通过。8 地点坐标全部 null，9 态势快照全部 hidden；没有正式路线，不从现代 DEM 或事件点推算历史几何。

素材为五组历史照片与 AI 艺术图。周恩来、刘伯承照片及各自艺术图共四项 rightsStatus=unknown；其余六项 cleared 只是候选资料中的使用依据判断，仍无真人复核、未发布。黄开湘只有文字。浏览器确认同一人物 ID 的照片和艺术图配对、照片年代与 AI 性质提示可见；不能据此认定人像身份或艺术相似性已经核实。

**公开部署阻塞：** `public/assets/archive/portraits/` 的未核清图片被 Vite 原样复制到 dist；候选 JSON 也因正式入口静态导入而包含在生产 JS 中，实际发现 `dist/assets/index-DIeuIh0s.js` 含 `ld-hotspot-banks`。发布过滤保证当前 UI 不展示，但不能保证构建文件中不含草稿及未核清素材。因此当前产物仅用于本地验证，不可直接作为公开站点发布。本轮没有部署。后续由 C 设计构建期候选和素材隔离，与 B 保留的审阅数据、素材来源及审计记录兼容，不以修改审核字段解决。

给 B 的具体复核问题：

1. `ld-s5` 及 ld-content-pack 结尾仍写“暂不为其建定名人物条目”，而正文与 person-huang 已采用黄开湘，需由 B 统一候选文本并保留修改记录。
2. 泸定桥桥板状态存在来源差异；精确比例、人物动作、枪型、火势、水位与时刻均缺足够证据。请明确可支持的画面边界，不让 A 补造细节。
3. 补强周恩来、刘伯承照片原始发表及使用范围，复核对应艺术图；五组身份、年代及杨成武合影中的指认仍需真人核查。
4. 来源登记已注明部分全文超时、502、转录、后世编述与同源转载；23 条来源不能当作 23 份独立原始证据。请两位不同真人逐项打开原文，记录本人决定。
5. 正式地图态势仍需单位适用时段、原始图件、地名映射、坐标系、转换、误差、几何及使用条件。无证据继续 hidden/null，不补路线。

本轮未修改 B 专属文件，未自动签署审核、发消息或发布任何候选。

## B 三个真实组件与浏览器结果

`history/index.ts` 实际导出 HistoricalDetailPanel、TeachingInteraction、EquivalentExperience；三个组件直接采用 C0 的对应 Props。C1 `loadExperienceModules` 发现同名出口，无需复制实现。B 不持有 App 路由、全局时钟或正式完成存储；C1 独立核验响应及解释确认。

开发环境 `npm run dev`：`http://127.0.0.1:5173/src/features/history/review/index.html`。Edge 实测结果：

- 六主题分别可打开候选正文，事件选择含全部 12 项。
- 飞夺泸定桥 ld-s1—s5 完整可读。ld-01 必须打开、确认两份材料；只读段落不能跳过材料。
- ld-02 使用上移/下移进行三片段排序，提交后未确认解释仍不能继续；确认解释后进入第五段。
- 五段阅读及两项解释齐全后，必须主动点击“完成本次本地审阅”；出现 5/5、2/2 和“未写入展馆完成记录”提示。
- 刷新后恢复 0/5、0/2。既有 review 测试也监测 Storage.setItem 未被调用。本地审阅不作为正式通关或史实批准。
- 五组照片与艺术图按同人 ID 配对；周、刘两组分别出现两条“使用范围仍需核定”；黄开湘无图，仅文字。
- 正式构建 `http://127.0.0.1:4173/` 实测首页→确认→主动进入；真实 v1 场景 ready。历史专题、阶段、态势及关联人物地点均安全为空，阶段播放按钮禁用。没有开放候选正文。

新增两项接口测试直接使用 B 公共出口和 C1 App，不用工程教学替身：第一项核对动态发现；第二项用隔离的内存工程样本完成首次介绍→等价五段→ld-01 实际材料操作→ld-02 排序→解释确认→主动完成→真实 B 正文。终点及两项互动完成前，记录始终为 0；主动完成后才保存一条 equivalent 记录。完成存储是测试专用内存 Map，不写正式 localStorage；没有载入或提升 B 草稿。

**重播缺口：** 在缺失 A Renderer 的情况下，正文“重播体验”调用默认 3D 模式并进入“暂未开放”，而不是重新提供等价入口。测试保留该拒绝边界与原完成记录，将“等价重播可用”列为未通过，未通过降低断言或伪造 Renderer 来掩盖问题。C3 下一批应明确保持上次模式或重新选择模式的行为，再实现回归测试。

## A PR #12 的边界与浏览器结果

A 场景和地形以外，仅多出两处与 #13 相同的 App 测试格式差异；#13 合入 main 后该差异应消失。未修改依赖、公共 contracts、C2 时钟或 B 数据。无未解决合并冲突。

最新公共出口仍只有 v1 LongMarchScene，另新增 createRegionalRenderer 及其类型。**没有 LongMarchSceneV2，也没有 ImmersiveExperienceRenderer。** 区域 renderer 的 UnitSpec 路径与 0..1 progress 是独立工程接口，不能直接当作 C0 v2 适配器。

现代 DEM 记录范围 101.96–102.40 E、29.72–30.12 N，z11 的 9 张 Terrarium 瓦片，321×321 网格，米单位、范围 1209—5960 m，EPSG:3857，垂直放大 2 倍。脚本进行现代地形双线性采样及米整数取整；这些处理不用于历史路线。渲染横纵采用同一投影，垂直比例另有明确放大，不能称为实测历史地形。未给出逐瓦片底层来源归属和定量高程误差，不能把网格密度/米整数当作精度认证。

已对照 [AWS 数据登记](https://registry.opendata.aws/terrain-tiles/)、[Tilezen 格式](https://github.com/tilezen/joerd/blob/master/docs/formats.md)、[归属说明](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) 和 [OSM 使用条件](https://www.openstreetmap.org/copyright)。Terrarium 公式、投影及 USGS 来源归属与记录相符；来源数据并非统一 MIT。水系为 ODbL 下的 6 条 way、546 个原始点，仅覆盖狭长查询区，非全域水文；河宽、植被、雪线及白模均属艺术/示意。保留 URL、哈希及下载日期。本轮未取得原始 9 PNG/4 XML 缓存，未重复下载或宣称独立重建哈希通过；重建结果是 A 原交付记录，正式使用条件与地图适用要求仍需人员核查。

Edge 从隔离组合工作树 `http://127.0.0.1:5174/src/features/scene/sandbox/index.html` 实测：

- 区域地形、河流及两支示意队伍可见；桌面 1440×900 DOM 视口下明确显示“演示进度 · 非历史日期与路线”。
- 俯瞰、全览、近观及缩放可操作；近景状态为“近景白模”，全览为“远景标识”。键盘方向键、Shift+方向键用于旋转和平移，手动操作后跟随状态取消。
- 50%→100%→50% 可前进与回退，稳定后的进度为 500。路径位置可重复性由原 motion 测试验证；本轮没有从 GPU 提取两队世界坐标来额外宣称像素/坐标完全一致。
- 播放后进度从 50 到 55，按钮变为暂停；可主动暂停。
- 地图桥谷标签→观察卡→真实桥谷艺术场景可进入；返回后时间仍为 500、iframe src=about:blank、区域 canvas=1。该场景是既有艺术工程，不是泸定桥历史体验。
- dispose 静态审查包含 RAF、监听、ResizeObserver、controls、composer、geometry/material/shadow/renderer 的释放。长期 GPU 泄漏未专项验证，不能用 canvas 数量代替内存审计。

A 页捕获一条异步消息通道错误（`A listener indicated an asynchronous response...message channel closed`），当前尚未定位来源；未观察到对应场景失败。正式预览页错误日志为空。不把该消息未经定位地认定为 A 渲染错误或已排除的问题。

演示编排在 dev main.ts，具备 DEV 检查，未从正式 App 导入；显式示意路径只供开发入口使用。renderer 中保留演示进度播放能力，未来 v2 适配必须禁用独立宏观播放，由 C2 phaseId 驱动。不能把 demo 两队套上红军/国民党军历史身份，也不能把 samplePath 用于补全历史几何。

## C3 接线基线、任务与验收计划

本轮已验证的真实连接是 **C1 ↔ B Details/Teaching/Equivalent** 的隔离工程链路。A 区域沙盘单独运行；未把它接成正式 v2 地图，也没有生产用假的 ready/terminal 回调。C0 门禁与六体验 ID、C1 完成版本与显式完成、C2 阶段选择及空间筛选保持原样。

| 下一项 / 负责人     | 明确输入与交付                                                                                                     | 验收门槛                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 基线 / C 与用户     | 审核 #13，获准后合并并复查最新 main CI；再从最新 main 建 `feat/c3-desktop-integration`                             | 每次以真实 main SHA 运行全套检查，不能复用 PR 结果                                         |
| 地图 / A            | 从 scene/index.ts 导出契约 LongMarchSceneV2；接 dataset/phaseId/selection/cameraBookmark，回传对象选择与书签       | 用 C2 scene-phase-view 与 force-state 输入；撤回/无坐标/hidden 清空图层；宏观阶段只来自 C2 |
| 沉浸 / A            | 导出 ImmersiveExperienceRenderer，接受 manifest/segments/assets/command，按 runId 上报真实生命周期与段落/互动/终点 | ready/终点不得自动伪造；暂停、退出、资源释放、迟到回调、异常和重试有组合验证               |
| 候选 / B 与两位真人 | 解决 ld-s5 不一致、素材权利和史实/空间证据；按原发布流程独立复核                                                   | 不更改旧结论，不由 AI 签名；逐项通过后才允许 published                                     |
| 构建隔离 / C 协调 B | 生产包不携带未开放候选正文、unknown 图片及其衍生图；开发审阅仍可用                                                 | 检查实际 JS 与静态文件，测试禁止绕过发布门禁；不删除审计来源                               |
| 调度 / C            | 等价完成后可重播、退出回沙盘、恢复同一 topic/phase 和合法书签                                                      | 内存样本验证完整主动操作；保持原完成记录、版本与撤回规则                                   |
| 真实组合 / A/B/C    | 正式渲染器到齐后，在隔离工作台接线泸定桥                                                                           | 先工程样本，再经人工发布的资料；每个代码 PR 运行全套检查及桌面浏览器流程                   |

首条目标链路逐段状态：首页→主动进入已实测；专题→事件→首次介绍已在隔离 App 测试；ld-01→ld-02→五段阅读→主动完成→正文已通过真实 B 等价组件；返回沙盘可用；等价重播缺少模式选择，未通过；A 真实沉浸终点及地图上下文联动仍未接线。不能把图文终点当作 3D 终点完成证据。

下一批测试还须覆盖：C2 阶段前后与专题切换、hidden/unknown/retracted 空间清层；C1 退出与重入、runId 迟到回调、重复终点不重复保存；A 真实 ready/error/terminal、相机切换与书签恢复；素材撤回及缺依赖闭合过滤；正式产物候选与开发入口隔离。桌面优先，不重复原生后台隐藏专项，不开展手机端精修或应用封装。

## 证据与复现

截图及观察记录位于 [evidence/phase-c3](evidence/phase-c3/)。截图来自实际浏览器，不用于证明真人审核或图片身份；manifest 记录文件哈希与实际像素尺寸，DOM 视口与截图像素可能不同。

- [B 五段主动完成](evidence/phase-c3/b-luding-complete.jpg)
- [B 周恩来素材待核](evidence/phase-c3/b-zhou-rights-pending.jpg)
- [A 桌面沙盘](evidence/phase-c3/a-desktop-sandbox.jpg)、[近景白模](evidence/phase-c3/a-near.jpg)、[局部场景](evidence/phase-c3/a-local-scene.jpg)
- [正式页面发布门禁](evidence/phase-c3/production-release-gate.jpg)
- [浏览器观察](evidence/phase-c3/browser-observations.json)、[证据索引](evidence/phase-c3/manifest.json)

本轮本机服务用于审阅，结束后停止；复现时分别在审核分支/独立工作树执行 npm run dev，使用终端实际端口。正式预览先 build 再 preview。未设置远程部署，未创建正式 C3 分支，未自动合并 #12/#13。
