# 山河行迹 · A0 区域沙盘

本轮把区域地图、立体地形、时间轴和小军队组合成一个可操作的 A0 交互演示。仍在现有 GitHub / Vite / Three.js 工程中开发，不另建 Sites 项目。

运行 `npm ci && npm run dev`，打开终端 Local 地址下的：

`/src/features/scene/sandbox/index.html`

该入口仅供开发演示，不由正式 App 导入、不包含在正式 Vite 入口中。原有 LongMarchScene v1 保留。本轮新增可复用的 `createRegionalRenderer`，从 scene/index.ts 导出；这不等于已完成 LongMarchSceneV2 的公共契约适配，也不等于已替换正式首页。

## 已实现的操作

- 大渡河谷现代高程地形、局部 OSM 水系、分层地形着色、雪线、植被、光照和截面底座。
- 拖动旋转、右键或双指平移、滚轮与按钮缩放、全览／俯瞰／队伍近景。罗盘随镜头方向变化；窄屏全览自动调整取景。
- 底部连续时间轴、五个观察节点、前进和回拖、播放／暂停／重置、0.5×／1×／2×。
- 两支**无历史身份的工程示意队伍**；近景白模和旗帜、远景点与箭头；切换有迟滞，人物脚底采样地形。编队不代表真实兵力。
- 跟随队伍、手动操作解除跟随、路线和等高层次开关、轻量画质、键盘操作。
- 地图的“桥谷漫游”标签 → 观察卡 → 已有《渡 · 山河之间》局部场景。退出保留进度和镜头，并卸载 iframe；进入局部时暂停底层 GPU 绘制。桥谷是已有艺术工程场景，不能当作泸定桥实景复原。

地图显示“交互演示”和示意编队说明，桌面时间轴另显示“非历史日期与路线”；资料面板解释现代地理与艺术表现的边界。未知史料没有被填成正式内容。

## 教程核对与工具分工

已检查用户提供的 [Bilibili 教程 BV16gp96yE67](https://www.bilibili.com/video/BV16gp96yE67/) 中多个关键画面：

| 视频附近时间 | 可见内容                      | 本工程对应方式                                       |
| ------------ | ----------------------------- | ---------------------------------------------------- |
| 00:41        | MiniMax Design 首页与创作输入 | 用于识别用户指定的实际工具；不是仅凭名字猜测视频 API |
| 01:13        | 生成的三维交互初稿            | 先把可操作区域地图跑通                               |
| 01:44        | 生成场景图片的界面            | 后续准备可环顾的沉浸素材，不等于已经生成视频         |
| 02:19        | 地图和进入全景的入口          | 地图节点 → 局部场景 → 返回地图                       |
| 02:46        | 雪山场景中的全景体验          | 计划供 2–3 个重点节点使用，待 B 的剧本与素材审核     |

[MiniMax Design 官网](https://design.minimax.cn/) 提供桌面客户端。本轮实际使用用户安装的 4.0.6 客户端、Design Image 2.5 Pro，生成河谷、雪山、草地三套环境和三套修订候选。原生图为 3840×1920，接入同一 Vite / Three.js 沙盘的“走进山河”目录。可环顾、缩放、切换和返回，首次不自动旋转；返回保留地图进度与镜头。本次没有生成视频。

**素材为交互预览，无缝验收未通过。** 背面衔接需要精修；MiniMax 下一次编辑需要 410 积分、当时剩余 277，已停止该生成，未充值。原图、修订版和接缝居中待修图均保留。状态与来源见 [沉浸素材说明](../../../../public/assets/textures/immersive-landscapes/README.md)。上表记录教程结构，其中的后续环境预览现已实现；正式历史节点仍需内容审核。

此前已保存 [20 项一手设计参考](../design-references.md) 和 [第二轮视觉研究](../VISUAL_REDESIGN_RESEARCH.md)。本轮延续克制的青绿、米白、暖金，突出山体轮廓、纵深、地理主体和简短动作文案，不复制第三方模型或图片。

## 与 B、C 的接线边界

1. **现在无需等 B 才能开发这些交互。** 演示编排仅存在 main.ts，未写入正式 dataset.json、fixtures 或公共历史时钟。
2. 提交前核对到 main 的 `cbbc916` 已合入 B 的六专题候选：12 事件、30 段脚本、12 互动，均 draft / unpublished。B 的空间交接仍为 0 路线、8 地点坐标 null、9 部队快照 hidden。已有候选脚本可进入后续制作审阅，不应继续表述为“B 什么都没给”；正式时间节点、空间几何与素材仍需复核。不能把本演示坐标或路径搬进正式史实数据。
3. C 继续拥有主页面与全局时间轴。区域渲染器接受显式 units/nodes 和外部 setProgress，不反向导入 app，也不持久化历史完成状态。
4. 后续正式 v2 适配必须遵守 displayMode 和输入阶段投影；无几何不绘制、独立点不连成路线。`samplePath` 只用于本次显式工程路径，不授权补全真实行军。
5. 用户本轮重点是 A0 与 MiniMax 素材。三套环境预览已接入；正式剧情互动、AI 视频、完整历史核验及 LongMarchSceneV2 / ImmersiveExperienceRenderer 接线仍未交付。其他原计划任务并未取消。

## 渲染器接口

`createRegionalRenderer(host, labels, options)` 接受现代 Heightfield / RiverData、明确的 UnitSpec 路径和 SandboxNode，以及 onNode / onFrame / onError 回调。返回 setProgress、play、setSpeed、overview、top、focusUnit、zoom、setFollow、setContours、setRoutes、setQuality、setSuspended、getState、dispose。

传入路径在场景坐标内，绝不由事件点自动合成。setProgress 是 0..1 的演示进度；帧更新按给定路径重新求位置，因此来回拖动不累计误差。dispose 停止 RAF、移除事件和 ResizeObserver、释放 composer passes、几何／材质、实例缓冲、阴影和 renderer。

真实浏览器检查见 [ACCEPTANCE.md](./ACCEPTANCE.md)；现代高程、水系的处理和许可见 [素材说明](../../../../public/assets/terrain/dadu-valley/README.md)。

## 最新集成

已合并 main 的 `cbbc916`，保留 B 候选包与 C 的空状态修订。另对 `src/tests/App.test.tsx` 两个既有断言执行 Prettier 格式修复，修前修后 TypeScript 语法结构一致，无语义变化；此唯一跨 A 目录改动修复 PR 继承的 CI 格式失败，供 C 审阅。组合回归为 28 文件、262 项测试通过。
