# B：历史事件与教学模块

先读根 AGENTS、接口文档和 HISTORY_INTEGRITY。公共出口为 index.ts 的 HistoryEventPanel，props 从 shared/contracts 导入；event 可为 null。App 提供相关 sources 与 onClose，内部只负责内容和教学逻辑。

允许范围：本模块、src/data/verified、docs/sources、docs/history-review、public/assets/archive。新记录 draft + unpublished，不填写假的 reviewed、坐标或路线。素材保存来源与授权，正式数据走真实双人复核。

不要创建自己的全局事件选择状态，不修改 App、公共契约或全局 CSS。需要新字段时先提出接口变更，由 C 协调。
