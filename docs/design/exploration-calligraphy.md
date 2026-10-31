# 探索页行书字形

2026-11-01，用户要求保留“山河之间，等待历史的回响。”原文，撤下圆润的 Ma Shan Zheng，改用更开张、有行笔力量的行书。

## 采用字库

- **Zhi Mang Xing（志莽行书）**，设计者 Wei Zhimang。Google Fonts 的[原始介绍](https://github.com/google/fonts/blob/main/ofl/zhimangxing/DESCRIPTION.en_us.html)说明其基于魏志莽手写书法，属于行书；不是毛泽东、颜真卿或吴昌硕为本项目书写的原迹。
- 字体文件来自 [Google Fonts 官方目录](https://github.com/google/fonts/tree/main/ofl/zhimangxing)，下载日期 2026-11-01，版本 `2.001`。
- 原始 TTF SHA-256：`644e0cae9b40f0b10ab729a01bd32032e3973bac22be3dccae01bf6ae7fde969`。
- 使用现有 FontTools 4.60.1 生成 WOFF2 字符子集，未改动字形轮廓。子集包括探索空态、装饰按钮、时间轴标签和进入确认页的全部用字，共 36 个 glyph，9468 字节。
- 本地文件：`public/assets/fonts/zhi-mang-xing-display.woff2`，SHA-256：`5708dce34ead0cf11cf49075100769a3854cca371798690b2fd70ee67ac826b1`。
- 许可为 SIL OFL 1.1，完整声明随 `public/licenses/Zhi-Mang-Xing-OFL.txt` 保存。字体自托管，运行时不请求外部字体服务，没有增加依赖或安装系统字体。

子集命令：

```powershell
python -m fontTools.subset ZhiMangXing-Regular.ttf --text='山河之间，等待历史的回响。开启征程立即进入返回首页历史专题事件资料历史进程尚未开放' --flavor=woff2 --output-file=zhi-mang-xing-display.woff2
```

## 作品参照与表达边界

研究中对照了毛泽东手书《从军行》所体现的粗放、开张笔势，参见[人民网转载《中国军网》的书法赏析](https://cpc.people.com.cn/n1/2023/1210/c443712-40135506.html)；另比较了颜真卿碑帖方向和黄庭坚《松风阁诗帖》的长笔舒展。用户明确选择保留原文并采用雄浑行草方向。

最终通过有许可的现代行书字库排印项目文案，没有从这些作品中取字，没有把现代文案冒充历史人物题词，也没有改变首页“长征”两张手迹图片。正文和核验说明继续使用 Noto Sans SC。

## 验证边界

原文字符覆盖与构建已验证。`evidence/zhimangxing-trial.png` 是原始字体的离线排字试样，不是网页截图。首轮浏览器截图使用的是已被用户否定的 Ma Shan Zheng，不能作为最终行书效果验收。替换行书后浏览器连接超时，最终字体在完整页面中的桌面、手机视觉复核待补。
