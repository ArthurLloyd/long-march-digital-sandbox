# A/C 地形接合核查 · 2026-11-02

## 实际版本

- 核查基线 main：`01dcc3f89c63073ee606c398163a8d5d329d31e4`。
- A 新交付 [PR #17](https://github.com/ArthurLloyd/long-march-digital-sandbox/pull/17)：Draft / Open，head `ecfa63b39cb19d5b0e40f764feb1e087d6960f0d`，base 为旧的 `codex/panorama-map-framework`（`728cbd3`），不是最新 main。
- #17 当前没有 PR-triggered CI run；工作流只监听指定 base。本地通过不能写成 GitHub CI 通过。
- #12、#15 未在本轮合并。A 原分支和工作树保持原样。

## A 已实际上传的内容

公共 `src/features/scene/index.ts` 现在导出 `LongMarchSceneV2`、`ImmersiveExperienceRenderer`，以及 atlas 地理、地形、河道、镜头与材质 API。此前“完全没有 v2 出口”的结论已过时。

`LongMarchSceneV2` 消费阶段输入，包含八个现代区域的环境配色、成簇植被、岩石、草簇和远近单位层。桥谷观察使用既有原创 18 人白模，不表示历史兵力、人物身份或真实桥板状态。雪山与草地的球面画卷标为 AI 艺术意象，背面连续性仍未验收。

`ImmersiveExperienceRenderer` 目前支持 `exp-feiduo-ludingqiao`，在真实渲染与用户操作后上报；其他体验返回 `media_unavailable`。有公共出口不等于三个重点历史体验全部交付或获准发布。

## 本机实际核查

隔离 worktree：`artifacts/browser/preview-a-atlas`，detached 在上述 A Head。仅本机预览 `http://127.0.0.1:5180/`，从原首页和确认页进入，已实际打开泸定河谷、走近桥谷和近看编队。

锁定依赖安装后，lint、typecheck、format:check、test（**41 文件 / 297 项**）、validate:data、build、git diff --check 通过。第一次沙箱测试有三项因 localhost EACCES 失败，主机环境重跑全部 297 项通过；没有修改测试来绕过。依赖仍报告 12 项 moderate，未自动升级。大 chunk 提示仍存在。

本机证据：`artifacts/browser/ruijin-checks/a-bridge-company.jpg`、`a-*.log`、`a-host-*.log`。这不是全 A 产品验收、持续性能认证或历史审核。

## 为什么不能直接并入

使用 `git merge-tree` 对 main 与 A Head 做无工作树改动的预演，产生 **33 条冲突消息**，记录在 `artifacts/browser/ruijin-checks/a-main-merge-preview.txt`。本轮没有实际 merge，也没有把冲突对象树写入分支。

主要冲突：

- 同一批 DEM、字体和岩石资料，C 迁至 `src/app/landscape/`，A 迁至 `src/features/scene/atlas/`，产生 rename/rename。
- `modern-landscape.ts`、`terrain-materials.ts`、旧 panorama facade、导航与来源测试存在内容冲突。
- A 的基线早于 C 的生产发布快照、素材允许清单与最新展馆光色修正，不能用 A 的整套入口替换当前 App 后直接公开。

## 推荐接合方式与成员 A 的下一批出口

保留一套现代地理投影、地形源和 C2 宏观阶段时钟。全局与瑞金入场构图由 C 负责；局部精细空间由 A 通过公共组件或可挂接图层提供。不要将两个完整地图渲染器叠在同一画布或复制 A 的内部实现。

1. A 从最新 main 同步，先解决重复迁移路径，保留所有高程/水系/字体/纹理的来源与哈希。不要自动删掉任何一方历史资料。
2. A 提供公共 `RegionalObservation` 一类入口（最终名称双方约定），包含桥谷、支持的画卷、退出回调。当前 `BridgeObservation` / `PanoramaObservation` 还是内部实现，C 不越过 index.ts 导入。
3. 植被、岩石和单位层可提供不拥有第二地形的挂接 API：由 C 注入 `projectGeo`、`heightAt`、可见现代区域及已发布阶段输入；A 图层返回 update / suspend / dispose。当前仅导出完整 atlas renderer，不能声称已有此细粒度接口。
4. 打开局部观察时保存当前相机、暂停背景绘制，关闭后释放局部资源并恢复原视角。观察不能自行完成 C1，也不能推进第二历史时钟。
5. 泸定 C1 渲染器继续使用公共 v2 Props；隔离内存样本验证真实 ready、段落、互动、终点和迟到 run 回调。正式历史、照片权利与两名真人复核仍由原发布门禁控制。
6. 在独立集成 PR 解决冲突后重跑 C0/C1/C2、生产 HTTP/素材隔离与 A 资源释放组合测试。#17 在更新基线和检查前不合并。

本轮 C 的瑞金构图、厚切面与高程艺术配色没有复制或修改 A 的 Three.js 核心代码；A 最新成果已单独开放给用户查看，接合仍属于待协调的后续工作。
