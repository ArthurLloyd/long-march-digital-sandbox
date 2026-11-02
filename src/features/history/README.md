# B：历史内容与教学模块

2026-11-02完整展出接线已完成。正常展馆首页、专题目录、人物/地点与资料来源均接入本模块，不再要求独立审阅地址。开发和构建预览行为一致。现有六专题、十二互动和五组人物照片/艺术形象保留。

HistoricalDetailPanel支持事件、人物、地点、专题。App通过HistoryDisplayContext开启完整展出，显示已登记且本地路径合法的配对素材；不改源记录审核字段，照片年代、AI属性与来源持续展示。没有同人照片时不单独展示艺术头像，图片失败保留文字。旧组件未提供Context时仍保留原过滤兼容行为。

TeachingInteraction与EquivalentExperience继续使用公共contracts，只上报操作。C1持有运行状态、真实完成、存储、重播与退出。正文直接阅读不生成完成记录。所有互动定义、脚本和字幕保持原数据，未通过修改答案或伪造回调完成联调。

新增跨模块接线见docs/architecture/full-content-exhibition.md；运行和GitHub更新见docs/history-review/B-INSTALL.md。独立review页保留为已有工具，不是正常用户必经入口，也不进入构建。
