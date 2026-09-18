# Android Tool Suite 工作区指南

## 适用范围

本文件适用于 `android-tool-suite/` 下的整个聚合工作区。若子目录以后出现更具体的 `AGENTS.md`，以离目标文件最近的说明为准。

当前工作区由一个外层 Git 超级项目和六个独立 Git 子模块组成，但仍然没有统一的根级 Gradle 工程：

```text
android-tool-suite/
├─ .gitmodules                    六个子模块的 HTTPS 地址
├─ AGENTS.md                      整个工作区的协作规则
├─ tools/                         全量构建、状态检查与设备安装工具
├─ artifacts/                     全量构建集中产物（Git 忽略）
├─ temp/                          一次性日志、试跑与构建中转（Git 忽略）
├─ workspace/                     外部研究仓库与长期本地工作副本（Git 忽略）
├─ app/                            主体应用仓库
│  ├─ app/                        Android 宿主应用
│  ├─ plugin-sdk/                 插件 API、模型与共享 Compose UI
│  ├─ runtime-contract/            V3 清单、RPC、声明式 UI 与 Capability 契约
│  ├─ web-sdk/                    Web Tool TypeScript SDK
│  ├─ examples/plugins/           Tool 与 Worker 示例
│  ├─ tools/plugin/               插件 CLI、模板和测试
│  ├─ docs/                       插件包格式与 ADB 调试文档
│  ├─ tools/adb-debug.ps1         Debug APK 的 ADB 操作封装
│  └─ artifacts/                  android-tool-suite-debug.apk
├─ plugin-registry/               正式/调试插件索引、签名与 Pages 展示页
└─ plugins/
   ├─ shizuku-auth/               Shizuku 授权与全信任 Provider 插件仓库
   │  └─ artifacts/               shizuku-auth.atsplugin
   ├─ accessibility-grant/        无障碍授权插件仓库
   │  └─ artifacts/               accessibility-grant.atsplugin
   ├─ phigros-advisor/            Phigros Data Studio 插件仓库
   │  └─ artifacts/               phigros-advisor.atsplugin
   └─ gacha-analysis/             跃迁与祈愿分析插件仓库
      └─ artifacts/               gacha-analysis.atsplugin
```

可以在工作区根目录使用 Git 管理 `.gitmodules`、工作区文档和子模块指针，但不要假定存在根级 Gradle 任务。源码状态检查和提交仍以 `app/`、`plugin-registry/`、`plugins/shizuku-auth/`、`plugins/accessibility-grant/`、`plugins/phigros-advisor/`、`plugins/gacha-analysis/` 中相应的子仓库为边界；应用和插件继续独立维护版本与更新日志，索引仓库则维护生成器、签名协议和 Pages 发布。跨仓库修改时，先分别完成并提交子仓库，再在外层仓库提交更新后的子模块指针。

外层仓库是集成工作区，不是日常功能开发仓库。开发单个宿主或插件时，允许只克隆和使用对应独立仓库；普通组件提交不需要同步更新外层 gitlink。只有联调本地 SDK、执行完整兼容性验收、集中交付，或明确提升已验证组合时才使用外层工作区。更新 gitlink 前必须确认组件提交已推送且通过对应验证；外层提交只描述集成基线变化，不重复承载组件功能内容。

六个子模块的 `origin` 和 `.gitmodules` 都使用 HTTPS：

- `https://github.com/android-tool-suite/app.git`
- `https://github.com/android-tool-suite/plugin-registry.git`
- `https://github.com/android-tool-suite/plugin-shizuku-auth.git`
- `https://github.com/android-tool-suite/plugin-accessibility-grant.git`
- `https://github.com/android-tool-suite/plugin-phigros-advisor.git`
- `https://github.com/android-tool-suite/plugin-gacha-analysis.git`

首次检出使用 `git clone --recurse-submodules`；已有检出使用 `git submodule sync --recursive` 和 `git submodule update --init --recursive`。不要把子模块改回 SSH URL，也不要直接提交只有外层 gitlink 更新、却没有对应远端子仓库提交的状态。

## 分支与发布

- 主分支为 `main`，日常开发使用 `codex/performance-optimization`、`codex/runtime-development`、`codex/ui-optimization`；已有 `*-archive` 存档分支保留。
- 普通 CI 只测试并上传构建产物。Debug 必须手动推送 `debug-v<版本号>` 标签，正式版使用 `v<versionName>`；不再自动创建或移动滚动 `debug`。
- 仅在最新 Debug 验证成功后清理旧 Debug Release 和对应 tag，保留正式版和 SDK 标签；详细步骤见 `docs/releasing.md`。

## 架构边界

- `app/app` 负责宿主界面、插件安装与运行时、Capability 权限、Shizuku 最小 bootstrap 及 Debug ADB Receiver。`shizuku_auth` 是合并授权 UI 与 Native Provider 的独立 format v3 包，不在内置插件注册表中。
- `app/plugin-sdk` 是宿主与外部插件之间的公开边界。插件 API、清单模型、主页组件协议和共享设计系统应放在这里，不要让外部插件直接依赖主体工程源码。
- 每个外部插件都是独立 Gradle 工程，不得添加指向 `app` 的 Gradle project 依赖。包含 Native Provider 的 `trusted-provider` 通过 Maven 坐标 `com.androidtoolsuite:plugin-sdk` 编译；纯 Web/Worker format v3 插件可以是无需 Android SDK 的打包工程。
- format v3 普通插件使用统一声明式 UI（若有 UI），文档可选择 Host 或 WebView renderer；也可通过必需的受限 Worker 提供 Capability，但不得声明或夹带原生 Provider。只有必须以宿主身份与系统交互的实现使用签名的 `trusted-provider`；该类型仍可贡献 UI、Tool、主页组件和 Worker。旧 format v1/v2 `plugin.apk` 只允许历史归档识别，不再安装或执行；继续使用各仓库现有生成与打包任务，不要手工拼装发布包。
- 普通 format v3 Tool 的能力调用必须经过 Capability Router，未授权调用应被真正拒绝；`trusted-provider` 是同进程可信代码，不要把插件级开关描述成对它的安全沙箱。不得记录或展示 SessionToken、Shizuku 敏感输出等凭据。

## 开发环境与构建

基线环境为 JDK 17、Android SDK 35、Gradle 8.9 或更新版本、Android 7.0/API 24 及以上。仓库没有 Gradle Wrapper，命令使用系统 `gradle`。以下命令均从工作区根目录执行。

跨仓库修改或正式验收优先运行外层一键流程：

```powershell
.\tools\build-all.ps1
```

该脚本构建主体、签名打包合并 UI 与底层能力的 Shizuku 插件、发布当前临时 SDK、测试并构建插件，验证 `.atsplugin` 内容，同时运行插件索引生成器测试，最后把五个产物、`SHA256SUMS.txt` 和带六个子模块提交号的 `build-manifest.json` 集中复制到外层 `artifacts/`。只有所有构建与测试成功后才刷新外层产物。`-NoClean` 仅用于开发增量构建，`-SkipTests` 仅用于临时排查，不得用于正式验收。

主体应用：

```powershell
gradle -p app :app:assembleDebug
gradle -p app clean collectArtifacts
```

发布插件 SDK 到 Maven Local，再分别构建插件：

```powershell
gradle -p app :plugin-sdk:publishToMavenLocal
gradle -p plugins\shizuku-auth clean collectArtifacts
gradle -p plugins\accessibility-grant clean collectArtifacts
gradle -p plugins\phigros-advisor testDebugUnitTest
gradle -p plugins\phigros-advisor clean collectArtifacts
gradle -p plugins\gacha-analysis testDebugUnitTest
gradle -p plugins\gacha-analysis clean collectArtifacts
```

验证尚未正式发布的 SDK 改动时，优先使用主体仓库内的临时 Maven 仓库，避免插件误用旧版 Maven Local 缓存：

```powershell
gradle -p app :plugin-sdk:publishReleasePublicationToPluginSdkRepository
gradle -p plugins\shizuku-auth `
  -PatsSdkRepository=..\..\app\plugin-sdk\build\repository `
  clean collectArtifacts
gradle -p plugins\accessibility-grant clean collectArtifacts
gradle -p plugins\phigros-advisor `
  -PatsSdkRepository=..\..\app\plugin-sdk\build\repository `
  testDebugUnitTest clean collectArtifacts
gradle -p plugins\gacha-analysis `
  -PatsSdkRepository=..\..\app\plugin-sdk\build\repository `
  testDebugUnitTest clean collectArtifacts
```

注意：对 `app` 执行 `clean` 会删除 `plugin-sdk/build/repository`，所以全量验证时应先构建主体，再发布临时 SDK，最后构建四个插件。

正式本地产物分别位于：

- `app/artifacts/android-tool-suite-debug.apk`
- `plugins/shizuku-auth/artifacts/shizuku-auth.atsplugin`
- `plugins/accessibility-grant/artifacts/accessibility-grant.atsplugin`
- `plugins/phigros-advisor/artifacts/phigros-advisor.atsplugin`
- `plugins/gacha-analysis/artifacts/gacha-analysis.atsplugin`

全量流程还会把它们集中到外层 `artifacts/`，设备安装和对外交付优先使用这组带校验和与构建清单的集中产物。

这些 `artifacts/` 目录虽然被 Git 忽略，仍是供安装和验收使用的正式构建产物；不要仅因为它们被忽略就当成垃圾删除。

## 修改规则

- Java/Kotlin 均使用 Java 17 目标；新界面优先沿用现有 Compose 架构。
- 宿主和插件的 UI 设计、实现与评审必须同时参考根目录的 `docs/ui-redesign-plan.md` 和 `docs/ui-redesign-preview.html`：前者是设计模式、交互和评审规范正文，后者是浅色／深色、宿主页、插件页、组件与响应式布局的样例示范。不得把 HTML 当成脱离规范正文的像素模板，也不得继续采用两份文件中已明确放弃的旧方案。
- 宿主和插件界面应复用 `app/plugin-sdk/.../SuiteDesignSystem.kt`、`SuiteTokens.kt`、`SuiteSettings.kt`、`SuiteStates.kt` 及现有 Compose 组件，保持所有页面、空态、加载态、错误态、拖拽态和弹窗的视觉与交互一致，不要在单个插件中复制一套相近但不同的设计 token。`UiKit.java` 仅为已有第三方插件的二进制兼容保留，新界面不得使用。
- 如果实际 Compose 设计系统、已经交付的宿主行为、UI 规范正文或 HTML 样例之间出现差异，先以当前公开 SDK token／组件和已交付行为核实设计基线，再在同一次相关修改中同步更新规范与预览，避免文档继续描述未实施方案。
- 修改 `plugin-sdk` 的公开 API 时，检查二进制/源码兼容性，同时验证主体和四个插件。发布 SDK 变更时更新 `app/gradle.properties` 中的 `pluginSdkVersion`，并按需要同步插件的 `atsPluginSdkVersion`。
- 每个子仓库独立维护根目录下的 `CHANGELOG.md`：`app/CHANGELOG.md`、`plugins/shizuku-auth/CHANGELOG.md`、`plugins/accessibility-grant/CHANGELOG.md`、`plugins/phigros-advisor/CHANGELOG.md`、`plugins/gacha-analysis/CHANGELOG.md`。插件仓库缺少该文件时，在下一次需要提升版本的修改中创建。更新日志只记录该子仓库的变化，不把多个仓库的发布内容混写在一起。
- 应用和插件的更新日志只记录产品本身的变化；分支整理、CI、标签命名、发布流程等仓库与开发维护改动写入提交说明或开发文档，不写入 `CHANGELOG.md`。
- 版本提升以发布状态为准，不以是否已经提交为准。当前版本尚未发布时，后续修改可以继续沿用该版本号和 `versionCode`，并将变更合并到同一版本的 `CHANGELOG.md`；已提交或推送到开发分支不等于已发布。当前版本已经发布时，修复、功能、依赖或 SDK/API 变化、用户可感知的 UI/交互变化以及产物行为变化应在提交前提升版本；纯文档、纯测试、注释/格式化、仓库元数据或不影响运行行为与交付产物的内部整理可以不提升版本。无法确定发布状态时，先核实发布记录。
- Debug、预发布和正式版发布均算已发布，包括滚动 Debug 渠道和历史快照；核实时检查发布产物对应的版本号与 `versionCode`，不能仅凭没有正式版本标签判断尚未发布。本地构建或设备安装本身不算发布。
- 主体版本位于 `app/app/build.gradle` 的 `versionCode`、`versionName`；插件版本位于各自 `build.gradle` 的 `pluginVersionName`、`versionCode`。每次发布版本都递增整数 `versionCode`，并按改动性质更新 `versionName`。`manifest.template.json` 的版本由构建任务注入，不要维护第二份硬编码版本。
- `app/plugin-sdk` 的发布版本位于 `app/gradle.properties` 的 `pluginSdkVersion`。公开 API 或发布内容变化时更新它，并同步检查四个插件的 `atsPluginSdkVersion`；SDK 变化仍记录在主体仓库自己的更新日志中。
- 每次准备提交子仓库前，都要把当前版本字段与该子仓库 `HEAD` 比较，并核实发布状态。版本号发生变化或沿用未发布版本时，都必须先完善对应 `CHANGELOG.md`，完整归纳该版本的新增、优化、修复、兼容性或升级注意事项；未发布版本标注“未发布”，首次发布（包括 Debug／预发布）时填写发布日期。版本号没有变化时，确认属于沿用未发布版本或无需提升版本的情形。
- 如果工作区开始时已有未提交修改，应按整个待提交改动判断版本和更新日志，不能只评估本轮新增的几行。
- 修改插件导入、更新或删除流程时，保持文件更新原子性，不得留下半写入的插件包或清单。
- 修改 Phigros 的 RKS、存档解析、缓存或历史逻辑时，在 `plugins/phigros-advisor/src/test-js` 添加或更新 Node 契约测试；不得用真实 SessionToken 作为测试数据。

## 验证与设备测试

按改动范围选择最小但充分的验证：

- 仅主体：`gradle -p app clean collectArtifacts`。
- 仅无障碍插件：运行该仓库的 `clean collectArtifacts`，并验证 format v3 包内容。
- 仅 Phigros 插件：运行 `testDebugUnitTest` 和 `clean collectArtifacts`。
- 仅抽卡分析插件：运行 `testDebugUnitTest` 和 `clean collectArtifacts`。
- 仅插件索引：运行 `python -m unittest discover -s plugin-registry/tests -v` 和对应仓库的 `git diff --check`。
- `plugin-sdk` 或跨仓库协议变更：主体、四个插件全部重新构建，并运行 Phigros 与抽卡分析单元测试。
- 跨仓库或正式全量验收：运行 `.\tools\build-all.ps1`，不使用 `-SkipTests`。
- 文档或配置改动：至少运行对应仓库的 `git diff --check`，并核对示例命令与当前目录结构一致。
- 外层 CI 只验证 gitlink 锁定的组件组合，不替代各组件仓库自己的最小充分构建和测试。

需要设备验证时，优先使用带图形界面的 Android Emulator：先观察真实 UI 和交互，再用 ADB 安装、切换状态、抓日志和截图。GUI Emulator、ADB 与 Shizuku 可以在同一调试流程中同时使用；`-no-window` 只隐藏模拟器窗口，不会关闭 ADB。完整流程以 `app/docs/adb-debugging.md` 为准。

从工作区根目录调用 Debug 辅助脚本，例如：

```powershell
.\app\tools\adb-debug.ps1 -Command status
.\app\tools\adb-debug.ps1 -Command list-plugins
.\app\tools\adb-debug.ps1 -Command navigate -Destination manager
```

多设备场景必须显式指定 serial。文档中的 PowerShell 日志示例应先获取 PID，再传给 logcat，避免不可移植的内联替换：

```powershell
$appPid = adb shell pidof com.androidtoolsuite.app.debug
adb logcat "--pid=$appPid"
```

修改完成并通过虚拟机测试后，必须运行 `adb devices -l` 检查实体设备。序列号通常为 `emulator-*` 的是模拟器，不要误判为实体设备；对已连接且状态为 `device` 的实体设备安装本次最新构建产物：

优先使用外层安装工具，它会自动选择唯一实体设备，或通过 `-Serial` 指定设备，并按主体、合并 Shizuku 插件、其他插件的顺序使用集中产物：

```powershell
.\tools\install-latest.ps1
.\tools\install-latest.ps1 -Serial <实体设备序列号>
```

需要只安装部分产物时再使用下面的原始命令或脚本参数：

```powershell
# 主体发生变化时安装最新 APK
adb -s <实体设备序列号> install -r -t .\app\artifacts\android-tool-suite-debug.apk

# 对应插件发生变化时，通过宿主 Debug 入口导入最新插件包
.\app\tools\adb-debug.ps1 -Serial <实体设备序列号> `
  -Command import-plugin `
  -PluginFile .\plugins\shizuku-auth\artifacts\shizuku-auth.atsplugin
.\app\tools\adb-debug.ps1 -Serial <实体设备序列号> `
  -Command import-plugin `
  -PluginFile .\plugins\accessibility-grant\artifacts\accessibility-grant.atsplugin
.\app\tools\adb-debug.ps1 -Serial <实体设备序列号> `
  -Command import-plugin `
  -PluginFile .\plugins\phigros-advisor\artifacts\phigros-advisor.atsplugin
.\app\tools\adb-debug.ps1 -Serial <实体设备序列号> `
  -Command import-plugin `
  -PluginFile .\plugins\gacha-analysis\artifacts\gacha-analysis.atsplugin
```

只安装本次受影响且已经重新构建的产物；若主体与插件都变化，先安装主体 APK，再导入插件。如果连接了多个实体设备，逐个指定 serial。安装完成后请用户进行真机手动验收，不要把一次自动化或模拟器通过表述为已经完成真机验收。

## 清理、Git 与提交

- 开始前在外层仓库运行 `git status --short`，并分别使用 `git -C app status --short`、`git -C plugin-registry status --short`、`git -C plugins/shizuku-auth status --short`、`git -C plugins/accessibility-grant status --short`、`git -C plugins/phigros-advisor status --short`、`git -C plugins/gacha-analysis status --short` 检查子仓库，保留用户已有的未提交修改；不要覆盖或回滚无关差异。
- `.gradle/`、`.kotlin/`、各组件的标准 Gradle `build/`、`temp/` 中的一次性文件和临时截图通常可重新生成；清理前仍应确认路径归属。外部研究仓库放在根级 `workspace/`，不要与 Gradle输出混放；正式集中产物保留在 `artifacts/`。
- `local.properties`、IDE 配置、缓存和构建目录不得提交。
- 用户要求整理并提交时，把“删除可再生产物”和“功能修改”分开处理；按仓库和关注点拆成多个小提交，不要生成跨多个仓库的单体提交。
- 提交跨仓库修改时，顺序必须是：完成子仓库版本与更新日志检查、验证并提交子仓库、推送或确认对应提交可供外层仓库获取，最后提交外层仓库的子模块指针。外层仓库本身没有应用版本号，单纯更新 gitlink、`.gitmodules` 或工作区文档不触发子仓库版本提升。
- 不要因为子仓库 HEAD 超前于外层锁定提交就自动更新 gitlink；这通常只是组件独立开发中的正常集成滞后。使用 `.\tools\workspace-status.ps1` 区分源码脏、HEAD 超前、gitlink 已暂存和远端可获取状态。
- 外层 gitlink 提交使用集成语义，例如 `build: update app integration baseline`，不要复制子仓库的功能提交信息。
- 提交信息沿用现有简洁的 Conventional Commit 风格，如 `feat:`、`fix:`、`refactor:`、`build:`、`docs:`。
- 当用户已经测试并接受一个完整、可独立回滚的部分，且授权了提交工作时，应及时在对应仓库提交，不要让已验收内容长期处于未提交状态。
- 如果 Git 因无法创建 `.git/index.lock` 报权限错误，先核对没有并发 Git 进程，再使用所需权限重试；不要据此判断仓库损坏。`git fsck` 中只有 dangling tree/object 而没有实际读写或构建异常时，通常只是历史对象信息。

## 交付检查

交付前说明：改动涉及哪些独立仓库、分别执行了哪些验证、生成了哪些产物、版本是否更新，以及模拟器/真机验证分别完成到什么程度。若某项未执行，明确写出原因，不要把“可执行的流程”描述成“已经执行成功”。
