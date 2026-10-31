# 三人 GitHub 协作

## Phase 3 · C0 公共契约

C0 使用新的独立 PR，目标 main，等待用户审核后再决定合并，不再记入已经合并的 PR #3。公共类型与接线方式见 [v2 接线说明](architecture/v2-integration-guide.md)。v1 数据和组件继续有效，正式 dataset.json 仍由 B 管理；C0 没有代替 A/B 提交实现或史料。

A/B 可先准备 v1 兼容工程和隔离小样；C0 合并后同步 main，使用相同的 experienceId、互动 ID、阶段、回调与审核门禁。不要各自新增全局时钟或完成存储，也不要从其他 feature 的内部文件取状态。

仓库：`https://github.com/ArthurLloyd/long-march-digital-sandbox`，目标为 Private，稳定分支 main。由所有者邀请另外两位成员。初始化提交直接到 main；后续全部通过 PR。

## 开工命令

成员 A：

```powershell
git clone https://github.com/ArthurLloyd/long-march-digital-sandbox.git
cd long-march-digital-sandbox
git switch -c feat/3d-scene
npm ci
npm run dev
```

成员 B 使用相同克隆与运行命令，分支命令改为：

```powershell
git switch -c feat/history-system
```

成员 C 从 main 创建：`git switch -c feat/app-shell`。不需要预先创建或推送其他成员的分支。已有同名分支时先检查，使用 `git switch`，不要强制重建。

## 每日同步与提交

确认工作区干净（有改动先提交自己的工作），在自己的分支执行：

```powershell
git fetch origin
git merge origin/main
```

处理冲突时联系文件负责人；不通过覆盖对方文件来“解决”。检查结果后只添加自己的文件、提交，再推送个人分支：

```powershell
git status
git add <本次修改的文件>
git commit -m "feat(scene): initialize 3d renderer"
git push -u origin feat/3d-scene
```

B/C 替换为对应分支。使用 Conventional Commits：`feat(history): add reviewed event records`、`feat(ui): implement timeline shell`、`fix(scene): correct camera interaction`、`docs(history): update source registry`、`test(data): add route validation tests`。

## 文件所有权与接口变更

所有权完整表见 AGENTS.md。A 专注 scene、terrain、textures；B 专注 history、verified、sources、history-review、archive；C 管理 app、components、timeline、shared、hooks、styles 和工程配置。

A/B 不得自行修改入口、根配置、全局 CSS、contracts、lockfile 或 CI。必要变更在 PR 中说明，由 C 审核协调。C 也不得擅自修改已审核史实。各模块通过 index 与 contracts 对接，不相互导入内部文件。

## PR 合并

1. 目标 main，填写 PR 模板，列出行为、接口、历史数据与授权变化。
2. 本地通过 lint、typecheck、test、validate:data、build 与 format:check；附 UI 截图或不适用说明。
3. C 审核工程与公共接口；历史数据还须满足 HISTORY_INTEGRITY 的两名不同人员独立复核。AI、机器通过、普通工程批准都不能替代史实复核。
4. CI 通过后由 C 合并；有争议的史实或几何保持 unpublished，不用猜测消除冲突。

推荐所有者在 GitHub Settings → Rules → Rulesets，为 main 禁止强推与删除、要求 PR、要求 Quality checks；根据私有仓库套餐支持情况设置。历史数据两人复核还需人工执行，因为“两个字段”并不是 GitHub 身份验证。本次仅配置 CI 和协作文档，未自动配置服务器分支保护，也未邀请成员。
