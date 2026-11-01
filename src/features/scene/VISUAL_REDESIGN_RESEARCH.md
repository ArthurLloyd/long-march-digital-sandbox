# 「渡·山河之间」视觉与交互重设计依据

调研日期：2026-11-01。此文件是第二轮设计研究与制作 brief；上一轮 [20 项参考](design-references.md) 保留。此次新增 12 个案例，其中 6 个是可探索世界／游戏场景，6 个是解决具体视觉问题的可运行演示。没有把同一库的多个按钮演示拆成多个案例，也没有将它们统称为 12 款完整游戏。

本轮实际打开作者页面、在线演示入口、仓库及关键实现／许可证。下文的「源码确认」与「作者说明」分开记录。首轮读取以网页和源码为主，随后补用独立 Chrome 页面实际操作、截图观察了 **Folio 2025、Walkable City、ThreeJS Water**；Sakura Fantasy 只看到动态入场页，未进入河谷。具体证据见下方「Chrome 实际观察补记」。**这不等于 12 项均完成动态试玩或性能测量**，也不能据此宣称看完所有运镜或达到作者帧率。报告中的落地方案是针对本项目的原创设计判断，不是已实现／已验收声明。

## 体验方向与先后顺序

本轮将隔离桥谷章节呈现为「渡·山河之间」：大字「渡」、细字「山河之间」、辅助字 `THE CROSSING`，少量朱红与旧金点缀。首屏的工作是让人看见河谷、桥与前行方向；工程术语放进设置中的说明。前景始终留一处简短「艺术演绎」入口，不要求用户勾选工程免责声明。

这是展示层的精简，不改变真实历史、数据发布或模块边界。场景仍为原创程序化艺术空间，不绑定真实历史地点，不补造路线、坐标、人物言行。主应用空数据场景不能因此增加看似真实的山河地图。B 负责审核内容；C 负责正式体验调度与接入；此章节仍按 A 的隔离范围制作。

优先顺序：**构图与地形连续性 → 统一光照与水面 → 相机和空间热点 → 字体与 HUD → 可选声景、取景模式 → 克制后处理**。任何新效果若令桥的轮廓、操作反馈或首屏加载更差，应先降低效果成本。

## 12 项新增案例及明确取舍

### 01 — Tidewater：环境系统需要共享同一束光

- 一手入口：[在线世界](https://dgreenheck.github.io/tidewater/)；[作者仓库](https://github.com/dgreenheck/tidewater)。已读 [App.js](https://github.com/dgreenheck/tidewater/blob/main/src/App.js)、[CREDITS](https://github.com/dgreenheck/tidewater/blob/main/CREDITS.md) 与 [MIT LICENSE](https://github.com/dgreenheck/tidewater/blob/main/LICENSE)。当前源码是作者自己的 WebGPU／WGSL 引擎，不能按旧介绍写成当前 Three.js 项目。
- 源码确认：天空、环境、阴影、地形、岸线、水面按依赖顺序建立，岸线数据同时参与地形与水面；加载有分阶段反馈。`App.js` 本次读取的文件 SHA 为 `d25378d7d1c73c26b239900c8d85d37d8694a5de`。完整钓鱼／驾驶系统及性能为作者说明，未本机试玩。
- 落地：`prototype/bridge-renderer.ts` 与环境模块统一太阳方向、雾色、水面高光和桥索轮廓光；岸与水使用同一条艺术河槽边界。先消除「岩石亮向、水反光、光束各指一边」的问题。
- 取舍／许可：代码 MIT；CREDITS 单列 CC0 录音、扫描物件以及字体和人物来源。只取系统协调方法，不引入整套引擎、人物、渔村、海洋资产或长时间编译成本。

### 02 — Bruno Simon Folio 2025：交互提示属于空间

- 一手入口：[当前作品](https://bruno-simon.com/)；[2025 源码](https://github.com/brunosimon/folio-2025)；[InteractivePoints.js](https://github.com/brunosimon/folio-2025/blob/main/sources/Game/InteractivePoints.js)；[MIT 许可](https://github.com/brunosimon/folio-2025/blob/main/license.md)。此版本与首轮的 Folio 2019 是不同作品；已补做进入、菜单和短距离驾驶观察，没有遍历完整世界。
- 源码确认：热点区分 hidden／open／concealed；动作只对当前开放项生效，并随鼠标键盘、手柄、触摸改变提示。场景更新顺序也将交互与环境系统纳入同一循环。文件 SHA：`0aada3f650c331e697e6fe0e2235a48f22b18eaf`。
- 落地：桥索、两岸热点随世界坐标投影；到停点才出现，不常驻抢戏。悬停给局部光圈，聚焦时只突出当前对象；键盘焦点提供同等反馈。主空场景可借鉴地标层次与反馈，不能借此绘制假地理。
- 取舍／许可：MIT 为代码依据，未逐项确认声音、模型和品牌资产权利；不复制汽车、地标、图标、音效或页面品牌。无需加入驾驶或物理系统。

### 03 — Sakura Fantasy：镜头模式清楚，用户输入优先

- 一手入口：[河谷体验](https://sakura.billpwchan.art/)；[源码](https://github.com/billpwchan/sakura-fantasy)；[camera.js](https://github.com/billpwchan/sakura-fantasy/blob/main/src/journey/camera.js)；[LICENSE](https://github.com/billpwchan/sakura-fantasy/blob/main/LICENSE)；[资产 CREDITS](https://github.com/billpwchan/sakura-fantasy/blob/main/CREDITS.md)。已读入口与实现，未观看完整旅程。
- 源码确认：导演相机有 follow、seat、cinema、photo 模式；拖动／滚轮会离开自动镜头；位置、目标分别缓动，并限制相机在地面和水面以上。源码明确区分低机位、岸边、抬升等镜头意图。文件 SHA：`5d5ac1c1333066177fcec2e40e110442699856f5`。
- 落地：`bridge-renderer.ts` 将自动推进、热点观察、自由观景分成明确状态；「自由观景」后不让自动路径夺回控制。取景模式隐藏 HUD，并以 Esc 或明显返回键退出；模式切换保存可恢复的镜头。
- 取舍／许可：源码 MIT；资产保留独立许可，部分雕像及录音为 CC BY，并非全部 CC0。只取镜头组织，不借用樱花、神社、人物、俳句、声音或文化造型作为长征内容。

### 04 — Walkable City：连续地形比散落石块更能建立尺度

- 一手入口：[作者说明](https://thebaileyperspective.com/open-source/walkable-city/)；[在线场景](https://thebaileyperspective.com/open-source/walkable-city/demo/)；[单文件实现](https://github.com/freak419/walkable-city/blob/main/index.html)；[LICENSE](https://github.com/freak419/walkable-city/blob/main/LICENSE)。实际页面可读到进入、目录与操作提示；没有把该读取当作走完整座城镇。
- 源码确认：`index.html` 441–479 行以一片位移网格形成地形，按坡度、高度和路径距离混合材质；陡壁使用三平面取样，解决俯视 UV 被拉成纵向条带的问题。SHA：`b74db9c60430b93f803e8d128710072ba905f866`。
- 落地：`prototype/bridge-landscape.ts` 先做完整谷坡与河槽，再叠加少量不规则岩脊、近岸碎石。草只出现在缓坡与湿润边缘；岩壁用与表面尺度一致的程序色差／粗糙度，避免所有石块同色同形。
- 取舍／许可：代码 MIT；LICENSE 明列 Poly Haven 纹理 CC0，字体另为 OFL。此项目只参考方法，不下载其纹理，也不复制房屋、道路布局或虚构城镇坐标。

### 05 — Sketchbook：自由观察也要有稳定的控制规则

- 一手入口：[可玩场景](https://jblaha.art/sketchbook/latest/)；[源码仓库](https://github.com/swift502/Sketchbook)；[CameraOperator.ts](https://github.com/swift502/Sketchbook/blob/master/src/ts/core/CameraOperator.ts)；[MIT LICENSE](https://github.com/swift502/Sketchbook/blob/master/LICENSE)。在线入口本次文本读取没有可读场景信息；控制行为依据源码和作者说明，未试玩。
- 源码确认：相机显式维护 target、radius／targetRadius、theta／phi、灵敏度及输入接收接口，而非将所有输入直接加到相机位置。文件 SHA：`d288523d46bd3e1ae64ac3837afac6fdcfd558bd`。仓库已归档，不据此新增运行时依赖。
- 落地：桥谷自由观景设定明确目标、缩放上下限、俯仰边界和恢复入口；切换到热点观察后停止自由旋转惯性。小屏避免要求连续拖动才能找回主体，提供「返回远景」。
- 取舍／许可：代码 MIT；未逐项核验其模型和纹理，全部不导入。不增加角色操控、车辆、碰撞世界或任务系统来凑游戏感。

### 06 — BakedVoxelLighting：水岸、植被和远景采用一致的空间规则

- 一手入口：[世界研究页面](https://samg-coder.github.io/BakedVoxelLighting/)；[源码及说明](https://github.com/SamG-Coder/BakedVoxelLighting)；[river-kernels.js](https://github.com/SamG-Coder/BakedVoxelLighting/blob/main/src/river-kernels.js)；[MIT LICENSE](https://github.com/SamG-Coder/BakedVoxelLighting/blob/main/LICENSE)。页面可读到探索／飞行／设置及画质分类，未完成世界漫游。
- 源码确认：河面用沿流向的两相位混合降低纹理周期重置感，深浅值影响岸线泡沫与微幅位移；远处细波逐步减弱。文件 SHA：`f6170c3e241dad263684face44c5a988512e32c9`。README 另解释连续河道、植被分簇和远近层级；其烘焙结果与性能数字未在本机复测。
- 落地：`bridge-materials.ts` 将水的方向、岸边浅色、泡沫强度统一；近景草成簇，中景降密，远山只留轮廓。避免沿整条河堆同样大的白色圆点。
- 取舍／许可：代码 MIT；README 明示项目含生成纹理，不能将它们说成实拍扫描资产。本项目不复制纹理、不引入其烘焙缓存／工作线程系统。只用原创程序材质实现对应视觉关系。

### 07 — ThreeJS Water：水应该对光和动作有因果反馈

- 一手入口：[在线水面演示](https://jeantimex.github.io/threejs-water/)；[源码](https://github.com/jeantimex/threejs-water)；[Water.ts](https://github.com/jeantimex/threejs-water/blob/main/src/Water.ts)；[MIT LICENSE](https://github.com/jeantimex/threejs-water/blob/main/LICENSE)。页面列出划水、拖物、暂停等操作，未实际验证每个光学效果。
- 源码确认：双缓冲渲染目标储存高度场，每步交换读写目标；局部扰动推动涟漪传播，并检查浮点渲染能力。作者说明包含反射、折射和焦散。原作版权 Evan Wallace，移植修改版权 Yong Su，不能抹掉来源。
- 落地：本轮河面先做到连续流向、掠射角更强的反射、近岸深浅与接触感。若增加水面点击，反馈应是点击位置附近的小涟漪，不能突然整片水变色。
- 取舍／许可：MIT；第三方环境图片权利未逐项确认，不导入。池水高度场、物体浮沉和焦散不是本轮必要范围，不为此引入额外模拟与 GPU 通道。

### 08 — THREE.Terrain 演示：材质分层应跟随地形含义

- 一手入口：[可编辑地形演示](https://icecreamyou.github.io/THREE.Terrain/)；[源码与说明](https://github.com/IceCreamYou/THREE.Terrain)；[materials.js](https://github.com/IceCreamYou/THREE.Terrain/blob/gh-pages/src/materials.js)；[MIT LICENSE](https://github.com/IceCreamYou/THREE.Terrain/blob/gh-pages/LICENSE.txt)。已读演示的飞行／雕刻操作提示；这里计的是地形材质演示，不是完整游戏。
- 源码确认：高度段使用平滑权重混合，坡度由法线与向上方向计算；README 将植被落点与材质覆盖权重关联。不是把噪声纹理直接铺满整个山体。
- 落地：谷壁主要由灰褐岩面构成，缓坡少量草土，水线附近稍深、稍湿。大形先确定，再用中频纹理分面；细噪声只补粗糙度。主应用正式地图不使用此程序生成结果冒充 DEM。
- 取舍／许可：代码 MIT，未完整核验演示纹理链，全部不导入。不要安装库替换现有渲染器，也不把它的分析面板带入体验 UI。

### 09 — three-good-godrays：光束需要遮挡关系

- 一手入口：[光束演示](https://three-good-godrays.ameo.design/)；[源码](https://github.com/Ameobea/three-good-godrays)；[godrays.frag](https://github.com/Ameobea/three-good-godrays/blob/main/src/godrays.frag)；[LICENSE](https://github.com/Ameobea/three-good-godrays/blob/main/LICENSE)。演示为 Canvas，文本读取没有画面；效果机制依据着色器核验。
- 源码确认：沿视线采样，并查询点光／方向光阴影贴图决定累积光密度；有步长、最大密度等控制。不是给屏幕叠几条常亮透明白线。
- 落地：`bridge-atmosphere.ts` 先让少量斜向光束来自确定的山隙，避开岩壁内部；雾的主要任务是拉开远近，不是覆盖桥面。高档可增强层次，低档保留背景雾和轮廓光。
- 取舍／许可：**不是 MIT**。LICENSE 是 zlib 风格三项条件：不得误述来源，改版须注明，源码分发保留声明；文件还注明改编自 N8python。只取遮挡原则，不复制着色器、不安装其后处理依赖，不声称当前薄雾近似就是体积光追踪。

### 10 — camera-controls 场景演示：点哪里，镜头就解释哪里

- 一手入口：[点选改变观察中心](https://yomotsu.github.io/camera-controls/examples/click-to-set-orbit-point.html)；[对应源码](https://github.com/yomotsu/camera-controls/blob/dev/examples/click-to-set-orbit-point.html)；[留白取景源码](https://github.com/yomotsu/camera-controls/blob/dev/examples/fit-and-padding.html)；[MIT LICENSE](https://github.com/yomotsu/camera-controls/blob/dev/LICENSE)。以上同一组演示只计一项，未实际拖动验证。
- 源码确认：点选用射线交点确定 orbit point；fit 演示可对取景边界留不对称 padding。两者说明热点与相机应共享空间目标，HUD 留白也需进入构图设计。
- 落地：点击「桥索」后，目标应是可见桥索结构，镜头不能仍对着山；点击「两岸」切到能比较两侧高差的机位。移动端把提示下移后仍保证目标在安全区内。返回时恢复上一个稳定视角。
- 取舍／许可：代码 MIT；演示图片／模型未逐项确认，不导入。无需新装库；用现有 Three.js 相机与原创插值实现。用户拖动／Esc 要能中断镜头过渡。

### 11 — Three.js Ocean：天空、反射、高光构成同一环境

- 一手入口：[Ocean 演示](https://threejs.org/examples/webgl_shaders_ocean.html)；[完整示例源码](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_shaders_ocean.html)；[Three.js MIT LICENSE](https://github.com/mrdoob/three.js/blob/dev/LICENSE)。已打开演示入口并读源码，未确认该次 Canvas 成功渲染。
- 源码确认：太阳向量同时更新天空和水面，天空用于环境贴图，水的时间推进与场景计时联动；有受限的 OrbitControls。当前 dev 示例接口可能超前于本仓库安装版本，不能原样套用。
- 落地：桥谷水面颜色不单独指定一块鲜艳蓝绿；要反映冷灰天空、暗岩和暖色太阳方向。高光集中且略破碎，河流仍应保持定向流动，不能套成大海起伏。
- 取舍／许可：示例代码 MIT；`waternormals.jpg` 等具体图片不因代码 MIT 就自动视为本项目已清权，本轮不复制。原有 Three.js 版本与依赖保持不变。

### 12 — Three.js Outline Pass：悬停反馈只强调可操作对象

- 一手入口：[Outline 演示](https://threejs.org/examples/webgl_postprocessing_outline.html)；[对应源码](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_postprocessing_outline.html)；[MIT LICENSE](https://github.com/mrdoob/three.js/blob/dev/LICENSE)。已打开演示并读取实现，未完成运行视觉测试。
- 源码确认：pointer move → raycast → selectedObjects → 轮廓通道，分别控制可见边与隐藏边。原示例无命中时清空选中的语句被注释，因此其悬停状态机不能照抄。
- 落地：桥索和两岸仅在可交互时出现细金色轮廓／局部标识；离开、失焦、切镜后清除。键盘 focus 与触摸选择要提供对应反馈。热点落到镜头背后或被遮挡时收起，不显示穿墙漂浮标签。
- 取舍／许可：代码 MIT；不导入示例树模型和纹理。现阶段可用已有材质高亮或原创光圈，不必为两处热点增加昂贵的全屏后处理；避免全景霓虹描边。

## Chrome 实际观察补记

2026-11-01 使用独立 Chrome 研究页，未占用项目已有页面。下列画面均通过浏览器实际截图检视；不是从 README 截图猜测。后续按单页串行导航，完成后导航到 `about:blank`，避免让多个 3D 场景持续运行、干扰本项目性能观察。没有下载这些作品的艺术素材或将截图当作本项目纹理。

### 已实际进入并操作的三项

| 案例          | 本次确实执行与看到的反馈                                                                                                                                                                           | 真实画面的设计判断                                                                                                                                                                               | 对桥谷的具体调整                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Folio 2025    | 加载完成后看到发光边缘的小岛、车辆、长椅与树；点击开始后世界展开。打开菜单读取 WASD 操作，关闭后按 W 约 1.2 秒；前后截图显示车辆移位、相机跟随，前景部分立体字倒落。菜单弹层与世界主画面均截图检查 | 小岛先建立一个完整、照明统一的视觉单位。进入世界后，植物成簇围出连续空地，桥、水与道路分区清楚；画面边缘常驻控制很少，长说明留在菜单。暖色地面、紫灰阴影和不同高度的植被让低面数物体有完整体积感 | 首屏先展示完成度高的桥谷构图；沿桥的视廊保持清楚。热点周围留空，输入必须带来可见的局部变化。只吸收密度和光色组织，不使用该作品明快玩具配色、车辆、立体字或品牌造型 |
| Walkable City | 首屏看到城门、连续两侧山壁、树林与长投影；点击 Enter the town，按 W 约 1.5 秒，再拖动环顾。前后截图中机位靠近城门并转向左侧树林，首屏卡片消失，保留地标／罗盘和一条操作提示                        | 中央空地与两侧密集边缘形成清楚入口，山壁使环境有连续体积。但重复锥形树和大面积竖直光柱明显带有程序演示感，不能因为源码开放就将全部美术做法视为高标准                                             | 中间保持通向桥端的连续空隙，碎石和植被集中边缘。不要照搬满屏光柱和等间距树；崖壁轮廓、坡脚与水岸优先于更多装饰物                                                   |
| ThreeJS Water | 初始截图看见水面、池底与水下球体的折射／亮纹。拖动划过水面，再按 Space；截图中出现沿划动区域的局部波纹和池底亮纹。随后拖动背景，相机确实改变至更低观察角度，水体和球体保持空间关系                 | 最明显的品质来自输入位置、表面变化与下方受光互相对应；水不是单一透明蓝平面。它是光学专项演示，右侧说明文字较密，不适合作为沉浸章节 UI 样板                                                       | 借鉴局部、有因果的反馈；河面优先完成方向、反射、岸线深浅。观察停点暂停章节推进时，仍允许用户控制观察相机。不要把泳池涟漪或水下焦散整套搬到河谷                     |

以上只证明短操作和前后画面变化；没有测量帧率、输入延迟、跨设备稳定性，也没有完成 Folio 全部互动、城镇全部建筑或水面全部设置。

### 未成功进入的场景

[Sakura Fantasy](https://sakura.billpwchan.art/) 在 Chrome 中显示黑底、米白书法圆环、纵向标题和少量飘落花瓣；连续截图可见标题／圆环揭示变化。可访问树提供「出舟 / SET SAIL」按钮，本次点击后仍停留在该入场页，没有看到河谷、船或摄影机模式。因而只确认其入场页的低文字密度与渐次揭示，不能把此前源码中的河谷运镜描述写成本次观看结果。没有诊断出确切失败原因，不归因于网站本身或用户显卡。

本次未进一步加载 Tidewater 的重型 WebGPU 世界，以免多个大型场景影响同时进行的本项目渲染验收；它仍保留源码研究级别证据。

### 对当前画面最有用的对照结论

1. 完成度来自整体一致性：一组光色、连续地形、明确主体和可读的空隙，不能由石块数量替代。
2. 崖壁可大，但需保留远处开口；让近景框景、中景桥体、远景山脊承担不同职责，避免同一面大墙堵住全部视线。
3. 植被和碎石应围出路径与观察目标；均匀撒满画面会削弱空间方向。
4. 画面中的交互要兑现动作：桥索／两岸改变观察目标，回望改变朝向；反馈不能只有计数器或按钮变色。
5. 日常 HUD 低密度、设置按需打开是实际可见的有效做法；光柱、霓虹、高饱和色和多页成就不是本项目必须继承的设计。

## 可直接制作的视觉 brief

| 层次     | 制作决定                                                                             | 完成判断                                                     |
| -------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 画面骨架 | 左前景深色岩壁／稀疏草影框景，桥从偏轴近处伸向中景，河道在远处收窄；远山至少三层明度 | 缩小到缩略图仍能认出桥、河与前进方向                         |
| 地形     | 连续谷坡承担体积；大岩脊打破轮廓；碎石只在近岸和坡脚出现                             | 不像堆积的同形石块，不出现桥端悬空、水岸明显断裂             |
| 光色     | 暖色低角度侧逆光，冷灰环境光；主体桥体对比最高，远山逐级降对比                       | 桥索可辨，暗部有层次；没有高饱和蓝水或大面积灰雾遮挡         |
| 水面     | 两层定向细波、掠射角反射、岸线浅色与局部薄泡沫；流速与波幅克制                       | 能看懂沿河流动；没有横向刷屏、规律白点链或沸腾塑料感         |
| 空气     | 近处清晰，中远处逐渐降低对比；少量山隙斜光                                           | 雾建立距离，不能代替地形；镜头移动时无明显平面穿帮           |
| 镜头     | 远观建立尺度 → 靠近看桥 → 真实回望 → 稍抬升收束                                      | 每段目标不同；「回望来路」必须改变镜头朝向，不能只改按钮文案 |
| 热点     | 世界锚点、细环、短名；停点出现，悬停突出，选中推镜，完成后弱化                       | 点击反馈明显；拖动不误触；键盘和触屏可完成同样动作           |
| HUD      | 大标题仅首屏；进入后保留章节、短目标和必要控制；设置集中画质／声音／控制／说明       | 画面不被大卡片占住；各按钮动作与名称一致                     |
| 声景     | 默认静音，用户主动开启；淡入淡出，后台／退出停止                                     | 不自动响，不模仿真实历史录音；可明确再次关闭                 |
| 取景     | 隐藏 HUD，保留一次简短 Esc 提示与触屏返回入口                                        | 退出后恢复先前操作状态；不丢失停点或进度                     |

后处理以改善边缘、接触和亮部为目标；高档与低档应保留相同构图、热点和短目标。不要用强烈 Bloom、晃动、过曝或持续粒子来掩盖几何与材质问题。这里是制作判断，不能将表中的完成判断写成已通过的验收结果。

## 状态文案与行为对应

标题排版为大字「渡」，下方细字「山河之间」与 `THE CROSSING`。两者组成章节名，不增加虚构年代、地点或人物引语。

| 状态／位置   | 建议可见文案                  | 对应行为                                                    |
| ------------ | ----------------------------- | ----------------------------------------------------------- |
| 首屏主目标   | 沿桥看向对岸                  | 提示空间方向，不介绍工程实现                                |
| 首屏主要动作 | 启程                          | 从章节初始机位开始                                          |
| 首屏次要动作 | 自由观景                      | 进入可控观察，不自动完成必需停点                            |
| 初次操作提示 | 拖动环顾 · 滚轮靠近           | 只在对应输入方式可用时显示；触屏改为「拖动环顾 · 双指缩放」 |
| 观察停点     | 看清桥索与两岸                | 保留当前两项主动观察要求，用空间任务表述                    |
| 两个热点     | 桥索 / 两岸                   | 点击进入对应观察机位并记录当前观察，不只是打勾              |
| 桥索提示     | 沿桥索看向桥端                | 纯可见结构提示，不讲未经核验的材料与建造史                  |
| 两岸提示     | 看向两侧岸壁                  | 只描述当前画面，不据此解释真实战事                          |
| 观察后       | 返回远景 / 继续前行           | 前者恢复构图；后者须满足已有停点条件                        |
| 第二停点     | 回望来路                      | 激活实际回望机位；动作完成后开放「继续前行」                |
| 暂停         | 继续 / 从头开始               | 继续保留当前状态；从头开始明确重置本章节                    |
| 收束         | 此程已毕                      | 仅指该艺术章节结束，不宣称正式历史体验已通关                |
| 收束动作     | 再走一程 / 自由观景           | 明确重播或自由查看                                          |
| 声音控制     | 环境声：关 / 环境声：开       | 默认关闭，状态可读                                          |
| 取景入口     | 取景                          | 隐藏 HUD；退出提示「Esc 返回」                              |
| 设置标签     | 画面 / 声音 / 操作 / 关于本章 | 低频设置集中在弹层                                          |
| 简短标识     | 艺术演绎                      | 打开关于说明，不要求勾选                                    |

本轮文案不使用「完成 2/2 工程确认」「非地理艺术工程小样」「不等于历史已证实」作为反复出现的主目标。制作边界在一个按需说明中保留：

> 本章节为程序化艺术演绎，未复原具体历史地点。地形、桥体与镜头用于空间体验；历史事件与路线以正式审核内容为准。

后续真实 AI 视频进入画面时，应显示对应的「AI 艺术再现」标注，不能只沿用上述通用短标识。当前没有真实视频文件或生成调用；具体镜头交接见 [AI_VIDEO_HANDOFF.md](AI_VIDEO_HANDOFF.md)。

## 字体来源补充

大字「渡」可与现有项目的行书方向保持一致。已实际读取 Google Fonts 官方 [Zhi Mang Xing METADATA](https://raw.githubusercontent.com/google/fonts/main/ofl/zhimangxing/METADATA.pb)：文件名为 `ZhiMangXing-Regular.ttf`、字重 400、许可 OFL；[完整 TTF](https://raw.githubusercontent.com/google/fonts/main/ofl/zhimangxing/ZhiMangXing-Regular.ttf) 本次 HEAD 返回 HTTP 200、4,063,532 bytes。[官方 OFL.txt](https://raw.githubusercontent.com/google/fonts/main/ofl/zhimangxing/OFL.txt) 为 SIL OFL 1.1，版权归 2018 The Zhi Mang Xing Project Authors；该版权行后未声明 Reserved Font Name。

主实施者已从上述完整 TTF 制作 `prototype/crossing-display.woff2`，并反馈通过 FontTools 核对「渡山河之间」字形完整。本研究代理另行核对该子集文件确实存在、大小为 1,984 bytes，及仓库 `public/licenses/Zhi-Mang-Xing-OFL.txt` 保留了对应版权和 SIL OFL 1.1。研究代理自身的默认 Python 没有 FontTools，因此不将主实施者的字形检查写成独立重复验证。

最终展示字体来源为该自托管子集，不是复制游戏标题或 logo；只把书法体用于大标题，控制标签保持清楚的正文体。旧 36 字子集不承担新标题显示。

## 实施交接和验收边界

制作落点为 A 模块：`prototype/bridge-renderer.ts` 及其地形／材质／空气拆分负责画面与镜头，`prototype/main.ts` 负责状态文案与操作，`prototype/study.css` 负责层级和响应式；`sequence.ts` 的两处停点不能因换文案被绕过。主应用的空数据展示保持艺术展陈，不将桥谷生成为历史地图。

主实施者已反馈取景、自由观景、声音、任务收起、设置进入实现；本报告没有独立运行验证这些实现，也不表示上述建议全部落地。

实际复查至少应涵盖：首帧与收束构图；桥索／两岸的真实相机变化；回望动作；拖动与点击区分；暂停／重播；取景与 Esc；声音关闭与后台停止；键盘和小屏；减少动态；低画质仍可完成两处停点。截图证明构图，交互记录证明行为，性能只能由实际设备测量；三者不能互相替代。

研究期间发现未跟踪的 `prototype/ambience.ts`，它是程序噪声声景实现；本研究代理未创建、修改或删除该文件，已告知主实施者保留他人工作。本轮仅新增本文档，没有改渲染代码、依赖、正式数据或旧研究，没有下载不明许可艺术资产。
