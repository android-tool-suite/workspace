# Android Tool Suite 数据管理与迁移

## 1. 用途

v3 用一种 `.atsbackup` 文件支持三类操作：

- 应用设置与插件启用状态分别导出、导入；
- 按插件或 Dataset 导入、导出；
- 同一包内组合整体迁移与插件数据。

它是当前 DatasetService 的归档语义基线，不等于运行时的物理 storage generation。导入继续识别 `.atsbackup` v2 和旧版 `migration.json` 宿主迁移包，但不会安装或执行其中的 API1 插件代码。

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
- `android_tool_suite/plugin-package.<pluginId>`：导出已安装 format v3 插件的原始包（含完整性与签名文件），支持仅本地、未发布的项目迁移。恢复使用与本地导入相同的安装校验；历史 API1 载荷仍拒绝安装。

当前宿主设置、启用状态和插件 Dataset 可独立选择保护方式。

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

导出先用复选框选择内容，再于设置与核对步骤决定文件保护。默认加密整个所选范围，另提供仅敏感内容加密、不加密与逐项自定义；敏感明文在核对页说明后果。浏览数据来源不改变全局任务范围，插件详情入口仅提供当前插件的可操作项目。

导入先读取归档并选择内容，在核对步骤按本机状态和接收方契约提供导入、合并或替换；不支持合并的项目明确说明原因。旧备份声明仅支持替换时，只要数据格式仍兼容，接收方新增的声明式合并规则仍可使用。

宿主私有 `DatasetBridge` 负责判断当前是否已有数据以及可用恢复方式；它只适配已经安装的 format v3 Dataset，不暴露给插件 SDK。

## 5. 恢复顺序

1. 读取 schema 元数据，识别历史项目并探测当前已安装 format v3 插件的数据。
2. 把所选项目写入应用私有缓存，验证数据区完整性。
3. 将所选应用设置和插件启用状态作为一个宿主事务应用；任一宿主项目失败时回滚本次宿主变更。
4. 重新确认已安装 format v3 插件的 Dataset 格式、恢复方式和已有数据状态没有产生冲突。
5. 按 Dataset 依赖顺序调用宿主私有 DatasetBridge，并传入用户选择的 `REPLACE` 或 `MERGE`；DatasetService 负责业务格式校验和 generation 原子切换。
6. 无论成功失败都删除暂存明文并清零密码。

尚未安装插件时，可同时选择归档中的 format v3 插件包及其 Dataset；先校验并安装包，再重新绑定该包声明的数据契约。包与项目 ID 不符、签名/完整性无效、降级、不兼容数据均中止恢复；包安装会话在数据恢复成功后确认。可捕获的恢复失败会回滚包版本、本次涉及的数据 generation 和宿主设置；generation 检查点保留原始文件，凭据不解密导出。若回滚本身失败，保留检查点并明确报错；不宣称整个多插件归档在进程被强杀或断电时具有跨存储事务原子性。新装插件保持停用，即使备份启用状态为 true 也不自动执行；已经停用的可信 Provider 也不会由备份重新启用，用户须在插件详情确认完全信任。普通插件权限不会从归档中自动授予。历史 API1 插件包拒绝安装，可跳过包，仅恢复已安装新版插件兼容的数据。

## 6. 删除边界

删除不是归档文件操作，而是宿主私有 `DatasetBridge` 的独立能力。宿主必须：

- 只展示插件明确声明可删除的 Dataset；
- 展开依赖影响并要求不可撤销确认；
- 在后台串行执行并报告首个失败项；
- 不把删除插件 APK 等同于删除插件数据；
- 不删除无法识别、未声明或其他插件命名空间的数据。

## 7. 兼容与演进

- v2 导入保持原有整包明文或整包密码语义。
- 旧宿主迁移包通过统一入口识别；只恢复仍受支持的宿主状态，忽略其中的 API1 可执行载荷。
- 主体 2.0.0 不再读取旧安装记录来管理插件，也不再导出旧 APK；旧文件和业务数据不会自动删除。尚未迁移的 API1 数据须先在支持 Migration Bridge 的旧版本导出。旧内置 Shizuku 的启用标记不会启用或授权新的可信 Provider。
- v3 解析器不猜测未来版本；未知版本明确拒绝。
- 插件运行时复用项目描述、保护区和完整性语义，并以平台无关接口替换 `Activity` 和 API1 私有路径。

## 8. 历史数据与当前 Dataset

历史归档按逻辑 owner/item 标识与当前已安装插件的 Dataset 契约匹配，旧路径不构成新插件可访问的文件接口。当前项目及恢复方式由各插件 `src/manifest.template.json` 声明：

| 插件 | Dataset ID | 类别 | 支持恢复方式 | 依赖 | 内容 |
| --- | --- | --- | --- | --- | --- |
| 无障碍授权 | `accessibility-settings` | SETTINGS | MERGE / REPLACE | 无 | 收藏、显式恢复规则与兼容旧设置 |
| Phigros | `profiles` | SETTINGS | MERGE / REPLACE | 无 | 档案、选择与小部件摘要设置，不含明文令牌 |
| Phigros | `analysis-data` | DATA | MERGE / REPLACE | `profiles` | 当前成绩、分析与历史，保留较新当前存档 |
| Phigros | `session-tokens` | SECRET | MERGE / REPLACE | `profiles` | 登录凭据，合并保留已有凭据 |
| Phigros | `catalog-versions` | CACHE | MERGE / REPLACE | 无 | 按版本与修订保存的定数快照 |
| Phigros | `song-catalog` | CACHE | REPLACE | 无 | 可重新获取的整体曲库缓存 |
| 抽卡分析 | `gacha-settings` | SETTINGS | MERGE / REPLACE | 无 | 账号选择、分析与小部件设置 |
| 抽卡分析 | `genshin-records` | DATA | MERGE / REPLACE | 无 | 原神账号、记录与卡池完成状态 |
| 抽卡分析 | `starrail-records` | DATA | MERGE / REPLACE | 无 | 星铁账号、记录与卡池完成状态 |
| 抽卡分析 | `mihoyo-session` | SECRET | MERGE / REPLACE | 无 | 米游社会话，合并保留已有值 |
| 抽卡分析 | `record-links` | SECRET | MERGE / REPLACE | 无 | 按游戏与账号保存的链接缓存，保留较新获取值 |

宿主自身使用 `android_tool_suite/app-settings`、`android_tool_suite/plugin-enabled-state` 与 `plugin-package.<pluginId>`。备份不包含 Gradle 缓存、临时文件、WebView Cookie、日志、截图、下载中转、API1 插件包或无法解密的密文占位。

## 9. 发布验收矩阵

| 场景 | 必须满足 |
| --- | --- |
| 导出选择 | 先选择内容再核对保护方式；敏感明文说明后果，默认保护全部所选项 |
| 依赖处理 | 选择项自动补齐依赖；取消依赖会同步取消 dependents |
| 错误密码、截断或篡改 | 认证或完整性检查失败，不修改目标数据，并删除暂存明文 |
| 空环境恢复 | 先安装 format v3 插件，再恢复所选宿主状态与 Dataset；凭据使用目标 Keystore 重新加密 |
| 恢复后再导出 | 排除时间、来源版本和随机加密参数后，Dataset 语义内容一致 |
| 已有数据 | 明确显示替换／合并能力；不支持的方式保持不可选并解释原因 |
| 缺少插件 | 同选 format v3 包和数据，标准校验安装后恢复；缺包则先安装；历史 API1 包不得执行 |
| 单游戏删除 | 只清理目标游戏的账号、记录和完成状态，不影响另一游戏 |
| 凭据故障 | Keystore 缺失或损坏时导出失败，原值不删除、不写占位 |

归档解析器只保留对旧 `.atsbackup` v2/v3 清单与非可执行数据的最小只读兼容，不恢复 API1 执行或公开 Bridge 接口。兼容性变更必须覆盖旧数据导出、空环境恢复、业务校验和降级边界。
