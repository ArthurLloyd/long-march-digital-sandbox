# 第二版运行与合入仓库

## 先看完整版本

解压 `Long_March_Chishui_V2_Full.zip` 到 `D:\Competition\chishui-v2-preview`，进入其中含 package.json 的目录：

```powershell
cd D:\Competition\chishui-v2-preview\long-march-chishui-v2
$env:Path = "D:\Competition\node-v24.22.2-win-x64;" + $env:Path
npm.cmd ci
npm.cmd run dev
```

打开终端 Local 地址，点击“开启征程 → 立即进入”，等地图准备完成后点击“四渡赤水行军”。地图右侧直接出现战况讲解；可暂停、拖动，也可点击讲解步骤。选择“扎西会议 · 决议与整编”一章可读扎西会议的背景与作用。查看两个一渡地点时，分别标为土城与猿猴场。

赤水“区域体验 → 仅体验本区域”仍可进入近景战役沙盘，该处也同步增加了蓝色追堵线与因果正文。

## 更新原 Git 仓库

完整预览包没有 .git。不要通过覆盖整个原仓库提交。把 `Chishui_Battle_V2_Update.zip` 解压到 `D:\Competition\Chishui-v2-update`。

```powershell
cd D:\Competition\long-march-digital-sandbox
git status --short
```

若有文件列出，先保留并提交你自己的修改，再切分支；不要清空工作区。工作区干净后，在当前包含队友行进集成版的分支上创建自己的新分支：

```powershell
git switch -c feat/chishui-battle-v2
$chishuiPatchName = if (Test-Path "src\features\scene\integration\chishui\ChishuiSandbox.tsx") { "from-chishui-v1.patch" } else { "from-original.patch" }
$chishuiPatchPath = Join-Path "D:\Competition\Chishui-v2-update" $chishuiPatchName
git apply --check "$chishuiPatchPath"
```

两个补丁分别在“上一版沙盘代码”和“队友原行进集成快照 8fb55a8”验证。若检查报错，就停在这里，提供 git status --short --branch 和 git rev-parse HEAD；不要跳过检查或覆盖文件。仅有 event-map-anchors 旧分支而没有行进集成的代码，不是本版宏观讲解的完整基线。

检查没有输出，才执行：

```powershell
git apply "$chishuiPatchPath"
$env:Path = "D:\Competition\node-v24.22.2-win-x64;" + $env:Path
npm.cmd ci
npm.cmd run dev
```

本轮要看的是正常展馆地图上的“四渡赤水行军”，不只是进入近景区域场景。

## 验证和提交

Ctrl+C 停止开发服务器后，逐条检查，上一条成功再继续：

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run test -- --maxWorkers=2 --testTimeout=30000
npm.cmd run build
```

检查并提交本轮列出的文件：

```powershell
git add --pathspec-from-file=docs/history-review/chishui-sandbox/files.txt
git --no-pager diff --cached --stat
git commit -m "feat(chishui): explain pursuit and battle decisions on the map"
git push -u origin feat/chishui-battle-v2
```

GitHub 新建 PR，compare 选 feat/chishui-battle-v2。若队友的 feat/exhibition-journey-integration 尚未合入 main，base 选该行进集成分支；已合入则 base 选 main。等检查通过再合并。不上传 ZIP、Node、node_modules 或 dist，不替换原 .git，不强制推送。
