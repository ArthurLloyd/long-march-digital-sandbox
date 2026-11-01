# B：历史内容与教学模块

基线 78c315ae92ba55b09ae12e2cad87fd281c4b8801。保留 HistoryEventPanel；新增 HistoricalDetailPanel、TeachingInteraction、EquivalentExperience，均从 index.ts 导出，props 直接使用 shared/contracts。C 的 loadExperienceModules 已按同名发现，无需修改 App。

TeachingInteraction 支持五种声明式类型、六主题十二互动。观察必须实际打开材料后确认阅读；sd-01 按 requiredMaterialIds 顺序。排序使用可键盘操作的上移/下移，配对要求完整一一对应，分类与选择须实际提交。完整但答错可阅读解释后确认。C 独立校验并保存状态，B 不写 localStorage、不改变路由或历史结果。每次定义更换重新挂载表单，迟到回调仍由 C 的 runId 防护。

EquivalentExperience 只展示 activeStepId 对应步骤，按钮仅发 onStepViewed；继续、互动及最终完成由宿主决定。没有定时通关、自动提交或伪造阅读回调。

HistoricalDetailPanel 支持事件、人物、地点、专题，使用文本安全渲染、独立滚动由 C 抽屉承担。图片只从当前条目关联且 reviewed/published/cleared 的本地资产选择；人物艺术形象需同人历史照片。图片失败仍可读文。来源、关联对象全部交 onNavigate，不绕过首次体验门槛。来源和关联 ID 的显示不增加公共字段。

候选数据唯一入口 src/data/verified/dataset.json，全部 draft/unpublished、无真人签署。正式页面仍按发布门禁过滤，因此导入候选不会立即开放六主题。真实候选审阅用开发专用 `/src/features/history/review/index.html`，支持六主题与人物配对；不从生产index导出。原工程契约工作台仍为 `/__dev/contracts`，禁止将 fixtures 导入生产。

B 全部内容的覆盖、来源与缺口见 docs/history-review/B-DELIVERY.md；真人复核按 docs/HISTORY_INTEGRITY.md。本批不修改公共契约、App、全局样式、依赖或 A 场景。

素材与字节哈希、生成prompt见 docs/history-review/B-PORTRAIT-ASSETS.md。本地候选审阅状态仅在内存，不保存正式完成。详细使用见 B-START-HERE.md。
