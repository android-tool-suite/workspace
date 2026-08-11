# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 先读 AGENTS.md

[AGENTS.md](AGENTS.md) 是本工作区的权威协作规则，涵盖版本提升与 CHANGELOG 要求、提交顺序、清理边界和交付检查。本文件只补充命令速查与架构全貌，遇到冲突以 AGENTS.md 为准。

## 仓库形态

这是**集成工作区**，不是单一 Gradle 工程。根目录没有 `settings.gradle`，也没有 Gradle Wrapper——所有 Gradle 命令必须用系统 `gradle` 并显式指定 `-p <子模块目录>`。

五个子模块是彼此独立的权威源码仓库，各自维护版本号、CHANGELOG 和发布边界：

| 路径 | 角色 |
| --- | --- |
| `app/` | 宿主应用 + `plugin-sdk`（发布给插件的 AAR） |
| `plugins/accessibility-grant/` | 无障碍授权插件 |
| `plugins/phigros-advisor/` | Phigros Data Studio 插件 |
| `plugins/gacha-analysis/` | 原神/星穹铁道抽卡分析插件 |
| `plugin-registry/` | Python 索引生成器 + ECDSA 签名 + GitHub Pages 发布中心 |

**只在这些场景使用外层工作区**：联调未发布的 `plugin-sdk`、完整兼容性验收、集中生成可追溯产物、提升已验证集成基线。日常开发单个组件时直接进入对应子仓库即可，普通功能提交不应同步更新外层 gitlink。

## 环境要求

JDK 17、Android SDK 35、Gradle 8.9+、Python 3（仅索引测试需要）、minSdk 24。命令均为 PowerShell，从工作区根目录执行。

## 常用命令

### 全量构建（跨仓库改动与正式验收）

```powershell
.\tools\build-all.ps1              # 索引测试 → 主体 → 临时 SDK → 三个插件 → 集中产物
.\tools\build-all.ps1 -NoClean     # 仅开发期增量
.\tools\build-all.ps1 -SkipTests   # 仅临时排查，禁止用于验收
```

产物集中到 `artifacts/`，含四个二进制、`SHA256SUMS.txt` 和记录五个子模块提交号的 `build-manifest.json`。

### 单组件构建

```powershell
gradle -p app :app:assembleDebug
gradle -p app clean collectArtifacts
gradle -p plugins\accessibility-grant clean collectArtifacts
gradle -p plugins\phigros-advisor testDebugUnitTest
gradle -p plugins\gacha-analysis clean collectArtifacts
```

### 运行单个测试

```powershell
gradle -p plugins\phigros-advisor testDebugUnitTest --tests "*PhigrosRksTest"
gradle -p plugins\gacha-analysis testDebugUnitTest --tests "*GachaAnalysisTest"
python -m unittest discover -s plugin-registry/tests -v
python -m unittest discover -s plugin-registry/tests -v -k test_release_history_filters_drafts
```

目录名带连字符，不能用 `python -m unittest 包路径.测试类` 的形式，筛选单个用例请用 `discover -k`。

只有两个插件有 JVM 测试（`PhigrosRksTest`、`GachaAnalysisTest`，各一个文件）；宿主和无障碍插件没有单元测试，靠构建 + 设备验证。

### 联调未发布的 plugin-sdk

插件通过 Maven 坐标 `com.androidtoolsuite:plugin-sdk` 编译，因此改动 SDK 后必须先发布再构建插件。**顺序不能颠倒**：对 `app` 执行 `clean` 会删除 `plugin-sdk/build/repository`。

```powershell
gradle -p app :plugin-sdk:publishReleasePublicationToPluginSdkRepository
gradle -p plugins\phigros-advisor `
  -PatsSdkRepository=..\..\app\plugin-sdk\build\repository `
  testDebugUnitTest clean collectArtifacts
```

`publishToMavenLocal` 也可用，但临时仓库能避免插件误用旧的 Maven Local 缓存。

### 工作区状态与设备安装

```powershell
.\tools\workspace-status.ps1                # SourceDirty / LockState / GitlinkStaged / PublishState / BaselineState
.\tools\workspace-status.ps1 -FailOnDirty   # CI 使用
.\tools\install-latest.ps1 -Serial <序列号> # 主体在前，插件在后
.\app\tools\adb-debug.ps1 -Command status   # status/list-plugins/import-plugin/navigate/reset-state 等
```

## 架构要点

### 插件加载链路

外部插件是**独立的 Android application 工程**，产物 `.atsplugin` 是 zip：根目录必须同时有 `manifest.json` 和重命名后的 `plugin.apk`。宿主 `ExternalToolFactory` 用 `DexClassLoader` 加载 `plugin.apk`，反射实例化清单里 `plugin.entryClass` 声明的无参构造类，要求它实现 `ToolPlugin`。加载前会把 APK 文件置为只读。

关键约束：**插件不得添加指向 `app` 的 Gradle project 依赖**，只能 `compileOnly` 依赖 SDK 的 Maven 坐标。打包必须走现有的 `generatePluginManifest` → `packagePlugin` → `collectArtifacts` 任务链，`manifest.template.json` 的版本占位符由构建注入，不要维护第二份硬编码版本。

### plugin-sdk 是唯一公开边界

`app/plugin-sdk/` 只有 9 个源文件，但它定义了宿主与所有外部插件之间的全部契约：

- `ToolPlugin`：插件入口，声明 id/title/version/dependencies，创建主页小部件与工具页 View。
- `PluginHost`：宿主回传给插件的能力面，包括 Shizuku 状态查询、`runShellCommand(...)`（复用宿主已绑定的 Shizuku UserService）、插件启停与导入导出。
- `SuiteDesignSystem.kt` / `UiKit.java`：共享设计系统。宿主和所有插件的页面、空态、加载态、错误态、拖拽态必须复用它，不要在单个插件里复制一套相近的 token。

改动 SDK 公开 API 时需检查二进制兼容性，更新 `app/gradle.properties` 的 `pluginSdkVersion`，同步各插件 `gradle.properties` 的 `atsPluginSdkVersion`，并重新构建主体和三个插件。

### 宿主结构

宿主代码高度集中：`MainActivity.java`（约 100KB）承载 Activity 壳、插件管理、导入导出与迁移逻辑，`HostAppUi.kt`（约 53KB）承载全部 Compose 界面。其余按职责分层：

- `plugin/store/ExternalPluginStore`：插件清单/代码/启停状态持久化，`installPlugin` → `confirmInstall` / `rollbackInstall` 构成事务，启动时 `recoverInterruptedInstalls` 恢复中断安装。**修改导入、更新、删除流程时必须保持原子性**，不得留下半写入的包或清单。
- `plugin/runtime/ToolRegistry`：内置插件注册表（当前只有 `ShizukuPlugin`）。
- `update/`：`UpdateClient` 校验索引 ECDSA 签名与资产 SHA-256，`UpdateCatalog` 解析历史目录，`PluginUpdatePolicy` 判定升级/降级是否允许。
- `migration/HostMigrationArchive`：`.atsbackup` 宿主布局与插件迁移包，**刻意不包含插件业务数据**。

### 安全边界

外部插件与宿主**同进程**运行并持有 `Activity`。插件级启停开关不是安全沙箱，只加载可信代码。不要记录或展示 SessionToken、Shizuku 敏感输出等凭据；Phigros 测试不得使用真实 SessionToken。

### 发布与索引

主体和三个插件都有两条通道：`main` CI 成功后产出 `debug-<完整 SHA>` 不可变快照并更新滚动 `debug` 预发布；`v<versionName>` 标签产出正式 Release。发布完成后通过 `repository_dispatch` 事件触发 `plugin-registry` 重建索引（不再轮询）。

`plugin-registry/sources.json` 用前缀发现组织内 `plugin-*` 仓库，因此**新增插件不需要手工改 sources.json**。宿主下载前校验签名、大小、SHA-256、插件 ID、版本、依赖和 `minHostVersionCode`。

降级由各插件仓库根目录的 `data-compatibility.json` 把关：`dataFormatVersion` 描述该版本写入的持久化格式，可读区间决定能否安全覆盖。任一侧缺声明即按未知风险阻止覆盖。改变持久化结构时必须递增 `dataFormatVersion`，详见 `app/docs/plugin-data-compatibility.md`。

## 版本与提交

`.gitignore` 忽略了各级 `artifacts/`，但它们是供安装与验收使用的正式产物，**不要当作垃圾删除**。

版本字段位置：主体在 `app/app/build.gradle` 的 `versionCode` / `versionName`；插件在各自 `build.gradle` 顶部的 `pluginVersionName` / `pluginVersionCode`；SDK 在 `app/gradle.properties` 的 `pluginSdkVersion`。

提交前把版本字段与该子仓库 `HEAD` 对比：版本变化就必须先补齐对应 `CHANGELOG.md`。只有纯文档、纯测试、格式化、仓库元数据等不影响运行行为的改动可以不提升版本，不确定时默认提升。跨仓库改动的提交顺序是：子仓库版本与 CHANGELOG 检查 → 验证并提交子仓库 → 推送 → 最后提交外层 gitlink（用 `build: update app integration baseline` 这类集成语义，不要复制子仓库的功能提交信息）。
