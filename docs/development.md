# 开发与排错

## C1 调度开发

`npm run dev:contracts` 后打开实际本机端口的 `/__dev/contracts?flow=c1`，可用真实 App/控制器和明确标注的工程适配器验证完整流程。开发记录键为 long-march.development.c1-completion.v1，正式键为 long-march.experience-completion.v1，二者隔离。

正式页面不导入工程样本；所有内容仍经发布过滤。缺少真实 A/B 组件时不假装成品已开放。具体协议见 [C1 接入](architecture/c1-integration-guide.md)，本轮浏览器工具错误和手工步骤见 [桌面验收](architecture/phase-c1-desktop-qa.md)。

## C0 接口开发

执行 `npm run dev:contracts` 可打开仅开发环境的 `/__dev/contracts` 工作台。它使用未发布合成样本，只供 A/B 接线、JSON 验证和回调观察。正式页面没有该入口，生产构建实际引用 fixtures 或 tests 会失败。详见 [v2 接线说明](architecture/v2-integration-guide.md)。

`npm run validate:data` 同时支持 v1/v2，并检查发布素材文件是否实际位于 public 内。CompletionRecord 与 canCompleteExperience 只是后续 C1 的类型/条件基础，当前不保存体验完成状态。

构建隔离测试会临时启动本机 HTTP 服务并在结束后关闭；受限执行环境需允许回环连接。不要跳过该测试或关闭门禁以制造通过结果。

## 环境与复现

推荐 Node.js 24 LTS（初始化 24.16.0）、npm 11。Vite 8.3.5 的 Node 要求为 ^20.19.0 或 >=22.12.0；Vitest 5.0.5 需要 ^22.12.0、^24 或 >=26，因此 package engines 取共同可用范围。使用 `.nvmrc` 与锁文件，CI 使用 Node 24。

兼容依据：[Vite 指南](https://vite.dev/guide/)、[R3F 安装](https://r3f.docs.pmnd.rs/getting-started/installation)、[Vitest 指南](https://vitest.dev/guide/)；实际版本以 package-lock.json 为准。React 19 搭配 R3F 9。

项目 `.npmrc` 选择 npm 官方 registry，未改动用户或 Windows 全局设置。网络受限时在允许联网的终端安装。不要把 token 写入 `.npmrc`、源码或聊天。

## 命令

| 命令                  | 实际行为                                       |
| --------------------- | ---------------------------------------------- |
| npm install           | 按 package 安装，开发者有意变更依赖时更新 lock |
| npm ci                | 按锁文件干净安装；CI／新成员推荐               |
| npm run dev           | 本机 Vite 开发服务器                           |
| npm run preview       | 本机预览 dist，需要先 build                    |
| npm run typecheck     | tsc -b 严格类型检查                            |
| npm run lint          | ESLint + TypeScript + React Hooks              |
| npm run test          | Vitest + jsdom，一次运行后退出                 |
| npm run validate:data | CLI 校验正式数据目录和所有跨来源关联           |
| npm run build         | 数据门禁 + 类型检查 + Vite 生产打包            |
| npm run format:check  | Prettier 格式检查                              |

## 配置与测试

`tsconfig.app.json` 管理浏览器代码，node 配置管理 Vite 和脚本，strict、noUncheckedIndexedAccess 防止不明确的数据访问。Vite test 只匹配 `src/**/*.test.{ts,tsx}`，不使用 passWithNoTests。

App 测试覆盖启动、空态、导航、全屏反馈；数据测试覆盖坐标、重复 ID、来源、审核状态、实线限制与发布过滤；播放测试用受控时间验证切换和终止。fixtures 全部为 draft + unpublished，正向审核分支只在测试内存中模拟，不写入正式文件。

## 资源与故障

不预置历史照片、真实地形或音频。Phase 2 自托管 Fontsource Noto Serif SC 与 Noto Sans SC（5.3.1，OFL-1.1），字体与网页同源提供，许可随 `public/licenses/OFL-1.1.txt` 发布。首页手迹标题为两个本地 PNG，不是新字体包；取字来源、比例和去底步骤见 `docs/design/title-calligraphy-research.md`，使用说明随 `public/licenses/title-calligraphy-SOURCE.txt` 发布。山河主题素材及组件纹样分别记录于 `docs/design/hero-art-provenance.md`、`docs/design/ornament-provenance.md`，不进入历史数据。

无历史数据属于正常状态。场景加载用 Suspense 占位；异常可重试。A 的真实场景加入后须测试 WebGL 缺失、低性能设备与资源释放，不能用本次 DOM 占位测试宣称 WebGL 已验证。

单个 JSON 是目前唯一正式数据入口。若要数据分片，由 C 同步修改 loader、CLI、契约和测试，不能只新增未加载的 JSON。

当前无正式历史内容或地图合规结论。公开展示须另完成人类史实与地图／素材审核。
