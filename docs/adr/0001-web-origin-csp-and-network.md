# ADR-0001：Web 虚拟源、CSP 与网络边界

- 状态：Accepted
- 日期：2026-08-21
- 影响阶段：Runtime v2 阶段 1–2

## 背景

Web Tool 需要加载插件包内的 HTML/CSS/JavaScript，同时不能继承 `file://` 的模糊来源语义、访问
任意本地路径或绕过 Capability 直接联网。不同插件也不能共享 cookie、Web Storage 或消息来源。

## 决策

### 虚拟源

- Android 使用 `WebViewAssetLoader`，每个插件建立独立 HTTPS 虚拟源：
  `https://<origin-key>.plugins.android-tool-suite.test/`。
- `origin-key` 为规范化插件 ID 的 SHA-256 前 160 bit 小写十六进制；不直接把可混淆、超长或包含
  非主机字符的插件 ID 放入域名。
- 只映射当前 active package generation 的 `/web/`。URL 路径经一次严格百分号解码后规范化；拒绝
  空段、`.`、`..`、反斜线、NUL、重复文件名和编码后的分隔符。
- `file://`、`content://`、跨文件访问和 universal file URL access 全部关闭；cookie 和第三方
  cookie 关闭。

### CSP

宿主对所有 HTML 响应施加不弱于以下基线的 header；插件可以收紧，不能放宽：

```text
default-src 'none';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'none';
media-src 'self' blob:;
worker-src 'self' blob:;
object-src 'none';
base-uri 'none';
form-action 'none';
frame-src 'none';
frame-ancestors 'none'
```

首版允许 inline style 以兼容常见 Web UI 构建产物，但不允许 inline script、`eval` 或远程脚本。
Release 包若需要更宽的 script 策略直接判为不兼容，不以 nonce 注入任意插件脚本。

### 导航与网络

- 主 frame 和子资源只允许当前虚拟源；其他 `http`/`https` 请求由 `shouldInterceptRequest` 拒绝。
- 打开外部页面使用 `app.openExternal` Capability，由宿主展示目标并交给系统处理。
- 网络数据使用 `network.request` Capability；方法授权与 host/method/MIME/size scope 分开声明。
- mixed content 设为 never allow，Safe Browsing 在设备支持时保持开启。
- DOM Storage 默认关闭；持久状态必须使用 ATS Storage。无 ATS API 的 Web Tool 只能在当前页面内
  保存内存状态。

### 消息桥

- 只使用 `WebViewCompat.addWebMessageListener`，allowed origin 为当前精确虚拟源。
- 只接受主 frame；不使用 `addJavascriptInterface` 作为 Release 兼容路径。
- 每次 UI 打开生成新的 session nonce，来源检查通过后仍必须校验 RPC 中的 plugin/session 身份。

### 故障与恢复

- `onRenderProcessGone` 后立即移除并销毁失效 WebView；共享外壳显示 `ErrorState`。
- 同一插件 60 秒内最多自动重建一次；再次终止进入熔断，只有用户显式“重新加载”或安装新版本
  才恢复。
- WebView 按需创建，离开详情页即关闭；它不承担后台任务。

## 结果

插件拥有标准 HTTPS 同源语义和完整 Web UI 自由，但不能靠浏览器 API 绕过 Capability、数据治理或
后台调度。关闭 DOM Storage 会让依赖 `localStorage` 的现成网页需要很小的适配，这是为可备份、
可迁移数据边界接受的代价。

## 验证

- 单测覆盖 origin 派生、路径规范化、重复/穿越/编码分隔符和 CSP 合并；
- instrumented test 覆盖同源加载、跨源/iframe/远程请求拒绝和主 frame 消息；
- 模拟 renderer 终止，验证一次恢复和崩溃熔断；
- API 24、主流 API 与物理设备分别验证 WebView 行为。

