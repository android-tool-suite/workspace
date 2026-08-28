# ADR-0009：插件 Capability 权限生命周期

- 状态：Accepted
- 日期：2026-08-26
- 影响阶段：Runtime v2 安装、管理、RPC、事件与后台任务

## 背景

仅在 manifest 声明 scope 可以限制实现，但不能表达用户是否同意某个插件使用网络、剪贴板、后台任务、无障碍或 Shizuku。反过来，把权限开关描述成原生代码沙箱又会产生错误安全承诺。

## 决策

每份 Capability 契约声明权限模式、风险、用户标题和说明：

- `implicit`：会话和每插件私有存储等基础能力，始终允许；
- `user`：网络、文件、剪贴板、通知、后台、无障碍和 Shizuku 等能力，默认待决定。

用户决定按 `pluginId + capabilityId + canonical scope fingerprint` 保存。scope 指纹使用键排序的规范 JSON 和 SHA-256；插件升级改变请求范围后，旧决定不自动覆盖新范围。

Capability Router 在 provider 解析和执行前检查权限；未允许返回 `PERMISSION_DENIED`。事件分发执行同一检查；撤销时取消匹配的在途调用、文件选择和该插件持有的 blob／Dataset handle，并发布 `app.permissionsChanged`。Scheduler 未获后台权限时取消已注册 WorkManager 工作，不继续周期重试。

管理页在插件卡展开区显示每项权限、风险、范围、是否可选和允许开关。Debug ADB 提供只在 Debug 构建存在的查询和设置命令。审计仅保留最近的授权、撤销和拒绝元数据，不记录业务 payload、凭据或 provider 输出。

普通 format v3 插件不得携带 `android/provider.apk`，其 Host 声明式 Action、WebView RPC、Worker 调用、事件和后台任务只能进入 Capability Router。Router 每次调用都核对清单声明、scope 指纹和当前授权；因此对普通插件，未授权能力在执行 provider 之前被真正阻断，而不是只隐藏 UI。

普通插件也可以通过清单中的 `provides.capabilities[].workerEntry` 提供 Capability。实现运行在 JavaScriptSandbox Worker，以提供者插件自己的身份调用它所依赖的其他能力；它获得的是结构化调用、消费者声明的 scope 与手势元数据，不获得 `Context`、Binder、Shizuku、宿主类或物理路径。消费者仍需声明并获得该 Capability 的权限。

`trusted-provider` 必须包含 Native Provider 并通过受信 publisher 签名验证，也可以贡献 Tool、UI、主页组件和 Worker。它与 API1 兼容插件属于同进程可信原生代码；权限系统只约束其他插件对其导出 Capability 的调用，不能约束同包 Provider 直接访问进程或 Android API。因此完全信任插件自身不进入权限列表，也不能通过权限开关撤销其能力；UI 和文档必须明确这一区别。

## 结果

Host renderer、WebView renderer 和 Worker 获得同一权限语义；普通插件既可消费也可提供 Capability，依赖链上的每次调用都以当前调用者身份重新授权。只有需要宿主身份与系统交互的底层实现才通过独立全信任 Provider 类型显式升级。
