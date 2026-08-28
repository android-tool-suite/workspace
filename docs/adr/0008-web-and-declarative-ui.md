# ADR-0008：统一声明式 UI 与可选 WebView Renderer

- 状态：Accepted
- 日期：2026-08-26
- 影响阶段：Runtime v2 UI、工具开发和主页组件

## 背景

Web UI 能覆盖图表、编辑器和高度自定义交互，但简单状态工具不应承担 WebView 冷启动、渲染器生命周期和前端样式维护。若在 manifest 中把 `web` 与 `declarative` 设计成两个同级 UI 类型，插件、宿主和工具链还要维护两套入口、状态和验收语义。V2 需要一个声明式入口，同时保留两种 renderer。

## 决策

format v3 的新包只声明 `runtime.ui[].type = declarative`，入口统一指向 `ui/*.json`。文档根 `body` 决定 renderer：

- `column`：宿主使用共享 Compose 设计系统递归渲染组件树；
- `webview`：文档仅声明包内 `web/*.html` 入口，宿主使用每插件独立 HTTPS 虚拟源和版本化 RPC 创建 WebView。

声明式 UI v1 只允许页面容器、分段、卡片、文本、受限共享图标、指标、状态标签、提示、按钮、加载／空／错误状态、分隔和间距。文档可以用状态路径绑定标量文本，用启动 Query 获取数据，用按钮 Action 调用 Capability；不支持任意表达式、脚本、HTML 或反射。WebView renderer 从宿主同时取得色彩、间距、圆角和类型层级 token，不能依赖浏览器默认字号、字重或字符图标。

所有 Query、Action 和主页组件数据源必须映射到 manifest 已声明的 Capability。文档在 CLI 打包和宿主 staging 安装时分别验证大小、深度、节点数、引用、method/Capability 对应和 payload 上限。

`webview` 根文档不能同时声明 Host 状态、Query 或 Action，避免一份入口出现两个状态机。复杂图表、编辑器、画布、长列表自定义和需要前端生态的页面选择 WebView renderer。旧版 `runtime.ui[].type = web` 只保留读取兼容，不再由脚手架或新示例生成。

## 结果

工具、权限、生命周期和 UI 元数据只有一套声明模型；简单工具不需要 WebView 或 Android 构建即可获得与宿主一致的主题、无障碍和状态组件，复杂工具仍保留 Web 技术自由度。声明式协议保持平台无关，Android Compose 与 WebView 都只是当前 renderer。
