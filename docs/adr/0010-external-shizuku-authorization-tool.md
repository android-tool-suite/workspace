# ADR-0010：Shizuku 授权与底层能力合并外置

- 状态：Accepted
- 日期：2026-08-28
- 影响阶段：宿主内置工具、Shizuku 平台适配和插件依赖

## 背景

旧宿主把 `shizuku_auth` 注册为不可删除的可选内置 `ToolPlugin`。V2 早期方案又把授权 UI 与底层 Provider 拆成两个包，增加了安装顺序、依赖和版本管理，却没有带来安全隔离：底层代码仍以宿主身份运行。

## 决策

宿主只保留 Android 安装模型要求的最小 Shizuku bootstrap：manifest 中的 `ShizukuProvider`、UserService 可装载类、Binder 生命周期和一个只对全信任 Provider 开放的底层 bridge。原因是内嵌 `.atsplugin` 的 DEX 不是 Android 已安装包，无法自行贡献 manifest 组件，也不能让 Shizuku 进程从宿主 base APK 之外解析 UserService 类。

`shizuku_auth` 从 `ToolRegistry` 删除，改为单个独立、签名的 format v3 `trusted-provider` 包。同包 Native Provider 在冷启动后注册 `shizuku.control` 与 `accessibility.manage`，声明式 UI 调用 `shizuku.getConnection`、`shizuku.requestPermission` 和 `shizuku.connect`。宿主不再内置注册这些业务 Capability。

`trusted-provider` 表示同包原生代码获得宿主身份，不表示包必须没有普通插件功能。它可以同时贡献 UI、主页组件、Worker、任务和 Tool；整包仍按同一 ID、版本、generation、启停和更新规则管理。启用后若 Provider 尚未冷启动激活，UI 也不加载，避免混用不同 generation。

API1 兼容插件在回滚窗口内仍可通过插件 ID 依赖 `shizuku_auth`。宿主使用统一的 API1/V2 迭代依赖图，使外部 V2 Tool 可以满足旧依赖。旧备份中内置 `shizuku_auth` 的启用状态映射到同 ID 外部包；权限决定不随备份自动恢复。

## 结果

Shizuku 授权 UI 和能力实现作为一个插件安装、启停、更新和回滚，不再需要第二个依赖包。宿主仍有不可避免的最小 Android/Shizuku bootstrap，但它不能直接满足普通插件的 Capability；只有已安装、启用、受信签名且完成冷启动激活的 `shizuku_auth` 才能提供能力。其他插件只看到受限 Capability 与各自权限。
