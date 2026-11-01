# 现代地理参考数据

覆盖 WGS84 经度 96–118°、纬度 23–39°。这是首版技术窗口，不是长征路线几何或国界。没有采集、制作政治边界，没有现代卫星照片贴图。

## 高程

来源：[AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)，Mapzen / Tilezen 集合；全球 SRTM / GMTED2010 归属 USGS，全球 ETOPO1 归属 NOAA。格式按 [Terrarium 官方说明](https://github.com/tilezen/joerd/blob/master/docs/formats.md)：`R*256+G+B/256-32768` 米。源数据与处理软件许可不同，不能把数据统称 MIT。

16 张 z6 瓦片，双线性采样为 385×321、米级整数高程。该“米”是存储单位，不是精度承诺；栅格实际为数公里级的概化。显示高度提供 1×/6×/12×/24×，默认 12× 艺术增强，页面持续标注；已进行 Web Mercator 本地纬度尺度补偿，不能将它用于量测或声称历史地势严格等比例。河流宽度为屏幕增强，不是实测河宽。

本范围解码高程为 -38 至 6138 米；低于零的部分只在渲染时截为零，原数据保留。没有添加程序噪声、虚构山体、虚构河道或历史路线。色带是艺术表达，不代表土地覆盖分类或历史植被。

## 水系

使用 Natural Earth 官方维护库 `nvkelso/natural-earth-vector` 中 `ne_10m_rivers_lake_centerlines.geojson`，上游 commit 固定于 `ca96624a56bd078437bca8184e78163e5039ad19`。根据 [Natural Earth 使用条款](https://www.naturalearthdata.com/about/terms-of-use/)，数据为公有领域。

保留 67 个范围内要素的原始顶点及连续河段；不平滑、不连接断段、不补造漏段。包括 Yangtze、Yellow、Gan、Xiang、Wu、Dadu、Yalong、Min、Jialing 等现代水系。**此源未提供命名为 Chishui 的河段**，因此没有用邻近河流假扮赤水河；四渡演示板的“水系轴”也不含地理坐标。局部赤水河与渡口需要后续有来源的高精资料。

主要山地观察清单：南岭与赣南丘陵、云贵高原、横断山地、川西山地与四川盆地、秦岭、陕甘黄土高原。现阶段由真实高程表达轮廓，不另外杜撰山峰定位；后续地名、精度和历史关联由 A/B 细化复核。

## 重建与追溯

```powershell
python scripts/prepare-panorama-geography.py --cache D:/Project/miniprogram/artifacts/browser/panorama-geography-cache --out src/app/panorama/data --acquired-at 2026-11-02
```

Python 3 与 Pillow 12 已在本机存在，本轮没有安装新依赖。下载只发生在这个显式准备步骤；运行网页不请求外部地理服务。`provenance.json` 记录每个原始 URL、字节数、SHA-256、处理说明及输出校验。缓存文件名与 URL 哈希绑定，避免不同上游版本错误复用。

现代地理不是 1935 年河道、道路、冰雪、植被或行军空间复原。公开地图展示条件仍需人员核查，不能将机器验证视为法律或史实认证。
