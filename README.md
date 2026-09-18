# Android Tool Suite 集成工作区

此仓库是 Android Tool Suite 的**集成工作区**，使用 Git 子模块锁定一组经过验证的主体应用和插件版本：

- `app`：主体应用与插件 SDK。
- `plugins/shizuku-auth`：Shizuku 授权与全信任 Provider 插件。
- `plugins/accessibility-grant`：无障碍授权插件。
- `plugins/phigros-advisor`：Phigros Data Studio 插件。
- `plugins/gacha-analysis`：原神与崩坏：星穹铁道抽卡记录分析插件。
- `plugin-registry`：应用与插件的正式/调试索引、历史目录、签名和 GitHub Pages 发布中心。

六个子模块是彼此独立的权威源码仓库，分别维护提交和发布边界。日常开发某一个组件时，直接克隆或进入对应仓库即可；不需要同步修改外层仓库，也不需要检出其他插件。

只有以下场景需要使用本集成工作区：

- 联调本地 `plugin-sdk`。
- 对主体和插件执行完整兼容性验收。
- 更新某个组件的已验证集成基线。
- 集中生成并安装一组可追溯的交付产物。

子模块普通功能提交不应立即更新外层 gitlink。只有对应提交已经推送、完成组件验证并需要进入已验证组合时，才在外层仓库更新指针。

## 文档入口

宿主应用和所有插件的新增、重构与评审应共同使用以下两份文件作为 UI 规范：

- [`docs/ui-redesign-plan.md`](docs/ui-redesign-plan.md)：设计模式规范正文，定义信息架构、导航、视觉 token、共享组件、状态反馈、现行交互、文案、无障碍和评审清单。
- [`docs/ui-redesign-preview.html`](docs/ui-redesign-preview.html)：与规范配套的可视化样例和预览，可在浏览器中切换浅色／深色并查看宿主页、插件页、组件及响应式布局。
- [`docs/plugin-runtime-architecture.md`](docs/plugin-runtime-architecture.md)：现行插件类型、权限、数据、后台任务、Provider 信任边界和剩余迁移计划。
- [`docs/product-roadmap.md`](docs/product-roadmap.md)：插件运行时、AI 开发、发布平台与跨平台的独立优先级和依赖关系。
- [`docs/follow-up-task-list.md`](docs/follow-up-task-list.md)：按 P0–P3 排序的后续执行清单、依赖和完成条件。
- [`docs/ai-plugin-development-plan.md`](docs/ai-plugin-development-plan.md)：Developer Agent、AI Provider、草稿运行时与人工批准边界。
- [`docs/publication-platform-plan.md`](docs/publication-platform-plan.md)：私有草稿、unlisted、公共社区和 GitHub Adapter 的分阶段发布平台。
- [`docs/data-management.md`](docs/data-management.md)：统一 `.atsbackup` v3、旧数据 Dataset 映射、删除边界与迁移验收矩阵。

Markdown 负责说明规则与适用边界，HTML 负责示范规则落地后的视觉效果；两者应同时参考，不能只复制样例外观而忽略交互、状态和无障碍要求。若实际 Compose 设计系统、规范正文与预览出现差异，应先以 `app/plugin-sdk` 中当前公开的 token／组件和已交付宿主行为核实事实，再同步更新这两份文档。

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

只开发单个组件时，直接克隆其独立仓库，例如：

```powershell
git clone https://github.com/android-tool-suite/plugin-phigros-advisor.git
```

运行时索引已经作为独立子模块固定在 `plugin-registry/`。只维护索引生成器时，也可以单独克隆它：

```powershell
git clone https://github.com/android-tool-suite/plugin-registry.git
```

只有包含 Native Provider 的全信任插件通过固定版本的 `com.androidtoolsuite:plugin-sdk` 编译，不直接依赖主体源码；纯 Web/Worker 插件可直接打包。联调本地 SDK 时使用本工作区的临时 Maven 仓库流程。

## 一键构建

要求 JDK 17、Android SDK 35，以及 PATH 中可用的 Gradle 8.9 或更新版本。

```powershell
.\tools\build-all.ps1
```

脚本按以下顺序执行：

1. 运行插件索引生成器的纯 Python 单元测试。
2. 构建主体 APK。
3. 将当前 `plugin-sdk` 发布到主体仓库内的临时 Maven 仓库。
4. 使用该临时 SDK 构建并签名 Shizuku 插件。
5. 打包纯 Web/Worker 无障碍插件。
6. 运行 Phigros 与抽卡插件 Node 契约测试并构建 format v3 包。
7. 所有步骤成功后，将五个产物、SHA-256 校验和与包含六个子模块提交号的构建清单复制到外层 `artifacts/`。

开发中需要增量构建或临时跳过测试时：

```powershell
.\tools\build-all.ps1 -NoClean
.\tools\build-all.ps1 -SkipTests
```

正式验收不要使用 `-SkipTests`。集中产物包括：

```text
artifacts/
├─ android-tool-suite-debug.apk
├─ shizuku-auth.atsplugin
├─ accessibility-grant.atsplugin
├─ gacha-analysis.atsplugin
├─ phigros-advisor.atsplugin
├─ SHA256SUMS.txt
└─ build-manifest.json
```

## 开发辅助工具

检查外层仓库和所有子模块的集成状态：

```powershell
.\tools\workspace-status.ps1
.\tools\workspace-status.ps1 -FailOnDirty
```

状态表会分别显示：

- `SourceDirty`：组件源码是否存在未提交修改。
- `Head` / `Locked` / `LockState`：当前组件提交与外层已提交 gitlink 的关系。
- `GitlinkStaged`：新的 gitlink 是否已经暂存但尚未提交。
- `PublishState`：本地 remote-tracking refs 是否包含当前提交。
- `BaselineState`：当前提交是否可以安全更新为集成基线。

`PublishState` 是不联网的快速检查；更新远端状态后可先在对应组件仓库执行 `git fetch --prune`。`-FailOnDirty` 只针对真正的源码或外层文件修改失败，不会把“组件 HEAD 超前于锁定版本”误判为源码脏。

## 集成 CI

外层 GitHub Actions 在 gitlink、全量构建脚本或集成工作流变化时检出精确子模块版本，并运行不跳过测试的 `build-all.ps1`。组件仓库仍应运行各自范围内的构建和测试；外层 CI 只验证组合，不替代组件 CI。

## GitHub Release 与插件仓库

主体和四个插件都支持两个发布通道：手动推送 `debug-v<版本号>` 标签发布不可变 Debug，`v<versionName>` 标签发布正式 Release。普通 CI 只验证构建，不再创建滚动 `debug`；两类发布都包含二进制文件、`release-metadata.json` 与 `SHA256SUMS.txt`。分支、标签和旧 Debug 清理流程见 [发布指南](docs/releasing.md)。

运行时索引由独立的 [`android-tool-suite/plugin-registry`](https://github.com/android-tool-suite/plugin-registry) 仓库维护，并作为本工作区子模块锁定已验证版本。它自动发现组织内的 `plugin-*` 仓库，通过 [GitHub Pages 发布中心](https://android-tool-suite.github.io/plugin-registry/) 发布应用 APK、插件包及其正式/调试历史版本，同时保留供宿主自动更新使用的 ECDSA 签名最新索引。组件发布完成后发送事件触发目录重建，不再用定时轮询；宿主下载后继续校验签名、大小与 SHA-256。

Release 应用默认使用正式插件仓库，但可在仓库页主动切换到调试仓库；Debug 应用默认使用调试仓库。本地 `.atsplugin` 仍可从同一页面导入，并明确显示为未经仓库验证。

插件仓库与外层工作区职责不同：

- `plugin-registry` 是面向已安装应用的运行时分发索引。
- `workspace` 锁定经过完整构建与索引测试验证的六个源码提交。
- 发布组件不会自动移动外层 gitlink；只有完成 Release 和集成验收后才提升外层基线。

完整构建并通过模拟器测试后，把最新集中产物安装到实体设备。仅连接一个实体设备时可自动选择；多设备时必须指定 serial：

```powershell
.\tools\install-latest.ps1
.\tools\install-latest.ps1 -Serial <设备序列号>
.\tools\install-latest.ps1 -Serial <设备序列号> -Plugins accessibility-grant
.\tools\install-latest.ps1 -Serial <设备序列号> -Plugins gacha-analysis
```

安装脚本默认先安装包名为 `com.androidtoolsuite.app.debug` 的主体 Debug APK，再通过主体的 Debug ADB Receiver 导入四个 format v3 插件。Debug 与包名为 `com.androidtoolsuite.app` 的 Release 可以共存且数据隔离；统一 `.atsbackup` v3 管理宿主设置与插件 Dataset，并保留对旧 Bridge v2 和旧宿主迁移包的只读识别。可用 `-SkipApp` 或 `-Plugins none` 缩小范围。

开发、版本、更新日志、测试与提交约定见 [AGENTS.md](AGENTS.md)。

根级 `temp/` 只存放可删除的日志、发布试跑和构建中转，`workspace/` 用于不属于本项目 Git 历史的外部研究仓库，正式集中产物仍放在 `artifacts/`。本机私密材料与环境说明必须留在 Git 忽略范围内，不得写入仓库文档或提交历史。
