# 新版展馆完整接入：运行与更新仓库

版本：2026-11-02 完整展出接入版。基于你上传的最新源码，GitHub ZIP提交标识为 `ab7e438296c1ba571211efa7f5227a001cc1f3d9`。本说明为同步队友ab7e438更新后的版本。使用带ab7e438标识的新同步包，替代旧更新包；不要叠加应用。核对细节见EXHIBITION-SYNC-NOTES.md。

## 这次打开哪个地址

正常运行后直接打开首页：`http://127.0.0.1:5173/`，端口以终端为准。不需要打开review地址、不需要切候选模式。开发运行和构建预览均包含现有全部专题内容与十张人物图片。

进入“开启征程 → 立即进入”后：

- “历史专题”：六张专题卡、全部阶段、人物、地点、双方部队文字资料、补充事件。
- “阅读××”：立即显示完整正文、时间、地点与出处，不要求先完成互动。
- “开始图文互动”：运行现有C1控制器，主动阅读五段、完成两项互动并确认解释，最后主动完成；可以退出、重播。
- 泸定桥、遵义会议、雪山正文的“观看场景演绎”：进入队友已经制作的对应区域艺术场景与现有短片；返回后恢复该事件资料。观看艺术场景本身不冒充完成B的教学互动。
- “人物”：毛泽东、周恩来、朱德、刘伯承、杨成武均显示真实照片与AI艺术形象；黄开湘为文字条目。
- “资料来源”：23条已整理记录。照片年代、AI属性与来源保留，已有审核字段不改为虚构通过。

历史路线仍未取得完整几何，因此不编造路线或部队位置。地图、地形、现有视频和A的区域场景沿用上传版本。

## 方式一：单独运行完整源码包

把完整源码ZIP解压到新目录，例如 `D:\Competition\long-march-exhibition-full`，确认package.json就在该目录。它没有.git，不是你原来的Git工作区。

```powershell
cd D:\Competition\long-march-exhibition-full
$env:Path = "D:\Competition\node-v24.22.2-win-x64;" + $env:Path
npm.cmd ci
npm.cmd run dev
```

想检查构建后效果：先Ctrl+C停止开发服务，再运行：

```powershell
npm.cmd run build
npm.cmd run preview
```

打开终端显示的预览地址，默认4173。该版本构建也包含正文与人物图。

## 方式二：更新原仓库并上传（推荐使用增量更新包）

不要删除原仓库，不要用完整源码目录替换.git。先把小更新包解压到仓库外，例如 `D:\Competition\B-exhibition-update`。补丁文件 `exhibition-update.patch` 应在这个目录下。

先停止服务，并检查原仓库：

```powershell
cd D:\Competition\long-march-digital-sandbox
git status --short
```

如果有输出，先保留并提交本人修改，不能直接覆盖。工作区干净再逐条执行：

```powershell
git fetch origin
git switch -c feat/history-exhibition origin/main
git apply --check D:\Competition\B-exhibition-update\exhibition-update.patch
```

如果同名新分支已经存在，改用 `git switch feat/history-exhibition`，先确认它的基线；不要强制重建。补丁检查报错就停下，说明本地或队友又有重叠变化，需要按报错合并；不要用--reject或强制覆盖。

检查命令没有输出表示通过，再应用：

```powershell
git apply D:\Competition\B-exhibition-update\exhibition-update.patch
$env:Path = "D:\Competition\node-v24.22.2-win-x64;" + $env:Path
npm.cmd run dev
```

此次没有修改package.json和package-lock.json；原仓库依赖已装好时无需再装。此前若队友另改了锁文件，则按同步后的版本运行npm.cmd ci。

## 检查后提交

Ctrl+C停止开发服务后逐条执行检查；有失败先处理，不继续提交：

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run test
npm.cmd run validate:data
npm.cmd run build
```

查看差异并只添加本次清单中的文件：

```powershell
git --no-pager diff --stat
git add --pathspec-from-file=docs/history-review/exhibition-update-files.txt
git --no-pager diff --cached --stat
git commit -m "feat(history): integrate full content into exhibition"
git push -u origin feat/history-exhibition
```

GitHub创建PR：base=main，compare=feat/history-exhibition。标题“完整接入六主题正文、人物素材与教学互动”。本轮跨模块变更是按你的明确集成要求实施，PR中请让C重点查看App入口、目录、构建资源清单和场景返回路径。

PR说明可写：

> 正常展馆与构建预览直接展示现有全部B内容，不再依赖独立审阅页。六专题正文可直接阅读，十张人物图片可见，C1图文互动可完成和重播；三个重点故事接入既有A区域演绎并支持返回资料。保留现有地图与资产，未修改历史数据或代签审核。构建采用明确的完整展出策略，仍排除开发页、测试样本和未登记资源。检查结果见exhibition-integration-report.md。

等GitHub检查通过再合并main。上传代码是推送改动后的源码，不是把ZIP上传到GitHub文件列表。
