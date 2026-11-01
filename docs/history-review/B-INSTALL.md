# 放入本机项目与后续提交

这是针对 `78c315ae92ba55b09ae12e2cad87fd281c4b8801` 的累积B文件包；不是完整仓库，不替换 `.git`、依赖和A/C代码。文件列表与SHA-256见 B-FILE-MANIFEST.json。

## 先放文件，不上传

1. 下载新ZIP并解压到仓库外，例如 `D:\Competition\B-package`；确认其中能直接看到 `src`、`docs`、`public`。
2. 进入原仓库，运行 `git status --short --branch`、`git rev-parse HEAD`。核对分支是 `feat/history-system`、基线匹配。已有修改先保留并逐文件比较；main若已更新，先核对重叠变更，不直接覆盖。
3. 把原仓库中 `docs.zip`、`public.zip`、`scripts.zip`、`src.zip` 移到仓库外保存；它们是打包上传文件，不提交Git。
4. 将本包 `src`、`docs`、`public` 中的具体文件 **合并复制** 到原仓库相同路径。不要先删除原目录；不要覆盖整份仓库。遇到本人或同学已经修改过的同名文件，比较后合并。manifest列出原始快照哈希，可用于识别冲突。
5. 打开 `docs\history-review\B-START-HERE.md` 查看预览步骤。

## 本机检查

```powershell
cd D:\Competition\long-march-digital-sandbox
$env:Path = "D:\Competition\node-v24.22.2-win-x64;" + $env:Path
node -v
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run validate:data
npm.cmd run build
npm.cmd run format:check
```

已有依赖且锁文件未变，不需要再运行安装命令。本包未修改package/lockfile，也不需要安装另一套Node。保留现有根忽略文件；本机format检查如果扫到dist，先核对原忽略规则，不格式化构建产物。

原样全项目有一项C旧空态按钮断言待更新，详见 C-TEST-HANDOFF.md。B专属26项测试通过；供C审阅的补丁在隔离副本应用后，全项目258项通过。不要删测试、改发布状态或改生产门槛消除失败。

## 确认后才更新GitHub

本轮先查看效果，无需立即上传。决定提交时，在原项目先看：

```powershell
git diff --stat
git diff
```

确认仅包含本人B修改后再暂存。以下目录如果有同学其他变更，改成逐文件添加，不使用 `git add .`：

```powershell
git add src/features/history/
git add src/data/verified/dataset.json
git add docs/sources/B-SOURCE-REGISTER.md
git add docs/sources/B-ASSET-AND-SPATIAL-GAPS.md
git add docs/history-review/
git add public/assets/archive/portraits/
git diff --cached --stat
git diff --cached
git commit -m "feat(history): deliver six-topic review and portrait pairs"
git push -u origin feat/history-system
```

到GitHub创建PR：base `main`，compare `feat/history-system`，关联Issue #2。PR说明工程与候选内容范围，附检查结果和未完成验收。C先审阅独立测试补丁、集成A场景和B组件；真人审核通过后再另行发布内容。不要把候选 `unknown` 素材直接部署公开站点。
