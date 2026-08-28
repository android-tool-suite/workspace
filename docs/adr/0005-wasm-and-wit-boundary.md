# ADR-0005：WASM 引擎评估与 WIT 子集

- 状态：Accepted
- 日期：2026-08-21
- 影响阶段：Runtime v2 阶段 4 之后

## 背景

WASM 有利于复用计算逻辑和未来跨平台，但会增加 APK 体积、引擎生命周期、WASI 权限、中断和
Android API 兼容性成本。普通 Web Tool 不应被迫学习 Rust/WASM，阶段 1–3 也不应因尚未选定引擎
而停滞。

## 决策

- 阶段 1–3 不内置独立 WASM 引擎；manifest 可以识别未来字段，但 verifier 返回明确
  `NOT_SUPPORTED`，不静默忽略必需入口；
- 阶段 4 先评估 AndroidX JavaScriptEngine 的 WebAssembly feature、Extism 及可在 API 24 运行的
 轻量 WASI 0.2 引擎；通过门槛后才选型；
- WASM 首先只作为 `worker`/计算模块，不承担 UI；Web UI 仍为 HTML/CSS/JS；
- Capability、Storage 和 Scheduler 通过同一逻辑契约生成 JS 与 WIT binding，不能形成第二套 API。

## 引擎准入门槛

候选必须实测并记录：

- API 24、26 和当前主流 API 的可用性；
- universal APK/ABI 增量体积与冷/热启动；
- 线性内存上限、OOM 影响范围、fuel/epoch/interrupt 或等价中断；
- WASI 0.2 component model、WIT binding 和多语言工具链成熟度；
- 并发 isolate/store、宿主函数异步调用和取消传播；
- 崩溃是否只影响 task、整个引擎进程还是 ATS；
- 许可证、维护活跃度和安全更新路径。

任何候选若不能在超时后可靠停止，不能进入执行不受宿主控制循环的 Release Worker。

## WIT 首版子集

允许：

- bool、整数、浮点、string、bytes；
- record、variant、enum、option、result、list；
- opaque resource handle；
- async request/response 与显式取消映射。

不直接暴露：

- 原始文件描述符、任意目录、socket、环境变量；
- Android 类、JNI 对象或 Binder；
- 未受控 wall clock、随机源和进程创建；
- 共享宿主内存指针。

时间、随机、网络和文件均通过 Capability，因而可测试、可模拟并可在未来平台替换。

## 结果

WASM 保持为增量能力而非产品定位。Web-only 插件和 JavaScript worker 可以先完成闭环；未来加入
WASM 时不会改变 manifest 外层、Capability ID、数据模型或调度语义。

