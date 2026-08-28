# Android Tool Suite Runtime v2 调研报告

状态：完成首轮调研  
更新日期：2026-08-26  
范围：相似工具平台、插件系统、Android WebView、后台 JavaScript、WASM 与 DeepSeek Harness

## 1. 结论先行

没有一个现成项目同时满足 ATS 的全部约束：Android 单应用体验、低门槛 Web 工具、可替换的高层
系统能力、可恢复后台任务、离线插件包、数据迁移和未来 AI 生成。因此 V2 不应移植某个框架，而应
组合以下已被不同项目验证的边界：

1. 用 Acode 证明的“清单 + Web 资源 + JavaScript”降低普通工具开发门槛；
2. 用 Home Assistant Android 与 AndroidX WebKit 的精确来源消息通道承载 UI RPC；
3. 用 Tauri 的 command / permission / scope 思路定义可生成、可审计的 Capability 契约；
4. 用 DeepSeek Harness 的 Definition / Provider / Consumer 服务缝和可撤销 effect 管理插件装载；
5. 用 Grafana 的发现、验证、注册、协议协商、健康检查和回滚状态机管理 Provider；
6. 用 AndroidX JavaScriptEngine + WorkManager 执行无界面、可恢复的后台 JavaScript；
7. 用 Zed 的 WIT/WASI 经验保留可选 WASM 后端，但不把 WASM 设为普通插件门槛。
8. 用 Figma 的“受限逻辑 + 独立 UI”和成熟宿主的 contribution 模型补充声明式 UI：简单页面由 Host 渲染，复杂页面才进入 WebView。

最接近 ATS 的不是单个竞品，而是：

> Acode 的开发体验 + Home Assistant 的 WebView 桥 + Tauri 的能力授权 + DeepSeek Harness 的服务组合
> + Grafana 的插件生命周期。

这轮调研没有推翻既有“Web-first、Capability、单 App、Android-first”方向，但把 UI 结论细化为
“声明式优先、WebView 作为复杂交互通道”，并补齐了此前尚未冻结的运行时边界：UI 与后台使用不同执行器；Capability 定义与实现分离；所有注册必须可撤销；
包安装必须先完成依赖图和载荷校验；API 24–25 不以隐藏 WebView 伪装后台脚本支持。

## 2. 评价维度

本报告按以下维度比较项目，而不是只比较“是否支持插件”：

- 普通开发者是否可以不接触原生平台工具链；
- UI 自由度和宿主外壳能否同时保留；
- 插件逻辑、UI、后台任务和平台能力是否有明确边界；
- 依赖、权限、版本、生命周期和故障是否可机器验证；
- Android 上是否能离线安装、恢复和升级；
- 机制是安全边界、可靠性隔离，还是仅用于接口治理；
- 是否有利于未来由 AI 生成、测试和装载插件。

## 3. 项目对比

| 项目 | 可借鉴机制 | 不直接照搬的部分 | 对 ATS 的结论 |
| --- | --- | --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) | Definition / Provider / Consumer、依赖注入、分层 profile、可撤销 effect、host/client 双端模块、能力图 | “产品一切皆插件”不能消除宿主 TCB；桌面/Node 装载方式不适合 Android | Capability 契约独立于 Provider；UI/宿主两端注册必须成对清理；生成依赖图并在 CI 校验 |
| [Acode](https://github.com/Acode-Foundation/Acode) | Android 上的清单、Web 技术插件、安装管理、init/unmount 生命周期 | 全局 JS API、`addJavascriptInterface`、隐藏 WebView 后台执行均不作为 V2 基线 | 证明 Web 插件门槛足够低；ATS 使用精确来源消息桥与独立后台执行器 |
| [Capacitor](https://capacitorjs.com/docs) | Web-first、统一 Plugin API、request/response ID、Promise 映射、原生实现注册 | Capacitor 插件属于应用自身代码，默认信任范围比 ATS 更宽 | JS SDK 应由契约生成，所有调用使用统一 envelope，但额外绑定 plugin/session/capability 身份 |
| [Tauri v2](https://v2.tauri.app/develop/plugins/) | command schema、allow/deny permission、scope、WebView/窗口能力绑定、移动端原生实现 | Rust 工具链和桌面进程模型不作为普通 ATS Tool 前提 | Capability 方法、权限标识和类型绑定从同一来源生成；未声明命令默认不可调用 |
| [Figma Plugins](https://developers.figma.com/docs/plugins/how-plugins-run/) | 逻辑沙箱与 iframe UI 分离、显式消息、网络域声明、关闭生命周期 | Figma 的页面模型和云分发不适配离线 Android 工具 | UI 与工作逻辑分开；关闭 UI 不等于取消已注册后台任务 |
| [VS Code Webview](https://code.visualstudio.com/api/extension-guides/webview) | 最小能力、局部资源根、CSP、消息传递 | Electron/extension host 进程不是 Android WebView | 每个 Tool 使用独立虚拟来源，只暴露包内资源，默认 CSP 禁网 |
| [Zed Extensions](https://zed.dev/docs/extensions/developing-extensions) | `wasm32-wasip2`、WIT 绑定、显式 capability scope | 移动端引擎成熟度和冷启动边界不同 | WIT 用于未来 worker/provider ABI；V2 首发不要求插件携带 WASM |
| [Firefox WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/permissions) | API permission 与 host/network permission 分离、安装时权限说明 | 浏览器标签页与站点注入模型不适合 ATS | `network.request` 方法权限与允许访问的 host scope 分开声明 |
| [Grafana Plugins](https://grafana.com/developers/plugin-tools/key-concepts/plugin-lifecycle) | 发现、签名验证、注册、协议协商、健康检查、懒加载、后端重启 | 服务端子进程/gRPC 不是 Android 单 App 的默认实现 | Provider 建立显式状态机、health、backoff 和上一版本回退；Web UI 按需创建 |
| [Home Assistant Android](https://github.com/home-assistant/android) | `WebViewCompat.addWebMessageListener`、主 frame/来源验证、版本化消息、旧桥迁移 | 面向单一自有前端，未处理多插件身份和 capability 授权 | 作为 ATS Android WebView 桥的直接实现参考，并增加 plugin/session 身份与消息上限 |
| [Joplin](https://joplinapp.org/help/dev/spec/plugins/) | sandbox proxy、RPC 序列化、callback ID、ready 握手、平台特定 runner | 移动端并不天然拥有和桌面相同的进程隔离 | RPC 必须有 ready/协议协商和排队上限；文档不能承诺所有平台同一种隔离强度 |
| [Obsidian API](https://github.com/obsidianmd/obsidian-api) | manifest + bundle、事件/定时器注册与自动清理 | 同上下文可信插件和全局 app API 不形成权限边界 | 借鉴 disposable 注册，不复制全局宿主对象 |
| [Extism](https://github.com/extism/extism) | 多语言 Wasm 插件、宿主函数、时间和资源限制 | 引入引擎体积、Android 兼容性和 WASI 能力需要单独实测 | 作为阶段 4 引擎候选，不阻塞 Web Tool 和 JavaScript worker |

## 4. Android 官方能力核查

### 4.1 Web UI

Android 官方建议本地内容使用
[WebViewAssetLoader](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)，
以 HTTP(S) 同源语义替代 `file://`/`data:`；文件、内容和跨文件访问应显式关闭。V2 因此为每个
插件生成唯一的 `https://<plugin-origin>/`，只映射已校验的 `web/` 目录。

消息桥使用
[WebViewCompat.addWebMessageListener](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge)，
只接受精确虚拟源且只处理主 frame。Android 官方对
[不安全原生桥](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges)
的说明指出，`addJavascriptInterface` 暴露给所有 frame 且无法可靠确认调用来源，因此它不进入
V2 Release 路径。

WebView renderer 是独立故障域。宿主按
[renderer termination 指南](https://developer.android.com/develop/ui/views/layout/webapps/handle-termination)
处理 `onRenderProcessGone`：销毁失效实例、展示共享 `ErrorState`、允许一次显式重载，并对短时
重复崩溃熔断。

### 4.2 后台 JavaScript

[AndroidX JavaScriptEngine 1.1.0](https://developer.android.com/jetpack/androidx/releases/javascriptengine)
已经是稳定版。官方的
[JavaScript/WebAssembly 执行指南](https://developer.android.com/develop/ui/views/layout/webapps/jsengine)
明确说明它不需要 WebView UI、可以在 Service 或 WorkManager 中运行，并通过独立进程连接执行
JavaScript。`JavaScriptSandbox` 只能有一个进程实例，但可建立多个 `JavaScriptIsolate`；不同
isolate 是独立状态和全局对象，却不是彼此之间的强安全边界。

V2 采用如下兼容策略：

- API 26+ 且 `JavaScriptSandbox.isSupported()` 为真：允许 `javascript-worker`；
- 逐项协商消息端口、WASM 编译、堆上限和终止等可选 feature；
- API 24–25 或 WebView 实现不支持：安装时把必需后台 JS 标为不兼容；可选后台入口则降级停用；
- 不使用隐藏 WebView、Activity 或无限 `setInterval()` 作为兼容层；
- 多个插件共享一个 sandbox 进程时，isolate 只提供可靠性和状态隔离，不宣称强对抗隔离。

持久任务由
[WorkManager](https://developer.android.com/develop/background-work/background-tasks/persistent)
保存唯一任务、约束、重试和重启后的调度状态。精确闹钟、持续前台服务和前台内协程分别走 Android
Adapter 的其他明确策略，不能全部伪装成 WorkManager 周期任务。

## 5. DeepSeek Harness 专项分析

DeepSeek Harness 的价值不在于“也是插件系统”，而在于它把组合关系放在实现类型之前。

### 5.1 Service seam

Harness 将服务拆为：

- Definition：稳定名称、类型与事件契约；
- Provider：某一具体实现；
- Consumer：只声明自己需要 Definition，不导入 Provider。

ATS 对应为：

```text
CapabilityDefinition(accessibility.manage@1)
        <- ShizukuAccessibilityProvider
        <- future RootAccessibilityProvider

AccessibilityTool -> requires accessibility.manage@^1
```

这样“所有插件一视同仁”落到同一解析和注册规则，而不是让 Shizuku 继续作为 `PluginHost` 的隐藏
方法。宿主仍保留最小 TCB（包验证、路由、存储、调度、WebView/JS 引擎 Adapter），TCB 不是一种
可被普通插件替换的 Provider。

### 5.2 可撤销 effect

插件装载过程中注册的服务、事件、任务、UI entry 和订阅都返回 disposable。停用、升级或卸载时
按逆序撤销；撤销失败使插件进入 `degraded`，不能假装卸载完成。这比目前依赖插件自行实现
`onDestroy()` 更适合热更新与 AI 生成代码。

### 5.3 Profile 与能力图

Harness 的 profile/bundle 能把一组定义、实现和配置组合为可验证启动图。ATS 不复制它的配置
语言，但采用同一思想生成三张图：

1. 安装图：插件、Provider、Capability 与版本范围；
2. 运行图：当前选中的 Provider、健康状态和降级原因；
3. 数据图：Dataset 依赖、generation 与迁移路径。

图在安装/升级前 fail-fast 校验，并可在 Debug 关于页导出；Release UI 只显示用户可理解的缺失能力
和处理办法。

### 5.4 Tool 与 Trusted Provider 分包

普通插件和 Native Provider 不允许混在一个包中。`tool` 不得夹带 `android/provider.apk`，但可以
通过必需的 JavaScript/WASM Worker 提供 Capability，且允许成为没有 UI 的服务型插件；
`trusted-provider` 必须包含签名 Native Provider，但也可同时贡献 UI、Tool、主页组件和 Worker。
区别不是能否提供能力或有无界面，而是实现是否必须以宿主身份与系统交互。Consumer 通过插件依赖与
Capability 依赖关联实现，不共享原生信任边界。

## 6. V2 由调研新增或强化的决策

### 6.1 单一契约源

manifest、Capability、RPC 错误码和事件从版本化 JSON Schema/IDL 生成：

- TypeScript SDK 类型和客户端；
- Kotlin 解析模型与校验器；
- 文档表格和示例；
- CLI lint/pack/verify；
- 兼容性 fixture。

禁止分别手写“看起来相同”的 Kotlin 与 TypeScript 模型。

### 6.2 插件贡献模型

包安装后先解析静态贡献，再执行任何代码。贡献至少包括 `uiEntries`、`workerEntries`、
`requires`、`provides`、`datasets` 和 `tasks`。运行时注册返回统一 disposable；停用和升级必须先
完成 quiesce，再卸载旧注册，最后原子切换 active generation。

### 6.3 RPC 基线

统一 envelope 包含：协议主/次版本、消息类型、`pluginId`、`sessionId`、`requestId`、方法、payload、
deadline。首版支持 request/response/event/cancel；大数据通过受控 blob handle 传递，不把 Base64
大对象塞进消息。调用在路由前再次核对声明的 Capability 和 scope。

### 6.4 Provider 生命周期

Provider 状态固定为：

```text
discovered -> verified -> registered -> starting -> healthy
                                      -> degraded -> stopped
                                      -> failed -> backoff -> starting
```

升级采用新 generation 预检、健康检查、原子路由切换和旧 generation 延迟回收。失败回退到上一已
验证 generation；不得只更新清单再期待运行时自行恢复。

### 6.5 统一声明式 UI 与后台执行器分离

所有新 Tool 使用 `ui/*.json` 声明入口：Host renderer 服务简单状态与动作页，`webview` renderer
服务复杂可见 UI。后台 JavaScript 使用
JavaScriptEngine isolate；持久调度由 WorkManager；平台持续任务必须显式升级到前台服务。四者共享
Capability/Storage 契约，不共享页面生命周期。声明式 UI 不引入表达式语言或任意脚本。

### 6.6 权限与网络 scope

借鉴 Tauri 与 WebExtensions，将三件事分开：

- 方法权限：能否调用 `network.request`；
- 数据 scope：允许哪些 host、路径、MIME、数据集或应用包名；
- 用户同意：首次、每次或系统设置中的长期选择。

“声明了 capability”不等于“已经获得系统授权”。普通 V3 Tool 的所有执行入口只能走 Router，未授权
调用会在 Provider 执行前被强制拒绝；用户决定绑定到 scope 指纹，范围变化重新确认，撤销同时作用于
调用、事件和后台调度。同进程 `trusted-provider` 明确是全信任代码，不包装成细粒度权限沙箱。

## 7. 明确不采用

- 不恢复 Host APK + 通用 Sandbox APK + 远程 Compose/Surface 原型；
- 不用 `addJavascriptInterface` 暴露全局 `ats` 对象；
- 不让隐藏 WebView 承担后台 worker；
- 不向 Tool 暴露 raw shell、`Activity`、`Context`、Binder 或任意文件路径；
- 不让“官方/内置”跳过普通插件的 ID、版本、依赖、签名和 Provider 解析规则；
- 不把同一 JavaScriptSandbox 中的 isolate 描述为相互强隔离；
- 不强制 React、Vue、WASM、Rust 或任意特定构建工具；
- 不把 GitHub Release 当作插件模型的一部分，GitHub 只是一种发布 Adapter；
- 不在 Runtime v2 完成前把 AI 生成或跨平台宿主插入关键路径。

## 8. 实施顺序建议

1. 冻结 7 个 ADR、manifest v3、RPC 和 Capability 兼容规则；
2. 完成不调用 ATS API 的 Web Tool：打包、原子安装、打开、错误恢复、卸载；
3. 加入生成式 TS SDK、storage 与基础 host event；
4. 建立 Capability Registry，将 Shizuku 和 `accessibility.manage` 接入同一路由；
5. 用无障碍授权完成第一个 Web Tool 迁移；
6. 加入 WorkManager + JavaScriptEngine 后台任务，验证 API 24/25/26+ 差异；
7. 建立 Storage/Dataset generation，迁移 Phigros 与抽卡分析；
8. 提供 CLI、模板、模拟器和契约 CI，再进入 API1 退役窗口。

阶段验收必须保持“一个可安装、可回滚、可验证的纵向闭环”，不能只统计新增类或 schema 数量。

## 9. 调研局限与后续验证

- JavaScriptEngine 的实际支持取决于设备 WebView 实现，必须在 API 26、当前主流 API 和物理设备上
  分别验证 `isSupported()` 与可选 feature；
- Android WebView 的内存上限没有跨设备统一值，启动、消息、资源和崩溃熔断阈值需通过基准测试
  冻结；
- Native Provider 的可安装载荷与 Android 动态代码策略需要以目标分发渠道再次核对；
- WASM 引擎只完成候选调研，仍需对 APK 体积、API 24 支持、WASI 0.2/WIT、可中断性和内存做
  实机 spike；
- 本报告关注公开架构与实现，不把项目流行度当作安全或适配性的证据。
