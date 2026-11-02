# 现代区域细节与水系

八个区域是 C 的技术镜头窗口，不是历史事件坐标。高程为 Mapzen / Tilezen z9 的 72 张 Terrarium 瓦片，分别采样到 385×321 的现代网格，保留整数米数值；实际水平分辨率约数百米，不是米级精度。

`modern-water.json` 单独保存现代 OSM 赤水河与大渡河原始中心线，共 49 个 way，并保留 way ID、来源和 SHA。该文件按 ODbL 1.0 提供，归属 © OpenStreetMap contributors；[版权与归属](https://www.openstreetmap.org/copyright)、[完整 ODbL 许可](https://opendatacommons.org/licenses/odbl/1-0/)。不要把 OSM 的数据库许可当成程序代码许可，也不要将它称为历史河道或渡口证据。

运行时地形柔化、垂直夸张、河槽、宽度、深浅、波光和岸线是艺术显示，不写回原始高程与中心线；不是实测水深、河宽、地表覆盖或 1935 地形。现代地形和水系不能补造任何历史行军线。

`provenance.json` 保存源文件下载 URL、字节数、SHA-256 和各输出哈希。准备脚本：

```powershell
python scripts/prepare-panorama-details.py --cache D:/Project/miniprogram/artifacts/browser/panorama-detail-cache --out src/features/scene/atlas/data/details --acquired-at 2026-11-02
```

地图本地读取细节，无运行时地图 API、账号、商业 SDK 或外部地理请求。
