# 依赖状态（2026-10-31）

使用 npm 官方 registry 获取稳定发布版本，package.json 精确固定直接依赖，package-lock.json 锁定依赖树。React 19.3.1 与 R3F 9.8.2 的 peerDependencies 匹配。未安装 GSAP、Zustand 或 Drei，本阶段不需要。

初始化审计实际结果：

- `npm audit --omit=dev`：0 个告警。
- `npm audit`：12 条 moderate 依赖链审计项，根因是开发依赖 minimatch 的 globparts amplification 拒绝服务问题（[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)），沿 ESLint／typescript-eslint 工具链传播，属于一个根因的多个受影响依赖条目。
- 未报告 high／critical。此结果不等于独立安全审计。

已使用受支持的 ESLint 10 与兼容插件。没有为消除计数而执行 `npm audit fix --force`、降级旧工具或强制替换跨主版本的内部依赖。上游兼容修复发布后由 C 通过独立依赖 PR 处理，再运行完整检查。CI 限定只读 contents 权限与 10 分钟超时；这些限制不代表漏洞已经修复。

完整直接依赖版本以 package.json 为准，完整解析版本以 package-lock.json 为准。
