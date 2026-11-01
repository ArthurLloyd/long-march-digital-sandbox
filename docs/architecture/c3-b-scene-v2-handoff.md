# C3-B：交给 A 的正式场景接口清单

审核版本：PR #12 `fa040fb9983450bec2eb066fb98c783be9bc41f2`。此前 `c2ec768` 的艺术全景也已审阅；后续新提交需重新确认。没有自动联系成员、修改 A 专属代码或合并 #12。

现有 LongMarchScene v1、createRegionalRenderer、艺术全景、峡谷行军和 GLB 包是可用的工程成果，但 scene/index.ts 仍没有以下两个公共出口。

## LongMarchSceneV2

直接使用 shared/contracts 的 LongMarchSceneV2Props，沿用 v1 的 onSceneReady/onSceneError。接受 C 的 dataset、phaseId、selection、cameraBookmark，回传 onObjectSelect 和 onCameraBookmark。

- dataset 是 C2 `selectScenePhaseView` 的当前阶段空间投影，不是完整史料库，也不能重新当作正式 JSON 校验或写回。
- phaseId 是宏观阶段的唯一权威输入。开发示例的 0..1 进度和 play 只能用于内部演示或渲染效果，正式适配不能启动另一套宏观时钟。
- 无发布坐标、routes=[]、hidden 快照必须不绘制历史单位位置或路线；阶段切换、撤回及未知数据要清理旧图层。
- 独立点不能插值连接。现代 DEM、OSM 河流、18 人白模及显式演示路径不能成为历史空间证据。
- 书签使用 scene-local 坐标，与场景 ID、phaseId 一起验证，禁止将 THREE/DOM 对象传回 C。

## ImmersiveExperienceRenderer

使用 ImmersiveExperienceProps 与 ImmersiveRendererCallbacks，从 scene/index.ts 导出。接受 manifest、segments、assets、command、cameraBookmark。

- command 的 runId、segmentId、playback、muted、quality、reducedMotion 是 C 的指令；不得另存一份完成记录。
- 真实可操作后发 onReady；按实际推进发 onSegmentReached；互动段发 onInteractionCue 并服从 C 的暂停/继续。
- 脚本实际到达终点后发 onTerminalReached。终点不等于完成，最终判定仍由 C1 对互动、解释、runId、规则版本及主动完成请求综合处理。
- onReady/onError/onSegmentReached/onInteractionCue/onTerminalReached/onExitRequested/onCameraBookmark 必须带匹配的 experienceId、scriptVersion、runId，段落/互动另带各自 ID。
- 静音、字幕、减少动态、错误恢复、退出与资源释放都要可验证。不得用定时器直接生成通关证据。

先接飞夺泸定桥 ld-s1—s5、ld-01/02；正文和互动定义由 B 提供，C1 持有响应、解释和完成状态。可以继续在隔离候选工作台联调，不要求 B 先完成全部真人审核；正式发布仍按原流程。

## 素材与独立展示包

三个 MiniMax 艺术全景的仓库字节哈希与清单一致；无缝验收仍未通过。新白模 GLB 的哈希一致，18 人及服装是艺术示意。现代地形、水系、AI 艺术图、程序模型应分别记录来源、分类、使用依据和适用边界。

正式 C3 构建不会自动复制上述开发素材。将来要公开使用，需通过来源、素材权利和发布资产白名单的明确流程；不通过改名或移动文件规避检查。

`sandbox/tools/build-showcase.mjs` 使用 configFile:false 并复制整个 public，不执行 C 的发布过滤及资源检查。该独立本地展示包不能视作本项目的安全生产 dist；本轮未运行、修改或部署它。若 A 继续提供展示包，应在独立 PR 中明确仅供本地审阅，并避免混入 B 未核清资料。本轮保留全部原始文件与审计记录。
