# 开发与排错

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

不预置历史照片、地形、音频或字体下载；当前字体使用设备已有中文字体，不向第三方字体服务发请求。未来自托管字体必须保存许可。

无历史数据属于正常状态。场景加载用 Suspense 占位；异常可重试。A 的真实场景加入后须测试 WebGL 缺失、低性能设备与资源释放，不能用本次 DOM 占位测试宣称 WebGL 已验证。

单个 JSON 是目前唯一正式数据入口。若要数据分片，由 C 同步修改 loader、CLI、契约和测试，不能只新增未加载的 JSON。

当前无正式历史内容或地图合规结论。公开展示须另完成人类史实与地图／素材审核。
