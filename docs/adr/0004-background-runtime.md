# ADR-0004：后台任务首版执行器

- 状态：Accepted
- 日期：2026-08-21
- 影响阶段：Runtime v2 阶段 1、4

## 背景

ATS 需要周期、条件、手动和 Provider 事件任务。UI WebView 的页面生命周期不可靠，也不应通过
隐藏窗口或无限定时器模拟后台。应用最低支持 API 24，而 AndroidX JavaScriptEngine 只在 API 26+
且设备 WebView 实现支持时可用。

## 决策

### 两种首版后台入口

1. `provider-task`：由已注册 Native/Host Provider 实现，API 24+ 可用；适合授权保持、平台状态
   检查和受控系统操作。
2. `javascript-worker`：由 AndroidX JavaScriptEngine 1.1.0 的 `JavaScriptIsolate` 执行，API 26+
   且 `JavaScriptSandbox.isSupported()` 为真时可用；适合普通 ATS Tool 的无界面逻辑。

manifest 必须声明入口是否 `required`。必需入口在当前设备不支持时阻止启用插件；可选入口保持
停用并显示原因。API 24–25 不使用隐藏 WebView 回退。

### 调度

- Android Adapter 使用 WorkManager 保存可延迟、需要重启后继续的唯一任务；唯一名由
  `pluginId + taskId` 派生；
- 周期任务遵守 WorkManager 最小周期和弹性窗口，不承诺精确时刻；
- 前台内一次性短任务可用协程执行，但注册和历史仍由 SchedulerService 记录；
- 精确闹钟仅对语义确实是用户闹钟的 capability 开放；
- 需要持续运行的任务必须由受信 Provider 显式申请前台服务，并提供通知和停止动作。

### JavaScript worker 生命周期

- 应用进程只维护一个 `JavaScriptSandbox` 连接，每次 TaskRun 创建一个新 isolate；
- worker 无 DOM、WebView、cookie、网络和文件系统；只通过同一 RPC 调用 Capability/Storage；
- 启动时逐项协商 message ports、heap limit、termination callback、FD evaluation 与 WASM feature；
- 默认堆上限 32 MiB、返回/单消息上限 256 KiB、默认超时 30 秒，manifest 可在宿主允许范围内
  请求更小或更长配置，普通任务绝对上限 10 分钟；
- 成功、失败、取消或超时后关闭 isolate；终止回调记录结构化状态，不记录敏感输入；
- sandbox 进程死亡会使同批其他 isolate 一起失败，Scheduler 按各自重试策略恢复，因此 isolate
  之间只称为状态/可靠性隔离，不称为强安全隔离。

### 重试与并发

- 并发策略固定为 `forbid | replace | parallel(max)`；默认 `forbid`；
- 重试固定为有界 exponential backoff + jitter，manifest 声明最大次数；
- Provider 离线、网络约束不满足等可重试错误与输入无效、未授权等永久错误分开；
- 用户手动“立即运行”获得明确进度与结果；系统调度无变化或自动失败保持安静，详情页保留历史。

### 事件与状态

任务状态为 `queued -> running -> succeeded | failed | cancelled | retrying`。TaskRun 输入在入队时形成
不可变快照；大数据只传 dataset/blob handle。Provider event 只用于唤醒/入队，不在回调线程直接执行
插件逻辑。

## 结果

V2 同时覆盖 API 24 的平台任务和 API 26+ 的普通后台 JavaScript，又不让 UI 运行时承担后台职责。
后台可用性成为 manifest/运行时协商的一部分，插件开发者能在安装前得到确定结果。

## 验证

- API 24/25 验证 required/optional JavaScript worker 的拒绝和降级；
- API 26+ 与当前主流 API 验证 sandbox feature matrix、超时、OOM、进程死亡和恢复；
- 验证应用强停/设备重启后的 WorkManager 唯一任务、约束、退避和取消；
- 确认后台执行期间没有 WebView 实例或不可见 Activity。

