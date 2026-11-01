# A：三维场景与《渡 · 山河之间》

主出口仍为 `index.ts` 的 `LongMarchScene`，完全沿用公共 v1 props。真实 Three.js 展陈已替换原 DOM 占位；未改应用入口、历史数据、公共契约、全局样式、依赖或 CI。

## 运行与查看

```sh
npm ci
npm run dev
```

- 主入口：终端 Local 地址，点击“开启征程”→“立即进入”。空数据展示可操作的原创火种展台，并提供艺术演绎说明。
- 隔离桥谷小样：同一 Local 地址下 `/src/features/scene/prototype/index.html`。只供开发环境，不由生产入口导入，不写历史完成记录。
- 小样操作：预设镜头与环顾、暂停、两个必须主动确认的停点、退出与重播。低动态模式按步骤推进。现有正式数据仍为空。

## 第二轮视觉与交互

桥谷场景已重构为《渡 · 山河之间》：程序材质与侵蚀岩壁、精细桥体、动态水面与分层光雾，配合空间热点、可中断的平滑镜头、自由观景、取景、环境声及手机可收起任务面板。界面采用书法章节题字与简短动作引导；工程参数和内容边界收进按需说明。

- [第二轮案例研究、文案与素材许可](VISUAL_REDESIGN_RESEARCH.md)
- [第二轮实际验收](VISUAL_REDESIGN_ACCEPTANCE.md)

## 首轮交付记录

- [主场景实现、坐标投影与资源释放](SCENE_IMPLEMENTATION.md)
- [桥谷小样说明](prototype/README.md)
- [20 项设计案例研究与取舍](design-references.md)
- [AI 视频补充镜头与交接规范](AI_VIDEO_HANDOFF.md)
- [实际验收与待办](A0_ACCEPTANCE.md)

场景模块新增几何均为原创程序实现，没有复制第三方图片、模型或影像；现有依赖和字体许可沿用仓库记录。正式地形、部队态势与历史体验须等待经核验数据及 C0/C1 接入。未来六体验名单和 ld-01/ld-02 不因本工程小样而缩减或视为完成。

## C 的集成审查

两处原应用测试 `src/tests/App.test.tsx`、`src/tests/experience-integration.test.tsx` 增加场景边界 mock，使 JSDOM 的应用壳测试不依赖 WebGL；原有交互断言保留，过时 DOM 占位标签改为明确的测试替身标签。该最小测试适配单独列入 PR，交由 C 审核；并未在生产中加入“测试环境假就绪”逻辑。真实 GPU 行为由浏览器记录与场景专项测试分别验证。
