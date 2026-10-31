# 长征·不灭的火种：所有成员与 Codex 的项目约束

开始任何任务前读取本文件、README、`docs/interface-contract.md`、`docs/collaboration.md` 和所在模块说明。不要忽略其他成员的未提交工作。

## 历史与地理红线（最高优先级）

1. **真实历史不可改写。** 重大事件、日期、人物、部队、会议、战役结果及行动顺序只能依据经过核验的史料。不要虚构历史数据。
2. **地图路线不可推测。** 不得插值、平滑、最短路径或 AI 补全缺失路径后冒充真实路线。不要自行生成历史坐标或补全地图路线。
3. **历史空间精度不得伪造。** 坐标统一 `[longitude, latitude]`，区分 exact、approximate、schematic、unknown；未知使用 null。现代地名或现代道路不能直接当作历史位置或路线证据。
4. **历史人物不得虚构言行。** 禁止伪造真实人物讲话、家书、电报、命令或档案，不将改写当原文引用。
5. **教学模拟不得改变历史。** 虚构观察者／士兵必须标注模拟，不能改变重大事件的真实过程和结果。
6. **AI 生成内容必须标注。** 艺术再现不能冒充真实照片、档案或历史影像。
7. **正式内容必须由人类审核。** 所有发布数据至少由两名不同成员独立复核。Codex 不得签署、冒充或自动生成真人审核；不得修改既有审核结论。必要更正先新增复核记录和 PR，旧结论保留审计轨迹。
8. **来源、授权与地图合规。** 保存历史资料、地形、地图、字体、音频、图片及模型来源和授权。公开展示前由人员另行核查适用地图规范，本工程没有完成任何法律合规认证。

完整流程见 `docs/HISTORY_INTEGRITY.md`。机器检查只校验结构和发布门槛，不能认定史实真实或签名身份真实。

## 模块所有权

| 成员 | 可修改范围                                                                                                               | 分支                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| A    | `src/features/scene/`、`public/assets/terrain/`、`public/assets/textures/`                                               | `feat/3d-scene`       |
| B    | `src/features/history/`、`src/data/verified/`、`docs/sources/`、`docs/history-review/`、`public/assets/archive/`         | `feat/history-system` |
| C    | `src/app/`、`src/components/`、`src/features/timeline/`、`src/shared/`、`src/hooks/`、`src/styles/`、工程配置、测试与 CI | `feat/app-shell`      |

初始化脚手架例外：首次初始化由 C 建立 A/B 最小可替换适配组件；以后按上表协作。不要跨模块擅自修改他人文件。A/B 不得自行修改应用入口、根构建配置、全局 CSS、公共契约、依赖锁文件或 CI；确需变更时提请 C 审核。C 集成时也不得改变经过审核的历史事实。

## 实施与 Git 安全

- 不擅自重构全项目、不删除他人的未提交工作、不覆盖已有文件来解决冲突。
- 禁止 `git reset --hard`、`git clean -fd`、`git push --force` 和未经检查的批量删除。
- 不把 `src/data/fixtures/` 混入正式数据；生产代码不得导入 fixtures。正式数据唯一入口为 `src/data/verified/dataset.json`。
- 成员只在自己的分支开发，初始化后 main 的变更走 PR；不替其他成员提交或覆盖修改。
- 跨模块只使用模块 `index.ts` 和公共 contracts；不导入其他 feature 的内部实现。不要让 scene/history 反向依赖 app。
- 公共契约当前为 v1，变更需 C 协调 A/B，先更新接口文档，再一并修改消费者、校验与测试。
- npm 为唯一包管理器，保留 lockfile；不加入 AI API、商业地图 SDK、数据库或应用封装。
- 新增素材记录授权，避免将大型地形、原始扫描件或秘密信息提交进 Git。
- 开发结束运行 lint、typecheck、test、validate:data、build；格式变化运行 format:check。汇报实际结果和未完成事项，不宣称没有执行的检查已通过。
