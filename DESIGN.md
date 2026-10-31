---
name: 长征·不灭的火种
description: 墨蓝山河、朱红入口与暗金细线构成的历史数字展馆
colors:
  background: '#080c11'
  surface: '#101720'
  text: '#f2eee8'
  muted: '#b3b8bc'
  gold: '#c5a46d'
  gold-bright: '#e4caa0'
  red: '#a82e32'
  red-muted: '#6e1b24'
  line: '#e4caa026'
  line-strong: '#e4caa04d'
typography:
  display:
    fontFamily: "'Noto Serif SC', serif"
    fontSize: 'clamp(28px, 2.5vw, 38px)'
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: '0.22em'
  headline:
    fontFamily: "'Noto Serif SC', serif"
    fontSize: 'clamp(32px, 3.1vw, 52px)'
    fontWeight: 600
    lineHeight: 1.7
    letterSpacing: '0.08em'
  title:
    fontFamily: "'Noto Serif SC', serif"
    fontSize: '23px'
    fontWeight: 600
    lineHeight: 1.6
  body:
    fontFamily: "'Noto Sans SC', sans-serif"
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.8
  reading:
    fontFamily: "'Noto Sans SC', sans-serif"
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 2
  label:
    fontFamily: "'Noto Sans SC', sans-serif"
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.8
rounded:
  control: '3px'
  tag: '2px'
  sheet-top: '16px 16px 0 0'
  circle: '50%'
spacing:
  compact: '8px'
  control: '12px'
  content: '16px'
  panel: '24px'
  section: '32px'
  generous: '48px'
components:
  button-primary:
    backgroundColor: '{colors.red-muted}'
    textColor: '{colors.text}'
    padding: '15px 18px 15px 25px'
  button-primary-hover:
    backgroundColor: '{colors.red}'
    textColor: '{colors.text}'
  button-quiet:
    textColor: '{colors.muted}'
    padding: '10px 0'
  button-outline:
    textColor: '{colors.text}'
    rounded: '{rounded.control}'
    padding: '12px 22px'
  button-play:
    backgroundColor: '{colors.red-muted}'
    textColor: '{colors.text}'
    rounded: '{rounded.circle}'
    width: '52px'
    height: '52px'
  brand-emblem:
    width: '52px'
    height: '59px'
  navigation:
    textColor: '{colors.muted}'
    padding: '8px 0'
  chip-preview:
    textColor: '{colors.gold-bright}'
    rounded: '{rounded.tag}'
    padding: '2px 8px'
  scene-tool:
    backgroundColor: '#101720e6'
    textColor: '{colors.text}'
    rounded: '{rounded.control}'
    padding: '15px 20px'
  reading-drawer:
    backgroundColor: '#101720fa'
    textColor: '{colors.text}'
    width: 'clamp(420px, 38vw, 620px)'
---

# Design System: 长征·不灭的火种

## Overview

**Creative North Star: "山河之间，信念长明"**

以墨蓝山河、暖纸色手迹标题、朱红入口与暗金细线建立庄重的数字展陈。山河画面、取字编排和主题纹样共同承担身份，网页文字与控件承担叙事和操作；阅读区域保持平整、疏朗。

本文件从 Phase 2 源码提取，替代 Phase 1 三栏壳的旧规范。用户已否定首版 SVG 山体；当前采用原创生成的山河栅格画面，制作记录见 `docs/design/hero-art-provenance.md`。按最新要求，前台不显示 AI／非历史地貌的显式提示。装饰背景不提供地点、路线或史料证据。

**验证状态：暂定。** 浏览器访问策略仍拒绝自动采集；用户提供了阶段截图并据此指出问题，但最终手迹、组件和动效组合尚未完成新一轮全表面截图复审。旧 SVG 截图不代表本实现。桌面优先，手机基础结构仍待实机验收，不能宣称最终视觉通过。

**Key Characteristics:**

- 墨蓝深底与暖纸文字，朱红主入口、暗金辅助强调。
- 手迹取字主标题、自托管宋体副标题与黑体阅读，层级分明。
- 全屏展陈与场景主体，章节和资料按需打开。
- 有限入场动效、可跳过转场与明确的键盘操作路径。

## Colors

前置 token 为色值依据；背景图色彩不等同于界面 token。

### Primary

- **朱红**（`red`）：主入口悬停反馈。
- **深朱红**（`red-muted`）：主入口、播放按钮与文字选区；主题印章另用素材内的红金渐变。

### Secondary

- **暗金**（`gold`）：图标、细线、状态点和时间轴进度。
- **浅金**（`gold-bright`）：副标题、链接、重点信息和焦点。

### Neutral

- **墨蓝底**（`background`）与**蓝黑表面**（`surface`）：页面及阅读表面的底层。
- **暖纸正文**（`text`）与**银灰次文**（`muted`）：正文及辅助说明。
- **轻金线**（`line`）与**强金线**（`line-strong`）：保留透明度的分隔线、描边与时间轴底轨。

**The Accent Restraint Rule.** 朱红承担主要动作，金色承担层级与反馈，深底保留大面积留白。

## Typography

**Hero Artwork:** 首页“长征”采用两张手迹取字 PNG，不是字体排印。
**Display Font:** 副标题及阅读标题使用自托管 Noto Serif SC（600），回退 serif。
**Body Font:** 自托管 Noto Sans SC（400、600），回退 sans-serif。

字体通过 Fontsource 的 unicode-range 分片随项目提供，采用 OFL-1.1；许可见 `public/licenses/`。宋体用于副标题、说明、阅读标题和章节名，黑体用于正文、导航与操作。

主标题由 `title-chang.png`（480 × 740）和 `title-zheng.png`（520 × 520）横向编排，从 1962 年毛泽东手书诗作题名取字，保留原笔画比例和飞白。来源与处理记录见 `docs/design/title-calligraphy-research.md`；不能表述为毛泽东为本展馆题字。“征”完整保留彳旁末点，不误判为邻字删去；图片四边保留透明边界。

### Hierarchy

- **Hero artwork**：图片容器的 `font-size` 仅为 em 尺寸基准（clamp(120px, 11.8vw, 190px)），不是字体字号；容器高（1.25em），长字高（1.2em）、征字高（1.1em），间距（0.1em），征字向下偏移（0.13em）。
- **Display**：主题副标题“不灭的火种”使用前置 display token；不把手迹图片的尺寸登记为字体 token。
- **Headline / Title**：探索空态与抽屉标题使用对应 token；阅读小标题采用宋体（26px、行高 1.7）。
- **Body / Reading**：默认正文行高较紧，资料正文使用 reading token；错误说明最长（52ch）。
- **Label**：导航通常为（15px），辅助信息为（12–14px）；小字号不作为新增正文的范本。

手机手迹图片的 em 基准为（clamp(88px, 23vw, 130px)），副标题（28px），抽屉标题（20px）。局部字号尚未整合为统一比例字阶。

## Layout

当前有展馆首页和沙盘探索两个场景：首页满幅背景、左侧主题与唯一主操作“开启征程”、顶部导航、底部左侧主题标语及右侧“了解作品”；史料原则仅保留顶部入口；探索以场景为主体，保留下方回放栏与工具入口，阅读通过抽屉覆盖。此处记录当前构图，不要求未来页面机械复制。

桌面导航高（108px），水平留白（clamp(24px, 4vw, 80px)）。首页最小高（max(760px, 100dvh)），内容宽（550px）、最大宽（80%）、左距（clamp(48px, 10.5vw, 240px)），上下内边距（100px / 135px）。探索最小高（max(730px, 100dvh)），时间轴预留（130px），采用（200px / 弹性轨道 / 220px）三列。

桌面抽屉宽（clamp(420px, 38vw, 620px)）、高（100dvh），正文内边距（34px 36px）。前置 spacing 记录复用间距，不代表局部尺寸均已统一。

桌面宽度至少（768px）且高度至多（820px）时，首页最小高收紧至（max(680px, 100dvh)），手迹 em 基准改为（clamp(112px, 10vw, 150px)），主操作最小高（72px）；内容上下内边距（110px / 86px）。

至多（1100px）时导航收紧、时间轴改双列。至多（767px）时导航移至第二行，首页及探索最小高（800px），工具并排，抽屉改为底部面板，高（min(84dvh, 900px)）、正文内边距（24px）。至多（374px）再收紧品牌和操作。页面最小宽（320px）。手机背景另有裁切，最终裁切与拥挤程度待截图验收。

## Elevation & Depth

山河栅格、雾层与暗角承担纵深；探索背景透明度（0.6）、饱和度（0.6）。抽屉采用近实色蓝黑表面，遮罩半透明并模糊后方（3px）；没有通用卡片阴影体系。

### Shadow Vocabulary

- **主入口投影**（`0 12px 32px #0003`）：仅用于主按钮。
- **阅读遮罩**（`#03070b66`）：隔开背景与模态阅读，不是卡片投影。

**The Reading Surface Rule.** 资料区域依靠色阶和细线分层，背景纵深不进入正文。

## Shapes

主体、主入口与桌面抽屉保持直边；普通轮廓控件轻微圆角，预览标签更紧凑，手机抽屉仅顶部圆角。播放按钮和状态点采用圆形；描边与分隔以一像素细线为主。山河轮廓来自栅格素材，不再使用被否定的多边形 SVG 山体。主题印章结合盾形、火种与山纹；旅程箭头结合六边形金线和山纹，均为装饰图形，不是历史徽章或地理路线。

## Components

### Buttons

主入口最小尺寸（270px × 88px），朱红底配外框和内缩（4px）的双金线，内边距见前置 token；两行文字说明用途，右侧采用 `journey-ornament.svg`（69px × 57px）。悬停上移（3px）、纹样右移（4px），按下归位；悬停及焦点触发暖金扫光与内框增强。短桌面最小高（72px），手机纹样缩为（48px × 44px）。

次要文字操作带短金线，悬停及焦点时展开；重试和全屏采用轮廓按钮。

通用颜色过渡（200ms）、位移过渡（300ms）。焦点为浅金轮廓（2px）、外偏移（5px）；禁用透明度（0.4）、不可操作指针。图标及关闭按钮最小高（44px），不能据此宣称所有文字按钮均有相同点击面积。

### Chips

“开发预览”是非交互状态标签，浅金文字、强金线描边与紧凑内边距，不作为筛选器。

### Cards / Containers

场景工具是带图标、标题及说明的紧凑按钮；资料采用抽屉与分隔列表。抽屉有固定标题、可滚动正文和底部说明。当前没有输入框、表单或通用卡片网格，不为它们虚构规范。

### Navigation

品牌返回首页，`ember-seal.svg`（52px × 59px；手机 36px × 42px）替换通用火焰图标。导航背后采用墨蓝向透明渐变收尾；悬停与焦点展开一像素金色下划线，该线不表示当前页面，按钮没有 `aria-pressed`。首页顶部保留关于展馆及史料原则；“了解作品”移至底部右侧，主操作区仅保留“开启征程”，底部不重复史料原则；探索导航提供返回、来源和说明。章节与时间轴选中节点采用浅金及 `aria-current`。

跳转链接直达主体。抽屉使背景 inert、锁定滚动、聚焦标题、约束 Tab、支持 Esc，关闭后恢复触发点焦点。进入探索与返回首页也迁移焦点。

### Timeline & Scene States

时间轴采用细进度线与圆形播放控件，手机播放按钮（46px）。无核验事件时保留等待状态、禁用无效回放，不用占位节点填充。加载、失败、超时和重试各有文字状态，资料仍可访问。目前没有真实地形或开放历史路线。

### Motion

手迹图片轻抬并旋正显现（1.15s），征字延后（140ms）；不使用 clip-path 裁切字底，也不模拟原作者真实书写过程。副标题及说明显现（1.6s），操作显现（1s，延后 400ms）；雾层首次显现（2.4s），没有持续背景渲染。进入转场（650ms）可跳过，抽屉显现（350ms），共用缓出曲线见 sidecar。

主入口扫光（650ms）、纹样位移与次要文字下划线（350ms）、导航下划线（300ms），仅响应悬停或焦点，不循环播放。

减少动态偏好下关闭 CSS 动画及过渡，入口直接切换场景。减少透明偏好下取消遮罩模糊，抽屉与工具采用实色表面。

## Do's and Don'ts

### Do:

- **Do** 沿用墨蓝、暖纸、朱红与金线的主次关系。
- **Do** 保留手迹取字原笔画与透明边界，以宋体副标题和黑体正文建立阅读层级。
- **Do** 保留核验空态、禁用反馈、可见焦点及抽屉键盘操作。
- **Do** 尊重减少动态和减少透明偏好，保留转场跳过操作。
- **Do** 对最终手迹、组件和动效组合重新截图复审，区分源码记录与视觉验收。

### Don't:

- **Don't** 将被否定的 SVG 截图或阶段截图用作最终视觉验收证据。
- **Don't** 把手迹取字重排称为毛泽东为本展馆题字，或用裁切动画截断笔画。
- **Don't** 将装饰山河、色带或回放进度解释为真实地形与行军路线。
- **Don't** 为填充页面虚构历史节点、引文、坐标、来源或人工审核。
- **Don't** 将主入口投影扩展为所有资料容器的装饰。
- **Don't** 将未验收的手机布局或小字号说明定为通用标准。
