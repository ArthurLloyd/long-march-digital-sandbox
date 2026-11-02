# 山河纪行 · 主地图视觉深化

## 本轮判断

队长参考为 [BV16gp96yE67](https://www.bilibili.com/video/BV16gp96yE67/)。本轮在 Chrome 打开并查看画面与页面逐字内容：主体是总图节点、可环顾环境与互动内容；2:1 环境图与后续可选视频是不同的制作步骤。采用这个体验结构，在现有 GitHub 项目接入，不再建独立演示网站。没有因为教程介绍某制作工具就更换队长的主地图架构。

对照已有两份研究中的 32 项记录，重新筛选下面 30 个设计/技术案例。不是 30 款完整游戏，也不是 30 项均完成试玩。01–12 本轮访问作者页面、README 或技术说明；Sakura 实际进入并截图观察，Tidewater 本机停在着色器编译，未声称完成试玩。13–30 为本项目既有研究记录复核，具体源码/许可记录保留在 `VISUAL_REDESIGN_RESEARCH.md` 与 `design-references.md`。早期像素策略游戏、Folio 2019、Aviator 不作为本次画质目标。

## 30 项筛选与落地

| #   | 设计参考 / 一手来源                                                                                                                        | 审阅重点与项目取舍                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 01  | [Sakura Fantasy](https://github.com/billpwchan/sakura-fantasy)                                                                             | 2026 河谷体验；章节名称、按需面板、自由相机。采用简短区域文案和观景模式，不复制日本建筑、人物或音乐。     |
| 02  | [Tidewater](https://github.com/dgreenheck/tidewater)                                                                                       | 2026 WebGPU 岛屿；水岸、植被、光照同一体系。采用近景覆盖及统一材质，不迁入整个引擎或钓鱼系统。            |
| 03  | [Folio 2025](https://github.com/brunosimon/folio-2025)                                                                                     | 空间热点与输入反馈；区域按钮增加清晰选中态与键盘焦点，不复制驾驶玩法。                                    |
| 04  | [BakedVoxelLighting](https://github.com/SamG-Coder/BakedVoxelLighting)                                                                     | 2026 林地实例分布、风与远近层次；采用确定性成簇植被和共享风时间，不声称实现其 GI 烘焙。                   |
| 05  | [Grace Cathedral](https://blog.playcanvas.com/building-the-grace-cathedral-experience/)                                                    | 2026 数字空间；内外切换与返回原视角。保留地图挂载、暂停背景、恢复书签；没有实景扫描不能宣称采用扫描重建。 |
| 06  | [Gaussian Splat Videogame](https://blog.playcanvas.com/turning-a-gaussian-splat-into-a-videogame/)                                         | 2026 扫描与碰撞、照明统一。作为未来实景素材流程参考，不用假照片替代现有 DEM。                             |
| 07  | [Atelier UI](https://tympanus.net/codrops/2026/10/21/atelier-ui-webgl-dom/)                                                                | 2026 DOM 与 WebGL 共享节奏；保留一个地图更新循环，面板使用原生 DOM，不制造额外历史时钟。                  |
| 08  | [Amber Genetics](https://tympanus.net/codrops/2026/10/08/building-parallel-page-transitions-with-gsap-and-react-router/)                   | 2026 持续场景与可中断过渡；复用已有镜头飞行和返回机制，不重挂主地图。                                     |
| 09  | [Museum of Motion](https://tympanus.net/codrops/2026/10/26/animating-agents-gsap-animaxxing/)                                              | 2026 字体动效与低动态偏好；选静定书法题字和短时按钮反馈，不让史料文字跳动。                               |
| 10  | [A Drift](https://tympanus.net/codrops/2026/10/13/scroll-driven-ghost-trails/)                                                             | 2026 字体层级；只借鉴题字与辅助字对比，不采用长拖影，避免遮挡地图。                                       |
| 11  | [Custom-Shaped Cursor Trail](https://tympanus.net/codrops/2026/09/24/custom-shaped-cursor-trail/)                                          | 2026 WebGPU/TSL 反馈；只对可交互项强调，不给整张地图增加无意义光轨。                                      |
| 12  | [Infinite Liquid Glass Grid](https://tympanus.net/codrops/2026/09/08/building-an-infinite-liquid-glass-grid-with-three-js-webgpu-and-tsl/) | 2026 单通道折射与拖动；采用轻量半透明工具栏，未引入液态玻璃扭曲历史地图。                                 |
| 13  | [Walkable City](https://thebaileyperspective.com/open-source/walkable-city/)                                                               | 连续地表、坡度与材质关系；保留真实 DEM，大地形不以散落石块替代。                                          |
| 14  | [ThreeJS Water](https://github.com/jeantimex/threejs-water)                                                                                | 水面方向与近岸关系；沿用共享河槽，植被排除河面与岸槽。                                                    |
| 15  | [three-good-godrays](https://github.com/Ameobea/three-good-godrays)                                                                        | 光束必须有遮挡；不靠满屏辉光掩盖地形问题。                                                                |
| 16  | [camera-controls](https://github.com/yomotsu/camera-controls)                                                                              | 输入、焦点与恢复；沿用现有控件，增加清楚的总览/俯瞰/观景入口。                                            |
| 17  | [Three.js Ocean](https://threejs.org/examples/webgl_shaders_ocean.html)                                                                    | 天光水色统一；河流保留流动材质，不引入海浪到内陆河。                                                      |
| 18  | [Outline Pass](https://threejs.org/examples/webgl_postprocessing_outline.html)                                                             | 只标记可操作对象；本轮用区域选中边和桥谷视角高亮，不额外引入全屏描边通道。                                |
| 19  | [Curve Gallery](https://tympanus.net/Tutorials/CurveGallery/)                                                                              | 镜头连续性；只作用于艺术相机，不能拿插值当历史行军路线。                                                  |
| 20  | [Relighting Images](https://tympanus.net/codrops/2026/08/19/relighting-images-with-depth-maps-and-three-js/)                               | 2026 材质与受光；使用真实网格法线，AI 图不生成假 DEM。                                                    |
| 21  | [MotionPath Transition](https://tympanus.net/Tutorials/MotionPathTransition/)                                                              | 转场方向一致；进出局部观察保留来源位置。                                                                  |
| 22  | [Infinite Scroll Gallery](https://tympanus.net/Tutorials/InfiniteScrollGSAPGallery/)                                                       | 视觉主次；图卷入口有统一尺寸，主空间占主要画幅。                                                          |
| 23  | [Scroll-Based Layout Animations](https://tympanus.net/Development/ScrollBasedLayoutAnimations/)                                            | 对象身份稳定；切换场景保持原主应用导航，不重建独立页面。                                                  |
| 24  | [On-Scroll Filter](https://tympanus.net/Development/OnScrollFilter/)                                                                       | 远近清晰度；采用雾层，不让地图坐标随滤镜变形。                                                            |
| 25  | [Infinite World](https://github.com/brunosimon/infinite-world)                                                                             | 环境规则统一；植被使用有限实例几何，不随机生成历史地形。                                                  |
| 26  | [Unrolling Images](https://tympanus.net/Development/UnrollingImages/)                                                                      | 渐次展开的入口语义；环境图命名为画卷，不伪装档案。                                                        |
| 27  | [Fullscreen Scroll](https://tympanus.net/Development/FullscreenScroll/)                                                                    | 每个画面一个主体；桥谷观察单独全屏对话框但仍在主应用中。                                                  |
| 28  | [Typography Animations](https://tympanus.net/Development/OnScrollTypographyAnimations/)                                                    | 字形与尺度；本轮书法标题/宋体区域名/黑体控件三级分工。                                                    |
| 29  | [Grid to Fullscreen](https://tympanus.net/Tutorials/GridToFullscreenAnimations/)                                                           | 从卡片到空间的可理解返回；保留原地图视角与入口焦点。                                                      |
| 30  | [Mapbox Storytelling](https://github.com/mapbox/storytelling)                                                                              | 章节与视角联动原则；只消费 C 的阶段数据，不加商用 SDK、不补造轨迹。                                       |

只借鉴设计与组织方法；本轮未复制这些项目的模型、纹理、字体、音乐或代码。原创程序模型与 CSS 插画继续在 A 模块中；复用的 MiniMax 环境素材另有来源说明。工具和技术的新旧不等于视觉质量，本轮优先改实际可见的构图、比例、字体与操作反馈。

## 队长要求核对

| 要求                 | 本轮结果与边界                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 接队长总图与接口     | 继续 PR #17，基于 C 的 PR #16；没有新增独立页面或改共享契约。                                                    |
| 多区域立体地图       | 八个现代 DEM 区域保留；增加林地、针叶林、雪线、草簇、岩石及区域配色。植被分布是艺术示意。                        |
| 旋转、缩放、视角切换 | 总览、俯瞰、自由观察、观景模式，Esc 返回。降低默认地势夸张，放宽区域构图，避免近山塞满画面。                     |
| 军队近白模、远图标   | 既有 C 阶段输入与 LOD 继续保留，桥谷可近看旧 A 编队；没有历史坐标时不放假部队。                                  |
| 时间轴控制军队       | 接口实现保留；当前正式数据未发布，不能用艺术编队假装完成真实阶段联动。                                           |
| 局部沉浸             | 桥谷实时三维观察；雪山、草地增加既有 AI 环境画卷，加载失败可退出。画卷背面连续性仍需修复，非完成的正式 C1 节点。 |
| 三个正式 C1 槽位     | 泸定已有适配；雪山、遵义仍需按 B 内容与 C 调度完成，艺术画卷不代替验收。                                         |
| UI、字体、文字       | 八区图卷、短标题、折叠说明、选中反馈，空数据时压缩重复状态提示。没有改写史实内容。                               |

## 本地验收记录

- 41 个测试文件、297 项测试通过。新增测试覆盖环境落点与陡坡排除、区域更换时 GPU 实例释放，以及画卷加载失败、未加载完成退出、控件与资源清理。
- lint、typecheck、format:check、validate:data、build 通过；生产构建仍有场景 chunk 超过 500 kB 的提示，不宣称达到 AAA 画质或任何帧率指标。
- 真浏览器检查默认桌面窗口（DOM 实测 1319×708）；指定视口的截图范围与 DOM 尺寸不一致，不将 1920×1080 计入已通过验收。检查内容包括：区域切换、观景模式/Esc、雪山画卷缩放、草地键盘环顾与 Esc、返回后地图只保留一个 canvas。控制台检查没有发现错误。
- 字体检查发现原 subset 缺少“与、之、光、北、区、周、回、域、声、岭、峡、川、微、河、流、纪、行、西、谷、边、间”。从已有同源 OFL 字体生成 16,376 字节新子集，验证八个区域名与画卷标题全部有字形，不覆盖 C 原字体。
- 截图保存在本地 `artifacts/browser/noon-*`，未将大幅截图放入 Git。画卷接缝、正式雪山/遵义 C1、史料发布与原生后台暂停仍不在本轮完成声明内。
