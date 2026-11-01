# C：长征全景地图框架

开发：`npm ci`，`npm run dev -- --port 5176`，打开 `/__dev/panorama`。只服务于本地开发审阅，不由正式 App 引入，不能发布候选资料。无需账号、API 密钥或运行时外部地图服务。

| 文件                | 职责                                                            |
| ------------------- | --------------------------------------------------------------- |
| `PanoramaApp.tsx`   | C2 阶段状态、导航、图层开关、候选详情、沉浸插槽和返回           |
| `map-renderer.ts`   | 可替换的全景 Three.js 渲染适配器、相机、投影标签、资源释放      |
| `geography.ts`      | WGS84 输入、Web Mercator 平面坐标、真实现代高程采样             |
| `navigation.ts`     | 八个区域取景框、十一段浏览目录、三个稳定体验 ID；不产生历史坐标 |
| `route-layers.ts`   | 正式发布图→C2 当前阶段态势→可绘制路线；独立非地理工程线槽       |
| `CrossingBoard.tsx` | 四渡赤水四阶段、双阵营线型、队伍图标和示意跟随                  |
| `MapCanvas.tsx`     | 真实 WebGL 创建、首帧反馈、重试、标签和卸载                     |
| `data/`             | 离线现代地理，带原始来源、处理方式和哈希                        |

原型只读 B 的原始候选正文，使用不含审核字段的导航模型；不会伪造 reviewed/published、C1 ready/终点或正式完成记录。`src/tests/panorama/main.tsx` 是隔离开发入口。正式构建一旦导入 `src/app/panorama/` 立即失败，直到后续通过正式接线审核再明确调整。

详见 `docs/architecture/panorama-framework-design.md`、`panorama-a-handoff.md` 和 `panorama-framework-report.md`。
