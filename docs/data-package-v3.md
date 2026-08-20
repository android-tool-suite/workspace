# `.atsbackup` v3 统一数据包契约

状态：1.6.1 正式版实现基线
更新日期：2026-08-21

## 1. 用途

v3 用一种 `.atsbackup` 文件支持三类操作：

- 应用设置、插件启用状态和每个外部插件包分别导出、导入；
- 按插件或 Dataset 导入、导出；
- 同一包内组合整体迁移与插件数据。

它是 API1 Bridge 与未来 StorageService 之间的归档语义基线，不等于新 Runtime 的物理存储格式。导入继续兼容 `.atsbackup` v2 和旧版 `migration.json` 宿主迁移包。

## 2. 外层结构

```text
manifest.json
items.json
sections.json
sections/plain.zip
sections/password.enc
```

元数据必须位于数据区之前。未使用的区不写入；同一保护方式最多一个区。未知文件、重复清单、未声明区、路径越界或重复项目必须拒绝。

`items.json` 中每项包含：

- `ownerId`、`ownerName`；
- `kind`：`HOST_SETTINGS`、`HOST_PLUGIN_STATE`、`HOST_PLUGIN_PACKAGE` 或 `PLUGIN_DATA`；
- 稳定 `id`、名称、类别、估算大小和格式版本；
- `sensitive`、插件声明的可用恢复方式列表和同 owner Dataset 依赖；
- `protection`：当前为 `NONE` 或 `PASSWORD`。

宿主项目固定使用以下 ID：

- `android_tool_suite/app-settings`：主题、配色、更新与布局等应用设置；
- `android_tool_suite/plugin-enabled-state`：内置与外部插件的启用状态；
- `android_tool_suite/plugin-package.<pluginId>`：一个外部插件包，每个插件独立成项。

三个种类可独立选择保护方式；插件包不再被捆绑成一个宿主迁移载荷。

## 3. 数据区

每个数据区是一个内层 ZIP，包含：

```text
payload/<ownerId>/<itemId>
integrity.json
```

`integrity.json` 按项目记录解压后大小和 SHA-256。单项最大 2 GiB；写入和读取必须流式执行。恢复时即使只消费区内部分项目，也要读取并验证该区所有项目，避免把未认证尾部当成成功。

### 3.1 明文区

`sections/plain.zip` 不加密。SECRET 或 `sensitive=true` 默认分配到密码区，但用户可以在明确后果提示下改为明文，以便把包交给外部加密容器、硬件盘或其他受控系统。

### 3.2 密码区

`sections/password.enc` 使用：

- PBKDF2-HMAC-SHA256，310000 次；
- 16 字节随机 salt；
- AES-256-GCM，12 字节随机 nonce、128 位 tag；
- 固定且版本化的 AAD。

UI 要求至少 8 位密码。随机 salt/nonce 使相同内容的两次导出字节摘要不同，内容等价性应比较解密后的逐项目摘要。

## 4. 选择与依赖

- 导出或恢复某 Dataset 时自动补齐其依赖。
- 取消依赖时同时取消依赖它的项目。
- 删除采用反向规则：删除被依赖项目时自动选择其 dependents，并按 dependents 到 dependency 的顺序执行。
- 依赖只在同一 owner 内解析；循环、缺失或重复 ID 均拒绝。
- 用户可以只恢复明文区，此时不要求密码，也不解密密码区。

导出界面对每项直接提供“不导出／明文／加密”三种状态。导入界面根据本机状态切换：

- 当前没有数据：`跳过／导入`；
- 已有数据：`跳过／替换／合并`；
- 插件未声明合并能力时，合并不可选，并在项目行说明原因。

`LegacyDataBridge.hasData(...)` 负责判断当前是否已有数据；`supportsRestoreMode(...)` 和 `importDataset(..., restoreMode, ...)` 由插件实现。宿主只展示归档声明与目标插件实际支持方式的交集。

## 5. 恢复顺序

1. 读取 schema 元数据；探测当前数据，并展示可由所选独立插件包先安装插件后处理的项目。
2. 把所选项目写入应用私有缓存，验证数据区完整性。
3. 将所选应用设置、插件启用状态和插件包作为一个宿主事务应用；任一宿主项目失败时回滚本次宿主变更。
4. 重新加载实际安装的插件 Bridge，重新确认 Dataset 格式、恢复方式和已有数据状态没有产生冲突。
5. 按 Dataset 依赖顺序调用插件 Bridge，并传入用户选择的 `REPLACE` 或 `MERGE`；各插件继续负责业务校验、事务或原子文件切换。
6. 无论成功失败都删除暂存明文并清零密码。

尚未安装插件的数据只有在同包中选中该插件自己的 `plugin-package.<pluginId>` 项时才允许恢复。若安装后发现目标存储已有数据、插件无法加载或不再支持用户选择的恢复方式，操作会明确停止并要求重新选择，不会静默改用替换或合并。

## 6. 删除边界

删除不是归档文件操作，而是 `LegacyDataBridge` 的独立、默认关闭能力。宿主必须：

- 只展示插件明确声明可删除的 Dataset；
- 展开依赖影响并要求不可撤销确认；
- 在后台串行执行并报告首个失败项；
- 不把删除插件 APK 等同于删除插件数据；
- 不删除无法识别、未声明或其他插件命名空间的数据。

## 7. 兼容与演进

- v2 导入保持原有整包明文或整包密码语义。
- 旧宿主迁移包通过统一导入入口识别并走原事务流程。
- v3 解析器不猜测未来版本；未知版本明确拒绝。
- Runtime v2 可以复用项目描述、保护区和完整性语义，但应以平台无关接口替换 `Activity` 和 API1 私有路径。
