# 长征·不灭的火种

长征三维历史数字沙盘，面向 2026 年“赓续长征精神，智创青春新程”微程序大赛。

当前分支开发 **Phase 2：展馆首页与沙盘探索双场景**。尚无正式三维地形、真实历史节点或开放的行军路线。探索空间显示：**历史数据正在核验，正式路线暂未开放展示。** 首页、转场、章节与资料抽屉已接入；最终视觉验收状态见 `docs/design/phase-2-report.md`。

Phase 2.5–2.7 的实际状态见[阶段报告](docs/design/phase-2-5-2-7-report.md)与[视觉验收表](docs/design/phase-2-visual-qa.md)。2026-11-01已恢复Chrome访问，完成三种桌面的静态布局与交互实测，并修复焦点恢复、转场及加载反馈；随后完成两种手机窄视口检查。真机触摸、动画连续性、性能与真实A/B集成仍待验收，PR #3保持草稿。

最新调整：开启征程后停留在确认页，必须激活“立即进入”才进入探索，减少动态模式也保留此确认；支持返回与 Esc。探索标题采用自托管行书，主入口、两侧工具与播放栏增加统一红金纹饰。2026-11-01 用户确认已复核本轮界面；自动整页截图及设备专项验证的证据边界仍见[视觉验收表](docs/design/phase-2-visual-qa.md)。字体来源见[行书记录](docs/design/exploration-calligraphy.md)。下一阶段按[集成准备](docs/design/phase-3-integration-readiness.md)接收 A/B 的分批 PR。

## 开始开发

使用 Node.js 24 LTS 与 npm；`.nvmrc` 指定 24。先由仓库所有者添加 GitHub 协作者，私有仓库没有授权时无法克隆。

```powershell
git clone https://github.com/ArthurLloyd/long-march-digital-sandbox.git
cd long-march-digital-sandbox
npm ci
npm run dev
```

开发地址以终端输出为准，默认 `http://127.0.0.1:5173`。首次安装也可 `npm install`，团队复现与 CI 使用 `npm ci`。只在本机监听；手机真机联调须显式增加 `-- --host 0.0.0.0`，并在可信局域网访问。

```powershell
npm run lint
npm run typecheck
npm run test
npm run validate:data
npm run build
npm run preview
```

`build` 先校验数据再进行 TypeScript 检查与 Vite 构建；产物位于 `dist/`。`preview` 预览现有构建，默认端口 4173。其他命令：`test:watch`、`format`、`format:check`。

## 三人协作

| 成员 | 分支                  | 主要任务                     |
| ---- | --------------------- | ---------------------------- |
| A    | `feat/3d-scene`       | 三维场景与地形、纹理         |
| B    | `feat/history-system` | 历史数据、资料来源、教学交互 |
| C    | `feat/app-shell`      | 页面、时间轴、公共接口与集成 |

各成员从最新 main 创建分支，通过 PR 合并；不提前创建全部远程分支。开始前务必阅读 [AGENTS.md](AGENTS.md)、[协作说明](docs/collaboration.md)、[接口契约](docs/interface-contract.md) 和 [历史真实性规则](docs/HISTORY_INTEGRITY.md)。

## 工程结构

```text
.github/           CI 与 PR 模板
docs/              架构、接口、协作、来源和人工审核记录
public/assets/     terrain / textures / archive / audio / fonts
scripts/           正式数据校验 CLI
src/
  app/             页面状态和模块集成
  components/      layout 与 ui
  features/        scene（A） / history（B） / timeline（C）
  shared/          contracts / constants / utils
  data/            verified（正式候选数据） / fixtures（隔离测试）
  hooks/           通用应用 Hook
  styles/          CSS 与设计变量
  tests/           应用、数据门禁和播放测试
```

`LongMarchScene` 与 `HistoryEventPanel` 目前是最小适配层，A/B 在同名公共出口替换实现。C 的探索容器通过 lazy/Suspense 接入场景，提供超时、异常及重试；事件资料由抽屉容器承载。当前未加载真实 Three.js 渲染器。首页素材制作记录、字体许可及接口兼容说明见 `docs/design/`。

## 数据与发布

唯一 JSON 入口为 `src/data/verified/dataset.json`，含 `events`、`routes`、`sources` 三个数组。目录名不等于审核通过；每条记录有独立审核与发布状态。新数据先 `draft + unpublished`。只有关联已发布来源、具备两名不同人员明确复核的 published 记录才能进入应用。

校验不能验证史实或签名身份。人工 PR 复核与来源记录是发布前提。CI 对空数据集正常通过，但不因此产生任何已审核史料。

更多信息：[开发说明](docs/development.md)、[架构](docs/architecture/overview.md)、[来源登记](docs/sources/README.md)、[复核记录](docs/history-review/README.md)。
