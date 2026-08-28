# ADR-0003：Native Provider 载荷、装载与信任根

- 状态：Accepted
- 日期：2026-08-21
- 影响阶段：Runtime v2 阶段 1、3、6

## 背景

Shizuku、Android 设置、使用情况访问等能力必须由原生代码实现。用户只应安装和打开一个 ATS
应用，同时“官方插件”不能绕过普通插件的身份、版本、依赖和路由规则。动态原生代码一旦装入
宿主进程便进入受信计算基，Capability 开关不能把它变成不可信沙箱。

## 决策

### 统一包模型

Native Provider 使用 format v3 `.atsplugin`，外层与 Web Tool 完全相同：ID、版本、publisher、
requires/provides、摘要、依赖解析、generation、升级回滚和发布渠道均走同一规则。原生载荷位于：

```text
android/provider.apk
```

包必须显式声明 `plugin.kind`：普通 `tool` 不得声明或夹带 Native Provider，但可以通过受限 Worker 提供 Capability，也可以同时贡献声明式 UI、Tool 或主页组件；没有 UI 的服务型普通插件至少提供一个 Worker Capability。`trusted-provider` 必须包含 Native Provider，也可以贡献普通插件拥有的 UI、Tool、主页组件、Worker 和任务。区分点不是功能形态或能否提供能力，而是同包原生实现是否必须以宿主身份运行并接触系统 API。

### 信任模型

- Web-only 本地包可以在明确显示来源风险后导入；
- 任何包含原生载荷的包必须有包内完整性清单和 publisher ECDSA P-256 签名；
- Release 默认只信任宿主内置官方 publisher key；用户只能在 Developer Mode 中显式添加其他
  publisher key，添加时显示指纹和“原生代码可访问 ATS 进程数据”的实际后果；
- registry 索引签名证明目录来源，包内签名证明离线包和载荷本身，两者不可互相替代；
- 签名覆盖规范化 manifest、每个文件的路径/长度/SHA-256 以及 package format major。

“官方”只决定预置信任根和默认可见性，不改变 Provider 的注册、版本或 Capability 路由。

### 装载

- 包先解压到应用私有 staging generation，完成路径、大小、摘要、签名和 ABI 检查后设为只读；
- API 24+ 使用独立 generation `DexClassLoader` 装载 `android/provider.apk`，父加载器只提供 Provider
  SDK 和宿主显式公共类型；Provider 不提供 Compose UI；
- Provider entry 实现版本化 `NativeProviderEntry`，只获得 application-scoped `ProviderContext`，
  注册 Capability 后返回 disposable；
- 已加载 generation 不尝试类卸载或就地替换。升级先预检，新版本在下次宿主冷启动激活；需要立即
  切换时由宿主执行受控进程重启并恢复原导航；
- 动态代码目录不可写、不可执行外部存储内容，运行前再次核对摘要。

### 宿主平台适配器与全信任 Provider

必须随已安装 Host APK 和 Android manifest 存在的最小 bootstrap（首个为 Shizuku Provider 与
UserService 可装载类）属于不可插件化的平台适配器。它不出现在 ToolRegistry、不提供用户页面，也不
直接注册 `shizuku.control` 或 `accessibility.manage`。宿主仅向通过签名验证的 `trusted-provider`
提供 `TrustedPlatformBridge`；普通 Tool 的类加载与 RPC 路径无法获得该对象。

`shizuku_auth` 作为单个全信任包把底层 bridge 转换为窄 Capability，并同时贡献授权 UI。它与其他包
使用相同 ID、版本、依赖、generation 和更新规则，但其“全信任”风险在启用界面单独显示；普通插件的
权限开关只控制它们是否能调用该包导出的能力，不能约束同包 Provider 本身。最小 bootstrap 随宿主
版本维护，不伪装成可删除插件，也不能绕过 Provider 包直接向普通插件提供业务能力。

### 强安全边界表述

Native Provider 与宿主同进程，拥有 Provider SDK 暴露的对象且可能利用同进程漏洞；publisher 信任
与代码审查是主要边界。Web Tool 的 WebView/JS isolate 是可靠性与攻击面收缩层，不把整个插件系统
宣传为可以安全运行任意敌意代码。

## 被拒绝方案

- 每个 Provider 安装为带桌面入口的独立应用：破坏单应用体验和统一迁移；
- 恢复通用 Sandbox APK/固定 Service：增加安装与 OEM 生命周期复杂度，且未解决 Provider TCB；
- 允许未签名 `plugin.apk` 延续 API1 路径：与原生载荷风险不匹配；
- 为 Shizuku 保留私有宿主方法：会让 Definition/Provider 解耦失效。

## 验证

- fixture 覆盖篡改 manifest/载荷、重复路径、未知 publisher、密钥轮换和降级；
- Provider 注册、health、停用、升级待重启与上一 generation 回退均有测试；
- `rg`/API 检查保证 V2 Tool 不引用 Shizuku 类或 raw shell；
- 物理设备验证冷启动装载、Shizuku 授权丢失和进程重启恢复。
