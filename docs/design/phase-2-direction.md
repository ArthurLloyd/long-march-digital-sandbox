# Phase 2：山河之间，信念长明

用户任务书已确定双场景、东方山河、深色朱红暗金、电影式入场与直接实施。基线 main 为 4b2822d，工作区干净，31 项测试通过；A/B Issue #1/#2 已读取。首版 SVG 画面被用户明确否定，本轮据此重建桌面视觉；优先桌面，手机只完成基础结构，后续再验收。

## 方向契约

- THESIS：以原创层叠山河与一束暖光建立纪念性，通过真正可操作的进入路径抵达历史探索。
- OWN WORLD：墨蓝山河、暖纸色手迹大字与中文宋体、朱红主按钮、暗金细线。改用原创山河画面，制作记录保留在文档。按用户最新要求，首页不显示 AI／非历史地貌说明。
- STORY：首页主题 → 开启征程 → 沙盘探索 → 章节／事件／来源抽屉 → 返回探索与首页。
- FIRST VIEWPORT：左侧手迹“长征”及“不灭的火种”，右侧远近山河；顶部简洁导航与唯一的“史料原则”入口，底部左侧标语、右侧“了解作品”。主标题下只保留“开启征程”，按钮始终可操作。
- FORM：约 2 秒分层显现；进入转场约 650ms 且可跳过，减少动态偏好下立即切换。探索以 scene 为主体，正文按需打开，手机采用底部阅读抽屉。

## 选择与取舍

初步比较平面海报、持续 WebGL 首页、原创 SVG 山河；用户否定 SVG 效果后，替换为内置 imagegen 生成的山河主视觉，WebP 约 178KB。首页仍由真实网页排版、可操作入口和 CSS 动效组成。无持续渲染循环，不占 A 的场景职责。新增两款 OFL 中文字体包，以 unicode-range 自托管；不增加动画库或 store。CSS 独立实现分层淡入，不复制第三方组件源码。

用户进一步要求毛泽东本人手迹：从1962年手书《长征》诗稿题名取字，横向编排，移除临时 Ma Shan Zheng 字体包；来源与处理见 title-calligraphy-research.md。顶部徽记和主按钮另绘金线 SVG 纹样。修正用户截图发现的邻字残留，并取消截住字底的 clip-path 动画。

## 参考

- [React Bits](https://www.reactbits.dev/c/text-animations)：查看 Split Text、Reveal 的呈现逻辑，独立实现。
- [Neon Logic](https://motionsites.org/zh/prompts/neon-logic)：仅查看公开介绍，参考全屏空间与入场节奏，不使用付费提示词。
- [Mobbin](https://mobbin.com)：公开主页可读，未访问需登录的具体案例。
- [Page Flows](https://pageflows.com/web/products/)：返回 403，未取得案例，不声称已核验。
- [数字敦煌·数字藏经洞](https://dlc.e-dunhuang.com/)与[故宫端门数字馆](https://gugongzhanlan.dpm.org.cn/exhibitShare/7)：参考公开介绍中的展陈进入与分层阅读结构；未复制其组件源码或素材。

## 兼容与验证

不修改 A/B 专属目录。LongMarchSceneProps、HistoryEventPanelProps、usePlayback、发布过滤保持不变。加载、超时、失败、重试与阅读分离。抽屉具备 Esc、焦点约束及返回触发控件能力。验证五个指定尺寸及全部核心流程，至少截图两轮。空正式数据不伪造历史节点。纪念年份是任务书给定主题文案，不写入 verified 数据。
