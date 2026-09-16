# Android Tool Suite 产品与架构路线图

状态：现行路线
更新日期：2026-08-31
实施范围：Android-first；其他平台只保留协议扩展点

## 1. 产品定位

Android Tool Suite（ATS）定位为“单一宿主中的个人工具平台”：用户只安装一个主应用，在其中安装、运行、备份和更新多个工具；所有工具采用统一声明式 UI，简单页面使用 Host renderer，复杂页面使用隔离 WebView renderer。普通插件只能通过用户可管理的稳定 Capability API 工作；需要 Android 或 Shizuku 宿主身份的插件使用签名、全信任的 `trusted-provider` 类型，但仍可同时贡献普通插件功能。

插件运行时已经把普通插件边界从 Android AAR／Compose 改为平台无关契约；Phigros 与抽卡均已迁移到 format v3，API1 可执行路径退出。AI 开发体验、ATS 自有发布平台和跨平台宿主仍是独立工作流，不作为运行时迁移的附带功能塞进同一验收里程碑。

## 2. 优先级与依赖

| 优先级 | 工作流 | 启动条件 | 不纳入本工作流的内容 |
| --- | --- | --- | --- |
| P0 | 插件运行时与剩余数据迁移 | 当前持续推进 | AI Agent、社区平台、iOS 宿主 |
| P1 | AI 插件开发体验 | 清单、Capability、数据与任务契约冻结 | 发布社区、运行时自主改写插件 |
| P2 | ATS 发布平台 | 包签名／来源证明稳定，AI 草稿流可产出可审查构建 | 用平台反向定义运行时契约 |
| P3 | 跨平台宿主 | Android 运行时稳定且出现真实非 Android 需求 | 当前周期实现 iOS、Desktop 或 KMP 工程 |

优先关系是 `插件运行时与迁移 > AI 开发 > 发布平台 > 跨平台`。P1、P2 可以先写契约和原型，但不得占用 P0 的发布门槛，也不得要求运行时为尚未验证的社区功能增加耦合。

各路线的可执行任务、依赖与完成条件统一维护在 [follow-up-task-list.md](follow-up-task-list.md)。路线图负责确定优先级，任务清单负责跟踪实施，不在两处重复定义架构契约。

## 3. 四条独立路线

### 3.1 插件运行时（P0）

以 [plugin-runtime-architecture.md](plugin-runtime-architecture.md) 为唯一架构与迁移文档。清单、Host/WebView renderer、Capability 权限、全信任 Provider、Storage/Secret/Scheduler、外置 Shizuku、Phigros 与抽卡迁移及 API1 退出实现均已落地；当前只剩全量发布验收与正式发布，P0.4 性能工作按用户要求暂缓。

首轮外部调研与项目映射见 [plugin-runtime-research-report.md](plugin-runtime-research-report.md)。冻结决策已合并到架构文档；UI 和后台继续使用不同执行器，API 24–25 不用隐藏 WebView 补齐 JavaScript worker。

### 3.2 AI 插件开发（P1）

以 [ai-plugin-development-plan.md](ai-plugin-development-plan.md) 为独立计划。AI 是开发代理和审查辅助，不是普通插件运行时的隐式权限层；生成结果必须落为确定性源码、清单、测试和可复现构建，经过人工批准后才能安装或发布。

### 3.3 ATS 发布平台（P2）

以 [publication-platform-plan.md](publication-platform-plan.md) 为独立计划。现有 GitHub Release、Pages 和签名索引继续作为近期发布路径；未来 ATS 平台先支持私有草稿和不可搜索发布，再扩展公开社区。GitHub 是可选适配器，不是永久存储模型。

### 3.4 跨平台（P3）

本周期不实现 iOS。清单、RPC、Capability、Dataset、任务和错误模型继续避免 Android 类型，并保留 `platform`、Adapter、Provider 和密钥保护类型扩展点。未来 iOS 需要独立评估插件分发、代码执行、后台任务和密钥策略，不能假定复用 Android 的 APK、动态原生 Provider 或发布流程。

## 4. 当前实现取舍

| 当前内容 | 结论 | 去向 |
| --- | --- | --- |
| 已正式发布的 Migration Bridge 与统一 `.atsbackup` v3 | 保留为迁移和数据管理基线 | 以 1.6.1 同包名正式版读取现有私有数据；剩余插件完成迁移并通过迁移、恢复、业务与降级测试后退役桥接 API |
| Dataset ID、依赖、格式版本、恢复模式和保护方式 | 保留语义 | 固化到平台无关 schema，替换 `Activity` 接口 |
| API1 插件的导入、导出、删除适配器 | 已删除 | 历史归档仅识别非执行元数据，不再安装或装载 `plugin.apk` |
| Host + 通用 Sandbox 双 APK、远程 Compose UI | 放弃实现 | 原型分支只保留研究证据；当前实现改用声明式 UI、隔离 WebView 和可替换 Backend |
| Capability Broker、数据 staging、回滚思想 | 重新设计 | 以版本化高层契约和宿主管理的服务重写 |
| AndroidX WebView、JavaScriptEngine 与 WorkManager | 采用平台 Adapter | WebView 只渲染可见 UI；JavaScriptEngine 仅在 API 26+ 且设备支持时执行 worker；WorkManager 保存持久调度 |
| DeepSeek Harness 的 service seam 与 reversible effect | 采用语义 | Definition / Provider / Consumer 分离；注册、订阅、任务和 UI contribution 必须可撤销 |
| AI Provider 与 Developer Agent 混为一体 | 放弃 | AI Provider 是插件可调用能力；Developer Agent 是受审查的开发工具，两者分开授权和发布 |
| 仅依赖 GitHub 的发布体系 | 中期替换 | 保留 GitHub Adapter，同时建立内容寻址对象、不可变制品和 ATS 元数据服务 |

## 5. 组合发布原则

- 每条路线维护自己的版本、退出条件、风险和回滚方案。
- 只有契约稳定后，上层工作流才能依赖它；AI 或平台原型不得成为 Runtime v2 合并条件。
- Android 交付先形成可安装、可回退的端到端闭环，再开始下一阶段。
- 跨平台只通过契约测试验证“没有不必要的 Android 类型”，不以空壳 iOS 工程冒充进度。
