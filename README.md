# Android Tool Suite Workspace

此仓库是 Android Tool Suite 的外层工作区，使用 Git 子模块组合主体应用和两个外部插件：

- `app`：主体应用与插件 SDK。
- `plugins/accessibility-grant`：无障碍授权插件。
- `plugins/phigros-advisor`：Phigros Data Studio 插件。

## 获取工作区

```powershell
git clone --recurse-submodules <workspace-repository-url>
cd android-tool-suite
```

已有工作区在 `.gitmodules` 变化后执行：

```powershell
git submodule sync --recursive
git submodule update --init --recursive
```

## 一键构建

要求 JDK 17、Android SDK 35，以及 PATH 中可用的 Gradle 8.9 或更新版本。

```powershell
.\tools\build-all.ps1
```

脚本按以下顺序执行：

1. 构建主体 APK。
2. 将当前 `plugin-sdk` 发布到主体仓库内的临时 Maven 仓库。
3. 使用该临时 SDK 构建无障碍插件。
4. 运行 Phigros 插件 JVM 测试并构建插件。
5. 所有步骤成功后，将三个产物、SHA-256 校验和与构建清单复制到外层 `artifacts/`。

开发中需要增量构建或临时跳过测试时：

```powershell
.\tools\build-all.ps1 -NoClean
.\tools\build-all.ps1 -SkipTests
```

正式验收不要使用 `-SkipTests`。集中产物包括：

```text
artifacts/
├─ android-tool-suite-debug.apk
├─ accessibility-grant.atsplugin
├─ phigros-advisor.atsplugin
├─ SHA256SUMS.txt
└─ build-manifest.json
```

## 开发辅助工具

检查外层仓库和所有子模块的分支、提交、工作区状态、remote、版本、更新日志及现有产物：

```powershell
.\tools\workspace-status.ps1
.\tools\workspace-status.ps1 -FailOnDirty
```

完整构建并通过模拟器测试后，把最新集中产物安装到实体设备。仅连接一个实体设备时可自动选择；多设备时必须指定 serial：

```powershell
.\tools\install-latest.ps1
.\tools\install-latest.ps1 -Serial <设备序列号>
.\tools\install-latest.ps1 -Serial <设备序列号> -Plugins accessibility-grant
```

安装脚本默认先安装主体 Debug APK，再通过主体的 Debug ADB Receiver 导入两个插件。可用 `-SkipApp` 或 `-Plugins none` 缩小范围。

开发、版本、更新日志、测试与提交约定见 [AGENTS.md](AGENTS.md)。
