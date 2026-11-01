# 通用岩石材质

原始素材：[Poly Haven · Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry)，摄影 Dimitrios Savva、处理 Rico Cilliers；[官方 CC0 授权](https://polyhaven.com/license)。只下载 1K Diffuse 与 Displacement JPEG，合计约 1.1 MB，不使用上游模型或大尺寸原件。

这是通用艺术表面，不是长征沿线实地照片、地质分类或历史地貌证据。三平面投射避免陡坡拉伸；瓦片尺度和法线微起伏为美术处理。没有用它改变 DEM 原始高程。

文件仅嵌入来源 COM 元数据，未改变图像像素。`provenance.json` 保存原始下载 MD5/SHA256、嵌入来源后的最终 SHA256 与字节数。正式代码本地加载，不依赖外部纹理服务器。加载失败保留程序材质；卸载释放纹理与 GPU 材质。
