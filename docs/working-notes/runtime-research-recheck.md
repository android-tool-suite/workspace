# 运行时选型调研复核

核对日期：2026-09-19。本文从原 `plugin-runtime-research-report.md` 提取仍有后续研究价值的内容。原报告的竞品比较与实施顺序属于历史调研，不整体恢复为现状结论；长期边界以 [运行时规范](../architecture/runtime.md) 为准。

## 与源码及官方文档相符的部分

| 主题 | 本次核对 | 使用边界 |
| --- | --- | --- |
| 本地 Web 内容 | Android 官方 [本地内容指南](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content) 仍提供 WebViewAssetLoader 的 HTTP(S) 本地资源方案；ATS 的 [WebToolPlugin.kt](../../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/WebToolPlugin.kt) 使用消息监听并核对来源和主 frame | 源码中存在这些检查，不代表所有设备 WebView 的行为已经实测 |
| 无界面 JavaScript | 官方 [JavaScriptEngine 指南](https://developer.android.com/develop/ui/views/layout/webapps/jsengine) 支持不创建 WebView 执行脚本，要求 API 26+、设备实现支持及逐项 feature 检查；[JavaScriptWorkerEngine.java](../../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/JavaScriptWorkerEngine.java) 有对应检查 | 不能只检查 Android API 就承诺 Worker 可用；共享 sandbox 中的 isolate 不能描述为彼此强安全隔离 |
| 依赖版本 | [主体构建配置](../../app/app/build.gradle) 固定 WebKit 1.16.0、WorkManager 2.11.2、JavaScriptEngine 1.1.0 | 这是核对时的项目依赖，不是“上游最新版”或兼容性背书；升级需另行验证 |
| Capability 与权限 | [CapabilityRouter.java](../../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/CapabilityRouter.java) 与 [PluginPermissionManager.java](../../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/PluginPermissionManager.java) 是路由及授权核对入口 | 普通插件授权边界与同进程可信 Provider 的完全信任必须分开描述 |

以上为本次官方资料与源码核对，不包含新增设备测试。

## 保留为研究入口，不作为实现完成证明

- 原报告借鉴的 Definition / Provider / Consumer、可撤销注册和能力依赖图，已在长期架构中定义方向。不能仅凭这些术语认定代码中存在统一 disposable API、完整三图导出或所有失败状态的自动恢复；需要逐项检查实现与测试。
- 原报告中的 Acode、Tauri、Grafana、DeepSeek Harness、Figma 等比较用于提出问题，不是本次逐项目复核的结果。需要重新选型时，应从对应项目官方文档和具体版本出发，避免继续复制历史比较表。
- 原报告将原生 Provider 升级概括为“原子路由切换”，容易被理解成无需重启的热替换。ATS 的 [NativeProviderManager.java](../../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/NativeProviderManager.java) 和插件激活策略需要一起核对，正式约束仍是可信原生 Provider 冷启动激活，不能套用服务端子进程的热更新模型。
- WASM/WIT 只保留后端候选方向；JavaScriptEngine 能执行 WebAssembly，不等于 ATS 已提供通用 WASM 插件 ABI 或经过验证的 Android WASI 后端。

## 下次研究应回答的问题

1. 在目标 Android API 和不同 WebView 实现上，Promise、消息端口、堆限制、终止及崩溃恢复各自能提供什么保证？不支持时如何明确降级？
2. WebView 的启动、消息大小、资源占用及重复崩溃限制在真实设备上应采用什么阈值？需用基准数据回答，不能照搬竞品。
3. 新后端是否满足体积、内存、可中断性、平台兼容和故障范围要求？公开 Capability／Dataset 契约是否保持一致？
4. 目标分发渠道对动态原生载荷有哪些要求？这属于发布前需重新核对的渠道条件，不由历史调研替代。

## 清理条件

完成下一轮后端或运行时选型后，把确认的规则及必要来源写入对应架构决策；未采用的对比留在相关讨论中，删除本文。不维护随上游变化而长期失真的竞品状态表。
