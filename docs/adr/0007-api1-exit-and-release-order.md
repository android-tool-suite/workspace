# ADR-0007：API1 退出、回滚窗口与发布顺序

- 状态：Accepted
- 日期：2026-08-21
- 影响阶段：Runtime v2 全阶段

## 背景

当前正式版 1.6.1 使用 format v2 `plugin.apk`、`ToolPlugin`、`PluginHost` 与同进程 Dex 装载，并已
交付 `.atsbackup` v3 Migration Bridge。直接替换会让现有工具和私有数据失去可回退路径；无限期
双运行又会产生两套 API、存储和 UI 规范。

## 决策

### 发布窗口

计划使用以下兼容里程碑；具体 patch 号可因修复增加，但语义不变：

| Host | 运行时策略 | 官方插件策略 |
| --- | --- | --- |
| 1.6.x | API1 + Migration Bridge | format v2，保持现状 |
| 1.7.x | API1 + V2 Web Runtime | 发布 V2 sample；API1 仍可安装/运行 |
| 1.7.x | API1 + V2 声明式 renderer／权限／Provider／Worker | Shizuku UI 与 Provider 合并外置、无障碍 Tool 使用 V2；其余 API1 |
| 1.9.x | API1 + V2 Storage/Dataset | Phigros、抽卡分析逐一迁移；停止新增 API1 功能 |
| 2.0.x | V2 为默认，API1 兼容运行只读维护 | registry 停止接受新的 format v2 Release |
| 2.1+ | 删除 API1 代码和 Bridge | 只接受 format v3；保留只读旧备份导入器 |

API1 删除必须同时满足：

- 三个官方外部插件都已有稳定 V2 Release；
- 最后一个迁移插件发布后至少经过两个稳定 Host Release 且不少于 90 天；
- 每个 Dataset 已完成空环境恢复和一次降级演练；
- 仍能从 `.atsbackup` v3 只读导入到 V2，不要求先安装 API1 插件；
- Debug/Release registry 已拒绝新 API1 元数据。

### 单向迁移与回滚

- 首次迁移前自动生成带摘要的 API1 数据归档；
- V2 数据写入新 generation，不双写回 API1 私有存储；
- Host 回滚到旧版本时旧 API1 数据保持原状，V2 generation 不被旧 Host 删除；
- 用户显式回退插件时，先检查 Dataset 可读范围；不兼容则要求从迁移前归档恢复，不能静默降级；
- Migration Bridge 在 2.1 删除后保留最小只读 v2/v3 archive decoder，删除 API1 `Activity` adapter
  和双向导出入口。

### 跨仓库发布顺序

每个纵向阶段按以下顺序：

1. 发布/验证 Host 对新旧格式和 Provider/Capability 契约的兼容版本；
2. 发布需要的 Provider generation，并验证 health 与回退；
3. 逐个发布 Tool；每个 Tool 都完成版本、CHANGELOG、数据和设备验收；
4. plugin-registry 在组件资产可获取后更新 schema/索引；
5. 外层超级项目最后锁定已经推送、可复现构建的组合。

不得提交只有外层 gitlink、远端却不存在对应组件提交的集成基线。

### 旧 API 冻结

- 1.7 起 `ToolPlugin`/`PluginHost` 只接受兼容性和迁移修复，不新增能力；
- 新工具不得使用 `runShellCommand()`；
- 新 Capability、任务、Dataset 和 Web UI 只进入 V2 contract；
- API1 UI 继续遵循现有 Compose 规范，直到对应插件迁移完成。

## 结果

Runtime v2 有明确终点，不把 Bridge 和两套插件 API 变成永久架构；同时每个正式阶段都能安装、
回退和读取旧数据。版本号是发布意图，不替代每个仓库的实际版本/CHANGELOG 检查。
