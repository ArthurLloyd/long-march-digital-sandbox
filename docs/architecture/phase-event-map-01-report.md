# C-EVENT-MAP-01 事件概略位置接入报告

日期：2026-11-03。分支 `feat/event-map-anchors`。正常生产预览：`http://127.0.0.1:4188/`，仅监听本机。

## 基线与范围

远端 main 基线为 `10e9ce7240816f51840902e4cba4936666d02a81`。为保留尚在 Draft PR #23 的连续地形、鼠标位置缩放和收纳侧栏，本轮从已验收的 `09a5d8088216c905fa711c4f90864a339be6ab2c` 新建独立 worktree。没有整包合并旧分支，没有修改原工作区、main 或成员 A/B 的未提交工作。

工程实现冻结于 `2fc680c942fb4b24a4143d4a037fe5caead795e2`。随后报告/证据提交的最终 head 以 PR 台账记录为准。本轮不合并、不公开部署，也不推进新的行军路线或下一阶段大规模集成。

## 本轮结果

当前 B 数据实际含 **12 个事件**、6 个专题、9 个阶段、23 条来源、0 条历史路线。12 个事件都已获得可加载的独立展陈位置：**15 个标记实例、13 个地点节点、7 个浏览分组**。其中11个点实例、3个区域实例、1个区域级参考；没有新增 exact 位置。

B 原始 `dataset.json` 字节保持不变，SHA-256：`2c45a680a291f0cee795c4388a448de0bd09dbef655a19748b4d05d40f48eb4b`。事件的原坐标仍为 null、精度仍为 unknown；正文、日期、来源和审核记录未改写。地图中的可用展陈资源不等于 published/reviewed 历史记录，也没有 Codex 生成的真人签名。

## 全部事件覆盖

| eventId             | B 原始标题           | B 日期原文                        | 展陈地点／区域                                                 | 实例数 | 表达             | 历史关系来源                              |
| ------------------- | -------------------- | --------------------------------- | -------------------------------------------------------------- | -----: | ---------------- | ----------------------------------------- |
| event-zy            | 遵义会议             | 1935年1月15—17日                  | 遵义会议会址附近                                               |      1 | point            | src-zy-site、src-zy-chronicle             |
| event-sd            | 四渡赤水             | 1935年1—3月                       | 四渡赤水相关地区                                               |      1 | area             | src-sd-deployment、src-sd-four            |
| event-sd-1          | 一渡赤水             | 1935年1月29日起（本卡仅登记起日） | 土城附近；猿猴场（今元厚）附近                                 |      2 | point            | src-sd-deployment                         |
| event-sd-2          | 二渡赤水             | 1935年2月18—21日                  | 太平渡相关地区（今太平镇参考）；二郎滩相关地区（今二郎镇参考） |      2 | point            | src-sd-deployment                         |
| event-sd-3          | 三渡赤水             | 1935年3月16—17日                  | 茅台附近                                                       |      1 | point            | src-sd-four                               |
| event-sd-4          | 四渡赤水             | 1935年3月21—22日                  | 太平渡相关地区（今太平镇参考）；二郎滩相关地区（今二郎镇参考） |      2 | point            | src-sd-four                               |
| event-js            | 巧渡金沙江           | 1935年5月3—9日（主力渡江范围）    | 皎平渡相关江段                                                 |      1 | point            | src-js-passage                            |
| event-ld            | 飞夺泸定桥           | 1935年5月29日                     | 泸定桥附近                                                     |      1 | point            | src-ld-study、src-ld-review               |
| event-sn            | 翻越雪山             | 1935年6月（夹金山相关批次）       | 夹金山及达维相关区域                                           |      1 | area             | src-sn-study、src-sn-daily                |
| event-gr            | 穿越草地             | 1935年8月（右路军本次北上范围）   | 毛儿盖—松潘草地—班佑／巴西相关区域                             |      1 | area             | src-gr-archive、src-gr-plans              |
| event-anshunchang   | 安顺场渡河           | 1935年5月25日                     | 安顺场附近                                                     |      1 | point            | src-ld-review                             |
| event-zy-resolution | 遵义会议相关决议通过 | 1935年2月8日                      | 云南扎西相关区域                                               |      1 | region_reference | src-zy-resolution-date、src-zy-resolution |

完整机器可读结果：[事件覆盖表](event-map-01/event-coverage.json)、[地点节点清单](event-map-01/location-nodes.json)。它们包含实际 topicIds/phaseIds、placementIds、regionIds、来源、定位进度和缺口，不为补充事件虚构专题/阶段关系。执行 `npx tsx scripts/export-event-map.ts` 可从当前有效数据重新生成；事件总数不写死。

## 定位依据与精度

[位置资源](../../src/app/history/event-map/data/event-placements.json)与[定位来源登记](../../src/app/history/event-map/data/location-references.json)独立于 B 数据。每个实例记录稳定 placementId、eventId、locationNodeId、区域归属、点/区域类别、锚点、范围、精度、角色、历史来源、现代来源、理由、局限、可用性及版本。

15份现代位置参考来自 Wikimedia GeoData 的版本化页面地理标签和 Wikidata 原始 P625 声明；另有5条地名关系/坐标格式参考。原始经纬度与页面/实体版本保存在来源登记中，按 WGS84 `[longitude, latitude]` 使用；点锚四舍五入到0.001度，不转换 GCJ-02/BD-09，不使用搜索摘要中的无来源坐标。未复制百科正文、网页图片或新增地图/字体素材；来源资源保留相应许可和访问日期。

- 遵义会议：采用会址条目的现代参考附近概略点，不声明会议室的测绘位置。
- 决议通过：B 本文自身写的是云南扎西相关范围。另核对[昭通市政协的扎西资料](https://www.ztszx.gov.cn/news/wszl/detail/6388.html)，使用扎西区域参考，未吸附到遵义会址或旧技术取景框。
- 四渡：分别保留总体区域、一渡土城/猿猴场（今元厚）、二渡太平渡/二郎滩、三渡茅台、第四次渡河太平渡/二郎滩。[国家林草局条目](https://www.forestry.gov.cn/c/www/dszl/657296.jhtml)支持这些地名与阶段关系。现代镇驻地只是附近参照，未冒充历史渡口。B 的中国军网原链接本轮仍访问超时，未声称重新取得全文；这一限制保留。
- 金沙江：采用[Wikidata 皎平渡口实体的地理声明](https://www.wikidata.org/wiki/Q67934428)，没有使用约18公里外同名镇驻地来冒充渡口。[昭通市政协地名资料](https://www.ztszx.gov.cn/news/wszl/detail/6420.html)用于两岸关系核对。现代遗址、桥梁、库区与1935年岸线不等同。
- 大渡河：安顺场现代镇参考与泸定桥参考独立落点，未把南侧位置吸附到原大渡河取景框边缘。
- 雪山：B 本文限定夹金山及达维相关批次；结合[雅安市人大资料中的南北地名关系](https://www.yasrdw.gov.cn/html/2024/yardw_07_0422/6610.html)，用硗碛—达维现代地名包络加取景留白表达，不选择网络上同名但不同范围的山峰点。
- 草地：以 B 本文涉及的毛儿盖、班佑、巴西现代地名构造宽泛展示包络。[B 登记的档案馆资料](https://www.yantian.gov.cn/ytdayszxxw/lsjt/content/post_11735370.html)支持过程范围；矩形不是穿越路径、草地边界或全部部队范围。

包络范围和中心仅用于标签/取景；范围加留白是展陈设计，不是测绘边界。区域中心不得成为路线端点。13个地点节点中，3个遗址附近点仅标为待复核的候选端点，6个现代镇参考与4个区域锚点不能直接作为历史路线端点；全部仍列有需要补充的定位与路线证据。

## 加载、展示和 strict 隔离

数据链路为：B 原始数据 → 已有完整展出目录 → `loadExhibitionEventMap(dataset,audience)` → C 管理的全局附加模型 → 原 PanoramaMapAdapter 的 setMarkers/DOM投影 → 地点预览 → 既有正文宿主。

正文资格、位置资格与 C2 当前阶段分别处理。App 传入完整附加模型，不把所有事件塞进当前阶段数组；原 `selectScenePhaseView`、部队过滤和 strict 审核规则保留。显式 strict 消费者不接收展陈位置；新增锚点不写回 HistoryEvent/Place，也不传给 A 作为历史事实。

原发布依赖图过滤后仍合法的历史坐标优先，避免重复叠加。展陈资源、地点、来源可撤回；明确拒绝或列入 withdrawnEventIds 的事件不能由地图打开。结构/关联失效时清空附加标记与附加阅读引用，显示错误说明；不从失败资源重开旧事件。既有历史专题正文入口独立保留。

Zod及关联校验已接入 `npm run validate:data`：重复实例/节点/来源、悬空事件和节点、无效范围/坐标系、丢失来源、点与节点不一致、区域伪装精确点及区域中心冒充端点均被拒绝。

## 地图与阅读行为

沿用同一个 Canvas、相机、地形 heightAt、RAF 和 C2 时钟。远景显示区域聚合，近景展开具体事件；地图外及相机后方隐藏。重叠仅调整屏幕标签并增加引导线，不改地理锚点；所有事件仍可从左上“事件地图”目录选择。二渡和四渡在太平、二郎各共享一个地点节点，但 placementId 分离，打开各自原事件。

区域采用轻量闭合虚线轮廓，不连接事件，不增加行军几何。标记与范围在地形细化/高度改变后用当前实际地表高度重贴。点击保存实例和事件选择，复用原平滑取景；适配器的请求版本使旧加载/飞行失效，鼠标按下捕获指针并暂时固定标签，避免移动中点击穿透。

预览显示 B 原标题/日期/摘要、地点、点或区域精度、可折叠的定位依据和局限；“阅读事件”调用已有 C1/B 正文入口。无需先完成互动，不强制艺术视频，不产生完成记录。阅读前保存书签并暂停宏观播放；关闭后回到保存机位和选择，不自动重播。

短桌面下修正了透明工具栏容器拦截点击的问题：空白区域允许点击穿过，可见按钮仍可用；预览期间临时收起会遮挡左侧内容的原专题按钮，阅读按钮保持可见。打开事件目录时收起预览的视觉层，避免同位置面板互相挡住。

## 实际工程检查

npm ci、lint、typecheck、format:check、test、validate:data、build、git diff --check均实际成功。最终本地为 **50 个文件、393 项测试通过**，既有有效测试和断言保留。新增覆盖结构/引用/坐标系、全事件覆盖、strict隔离、历史坐标优先、明确撤回与失效关闭、多实例、跨阶段保留、真实宿主正文、指针按压投影更新、异步末次取景、贴地范围与资源清理。

没有改依赖和 lockfile。保留既有构建大chunk与Vite配置兼容性提示，未为消除提示扩大重构。构建隔离测试继续检查 fixtures/工作台边界。A/B源目录、原地形数据、素材及历史 JSON 没有变化。

## 浏览器验收与证据

Edge156 / Windows桌面，生产构建4188。1920×1080、1440×900、1366×768从正常首页进入。只读 `?terrainMetrics=1` 采集真实相机及Canvas身份，没有注入内部状态、修改存储、伪造ready或完成回调。原生后台隐藏专项按已有决定未重试。

本轮已实际完成：全局多专题分布、赤水总体与四次渡河、多地点和同地点选择、安顺场与泸定桥分离、遵义预览、正文直接阅读及返回。真实C2专题从遵义切到二渡赤水后，全局七组/十二事件仍保留；播放中选择地图事件会暂停原时钟。

稳定机位下正文返回记录的主Canvas backend id为 **11407→11407**，相机position和target逐项相同。验证路径：[实测JSON](event-map-01/evidence/final-read-return.json)。这一记录只证明实际操作路径，不扩展声称所有机位或移动端均已验收。

最终截图逐张检查后归档，旧的机位过渡截图、错名截图及一次视口接口缩放留黑录制均未作为交付证据。最终采用浏览器正式 viewport 接口重新拍摄。

| 证据                                                                   | 尺寸 / 内容                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------- |
| [全局大尺寸](event-map-01/evidence/final-global-1920.jpg)              | 1920×1080，七个全局浏览分组                         |
| [全局中尺寸](event-map-01/evidence/final-global-1440.jpg)              | 1440×900                                            |
| [全局短桌面](event-map-01/evidence/final-global-1366.jpg)              | 1366×768                                            |
| [四渡赤水](event-map-01/evidence/final-chishui-1366.jpg)               | 总体区域与四次渡河、多位置                          |
| [大渡河两地](event-map-01/evidence/final-dadu-1440.jpg)                | 安顺场与泸定桥分离；区域取景后滚轮缩小              |
| [雪山区域预览](event-map-01/evidence/final-snow-preview-1920.jpg)      | 区域中心仅用于取景                                  |
| [展开定位依据](event-map-01/evidence/final-location-evidence-1920.jpg) | 现代资料与历史关系分列                              |
| [事件预览](event-map-01/evidence/final-preview-1366.jpg)               | 二渡赤水与关联位置                                  |
| [真实正文](event-map-01/evidence/final-reading-1366.jpg)               | 既有 B 正文宿主                                     |
| [返回地图](event-map-01/evidence/final-returned-1366.jpg)              | 保留同一事件选择                                    |
| [阶段切换](event-map-01/evidence/final-phase-switch-1440.jpg)          | 先前 93f1ac7 构建的真实 C2 切换；其后只简化聚合边框 |

[12秒实际录屏](event-map-01/evidence/event-map-walkthrough.mp4)：总览 → 赤水区域 → 二渡位置 → 原正文 → 返回。270张实际视口帧按采样时间编码成1280×720 / 30fps；无页面内部状态注入或光流补帧。录屏包含自然的地形细化过程。稳定机位的精确返回另由JSON核对，不将转场中地形继续细化说成所有时刻的逐像素冻结。

[阶段与暂停实测](event-map-01/evidence/phase-reading-1440.json)、[旋转缩放实测](event-map-01/evidence/navigation-check.json)、[文件来源与哈希清单](event-map-01/evidence/capture-manifest.json)。

## 后续路线资料与限制

地图提供的是事件分布和有依据的现代参照，不是完整历史行军图。仍缺具体单位、适用时段、旧地名映射、历史地图/原始图件、渡口/岸线变迁、误差与独立真人复核；节点之间没有可靠中间路径。不得按日期连线、推算速度、采用最短路或用现代道路/平滑补全当历史路线。A的艺术空间及已有行进示意保留，不升级为已审核的部队态势。

当前未定位清单为0个事件；这不是说位置已精确核实。B新增事件会重新进入覆盖结果，缺乏依据的事件保留未定位阅读入口。正式地图使用要求与内容发布审核仍由人员另行复核，本工程不作合规认证。

既有 DESIGN.md 与设计sidecar的漂移未作为本轮扩大修改的理由；沿用墨蓝/朱红/金线与原字体，无新设计系统或栅格素材。

## 修改文件

- `.github/workflows/ci.yml`
- `docs/architecture/event-map-01/event-coverage.json`
- `docs/architecture/event-map-01/location-nodes.json`
- `scripts/export-event-map.ts`
- `scripts/validate-data.ts`
- `src/app/App.tsx`
- `src/app/history/event-map/README.md`
- `src/app/history/event-map/data/event-placements.json`
- `src/app/history/event-map/data/location-references.json`
- `src/app/history/event-map/event-map-loader.ts`
- `src/app/history/event-map/event-map-schema.ts`
- `src/app/history/event-map/event-map-selectors.ts`
- `src/app/landscape/EventMapLayer.tsx`
- `src/app/landscape/ExhibitionPanorama.tsx`
- `src/app/landscape/event-marker-layout.ts`
- `src/app/landscape/map-renderer.ts`
- `src/styles/event-map.css`
- `src/tests/event-map-data.test.ts`
- `src/tests/exhibition-panorama.test.tsx`
- `src/tests/full-exhibition.test.tsx`
- `src/tests/terrain-map-input.test.ts`

另更新 `src/app/landscape/README.md`、`docs/architecture/full-content-exhibition.md`，归档本报告、`event-map-01/finish-review.md`与实际截图/录屏；不包含原始逐帧目录。

## PR 与 CI

[Draft PR #24](https://github.com/ArthurLloyd/long-march-digital-sandbox/pull/24) 已创建，目标为 `feat/terrain-closeup-refinement`，依赖尚未合并的 #23。该 base 仍为 `09a5d8088216c905fa711c4f90864a339be6ab2c`，避免把旧地形整包伪装成本轮差异。两个 PR 均不自动合并。

已核实工程 head `93f1ac75b9cfed580bd513e64ca896613b32bbb8` 的 [GitHub CI #63](https://github.com/ArthurLloyd/long-march-digital-sandbox/actions/runs/41585387730) 为 completed / success。随后仅简化聚合边框为细线，得到最终工程提交 `2fc680c942fb4b24a4143d4a037fe5caead795e2`；该版本本地完整检查重新通过，50文件 / 393项。沙箱复测曾因禁止连接自己的127.0.0.1临时端口而出现EACCES，主机环境重跑全部测试通过，没有修改断言或绕过隔离测试。

本报告与证据的最后提交 SHA、对应最新 CI run 的实际地址/结论记录在 PR #24 描述的“最终交付台账”，与工程版本分开记录，避免文档自引用提交SHA。最终对外交付前核对 PR 的当前 head CI；不以 #63 代替最终 head 的结果。main 经本轮结束前 fetch 核对仍为 `10e9ce7240816f51840902e4cba4936666d02a81`。

## 视觉与文档复核方式

独立复核代理启动后因账户额度限制未能运行，未产生独立通过结论。本轮改由主执行者按降级清单复核实际截图、交互证据与既有设计系统，范围和结论见[收尾复核](event-map-01/finish-review.md)。不修改既有 DESIGN.md、PRODUCT.md 或设计sidecar；原有设计记录漂移仅报告。
