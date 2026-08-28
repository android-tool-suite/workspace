# ADR-0002：RPC envelope、取消、数据流与版本协商

- 状态：Accepted
- 日期：2026-08-21
- 影响阶段：Runtime v2 全阶段

## 背景

Web UI、后台 JavaScript、未来 WASM worker 和 Native Provider 需要共享一个不含 Android 类型的
调用契约。协议必须在输入不可信、页面可能重载、Provider 可能重启的情况下保持可诊断和可取消。

## 决策

### 握手

每个 transport 从 `hello` 开始：

```json
{
  "protocol": "2.0",
  "kind": "hello",
  "pluginId": "com.example.tool",
  "sessionId": "random-128-bit",
  "requestId": "0",
  "payload": { "supported": ["2.0"], "features": [] }
}
```

宿主返回选定版本、平台、主题、容器信息和当前可用 Capability 摘要。主版本必须完全一致；次版本
选择双方交集中的最高值。握手完成前最多排队 32 条客户端消息，超出即关闭 session。

### Envelope

所有消息固定包含：

- `protocol`：`major.minor`；
- `kind`：`hello | ready | request | response | event | cancel`；
- `pluginId`、`sessionId`、`requestId`；
- request 使用 `method`、`payload`、可选 `deadlineMs`；
- response 使用 `ok`，并且只包含 `result` 或 `error` 之一；
- event 使用单调递增 `sequence`、`event` 和 `payload`。

ID 是不透明字符串。宿主不信任 Web 端声明的 plugin/session，而是与 transport 绑定身份逐项比较。

### 上限与顺序

- 单条 UTF-8 JSON 消息上限 256 KiB，JSON 最大嵌套 32 层；
- 单 session 最多 64 个未完成请求；
- transport 按接收顺序解析，同一 request 只允许一个终态 response；
- 默认 deadline 30 秒，方法定义可以收紧；普通调用硬上限 10 分钟；
- 日志只记录 method、耗时、结果码和字节数，不记录敏感 payload。

### 取消

`cancel` 引用原 request ID。路由器传播取消令牌；尚未开始的请求必须取消，已进入不可中断平台调用
的请求返回 `CANCEL_PENDING`，最终 response 仍会被宿主丢弃。关闭 session 等价于取消其所有未完成
请求，但不取消已经持久化到 Scheduler 的独立 TaskRun。

### 大数据与流

首版不提供无界 push stream。超过消息上限的数据通过受控 blob/cursor：

```text
blob.openRead(dataset-or-result) -> handle
blob.read(handle, offset, maxBytes) -> bytes + eof
blob.close(handle)
```

handle 绑定 plugin/session、权限、过期时间和总字节上限。事件流是有界通知；消费者丢失序号后调用
显式 snapshot/cursor 恢复，不能依赖无限内存队列。

### 错误模型

稳定错误码至少包含：

```text
INVALID_REQUEST
PROTOCOL_MISMATCH
CAPABILITY_UNDECLARED
CAPABILITY_UNAVAILABLE
CAPABILITY_VERSION_MISMATCH
PERMISSION_DENIED
CONSENT_REQUIRED
PROVIDER_OFFLINE
TIMEOUT
CANCELLED
CANCEL_PENDING
RESOURCE_LIMIT
NOT_SUPPORTED
INTERNAL
```

错误包含面向开发者的安全摘要、`retryable` 和可选 details schema；面向用户的文案由宿主/Tool 根据
错误码生成，不直接展示异常堆栈。

## 兼容规则

- 同一 major 内只允许增加 optional 字段、方法或枚举的可忽略扩展；
- 删除/重命名字段、改变默认值或收紧已接受输入必须提升 major；
- 未知 request 方法返回 `INVALID_REQUEST`，未知 event 必须可忽略；
- schema fixture 同时由 Kotlin validator 和 TypeScript SDK 测试。

## 结果

所有 runtime backend 共用可生成的线协议；消息桥不等于授权边界，Capability Router 在每次调用时
重新校验声明、scope、同意状态和 Provider generation。
