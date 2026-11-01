# 空间与双方部队交接

本轮负责“有证据的文字范围与可见性”，没有取得足以重建完整历史路径的几何材料。0路线；8地点坐标null；9快照hidden。不是已完成动态战场地图。A 的 DEM、局部建模与表现工程由 A 实施。

## 阶段清单

| phaseId    | 阶段               | 历史日期／精度                          | 来源                                                 |
| ---------- | ------------------ | --------------------------------------- | ---------------------------------------------------- |
| zy-phase   | 遵义会议资料阶段   | 1935年1月15—17日 / range                | src-zy-chronicle、src-zy-qingshan、src-zy-resolution |
| sd-phase-1 | 一渡赤水           | 1935年1月29日起（本卡仅登记起日） / day | src-sd-deployment                                    |
| sd-phase-2 | 二渡赤水           | 1935年2月18—21日 / range                | src-sd-deployment                                    |
| sd-phase-3 | 三渡赤水           | 1935年3月16—17日 / range                | src-sd-four                                          |
| sd-phase-4 | 四渡赤水           | 1935年3月21—22日 / range                | src-sd-four                                          |
| js-phase   | 巧渡金沙江资料阶段 | 1935年5月3—9日（主力渡江范围） / range  | src-js-passage                                       |
| ld-phase   | 飞夺泸定桥资料阶段 | 1935年5月29日 / day                     | src-ld-study、src-ld-review                          |
| sn-phase   | 翻越雪山资料阶段   | 1935年6月（夹金山相关批次） / month     | src-sn-study、src-sn-daily                           |
| gr-phase   | 穿越草地资料阶段   | 1935年8月（右路军本次北上范围） / month | src-gr-archive、src-gr-plans、src-gr-living          |

## 双方单位清单

| trackId / unitId                   | 单位及适用时期                                 | 已登记阶段                                     | 依据                           |
| ---------------------------------- | ---------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| track-red4 / unit-red4             | 红一军团第二师第四团（1935年5月）              | ld-phase                                       | src-ld-review                  |
| track-central / unit-central       | 中央红军（1935年四渡赤水范围，非单一战术单位） | sd-phase-1、sd-phase-2、sd-phase-3、sd-phase-4 | src-sd-deployment、src-sd-four |
| track-right / unit-right           | 右路军（1935年8月混编范围）                    | gr-phase                                       | src-gr-plans、src-gr-archive   |
| track-wangjialie / unit-wangjialie | 王家烈黔军（编制待核，1935年2月）              | sd-phase-2                                     | src-sd-deployment              |
| track-yunnan / unit-yunnan         | 滇军（1935年金沙江行动背景，具体编制待核）     | js-phase                                       | src-js-passage                 |
| track-huzongnan / unit-huzongnan   | 胡宗南部（1935年8月松潘背景，具体编制待核）    | gr-phase                                       | src-gr-plans                   |

双方材料仅支持阶段关联和文字背景，不能据此猜单位逐日位置、兵力、速度或图标规模。未取得原始地名定位与精度证据的条目一律隐藏。中央红军总体、红四团与混编右路军不是同一连续战术单位。

## 地点与现代差异

### place-zunyi / 遵义会议会址

现代对照：贵州遵义；遵义会议会址原为柏辉章私邸，由主楼和跨院组成，会议室位于主楼楼上。纪念馆资料同时说明，1954年以来各房间逐步复原，因此建筑历史、历史原物与现代复原陈列须分开说明。本文用于建筑关系交接，不是测绘尺寸或真人座次记录。

依据：src-zy-site。未取得可靠原始测绘坐标，历史坐标仍为null。

来源：src-zy-chronicle、src-zy-site。

### place-tucheng / 土城

现代对照：土城地区；依据 src-sd-deployment 的对应事件段落登记。现代名称仅用于文字对照，尚未取得足以支撑历史精确定位的坐标或地形证据，因此 coordinates=null；不以现代纪念馆、景区门口或道路坐标替代历史发生地。

来源：src-sd-deployment。

### place-maotai / 茅台

现代对照：茅台及附近地区；依据 src-sd-four 的对应事件段落登记。现代名称仅用于文字对照，尚未取得足以支撑历史精确定位的坐标或地形证据，因此 coordinates=null；不以现代纪念馆、景区门口或道路坐标替代历史发生地。

来源：src-sd-four。

### place-jiaopingdu / 皎平渡

现代对照：金沙江皎平渡相关地区；依据 src-js-passage 的对应事件段落登记。现代名称仅用于文字对照，尚未取得足以支撑历史精确定位的坐标或地形证据，因此 coordinates=null；不以现代纪念馆、景区门口或道路坐标替代历史发生地。

来源：src-js-passage。

### place-anshunchang / 安顺场

现代对照：四川安顺场相关地区；依据 src-ld-review 的对应事件段落登记。现代名称仅用于文字对照，尚未取得足以支撑历史精确定位的坐标或地形证据，因此 coordinates=null；不以现代纪念馆、景区门口或道路坐标替代历史发生地。

来源：src-ld-review。

### place-luding / 泸定桥

现代对照：四川泸定；依据 src-ld-study 的对应事件段落登记。现代名称仅用于文字对照，尚未取得足以支撑历史精确定位的坐标或地形证据，因此 coordinates=null；不以现代纪念馆、景区门口或道路坐标替代历史发生地。

来源：src-ld-study。

### place-jiajin / 夹金山

现代对照：宝兴与小金相关地区；依据 src-sn-study 的对应事件段落登记。现代名称仅用于文字对照，尚未取得足以支撑历史精确定位的坐标或地形证据，因此 coordinates=null；不以现代纪念馆、景区门口或道路坐标替代历史发生地。

来源：src-sn-study。

### place-maoergai / 毛儿盖

现代对照：毛儿盖相关地区；依据 src-gr-plans 的对应事件段落登记。现代名称仅用于文字对照，尚未取得足以支撑历史精确定位的坐标或地形证据，因此 coordinates=null；不以现代纪念馆、景区门口或道路坐标替代历史发生地。

来源：src-gr-plans。

## 给 A 的可落实边界

遵义会址有纪念馆文字支持的“主楼、跨院、楼上会议室”关系，以及1954年以来逐步复原的说明；不是实测尺寸、室内原物或与会者座次图。泸定桥仅采用铁索桥、河谷与通行功能的关系表现，桥板比例、枪型、具体水位、精确人数和实名动作不锁定。皎平渡历史河道与当代工程须分清；雪山草地只做标明艺术性的阅读环境，不冒称历史路径或精确天气。

要启用地图态势或完整路线，还须逐条补：原始图件或定位材料、单位适用时段、地名映射、坐标系、坐标转换、误差与精度、原始几何、素材使用依据，并通过真人核查。缺少中间几何只能保持文字／隐藏，不插值、不就近吸附、不以景点坐标替代。新证据应先加来源，再提交对应对象的修订和复核。
