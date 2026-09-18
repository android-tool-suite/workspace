# 分支与发布

外层工作区及六个组件仓库均以 `main` 为主分支。组件日常开发可以直接在各自的 `main` 上进行；需要隔离并行工作或单独评审时，再按需创建 `codex/*` 分支，不要求长期维护固定用途的开发分支。提交到 `main` 不等于发布，Debug 与正式版仍由显式标签触发。

历史存档分支不参与日常集成，清理时按其保留目的单独判断。保留含未提交修改的工作树；删除工作树前检查其自身和全部嵌套仓库。组件分支独立管理，外层 gitlink 只在组件已经验证、提交并可从远端获取后更新。

外层 `main` 维护已验证的组件集成组合；单组件日常开发仍在对应仓库进行，不因直接使用组件 `main` 就同步更新外层 gitlink。

## 手动 Debug 发布

组件 `ci.yml` 只验证并上传 Actions 构建产物。推送 main、开发分支或手动运行 CI 均不会创建 Debug Release。只有显式推送 `debug-v<版本号>` 标签触发 `debug.yml`：

```powershell
# 在需要发布的组件仓库内执行，先确认 main 和验证结果。
git switch main
git pull --ff-only
$tag = "debug-v2.0.0" # 主体示例：必须与当前组件 versionName 一致
git tag $tag
git push origin "refs/tags/$tag"
```

发布工作流严格核对标签版本与组件版本，并在元数据中记录实际构建提交，重新运行组件构建／测试，生成元数据和 SHA-256 校验和，先上传草稿资产，再公开预发布，最后发送索引更新事件。宿主使用稳定 Debug 签名；Shizuku Provider 使用发布者签名。标签不移动、资产不覆盖，不再创建滚动 `debug` 标签。

跨组件发布先将宿主和索引主分支更新到验证后的提交，再发布插件，确保 Shizuku 的 SDK／CLI 来源可获取。失败时检查 Actions 日志；若仅索引通知失败，手动运行索引仓库的 `pages.yml`，无需重新创建 Release。

新 Debug 的工作流、资产、元数据和校验和都验证成功后，可删除该组件旧 Debug Release 及对应 Debug tag，再手动运行 `plugin-registry` 的 `pages.yml` 刷新目录。默认保留策略为每个组件一个最新 Debug；正式 `v<versionName>` 和 `plugin-sdk-v<version>` 标签保留。删除不是普通 CI 的副作用。

## 正式版与 SDK

正式发布继续手动推送 `v<versionName>`，必须匹配构建版本。SDK 的 `plugin-sdk-v<version>` 标签标识相应 SDK 源码，供可信 Provider 的正式构建引用，不应触发应用发布。发布前核对版本、versionCode 与 CHANGELOG；Debug、预发布、正式发布均算发布。外层工作区不额外复制组件 Release。
