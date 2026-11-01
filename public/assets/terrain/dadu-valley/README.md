# 大渡河谷现代地理底图

范围为东经 101.96–102.40、北纬 29.72–30.12。**仅作现代地理参考，不是 1935 年地形、河道、植被或行军路线复原。**

## 高程

- 来源：[AWS Open Data / Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)，Mapzen / Tilezen 全球高程集合。全球数据包括 USGS SRTM / GMTED2010；集合可能含重采样及填补，不能宣称每个高程都是现场测量。
- [官方格式](https://github.com/tilezen/joerd/blob/master/docs/formats.md)：Terrarium，解码 `R × 256 + G + B / 256 − 32768` 米。
- [官方归属说明](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)：保留数据提供方归属；源高程与处理代码的许可不同，不能将所有源数据统称为 MIT。
- 使用 z11 的 9 张瓦片，双线性采样到 321 × 321 的 Web Mercator 均匀网格，再四舍五入为米。坐标输入为经纬度；高度、地图点和水系共用同一转换。可视化垂直放大 2 倍。
- `provenance.json` 记录下载日期、原始 URL、字节数和 SHA-256；`heightfield.json` 同时内嵌来源信息。原始 PNG 未放入 Git。
- 色带、雪线、树木是艺术表现，不是遥感土地覆盖分类。不要据此推断历史植被或积雪。

## 水系

- 来源：© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)，[ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)。提取后的数据库仍按该许可提供；页面持续显示归属。
- `rivers.json` 保留 6 条 `waterway=river` way，共 546 个原始坐标点；不平滑中心线、不补造缺失节点。
- 查询覆盖 102.20–102.26 E、29.72–30.12 N 的狭长区域，保留返回的完整 ways。**不是全区域完整水文数据库**。渲染时只显示地形范围内的段落，宽度是显示用示意值，不是测得河宽。
- 文件保存每个原始响应的 URL 与 SHA-256。OSM 在线数据会变化，下载新版本需要重新检查来源与呈现。

## 重建

脚本位于 `src/features/scene/sandbox/tools/prepare-terrain.py`，需要 Python 3 和 Pillow。必须显式指定缓存和输出目录，建议先输出到仓库外比较，再替换素材：

```sh
python3 src/features/scene/sandbox/tools/prepare-terrain.py \
  --cache /path/to/terrain-cache --out /tmp/terrain-rebuilt --acquired-at 2026-11-01
```

本轮已用保留的 9 张 PNG 和 4 份 OSM XML 重建，比较解析后的 JSON：高程、来源和水系内容一致（way 顺序不影响比较）。无 API 密钥，无商业地图 SDK，无运行时第三方取数。
