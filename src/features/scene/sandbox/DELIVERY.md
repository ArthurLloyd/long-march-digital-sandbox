# 长征沙盘 · 三维整合版

打开方式：在 Mac 上双击“启动整合版.command”；浏览器地址为 `http://127.0.0.1:5180/sandbox/index.html`。程序需要 Python 3 提供本地静态服务；也可用任何静态服务器托管本目录。不要直接双击 HTML 以 file:// 运行。

## 进入后看什么

1. **区域沙盘**：立体地形、水系、旋转缩放、底部时间轴。点击“近观队伍”，远处箭头切换为近景人物。
2. **峡谷行军**：点击右上角入口，直接看到岩壁、铁索、木板和 18 人白模编队。拖动底部时间轴，军队前进与回退；右侧可远望、近看军队、观察桥索与石壁、回望来路。返回后将行进进度带回地图。
3. **场景素材**：地图右下“场景素材”可下载人物 GLB（含 March 动画）、编队 GLB 和三套 MiniMax 环境图片。
4. **原有观桥体验与环境画廊**：顶部说明按钮内可进入。此前的石壁、桥索、木板、水流、环境声和两处观察互动都保留。

## 素材在哪里

- `assets/terrain/scene-kit/clay-marcher.glb`：原创人物白模，带一段循环行走动画。
- `assets/terrain/scene-kit/marching-company.glb`：18 人编队和无标记红旗，静态可编辑模型；沿桥移动由场景代码按时间轴驱动。
- `源素材/MiniMax/`：三张本轮采用的 3840×1920 原生 PNG。
- `assets/textures/immersive-landscapes/`：MiniMax 生成的河谷、雪山、草地及封面、来源清单。
- 岩壁、桥梁、铁索、木板、水流和光照由原 Three.js 场景代码生成，已包含在本包的 JavaScript 中；可编辑源代码在本包 `源素材/Three.js/`，也在 GitHub 的 `src/features/scene/prototype/`。

这份包可独立运行本轮三维整合体验，不依赖开发服务器。它是艺术交互作品：现代地形、编队规模和局部桥谷不作为历史复原证据。MiniMax 完整球面图片仍有背面衔接缺陷；三维桥谷只融合其天空细节，保留实际立体前景。图片不是 AI 视频，正式剧情媒体须另行制作。

GitHub 协作位置：ArthurLloyd/long-march-digital-sandbox，分支 `codex/regional-sandbox`，PR #12。正式 App 的 C 接线与历史发布审核流程保持独立。
