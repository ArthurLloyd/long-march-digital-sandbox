# 四渡赤水更新：运行与提交

## 先预览完整代码（最容易）

解压 `Long_March_Chishui_Full.zip` 到 `D:\Competition\chishui-preview`。进入其中含 package.json 的目录，运行：

```powershell
cd D:\Competition\chishui-preview\long-march-chishui
$env:Path = "D:\Competition\node-v24.22.2-win-x64;" + $env:Path
npm.cmd ci
npm.cmd run dev
```

打开终端 Local 地址。正常进入展馆，选择“自由探索山河”，在区域浏览中选择赤水流域，展开“区域体验”并点击“仅体验本区域”，即打开“战役沙盘”。这不是独立审阅页，不需要特殊网址。完整包没有 .git，因此提交仓库时请使用下面的增量补丁流程，保留你电脑原仓库的 .git。

## 在原 Git 仓库应用增量包

将 `Chishui_Sandbox_Update.zip` 解压到 `D:\Competition\Chishui-update`，使补丁位于 `D:\Competition\Chishui-update\chishui-sandbox.patch`。

```powershell
cd D:\Competition\long-march-digital-sandbox
git status --short --branch
```

如果有未提交修改，先保留并提交自己的工作，不要覆盖、清空或强制重置。干净工作区下：

```powershell
git fetch origin
git switch -c feat/chishui-battle-sandbox origin/feat/exhibition-journey-integration
git apply --check "D:\Competition\Chishui-update\chishui-sandbox.patch"
```

这次完整代码以队友提供的行进集成分支为基线，因此默认从该分支开自己的新分支。若队友已把行进集成合入 main，可以把上面的最后一个分支参数换成 `origin/main`。如果远程分支不存在，或补丁检查报错，停止并核对当前代码，不跳过检查、不通过覆盖整仓解决。

检查没有输出，表示通过。再应用：

```powershell
git apply "D:\Competition\Chishui-update\chishui-sandbox.patch"
$env:Path = "D:\Competition\node-v24.22.2-win-x64;" + $env:Path
npm.cmd ci
npm.cmd run dev
```

## 检查后提交

用 Ctrl+C 停止开发服务。以下每条成功后再执行下一条：

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run validate:data
npm.cmd run build
```

本次文件的格式检查：

```powershell
npm.cmd exec -- prettier --check src/features/scene/integration/chishui src/features/scene/integration/RegionalObservation.tsx docs/history-review/chishui-sandbox
```

若整套测试因电脑负载触发默认 5 秒超时，可用 `npm.cmd run test -- --maxWorkers=2 --testTimeout=30000` 重跑；不需要修改项目测试配置。

提交仅包含本次列出的文件：

```powershell
git add --pathspec-from-file=docs/history-review/chishui-sandbox/files.txt
git --no-pager diff --cached --stat
git commit -m "feat(scene): add four-crossing Chishui battle sandbox"
git push -u origin feat/chishui-battle-sandbox
```

在 GitHub 建 Pull Request：compare 为 feat/chishui-battle-sandbox；base 默认选 feat/exhibition-journey-integration（若它已合入 main，base 选 main）。这样 PR 只审本次沙盘修改。确认检查通过后再合并。没有替你执行推送或合并。

不要上传整个 ZIP、便携 Node、node_modules 或 dist；不要删除原仓库 .git；不要使用 reset --hard、clean -fd 或强制推送。
