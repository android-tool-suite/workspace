# Android Tool Suite 后续任务清单

状态：现行执行清单
更新日期：2026-09-08
排序依据：插件运行时与迁移（P0）> AI 插件开发（P1）> ATS 发布平台（P2）> 跨平台宿主（P3）

## 1. 使用方式

本文把现行路线拆成可执行、可验收的任务。架构约束仍以
[plugin-runtime-architecture.md](plugin-runtime-architecture.md) 为准；本文只记录执行顺序、完成条件和依赖，
不重复定义另一套运行时协议。

- `[ ]`：尚未完成；
- `[~]`：已有实现，但仍缺少迁移、自动化验证或发布证据；
- `[x]`：已经完成并进入当前集成基线；
- 只有形成可安装、可回退、可验证的纵向闭环后，任务才能标记为完成；
- 普通 format v3 Tool 与全信任 `trusted-provider` 的安全边界必须分别表述；历史 API1 包只读识别、不执行；
- 纯文档、测试和不改变交付行为的内部整理不提升版本；功能、UI、API、数据或产物行为变化按各仓库规则提升版本。

## 2. P0：插件运行时与迁移

### P0.0 当前基线收口

- [x] format v3 清单、RPC、声明式 UI、Capability、Storage、Dataset、Scheduler 与签名包契约落地。
- [x] Host renderer 与隔离 WebView renderer 统一使用 `ui/*.json` 声明入口。
- [x] Shizuku 授权移出宿主内置插件，使用独立、单包的签名 `trusted-provider`。
- [x] 无障碍授权迁移为普通 Web/Worker 插件，并通过 `accessibility.manage` 使用底层能力。
- [x] 普通插件权限由 Capability Router 强制检查；全信任 Provider 不展示虚假的逐项权限开关。
- [x] 在当前组合上执行完整 `tools/build-all.ps1`，刷新集中产物、校验和与 `build-manifest.json`。
- [x] 为 Host/WebView renderer 补齐冷启动、旋转、前后台恢复、Provider 重连和错误外壳回归用例。
- [x] 为 Scheduler 补齐手动、周期、约束、Provider 事件、超时、重试、并发租约、撤权停调度、重启恢复和 Sandbox 死亡恢复测试。
- [x] 增加一个独立于无障碍自动授权的后台任务示例，覆盖任务历史、状态展示和无敏感载荷日志。
- [x] 在模拟器自动化后，通过 ADB 在实体设备安装 Host 与四个插件，复核主页任务、权限、Shizuku 恢复和无障碍运行状态。

完成条件：当前锁定组合具有可追溯构建清单；renderer、Capability、Provider 和 Scheduler 的关键生命周期具有可重复证据。

### P0.1 迁移 Phigros Data Studio

- [x] 冻结现有 API1 功能、Dataset、SessionToken、缓存、历史记录和生成图片的迁移 fixture。
- [x] 定义 format v3 清单、声明式 UI 入口、主页组件、后台任务及所需 Capability；不暴露 Android/Kotlin/Compose 类型。
- [x] 复杂交互使用声明式 WebView renderer，并复用现行设计 token、状态与文案规范。
- [x] 将网络、文件、凭据、数据集和后台行为接入稳定 Capability，普通 Tool 不直接访问宿主或 Shizuku 实现。
- [x] 将 SessionToken 写入 SecretStore，将账号、缓存和历史数据迁移到 Dataset generation；写入使用 staging、校验和原子切换。
- [x] 实现从已发布 API1 数据的单向导入，失败时保持旧数据和当前 generation 不变。
- [x] 通过 RKS、存档解析、历史合并、缓存、图片生成及错误路径的 Node 契约测试。
- [x] 完成旧数据导出、空环境恢复、业务结果校验、降级演练和实体设备验收。
- [x] 构建并在实体设备安装迁移版 Debug，验证后台获取、前台解析和旧版回读；正式发布归入 P0.3。

完成条件：用户不再依赖 Phigros API1 代码即可获得业务等价功能，旧数据可验证迁移并可降级恢复。

### P0.2 迁移跃迁与祈愿分析

- [x] 冻结原神、星穹铁道账号、记录、完成状态、设置和 UIGF 导入导出的迁移 fixture。
- [x] 定义 format v3 清单、声明式 UI、主页组件、任务和网络／文件／存储 Capability。
- [x] 将页面迁移到统一声明式入口，保持双游戏筛选、统计、卡池历史、导入、导出和错误状态业务等价。
- [x] 将数据获取与 Shizuku 具体实现解耦；通用 `system.logs` 只按插件清单 scope 返回匹配行，普通逻辑使用受限 Worker。
- [x] 将账号、记录、池状态和设置迁移到 Dataset generation；敏感数据进入 SecretStore 与受保护 Dataset。
- [x] 实现从 API1 数据的单向导入、合并冲突处理、失败回滚、部分数据迁移和单游戏删除隔离。
- [x] 通过 UIGF、记录合并、分页、去重、双游戏隔离、旧 fixture、权限拒绝和流式摘要测试。
- [x] 完成旧数据导出、空环境恢复、业务结果校验、降级演练和实体设备验收。
- [x] 构建并在实体设备安装迁移版 Debug，验证真实迁移数据的 Worker 摘要；正式发布归入 P0.3。

完成条件：两个游戏的数据与主要功能均不再依赖 API1，同一迁移或删除操作不会破坏另一游戏的数据。

### P0.3 正式发布与 API1 退出

- [x] 所有剩余插件完成迁移，并集中执行旧数据导出、空环境恢复、业务校验、升级与降级演练。
- [x] API1 退出只以迁移完成和测试结果为条件，没有附加稳定版本数量或日历时间要求。
- [x] 停止发布新的 API1 插件版本，并从模板、示例和开发文档移除 API1 创建入口。
- [x] 删除公开 Bridge、旧 AAR Tool/Host API 与外部 Tool APK 装载；本地、仓库和 Debug 入口拒绝 API1 包。
- [x] 保留 `.atsbackup` v2/v3 与必要旧清单的最小只读解析能力；历史 API1 可执行载荷不会恢复。
- [x] 删除 API1 后重新执行全量构建、升级、历史归档读取和实体设备回归测试。
- [ ] 发布包含 Host、SDK、Shizuku、无障碍及两个迁移插件，且不再包含 API1 运行路径的正式稳定组合。
- [x] 更新兼容矩阵、CHANGELOG、迁移说明和回滚边界；发布索引随正式发布更新。

完成条件：剩余官方插件全部使用 format v3；迁移、恢复、业务与降级测试通过；删除 API1 后全量构建、升级和历史归档读取仍然成功。

### P0.4 性能与发布质量

状态：2026-09-08 按用户要求暂缓，不作为当前 API1 退出与迁移发布门槛。

- [ ] 建立实体设备 Macrobenchmark 模块和固定的冷启动、分页、列表、插件页场景。
- [ ] 保存 FrameTimingMetric、Perfetto trace、构建类型、温度和刷新率模式，形成可比较基线。
- [ ] 按 trace 依次处理主线程 I/O、全局重组、重复插件／Widget 创建、Pager 缓存和布局热点。
- [ ] 验证交互升频与静止降频，不以刷新率浮层代替帧时序指标。
- [ ] 在稳定基线后引入 Baseline Profile，并独立评估 R8／资源压缩及反射保留规则。
- [ ] 将稳定性能报告作为 CI 或正式发布附件；模拟器只验证脚本，不提供帧率结论。

完成条件：正式或 profileable 构建具备可重复性能基线，主要场景的回归可以被自动发现和定位。

## 3. P1：AI 插件开发体验

### P1.1 A1 只读助手

- [ ] 从 Runtime 契约生成可检索的 Capability、Dataset、任务和错误目录。
- [ ] 实现 `inspect`／`catalog`，只描述真实契约，不临时发明宿主 API。
- [ ] 支持解释清单、构建、校验和测试错误，生成建议差异但不自动应用或安装。

### P1.2 A2 草稿生成

- [ ] 生成最小 Web Tool 的源码、清单、测试、fixture 和依赖锁。
- [ ] 建立独立草稿插件 ID、存储命名空间、虚拟时钟和 Capability Mock 情景。
- [ ] 在 Draft Runtime 中运行 schema、lint、unit 和 contract tests。

### P1.3 A3 受控修改与本地安装

- [ ] 展示源码差异、权限变化、Dataset、后台行为、依赖、测试结果和制品摘要。
- [ ] 对删除数据、外部请求、扩大权限和修改后台计划设置独立人工批准点。
- [ ] 记录源码快照、工具链、依赖锁和来源证明，只安装到 Debug／草稿槽位。

### P1.4 A4 发布草稿交接

- [ ] 将批准后的源码快照、BuildRecord 和不可变制品交给 ATS 发布平台私有草稿区。
- [ ] 保持 Developer Agent、AI Provider、签名和发布权限相互独立。

## 4. P2：ATS 发布平台

### P2.1 私有草稿

- [ ] 实现 Publisher、SourceSnapshot、BuildRecord、Artifact、Release、Draft 和 Visibility 数据模型。
- [ ] 建立内容寻址对象存储、不可变制品、签名、撤回和回滚流程。
- [ ] 支持私有上传／构建、受邀测试者和 Debug／草稿安装，不进入公共搜索。

### P2.2 Unlisted 发布

- [ ] 支持持链接访问、兼容性拦截、安全通知、签名撤销和版本回退。
- [ ] 实现 GitHub 导入／导出／镜像 Adapter；Adapter 断开不影响已发布制品验证与下载。

### P2.3 公共社区

- [ ] 在私有与 Unlisted 流程稳定后增加搜索、分类、收藏和版本历史。
- [ ] 在开放上传前完成举报、下架、申诉、恶意制品隔离、密钥泄露和审计演练。

## 5. P3：跨平台宿主

- [ ] 只有 Android 运行时稳定且出现真实非 Android 需求后才启动实现。
- [ ] 独立评估目标平台的插件分发、代码执行、后台任务、密钥保护和审核限制。
- [ ] 复用平台无关清单、RPC、Capability、Dataset、任务和错误模型，不复用 Android APK 或动态 Provider 假设。
- [ ] 先实现契约兼容性与最小纵向工具，再决定是否建立 iOS、Desktop 或 KMP 产品工程。

## 6. 每个任务的共同验收

- 对应仓库版本与 CHANGELOG 符合工作区规则；无需提升版本的修改必须有明确理由。
- 组件测试、包校验和 `git diff --check` 通过；跨仓库协议变更运行完整 `tools/build-all.ps1`。
- UI 同时符合 `ui-redesign-plan.md`、共享 SDK token／组件和已交付行为。
- 数据修改具有 staging、校验、失败不切换和回滚路径；不得使用真实凭据作为测试数据。
- 先完成模拟器自动化，再用 ADB 在实体设备安装受影响产物；明确区分自动化结果与人工/OEM 验收。
- 组件提交先于外层 gitlink；只有已推送、已验证的组合才能进入外层集成基线。
