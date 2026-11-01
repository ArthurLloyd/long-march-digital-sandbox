# A0 场景设计参考与取舍

调研日期：2026-11-01。范围仅限 A 的可操作地图工程小样与隔离的约一分钟河谷／桥体沉浸工程小样，不改变 C 的首页、全局结构、公共契约或 B 的历史数据。

## 证据边界

下列 20 项均实际打开了一手演示页、作者说明或源码页面；不是从搜索标题拼接的案例清单。研究包括交互描述、结构与公开许可核对，**不表示 20 个网站都完成了动态视觉体验或兼容性测试**。浏览器抽查中，Atmospheric Depth Gallery 的首屏图像、色场与编辑式留白可见；Cinematic 3D Scroll、Curve Gallery 已读到界面和源码说明，但本次截图未证明其完整动画加载完成；Storytelling Map 已读取实际页面结构。其余以演示页面、作者说明及仓库为证据。

这是一份设计研究记录，不是素材授权清单，也不是历史来源。没有从这些项目复制图片、模型、纹理、音频、字体或历史内容。未确认许可的项目只作视觉／交互思路参考。MIT、BSD、AGPL 等代码许可不自动覆盖仓库中的第三方素材；旧 Codrops 的自定义许可不得写成 MIT。

## 桥谷小样的五项落地原则

1. **先有清楚的构图。** 两侧岩壁形成框景，桥从近景偏轴位置延伸到远端，河流向雾后收束。用桥索、桥面与水流方向引导视线，避免把主体淹没在同等密度的小物件中。
2. **用剪影建立可信度。** 深灰岩体、雾白水面、低饱和木色／铁色桥体形成明暗分组；桥索连接、桥面厚度、桥端落点与接触阴影优先于额外粒子特效。桥的造型是原创工程示意，不对应某座历史桥梁。
3. **一分钟只有三个镜头意图。** 远观河谷尺度 → 靠近桥体结构 → 稍抬高回望。慢推、轻转、停顿比不断绕圈更适合庄重题材。保留开始、暂停和重置；减少动态模式采用静态构图或低幅度运动。
4. **用三层景深替代堆面数。** 近景岩体轮廓清楚，中景桥体对比最高，远景山脊与雾降低饱和度和对比。重复几何要改变尺度、方向与轮廓；禁止把程序噪声地形包装成真实 DEM 或历史地形。
5. **冷环境中只留一处暖色焦点。** 暖光来自远端雾后或桥端，水面以低速微波提供生命感，雾带保持克制。持续显示“非地理艺术工程场景”，不放置虚构地名、日期、路线或人物言行。

以上是本项目的原创设计决策，不是对参考作品做同形复制，也不是已完成验收的声明。

## 20 项参考及 A0 吸收点

| #   | 案例与一手入口                                                                                     | 源码／许可证据                                                                                                                              | 观察到的设计方法                                                         | 对 A0 的具体取舍                                                                                             |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 01  | [Cinematic 3D Scroll Experiences](https://tympanus.net/Tutorials/Cinematic3DScroll/)               | [JosephASG 仓库](https://github.com/JosephASG/codrops-cinematic-scroll-animations)，README 明示 MIT                                         | 滚动控制镜头、几何景深、低密度粒子与大标题共同形成章节节奏。             | 借鉴镜头段落与停顿；桥谷用显式播放控制，不复制圆柱画廊或占据 C 的页面滚动。                                  |
| 02  | [Atmospheric Depth Gallery](https://tympanus.net/Tutorials/DepthGallery/)                          | [houmahani 仓库](https://github.com/houmahani/codrops-depth-gallery/)，MIT 文件与 README 可查                                               | 图像沿深度排列，背景随主色变化；首屏有很大留白和少量精确注记。           | 把背景色场转为冷灰雾与暖光层次；只保留必要场景信息，不把桥谷做成相册。                                       |
| 03  | [Curve Gallery](https://tympanus.net/Tutorials/CurveGallery/)                                      | [gaspoorf 仓库](https://github.com/gaspoorf/curve-gallery)，本次未确认独立许可                                                              | 作者用曲线组织摄影机运动，近处图像进入焦点，远处退入雾。                 | 借鉴连续镜头路径与景深组织；只对虚构工程相机使用曲线，绝不平滑、补全历史路线。                               |
| 04  | [Relighting Images](https://tympanus.net/Tutorials/RelightingImages/)                              | [DGFX 仓库](https://github.com/DGFX/codrops-relightning-images)，README 明示 MIT                                                            | 由深度信息推导受光，让平面画面产生体积感。                               | 借鉴“先设计光、再加细节”；A0 使用程序几何自身法线，不导入参考图或生成未经说明的地形深度。                    |
| 05  | [Thumbnail Flow / MotionPath](https://tympanus.net/Tutorials/MotionPathTransition/)                | [Ibaliqbal 仓库](https://github.com/Ibaliqbal/codrops-motion-path-transition)，MIT                                                          | 元素沿同一轨迹汇聚，展开和收起保持空间连续性。                           | 场景局部控制栏可采用一致的进入／退出方向；不在主场景增加成排飞舞卡片。                                       |
| 06  | [Infinite Scroll Gallery](https://tympanus.net/Tutorials/InfiniteScrollGSAPGallery/)               | [surya-aditya 仓库](https://github.com/surya-aditya/codrops-infinite-scroll-and-content-transition)，README 明示 MIT                        | 大小错落的图片、视差与全屏过渡保持视线连续。                             | 取其主次尺度和少量视差；一分钟演示有明确终点，不采用无限滚动。                                               |
| 07  | [On-Scroll Image Layout Animations](https://tympanus.net/Development/ScrollBasedLayoutAnimations/) | [Codrops 仓库](https://github.com/codrops/ScrollBasedLayoutAnimations/)，MIT                                                                | 在疏密不同的构图之间切换，转场维持对象身份。                             | 切换地图工程视图与隔离小样时保证状态、按钮与说明连续；不重排 C 的首页。                                      |
| 08  | [On-Scroll Filter](https://tympanus.net/Development/OnScrollFilter/)                               | [Codrops 仓库](https://github.com/codrops/OnScrollFilter)，MIT                                                                              | SVG 滤镜配合布局变化，影像由扭曲过渡到清晰。                             | 只吸收远近清晰度差异；岩壁和桥体不做频繁波动变形，避免破坏结构可信度。                                       |
| 09  | [The Aviator](https://tympanus.net/Tutorials/TheAviator/)                                          | [yakudoo 仓库](https://github.com/yakudoo/TheAviator)，自定义条款：允许集成／改造，禁止原样再发布；不是 MIT                                 | 小体量 3D 世界、清楚主体、统一几何语言，少量输入即可理解交互。           | 借鉴程序几何的统一语言和操作反馈；不沿用卡通配色、收集奖励或战斗式玩法。                                     |
| 10  | [Bruno Simon Folio 2019 源码](https://github.com/brunosimon/folio-2019)                            | [license.md](https://github.com/brunosimon/folio-2019/blob/master/license.md)，MIT                                                          | 作品把导航与可探索空间结合，物件和地标承担方向提示。                     | 让地图控制有明确反馈，桥端和河谷出口有可辨认轮廓；不复制车辆、地图、模型或品牌构图。                         |
| 11  | [Infinite World](https://infinite-world.vercel.app/)                                               | [Bruno Simon 仓库](https://github.com/brunosimon/infinite-world)，本次未确认许可                                                            | 作者公开说明这是 Three.js 程序生成世界；环境以重复规则维持统一。         | 借鉴有限几何的分布与层次；程序山体只留在非地理艺术小样，不进入正式地图。                                     |
| 12  | [Image Unroll Effects](https://tympanus.net/Development/UnrollingImages/)                          | [akella 仓库](https://github.com/akella/UnrollingImages)，README 为自定义许可，允许集成／改造、限制原样再分发                               | 展开动作具有材质感与方向感，图像从局部揭示为完整画面。                   | 仅借鉴进入场景的渐次揭示；A0 不制造仿档案、仿史料卷轴。                                                      |
| 13  | [Fullscreen Scrolling Slideshow](https://tympanus.net/Development/FullscreenScroll/)               | [Codrops 仓库](https://github.com/codrops/FullscreenScroll)，MIT                                                                            | 一次一个完整视觉主题，支持滚动或拖动进入内容视图。                       | 每个镜头只突出一个视觉目标；控制范围局限 A 模块，不劫持全页滚轮。                                            |
| 14  | [On-Scroll Typography Animations](https://tympanus.net/Development/OnScrollTypographyAnimations/)  | [Codrops 仓库](https://github.com/codrops/OnScrollTypographyAnimations)，MIT                                                                | 字的原点、尺度与旋转改变强调方式；作者也提醒节制使用。                   | 小样标题与阶段提示采用短句、稳定对齐；不让历史说明逐字旋转或不可读。                                         |
| 15  | [Grid to Fullscreen Animations](https://tympanus.net/Tutorials/GridToFullscreenAnimations/)        | [Anemolo 仓库](https://github.com/Anemolo/GridToFullscreenAnimations)，README 为自定义许可，非 MIT                                          | 缩略内容连续扩展至全屏，用户知道当前画面来自哪里。                       | 从模块内“查看工程小样”进入沉浸视图时保留明确返回路径；不修改 C 的全局导航。                                  |
| 16  | [Mapbox Storytelling](https://github.com/mapbox/storytelling)                                      | 同仓库 License 为 BSD-3-Clause；地图 SDK 与底图服务另有条款                                                                                 | 章节绑定地图视角，位置与叙述相互解释，图层按章节变化。                   | 借鉴已审节点与视角的联动。A0 不新增 Mapbox 商业 SDK、不填 token，也不添加假坐标或推测路线。                  |
| 17  | [Apollo 17 in Real Time](https://apolloinrealtime.org/17/)                                         | [bfeist/Apollo17](https://github.com/bfeist/Apollo17)，AGPL-3.0；本项目不移植其代码或素材                                                   | 影像、音频、文字、任务时间共同组成可定位的历史体验，提供时刻跳转。       | 借鉴播放进度、暂停、状态与内容标识的一致性；工程一分钟是演示时长，不标成某场历史事件的时间轴。               |
| 18  | [Bear 71 VR](https://bear71vr.nfb.ca/)                                                             | NFB／Jam3 官方页面有制作与素材署名；本次未确认可复用源码许可                                                                                | 抽象环境承载可探索空间，照片与叙述提供情感支点，内容分为清楚章节。       | 借鉴“环境不必写实到每片石头”的取舍与低干扰信息；不复制照片、视频、音乐或旁白。                               |
| 19  | [The Fallen of World War II](https://www.neilfilms.com/ww2/)                                       | 作者官方页面；本次未确认可复用源码许可                                                                                                      | 线性叙述在关键点暂停，允许观众自行理解；有画质、全屏和视频替代入口。     | 借鉴主动暂停、可控节奏与降级意识。桥谷小样不承载未经核验的伤亡数字、战争情节或影像。                         |
| 20  | [Animated Map Path / The Wild Path](https://tympanus.net/Development/StorytellingMap/)             | [作者实现说明与下载入口](https://tympanus.net/codrops/2015/12/16/animated-map-path-for-interactive-storytelling/)，本次未独立确认下载包许可 | 正文滚动驱动地图视角，图像与拍摄点产生空间联系，内容和地图具有固定分工。 | 借鉴地图视角与信息焦点的联系；历史路线只能原样显示满足契约的已审几何，参考中的路径动画不能用来编造缺失路径。 |

## 与用户所给技术例子的关系

[Three.js Skeletal Animation Blending](https://threejs.org/examples/webgl_animation_skinning_blending.html) 是人物骨骼动作混合例子，说明人物行动可以由代码实时驱动；它本身不提供符合长征题材的服装、面部表演、山河地形、叙事镜头或历史依据。A0 的核心验收是地图可操作与桥谷工程小样可体验，不因这个链接就引入外部人物模型或扩展为完整人物剧情。

用户给出的 [Bilibili 视频](https://www.bilibili.com/video/BV14uWxeKEmr/) 已通过 [Bilibili 官方视频信息 API](https://api.bilibili.com/x/web-interface/view?bvid=BV14uWxeKEmr) 独立复核元数据：响应 `code: 0`，标题《CIMPro数字孪生｜数字沙盘集锦》，UP 主“融合进化”，发布于 2024-08-20，时长 72 秒，画面尺寸 1920 × 1080。响应的 `rights.no_reprint: 1` 表示禁止转载标识，`subtitle.list` 为空，当前 API 响应未提供字幕。本次只核验这些元数据，没有观看视频或验证其中镜头；不将其计入上面 20 项，也不复制或再发布其视频内容。

## AI 影像的适用位置与当前边界

后续可以把经审核的 AI 艺术影像用于难以实时表现的环境氛围、远景或短暂叙事插段，但必须标为 AI 艺术再现，并具备素材来源／生成记录。地图互动、视角控制、桥体轮廓、暂停重置与无 WebGL 降级仍由代码提供。AI 影像不能补成历史坐标、真实行军路线或档案证据。

本轮研究不调用视频生成 API，不引入 AI 服务依赖，不把“建议使用”记为“已经生成”。当前桥谷优先使用原创程序几何，以便在 A 的目录内独立构建、复查、替换与集成。

## 本地验收时应观察的效果

- 首帧即能辨认桥、河谷和远近关系；说明文字与主体不互相遮挡。
- 一分钟镜头的起止状态明确，暂停后相机与时间保持一致，重置可回到初始构图。
- 普通地图交互与隔离小样不共用不明坐标，不因演示相机路径生成历史路线。
- 手机布局保留操作区与场景主体，减少动态偏好生效，键盘可以操作可见按钮。
- WebGL 不可用或资源失败时返回现有契约错误；不靠卡住的黑屏表示失败。
- 只登记实际通过的观察与测试；本报告不代替运行验收、真实设备性能测量、史实审核或地图合规核验。
