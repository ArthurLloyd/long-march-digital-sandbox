# Phase 2.5–2.7 浏览器与视觉验收

## 2026-11-01 用户复核更新

后续协作决定：用户明确授权将 PR #3 合入 main，作为 A/B 的共同应用壳基线。下方各轮 Draft 表述保留为当时状态；尚未完成的专项验收继续在后续模块集成中跟踪。合并状态以 GitHub PR 为准。

用户在本轮界面代码 `0d600f4` 推送后明确表示“我复核过了”，并要求更新 GitHub 仓库。现记录为**本轮界面用户复核完成**，进入接收 A/B 分批交付的集成准备阶段。该代码提交的 GitHub CI 已通过（run `41226446585`）。

本次确认没有附具体设备、视口、截图或逐项测试结果，不扩展为三种桌面／两种手机专项通过，也不补造最终行书整页截图。下方 Codex 浏览器中断与未采集证据的原记录保留；真机触摸、连续动画、性能、真实 A/B 集成和素材使用条件仍单独跟踪。此处是界面复核记录，不是历史数据双人复核，不修改历史审核结论。

## 2026-11-01 红金控件、主动进入与行书调整

本轮基于 `a544ba4` 开始，修改范围为 C 的应用壳、公共装饰组件、时间轴与测试。没有改变历史数据、A/B 模块、山河背景或首页“长征”手迹图片。

- **进入行为**：删除 650ms 自动完成定时器，减少动态模式也必须停留在确认页，只有激活“立即进入”才进入探索。确认页支持 Tab 约束、返回首页、Esc 取消与入口焦点恢复；防止长按 Enter 重复触发。
- **主题控件**：入口采用朱红漆面、阶形金边与回纹角饰；箭头重新绘制。历史专题／事件资料采用统一红金角饰、山形／卷册纹样；底栏采用火种中饰、刻度环、双层轨道和当前事件框。空数据播放禁用语义保留。
- **字体修订**：首轮 Ma Shan Zheng 已被用户明确否定并撤下。用户要求保留原文，最终改用 Zhi Mang Xing 开源行书，扩大标题字面并收紧字距；来源、许可与覆盖检查见[字形记录](exploration-calligraphy.md)。没有从历史人物作品中拼造题词。

### 实际证据与限制

[首轮 13 张原始 JPEG 与校验和](evidence/ornament-round1-2026-11-01/inventory.json)覆盖 1920×1080、1440×900、1366×768、390×844 的控件与确认页；它们使用的是后来被否定的字体，**不代表最终行书效果验收通过**。1440 确认页截图采集后约 26.33 秒检查仍为 `entering`，随后主动点击才进入探索。1366 返回截图采在淡入过程，不作为稳定首页证据。

最终行书替换后，浏览器连接操作多次超时、会话被重置；未能重新观察完整页面或采集最终截图。没有使用其他浏览器表面、端口或外部截图方式代替。原主机服务经只读检查仍为 `127.0.0.1:5173`、PID `52484`、HTTP 200，没有重复启动。`evidence/zhimangxing-trial.png` 仅为离线字形试排，不能代替网页、桌面／手机或动画验收。

### 检查结果

- `lint`、`typecheck`、`test`（9 文件 50 项）、`validate:data`（0 事件／0 路线／0 来源）、`build` 通过。自动测试覆盖等待 60 秒不跳转、显式进入、减少动态仍确认、取消与键盘路径。
- React 检查保留稳定的完成回调、一次性初始聚焦、原生按钮、对话框可访问名称及背景 inert，没有增加依赖或改变公共契约。
- [Impeccable 静态检测](evidence/ornament-detector-2026-11-01.json)针对本轮三个新增／重做文件运行一次，33 项均为 advisory：22 项局部色值、11 项局部字号；没有 primary finding。红金细节与行书为本轮用户指定方向；未通过禁用检测来消除告警，`design.json` 未自动重建。
- 字体子集全部用字覆盖，9468 字节，保留 OFL；最终 `format:check` 与 `git diff --check` 结果在提交前复核。
- **专项未完成**：Codex 对最终行书完整页面的三种桌面和两种手机复验、减少动态实际浏览器复验，以及此前保留的真机触摸、连续动画、性能和真实 A/B 集成。用户整体复核已更新至上方记录；PR #3 保持 Draft，不将首轮或旧版图片冒充本轮最终截图。

## 2026-11-01 前一轮已完成的基础布局与交互

Chrome 页面访问已在新聊天恢复。**三个桌面尺寸的静态布局和本轮列出的交互已实测；发现的焦点恢复、转场文档增高、加载面板越界均已修复并复验。** 随后完成两种手机尺寸的窄视口检查及局部修正。没有据此宣布 Phase 2 全部完成，PR #3 继续保持 Draft。

- 仓库开始状态：`feat/app-shell`，`de4f81f`，工作区干净；远程 head 同为 `de4f81f090a957a1ff3fcab0dc93d1d423b765e6`，main 为 `4b2822d28150a72a7b479ce0b5f1c3ffc2ddf1b1`。
- 页面修复提交：`aee3dee`（焦点与转场）、`4b70eb9`（加载反馈边界）、`f7f1974`（手机文字遮罩与底部右侧入口）。后续文档提交不改变画面。
- 浏览器：用户已有的 Chrome localhost 标签页；版本 `156.0.8078.79`，由本机 Chrome 可执行文件的版本信息采集。
- 系统：Microsoft Windows 11 家庭版中文版，`10.0.26300`。
- 原服务已在主机复核：`127.0.0.1:5173`，PID `52484`；没有重复启动服务，也没有切换端口。
- 只观察及操作 `http://127.0.0.1:5173/`。先通过正常 Chrome 工具成功读取页面，之后才使用同标签页的开发能力检查 hover、减少动态和触摸；没有出现新的站点权限拒绝，没有通过别的表面读取被拒页面。
- 实测 CSS 视口：1920×1080、1440×900、1366×768、390×844、430×932。DOM 的 `innerWidth/innerHeight` 与文档尺寸相符；工具覆盖下 DPR 为 1，`visualViewport.scale` 为 1。未读取 Chrome 缩放菜单和 Windows 显示缩放，不能据此报告它们为 100%。
- 证据索引：[截图尺寸与 SHA-256](evidence/screenshot-inventory.json)。共78份原始JPEG：77份目标尺寸画面、1份裁切接口诊断；不是78项验收全部通过。按采集时的页面提交分目录保存，未缩放、拼接或加标注。

### 截图接口和归档限制

本次 `fullPage:false` 首次返回了放大裁切的 1920×933 画面，虽然 DOM 为 1920×1080。该图仅保留为 [接口诊断图](evidence/de4f81f/diagnostic-viewport-api-cropped.jpg)，不算指定尺寸通过。随后使用正常浏览器工具的 `fullPage:true`，并核对文档宽高与原始图片宽高；稳定页面的文档恰好等于目标视口，因此这些完整页面图同时覆盖完整目标视口。没有将超长页面图伪称为目标视口图。

存储辅助函数曾捕获旧目录，部分后续同名图覆盖了首轮图。已依据采集顺序、文件时间和代码检查点重新归档，映射见 [归档更正](evidence/capture-filing.json)。最初1920首页及hover/focus从仍保留的原始字节变量恢复；其余被覆盖的首轮图片没有补造。原 DOM 观测仍保留在 [首轮观测](evidence/de4f81f/observations.json)，其中 `originalScreenshotAvailable: false` 的条目不能当作对应首轮本地图片。转场首次两屏原图在本聊天工具输出中观察到，本地同名图已被复验图覆盖；修复前的2160px文档高度仍有原始 DOM 记录。

### 发现、修复与复验

| ID  | 级别 | 实测发现                                                                                                       | 修复                                                                                                           | 复验依据                                                                                                                                                                                                                                                  |
| --- | ---- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F03 | P1   | 打开抽屉时，原生 `inert` 已让触发按钮失焦；抽屉 effect 读到 BODY，关闭后无法返回原按钮。jsdom 未模拟这个失焦。 | App 在触发事件中保存 opener；抽屉关闭恢复保存的元素，专题切换事件时保留原工具入口。新增失焦回归测试。`aee3dee` | 三种桌面以键盘打开、Esc关闭恢复原按钮；1366事件抽屉用关闭按钮恢复。见 [1920](evidence/aee3dee/phase2-1920-about-restored.jpg)、[1440](evidence/aee3dee/phase2-1440-chapters-restored.jpg)、[1366](evidence/aee3dee/phase2-1366-history-restored.jpg)。    |
| L01 | P2   | entering 阶段首页和探索页同时参与文档流；1920×1080时文档高2160。                                               | incoming scene 保持挂载以准备资源，但转场期间绝对定位并隐藏；不叠成两屏。`aee3dee`                             | 三种桌面转场图与 DOM 高度均等于1080/900/768，立即进入有焦点，Enter跳过后聚焦探索主体。                                                                                                                                                                    |
| L02 | P2   | 减少动态的真实懒加载瞬间，`.scene-module > *` 强制加载框宽高100%，覆盖其 inset 约束，右侧及底部被裁切。        | 通用场景尺寸规则排除 `.scene-state`。`4b70eb9`                                                                 | 三种桌面重新加载实际 lazy 模块后采集 [1920](evidence/4b70eb9/phase2-1920-loading.jpg)、[1440](evidence/4b70eb9/phase2-1440-loading.jpg)、[1366](evidence/4b70eb9/phase2-1366-loading.jpg)；矩形完全在场景内。这些是实际加载瞬间，不是人为失败或慢速模拟。 |
| M01 | P2   | 手机媒体查询将“了解作品”放到底部左侧，与保留右侧入口的要求不符。                                               | 手机入口 `align-self: flex-end`。`f7f1974`                                                                     | [390](evidence/f7f1974/phase2-390-landing.jpg)、[430](evidence/f7f1974/phase2-430-landing.jpg) 中均在右下，未与标语或主按钮遮挡。                                                                                                                         |
| M02 | P2   | 手机背景裁切让部分金色文字落在较亮雾层上，可读性减弱。                                                         | 仅加强手机首页文字背后的墨蓝遮罩，保留山河素材、手迹与构图。`f7f1974`                                          | 同上两张原图；属于视觉可读性修正，没有据此宣称全站 WCAG 对比度认证。                                                                                                                                                                                      |

本轮没有修改手迹素材。“征”左下彳旁末点在网页图中保留，右下邻字碎笔没有重新引入。A/B目录、正式数据及公共contracts相对 `de4f81f` 无改动。

### 桌面实测矩阵

“通过”只覆盖该行所列状态；首次动画连续性、性能和真实模块失败路径单列，不由静态图推断。`de4f81f`的未改动布局图与后续针对性复验共同构成本轮证据。

| 状态                      | 1920×1080                                                       | 1440×900                                                        | 1366×768                                                        |
| ------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| 稳定首页／字形与主按钮    | [通过](evidence/de4f81f/phase2-1920-landing.jpg)                | [通过](evidence/de4f81f/phase2-1440-landing.jpg)                | [通过，最终代码](evidence/f7f1974/phase2-1366-landing.jpg)      |
| 主按钮hover               | [通过](evidence/de4f81f/phase2-1920-landing-hover.jpg)          | [通过](evidence/de4f81f/phase2-1440-landing-hover.jpg)          | [通过](evidence/de4f81f/phase2-1366-landing-hover.jpg)          |
| Tab聚焦主按钮             | [通过](evidence/de4f81f/phase2-1920-landing-focus.jpg)          | [通过](evidence/de4f81f/phase2-1440-landing-focus.jpg)          | [通过](evidence/de4f81f/phase2-1366-landing-focus.jpg)          |
| 顶部史料原则              | [通过](evidence/de4f81f/phase2-1920-landing-sources.jpg)        | [通过](evidence/de4f81f/phase2-1440-landing-sources.jpg)        | [通过](evidence/de4f81f/phase2-1366-landing-sources.jpg)        |
| 底部了解作品／关于        | [通过](evidence/de4f81f/phase2-1920-about.jpg)                  | [通过](evidence/de4f81f/phase2-1440-about.jpg)                  | [通过](evidence/de4f81f/phase2-1366-about.jpg)                  |
| 关闭恢复、滚动解锁        | [修复后通过](evidence/aee3dee/phase2-1920-landing-restored.jpg) | [修复后通过](evidence/aee3dee/phase2-1440-landing-restored.jpg) | [修复后通过](evidence/aee3dee/phase2-1366-landing-restored.jpg) |
| 转场布局／Enter立即进入   | [修复后通过](evidence/aee3dee/phase2-1920-transition.jpg)       | [修复后通过](evidence/aee3dee/phase2-1440-transition.jpg)       | [修复后通过](evidence/aee3dee/phase2-1366-transition.jpg)       |
| 探索／合法空态            | [通过](evidence/aee3dee/phase2-1920-exploring.jpg)              | [通过](evidence/aee3dee/phase2-1440-exploring.jpg)              | [通过，最终代码](evidence/f7f1974/phase2-1366-exploring.jpg)    |
| 历史专题                  | [通过](evidence/de4f81f/phase2-1920-chapters-drawer.jpg)        | [通过](evidence/de4f81f/phase2-1440-chapters-drawer.jpg)        | [通过](evidence/de4f81f/phase2-1366-chapters-drawer.jpg)        |
| 事件资料空态              | [通过](evidence/de4f81f/phase2-1920-history-drawer.jpg)         | [通过](evidence/de4f81f/phase2-1440-history-drawer.jpg)         | [通过](evidence/de4f81f/phase2-1366-history-drawer.jpg)         |
| 探索中资料来源            | [通过](evidence/de4f81f/phase2-1920-exploring-sources.jpg)      | [通过](evidence/de4f81f/phase2-1440-exploring-sources.jpg)      | [通过](evidence/de4f81f/phase2-1366-exploring-sources.jpg)      |
| 长正文与固定关闭区        | 全文可容纳                                                      | [正文可滚动](evidence/de4f81f/phase2-1440-sources-scrolled.jpg) | [正文可滚动](evidence/de4f81f/phase2-1366-sources-scrolled.jpg) |
| 返回首页                  | [通过](evidence/de4f81f/phase2-1920-return.jpg)                 | [通过](evidence/de4f81f/phase2-1440-return.jpg)                 | [通过，最终代码](evidence/f7f1974/phase2-1366-return.jpg)       |
| 减少动态：立即进入        | 通过；phase直接为exploring                                      | 通过；同左                                                      | 通过；同左                                                      |
| 真实lazy加载反馈          | [修复后通过](evidence/4b70eb9/phase2-1920-loading.jpg)          | [修复后通过](evidence/4b70eb9/phase2-1440-loading.jpg)          | [修复后通过](evidence/4b70eb9/phase2-1366-loading.jpg)          |
| 首次动画完整连续性／闪烁  | 待短录屏或逐帧证据                                              | 同左                                                            | 同左                                                            |
| 快速连续点击              | 自动测试已覆盖重复状态；浏览器连续点击尚未录制                  | 同左                                                            | 同左                                                            |
| 真实WebGL错误／超时／重试 | 待A模块集成；隔离测试通过不能代替实测                           | 同左                                                            | 同左                                                            |

抽屉标题自动获得焦点，Tab保持在可操作区域；Esc、关闭按钮、返回入口均已实际操作。资料均为空时，不生成事件或路线以填充截图。长事件、来源展开及回放正向路径仍依赖后续正式内容与模块集成。

### 手机视口检查

| 尺寸    | 首页／标题／右侧入口                                  | 抽屉、正文、关闭                                                                                                  | 探索、时间轴与返回                                                                                                                                                 | 限制                         |
| ------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| 390×844 | [修复后通过](evidence/f7f1974/phase2-390-landing.jpg) | [滚轮正文](evidence/4b70eb9/phase2-390-sources-scrolled.jpg)、[Esc恢复](evidence/f7f1974/phase2-390-restored.jpg) | [探索空态](evidence/4b70eb9/phase2-390-exploring.jpg)、[事件资料](evidence/4b70eb9/phase2-390-history-drawer.jpg)、[返回](evidence/4b70eb9/phase2-390-return.jpg)  | 桌面Chrome窄视口；真机待验收 |
| 430×932 | [修复后通过](evidence/f7f1974/phase2-430-landing.jpg) | [正文滚轮](evidence/f7f1974/phase2-430-sources-scrolled.jpg)、[Esc恢复](evidence/f7f1974/phase2-430-restored.jpg) | [探索空态](evidence/f7f1974/phase2-430-exploring.jpg)、[历史专题](evidence/f7f1974/phase2-430-chapters-drawer.jpg)、[返回](evidence/f7f1974/phase2-430-return.jpg) | 同左                         |

两种视口文档宽度均等于视口宽度，未出现横向溢出。390首页实际测得品牌高度约51px、导航44px、全屏44×44px、开启征程约207×88px、了解作品约81×45px。没有把鼠标滚轮当成触摸证据：两次合成触摸尝试没有观察到正文位移，结果明确记为**未通过该验证尝试，尚不能判定是真实手机缺陷还是工具输入差异**，见 [尝试截图](evidence/f7f1974/phase2-390-touch-attempt.jpg) 和 [记录](evidence/f7f1974/observations.json)。真机触摸、动态地址栏、安全区域、iOS/Android浏览器仍待实测；360与平板未纳入本轮。

### 检查、性能与剩余门槛

- `lint`、`typecheck`、`test`（8文件47项）、`validate:data`（0事件／0路线／0来源）、`build` 已在最终页面代码后运行通过。截图JSON曾触发格式告警，归档后统一格式化，最终 `format:check` 与 `git diff --check` 通过；78份JPEG校验和一致，QA中的本地证据链接均存在。
- React检查确认 opener只在交互事件中写入ref，effect依赖及清理保留；没有新增依赖或公共接口变化。Impeccable检测在桌面修复后运行一次，输出包含既有字号、色值与圆角 advisory，未声称全站零告警。`design.json`滞后于DESIGN.md，未自动重建。
- 按复验开始时间过滤控制台：未发现应用来源的错误或警告；观察到两条 Zotero Chrome扩展“Receiving end does not exist”连接错误，来源URL为扩展脚本，保存在记录中，没有把它们伪称应用错误，也没有操作扩展设置。
- LCP、CLS、INP、真实首屏时间和动画帧率仍未测量。静态截图不能证明无闪烁或GPU性能；没有捏造录屏或性能数值。
- 完成后已清除viewport覆盖、减少动态和触摸模拟。原用户标签页保留。
- 放行仍需：真实A/B集成与失败恢复、手机真机触摸、动画连续性与性能证据、素材使用条件和人工内容审核。当前保持Draft，不合并main，不签署任何真人复核。

## 2026-10-31 受限验收原记录

以下内容保留当日事实，其“未采集／待验收”是当日状态；本轮更新以以上2026-11-01记录为准。

## 当前记录

- 测试日期：2026-10-31。
- 页面代码检查点：`311f91fd9610e2e34d6fcd4c2add3118e62f87a1`。后续只改文档时画面仍以此为准；截图前重新核对 `git rev-parse --short HEAD`。
- 分支／PR：`feat/app-shell`／[#3](https://github.com/ArthurLloyd/long-march-digital-sandbox/pull/3)，保持 Draft。
- 页面地址：`http://127.0.0.1:5173/`。原 Vite 开发服务仍在运行，未启动重复服务或改用另一端口。
- 目标浏览器：用户正常使用的 Chrome；实际版本、视口、设备缩放、页面缩放未能采集。
- 系统：Windows，具体版本未采集。
- 本轮真实网页截图：**0 张**。工具权限拒绝，所有尺寸均未通过视觉验收。
- 本轮未进行手机视觉调整：桌面验收前置条件未满足。

2026-10-31 使用已配置的 Chrome 浏览器能力，尝试绑定用户已打开的同一 URL，工具原始返回为：

```text
Browser Use rejected this action due to browser security policy. Reason: A saved user permission setting blocks this action. Browser use could not acquire authority to observe page content. The origin approval gate did not grant access for http://127.0.0.1:5173. A saved permission or managed policy denies access. The agent must not attempt to achieve the same outcome via workaround, indirect execution, raw CDP or browser commands, alternate browser surfaces, or policy circumvention. Proceed only with a materially safer alternative that does not require this blocked browser action; if none exists, stop and request user input.
```

因此没有观察 DOM、运行页面脚本、截图、读取当前控制台或测量 Web Vitals；没有切换端口、浏览器表面、控制通道或引入 Playwright 绕过。单元测试及构建不能替代上述检查。

旧 `.impeccable/review/phase2-round1/` 是已撤下的 SVG 山河方案。此前用户的局部截图有助于定位问题，但未包含已确认的完整视口、缩放、版本和所有页面状态，不能当作最终截图矩阵。

## 已有问题证据

| ID  | 来源                                                                            | 发现与处理                                                                  | 实际复验                                                   | 结论                          |
| --- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------- |
| G01 | 用户提供彳旁原形截图 `codex-clipboard-8817fe7c-288d-4be1-be49-55ceae1b1ae6.png` | 纠正此前误判，恢复“征”左下彳旁末点，取字扩大为520×520                       | 素材查看与alpha检查；未采集网页截图                        | 素材已修，页面待复验          |
| G02 | 用户红框截图 `codex-clipboard-0835461a-5ba3-4451-b7c2-1bfab6ef96e5.png`         | 只去掉右下方混入的下一字起笔，保留左下末点                                  | 右下排除区alpha为0、左下保留区alpha含255、图片四边alpha为0 | 素材已修，页面待复验          |
| F01 | 源码检查与自动测试                                                              | 转场聚焦“立即进入”，开启征程在转场中禁用，重复enter不改变当前阶段或资料面板 | 测试通过                                                   | 功能已修，实际键盘视觉待复验  |
| F02 | 模拟场景模块的集成测试                                                          | 验证15秒未就绪后可阅读来源，Esc恢复焦点，重试重新挂载并就绪，返回清理定时器 | 测试通过；不修改 A 模块                                    | 自动化已覆盖，真实WebGL待集成 |

字形技术预览见 `evidence/title-lettering-corrected.png`。它是两个素材合成的检查图，**不是浏览器页面截图**，不能用来填写下面的通过状态。

## 人工采集准备

1. 在本机 Chrome 打开上述地址，刷新页面，避免把开发中 Hook 改动的旧 HMR 状态带入验收。
2. 地址栏输入 `chrome://version` 仅由人员读取并记录版本，然后回到预览页。不要在截图中包含账户信息或完整浏览器个人资料路径。
3. `Ctrl+0` 将网页缩放恢复100%；按 F12，再按 `Ctrl+Shift+M` 打开设备工具栏，选择 Responsive，输入宽高。设备工具栏显示的预览缩放与网页缩放不同，应分别记录；设备像素比按实际值填写，不猜测。
4. 依次完成1920×1080、1440×900、1366×768。先确认短桌面标题、主按钮和页脚互不遮挡，再开始390×844、430×932。
5. 使用 DevTools 命令菜单中的 Capture screenshot 保存**视口**截图；用“Capture full size screenshot”保存的全页截图不能冒充指定视口图。保留原图，不加红框或裁掉导航后作为最终证据。
6. 文件保存到 `docs/design/evidence/<页面提交短哈希>/`。每次修改后重新采集相关状态，保留旧版本目录。目录只在确有截图后创建；不能提前生成空白占位图。

先提供三种桌面的稳定首页及探索页这6张图，再补充细分状态；有问题时可另附标注图，仍保留未标注原图。人工图片到达后记录实际来源、提交与环境，再进行基于截图的局部修改。

## 桌面状态矩阵

以下“待采集”均表示未检查、未通过。将 N 替换为1920、1440、1366，三种尺寸均按同一操作执行。

| 状态与操作           | 预期与检查重点                                                 | 文件名                               | 1920×1080    | 1440×900     | 1366×768     |
| -------------------- | -------------------------------------------------------------- | ------------------------------------ | ------------ | ------------ | ------------ |
| 首次打开／刷新       | 文字可见、资源不闪白；首次动画不能靠稳定截图证明               | phase2-N-landing-initial.png及短录屏 | 待采集       | 待采集       | 待采集       |
| 动画完成             | 手迹完整、左右比例、主视觉裁切、底部了解作品                   | phase2-N-landing.png                 | 待采集       | 待采集       | 待采集       |
| 主按钮hover          | 双金线、箭头纹样、位移无错位                                   | phase2-N-landing-hover.png           | 待采集       | 待采集       | 待采集       |
| Tab聚焦主按钮        | 焦点环完整、主操作只有一个                                     | phase2-N-landing-focus.png           | 待采集       | 待采集       | 待采集       |
| 顶部史料原则         | 仅一个入口，抽屉正文与关闭清晰                                 | phase2-N-landing-sources.png         | 待采集       | 待采集       | 待采集       |
| 底部了解作品         | 打开关于；手迹出处和山河说明可阅读                             | phase2-N-about.png                   | 待采集       | 待采集       | 待采集       |
| Esc关闭              | 返回触发点，未锁死滚动                                         | phase2-N-landing-restored.png        | 待采集       | 待采集       | 待采集       |
| 开启征程／转场       | 无闪烁，键盘能立即跳过，入口不会重复触发                       | phase2-N-transition.png及短录屏      | 待采集       | 待采集       | 待采集       |
| 沙盘探索／合法空态   | 场景占主体，真实路线未开放提示可读                             | phase2-N-exploring.png               | 待采集       | 待采集       | 待采集       |
| 章节导航             | 空列表说明清晰、可关闭、焦点受约束                             | phase2-N-chapters-drawer.png         | 待采集       | 待采集       | 待采集       |
| 事件资料             | 合法空态、长文字可滚动、关闭按钮固定可达                       | phase2-N-history-drawer.png          | 待采集       | 待采集       | 待采集       |
| 探索中资料来源       | 来源面板不挤压或破坏场景                                       | phase2-N-exploring-sources.png       | 待采集       | 待采集       | 待采集       |
| 关闭／返回首页       | 恢复焦点与原布局，无残留遮罩                                   | phase2-N-return.png                  | 待采集       | 待采集       | 待采集       |
| 减少动态             | DevTools Rendering中启用reduce；刷新后直接进入，没有裁切或等待 | phase2-N-reduced-motion.png          | 待采集       | 待采集       | 待采集       |
| 快速连续点击         | 页面只进入一次，约650ms结束、无重复遮罩                        | phase2-N-rapid-entry录屏             | 待采集       | 待采集       | 待采集       |
| 场景加载／失败／重试 | 需真实慢速资源或 A 的失败反馈；不能伪装页面生成截图            | phase2-N-loading/error/retry.png     | 待集成后采集 | 待集成后采集 | 待集成后采集 |

当前 A 占位模块立即报告ready，不能把“准备中”瞬时状态、一次性禁用缓存或单元测试DOM图当成真实失败场景。完整的超时／重试行为已在隔离测试验证，真实模块图形性能仍待 A 的实现。长历史详情只在隔离测试内存中验证，不把测试史料写入正式数据制造截图。

## 每个实测尺寸的填写模板

```text
测试日期：
页面Git Commit：
截图来源（人员/浏览器工具）：
浏览器及版本：
系统：
视口尺寸（CSS像素）：
设备像素比：
网页缩放／工具栏预览缩放：
页面状态：
实际截图路径：
结论（通过/需修复/未检查）：
发现问题与截图位置：
修复文件及提交：
复测截图与结果：
剩余限制：
```

## 手机与平板

| 尺寸           | 进入条件                   | 首页／滚动／抽屉／时间轴／返回 | 截图 |
| -------------- | -------------------------- | ------------------------------ | ---- |
| 390×844        | 桌面主要问题已修复并有截图 | 未检查                         | 无   |
| 430×932        | 同上                       | 未检查                         | 无   |
| 360×800，可选  | 核心手机尺寸通过后补充     | 未检查                         | 无   |
| 768×1024，可选 | 桌面与手机之间的布局检查   | 未检查                         | 无   |

届时检查安全区域、动态地址栏、横向滚动、标题大小、顶部导航、底部了解作品、44px级触摸区、抽屉正文滚动与穿透、关闭恢复。触摸与真实浏览器性能不能由jsdom测试代替。

## 性能记录

LCP、CLS、INP、首屏时间、当前控制台错误、实际资源加载与动画帧率均**未测量**。构建字节数另记于阶段报告，不属于浏览器性能指标。清空控制台后刷新，再记录本次加载的错误；不能将历史HMR日志认定为当前页面结论。

## 放行条件

真实桌面三种尺寸与手机两种尺寸的证据补齐、重要缺陷修复并复测、自动测试与CI通过、素材风险有处理方案、公共接口兼容，才可考虑把 PR #3 转为 Ready for review。是否合并由项目负责人决定。
