# 展陈概略位置

成员 C 管理的附加展陈信息，关联 B 原始事件 ID；不回填 `dataset.json` 的 null 坐标，不改审核状态，不复制正文。不进入 strict 消费者的场景输入。

- `data/event-placements.json`：15 个位置实例、13 个地点节点、7 个浏览分组。事件数量由当前 dataset 推导，不写死。
- `data/location-references.json`：现代地理标签的原始坐标、版本链接、许可和地名关系依据。坐标为 WGS84 `[经度, 纬度]`。0.001 度概化不代表历史测绘精度；未使用 GCJ-02、BD-09。
- `event-map-schema.ts`：独立严格 Zod 结构及关联校验。`npm run validate:data` 同时运行，拒绝重复、悬空、混用坐标系、反向边界和区域锚点冒充路线端点。
- `event-map-loader.ts`：只接受显式 `audience=exhibition`。无效资源失败关闭，正文原入口保留。strict 调用返回 null。
- `event-map-selectors.ts`：原有完整发布依赖过滤得到的历史坐标优先；其次为可用的独立展陈位置。拒绝、明确撤回、失效事件/来源/地点不得用于地图。`withdrawnEventIds` 是 C 的显式展陈撤回清单，不改变 B 的审计记录。

App 提供全局展陈模型，C2 的 `selectScenePhaseView` 及部队过滤保持不变。`EventMapLayer` 在同一地图 DOM 投影层中负责聚合、标签避让、预览及目录；相机平移/聚焦仍由原适配器完成。标签避让仅改屏幕位置并绘制引导线，不能写回经纬度。矩形虚线是展示取景范围，既不是历史边界，也不是行军几何。

同一事件允许多个 placementId。同一 locationNodeId 可关联多个事件。点击预览暂停宏观播放；阅读调用宿主的既有正文控制器，不改变阶段事件数组、完成记录或艺术场景。关闭后保留机位与选择。地图快捷键、鼠标位置缩放、地形细化和 A 场景出口继续保留。

显式运行 `npx tsx scripts/export-event-map.ts` 可重新生成 [地点节点与覆盖清单](../../../../docs/architecture/event-map-01/)。区域参考节点的 `candidateRouteEndpoint=false`；其他节点只是待复核的候选端点，不能据此自动连线或推算速度。需要路线时另行补单位、历史时段、中间几何和来源。
