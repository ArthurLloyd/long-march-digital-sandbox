---
name: 长征·不灭的火种
description: 深色历史数字展馆的工程预览界面
colors:
  background: '#181a18'
  surface: '#21231f'
  text: '#e6e1d6'
  muted: '#a9aa9f'
  gold: '#bca378'
  gold-bright: '#d5bd94'
  red: '#783e36'
  red-muted: '#743b332e'
  line: '#e4dfce12'
  line-strong: '#e4dfce26'
typography:
  display:
    fontFamily: "'Noto Serif SC', 'Songti SC', SimSun, serif"
    fontSize: 'clamp(48px, 5vw, 76px)'
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: '0.16em'
  headline:
    fontFamily: "'Noto Serif SC', 'Songti SC', SimSun, serif"
    fontSize: '19px'
    fontWeight: 500
    lineHeight: 1.9
  title:
    fontFamily: "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif"
    fontSize: '14px'
    fontWeight: 500
    lineHeight: 1.7
    letterSpacing: '0.08em'
  body:
    fontFamily: "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif"
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif"
    fontSize: '12px'
    fontWeight: 400
    lineHeight: 1.7
  caption:
    fontFamily: "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif"
    fontSize: '11px'
    fontWeight: 400
    lineHeight: 1.7
rounded:
  control: '4px'
  circle: '50%'
spacing:
  compact: '8px'
  control: '12px'
  content: '16px'
  panel: '24px'
  section: '30px'
components:
  button-outline:
    textColor: '{colors.muted}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '9px 12px'
  button-topic:
    backgroundColor: '{colors.red-muted}'
    textColor: '{colors.text}'
    rounded: '{rounded.control}'
    padding: '11px 13px'
  button-play:
    backgroundColor: '{colors.red}'
    textColor: '{colors.text}'
    rounded: '{rounded.circle}'
    width: '44px'
    height: '44px'
  button-icon:
    textColor: '{colors.text}'
    rounded: '{rounded.control}'
    padding: '9px'
  button-text:
    textColor: '{colors.gold-bright}'
    typography: '{typography.body}'
  navigation:
    textColor: '{colors.muted}'
    typography: '{typography.body}'
    padding: '0 3px'
  navigation-active:
    textColor: '{colors.text}'
  chip-preview:
    textColor: '{colors.gold-bright}'
    rounded: '{rounded.control}'
    padding: '2px 8px'
  information-panel:
    textColor: '{colors.text}'
    padding: '29px 0 20px 25px'
---

# Design System: 长征·不灭的火种

## Overview

**Creative North Star: "暗色历史数字展馆"**

以炭绿深底、暗红入口和少量旧金色建立安静、庄重的历史探索环境。中文宋体承担主标题的历史感，操作与资料采用黑体；细线、留白和字号差异组织信息，视觉重心落在场景及可追溯的资料。

这是依据当前代码提取的初始化系统，尚无经批准的视觉效果图或授权图像资产。中央展台是 DOM/CSS 抽象占位；其几何、网格和光影没有历史地理含义。前置 token 记录实际实现，来源为 `src/styles/tokens.css` 和 `src/styles/global.css`。

**Key Characteristics:**

- 深色低饱和底色，暗红与旧金色克制点题。
- 宋体标题与黑体操作形成层级，设备字体是当前实现约束。
- 面板以细分隔线组织，抽象展台局部产生深度。
- 核验空态、键盘焦点与移动端读序属于界面的一部分。

## Colors

炭绿中性色承载长时间阅读，暗红指向主题与播放，金色标识重点、状态和交互反馈；色值以前置 token 为准。

### Primary

- **暗红**（`red`）：品牌印记、播放按钮和文本选区。
- **暗红薄层**（`red-muted`）：专题入口的低强度底色，保留透明度。

### Secondary

- **旧金**（`gold`）：细线、图标、进度和状态点。
- **明金**（`gold-bright`）：副标题、预览标识、链接反馈和焦点轮廓。

### Neutral

- **炭绿背景**（`background`）与**炭绿表面**（`surface`）：页面底层及少量辅助表面。
- **暖纸正文**（`text`）与**灰绿次文**（`muted`）：正文与辅助说明。
- **轻分隔线**（`line`）与**强分隔线**（`line-strong`）：面板分界、描边和时间轴底轨；透明色不可改写为不透明近似值。

**The Accent Restraint Rule.** 暗红与金色用于已有的主题、状态和操作层级，保持大面积深色阅读底。

## Typography

**Display Font:** 当前使用设备已有的 Noto Serif SC、Songti SC、SimSun 与 serif 回退。
**Body Font:** 当前使用设备已有的 Microsoft YaHei、PingFang SC、Noto Sans CJK SC 与 sans-serif 回退。

设备未安装的字体会按栈回退；未下载字体，也未确认跨设备字形一致性。这些是现状记录，后续字体品牌与授权仍待确认。

### Hierarchy

- **Display**：场景主标题，使用前置 display token；副行使用较小的响应字号与明金。手机主标题目前固定为 60px，副行为 22px。
- **Headline**：资料空态与阅读段落标题；在较窄桌面上空态标题缩为 17px。
- **Title**：面板标题，采用适度字距和中等字重。
- **Body**：页面默认字号；资料段落实际使用 12px、两倍行高。
- **Label / Caption**：控件与说明。现有页脚及少量辅助文字低于此层级，不作为新增正文的字号范本。

## Layout

桌面应用壳最大宽度为 1920px，水平居中，两侧内边距为 30px。顶部导航、左侧专题、中央场景、右侧资料、底部时间轴形成当前首页的五区组合；新增界面按任务保持信息读序，不机械复制首页构图。

桌面工作区和时间轴对齐到 204px / 弹性中栏 / 280px；场景最小高度为 640px。宽度至少 1600px 时，工作区与场景最小高度增至 720px。

宽度至多 1200px 时，外侧内边距改为 22px，三栏变为 165px / 弹性中栏 / 235px。至多 1023px 时，资料区移到工作区下方，导航换到完整的一行。至多 639px 时，外侧内边距为 16px，专题、场景、资料依次纵向排列；场景最小高度为 590px，时间轴保留紧凑双栏。页面最小支持宽度为 320px。

间距使用前置 scale 中的现有复用值；复杂区域还保留源样式中的局部尺寸。不要将其误写成已经统一的数学间距系统。

## Elevation & Depth

面板本身平整，主要依赖色阶、细线与空间关系分层。场景占位区域使用局部径向光、透视展台及阴影；这不构成通用卡片阴影。

### Shadow Vocabulary

- **展台投影**（`background: #0009; filter: blur(30px)`）：仅用于抽象展台后方的模糊阴影层。
- **展台厚度**（`box-shadow: 0 14px 28px #0004`）：仅用于占位底座的下层。

**The Local Depth Rule.** 展台的透视与阴影限定于场景，不扩散到资料、导航和时间轴。

## Shapes

控件、品牌印记与预览标识采用轻微圆角；播放按钮使用圆形，状态点和章节节点也采用小圆点。面板保持直边，以一像素细线分隔。抽象底座的网格只存在于明确标注的沙盘占位区，不代表地形、坐标或路线。

## Components

### Buttons

轮廓按钮用于全屏，暗红薄底用于专题入口，暗红圆形按钮用于播放；次要操作采用图标或下划线文字。各组件的形状与内边距见前置 token。

悬停时可用操作文字转为明金，颜色与背景色以 160ms ease-out 过渡。键盘可见焦点使用两像素明金轮廓及五像素外偏移。禁用控件保持原结构，透明度为 0.4，鼠标显示不可操作；空数据时播放与前后切换禁用。

### Chips

“开发预览”是状态标签，采用明金文字、轻描边和紧凑内边距，不表现为可点击筛选器。

### Cards / Containers

资料与章节采用开放式面板，依靠分隔线而非反复包裹的卡片建立层级。资料区段落、元数据和来源列表逐层分隔；默认无阴影。没有输入框、表单或通用卡片组件，当前不为它们创造规范。

### Navigation

顶部按钮采用次文色；当前项转为正文色，并以底部金色短线标识，状态同时由 `aria-pressed` 表达。章节与时间轴的已选节点使用明金及 `aria-current`。

在至多 1023px 的布局，切换资料面板后滚动到资料区，并将焦点移至其标题。跳转链接提供直接进入主体的路径；键盘操作应保留可见焦点。减少动态效果偏好下，关闭平滑滚动、过渡和动画。

### Timeline & Scene Empty State

时间轴使用细底轨、金色进度与圆形媒体控制，窄屏播放按钮缩为 36px。无核验节点时保留等待状态，进度不是推测路线的依据。

核验提示、开发预览标识及抽象几何说明应与占位场景同时存在；加载、异常及重试是独立状态。当前场景没有 WebGL、真实地形、真实事件图像或历史路线。

## Do's and Don'ts

### Do:

- **Do** 沿用现有色彩、细线与轻圆角，让场景和资料拥有清晰主次。
- **Do** 保留核验提示、抽象几何说明、禁用状态和可见键盘焦点。
- **Do** 在窄屏保持专题→场景→资料→回放的读序，并让面板导航滚动及聚焦目标。
- **Do** 将减少动态效果偏好应用于滚动、过渡和动画。

### Don't:

- **Don't** 为填充界面而虚构史实、人物引文、地形、坐标、路线或人工审核。
- **Don't** 将占位网格、抽象展台或艺术再现表述为真实历史地图或档案。
- **Don't** 将局部展台阴影复制成通用面板装饰。
- **Don't** 将当前设备字体回退或细小页脚字号提升为未来所有界面的品牌要求。
