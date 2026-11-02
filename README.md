# 长征·不灭的火种

当前版本已把B的现有内容接入同一展馆：6专题、12事件、6人物、8地点、23来源、12教学互动与10张人物图片。正常打开首页“开启征程 → 立即进入 → 历史专题”即可阅读全文，不需要独立审阅页。三个重点故事可从正文打开已有区域演绎，退出后返回资料。

开发运行和构建预览均展示登记内容；原始史料状态与来源保留，没有代签审核。地图沿用队友的现代全景与区域场景，未知历史坐标和路线不补造。完整运行和GitHub更新步骤见 [B-INSTALL](docs/history-review/B-INSTALL.md)，接线设计见 [完整展馆说明](docs/architecture/full-content-exhibition.md)。

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

PR #3 合并后，A/B 按[基线同步步骤](docs/design/phase-3-integration-readiness.md#基线使用与同步)更新自己的分支；已有本地修改先提交自己的工作，再合并 `origin/main`。后续功能各自提交 PR。

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

`LongMarchScene` 已接入 A0 的真实 v1 Three.js 展台；`HistoricalDetailPanel`、`TeachingInteraction` 与 `EquivalentExperience` 提供B资料与互动；旧 `HistoryEventPanel` 保持兼容。C 的探索容器通过 lazy/Suspense 接入场景，提供超时、异常及重试；事件资料由抽屉容器承载。v2 地图和正式沉浸渲染器尚未交付，独立艺术工程原型保留在开发入口。首页素材制作记录、字体许可及接口兼容说明见 `docs/design/`。

## 内容来源与展出

唯一历史数据入口为src/data/verified/dataset.json。默认App使用经过结构与关联校验的完整展出视图；照片年代、AI属性和出处在资料面板保留。历史源记录的draft/unpublished及空审核字段不被展示层改写为已核验。

构建按登记的文件白名单包含全部正文和十张人物图片，不整目录复制public；工作台、测试样本和未登记资源不进入输出。旧审核过滤工具保留供兼容消费者使用，默认展馆不再以该过滤结果显示空目录。

更多信息：[协作说明](docs/collaboration.md)、[本轮接线](docs/architecture/full-content-exhibition.md)、[检查记录](docs/history-review/exhibition-integration-report.md)。
