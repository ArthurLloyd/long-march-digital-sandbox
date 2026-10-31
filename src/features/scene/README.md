# A：三维场景模块

先读根 AGENTS、接口文档和 HISTORY_INTEGRITY。公共出口为 index.ts 的 LongMarchScene，props 统一从 shared/contracts 导入。替换 LongMarchScene.tsx 的最小占位，不另建并存的主场景。

可使用已安装 Three.js 和 R3F；不必修改 App。只在本目录及 terrain/textures 素材目录开发，需要全局样式或新依赖时联系 C。组件样式使用独立 CSS／CSS Module，不擅改全局文件。

空数据、WebGL 不可用、资源失败须有对应行为；准备完成回调 onSceneReady，已知错误回调 onSceneError。不修改 props，不生成历史坐标或补全路线。地图数据、精度、坐标系和授权说明须可审查。
