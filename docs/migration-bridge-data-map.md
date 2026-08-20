# Migration Bridge 数据映射与验收清单

状态：1.6.1 正式版基线
更新日期：2026-08-21

## 1. 范围

Migration Bridge 在当前 API1 同进程插件与统一 `.atsbackup` v3 之间提供临时数据管理适配：只读导出现有旧数据、恢复已认证 Dataset，并在显式确认后删除插件声明可删除的数据。v3 还能嵌入宿主设置、插件包和启用状态；导入继续兼容 Bridge v2 与旧宿主迁移包。它不初始化或写入新运行时存储，不负责跨运行时在线同步。

Debug 宿主使用 `com.androidtoolsuite.app.debug`，只能读写该 Debug 安装自己的应用私有目录；正式宿主使用 `com.androidtoolsuite.app`，1.6.1 以相同协议读取该安装既有的 API1 私有数据。两者数据隔离，不能依靠安装覆盖跨包名迁移。

## 2. Dataset 映射

| 插件 | Dataset ID | 类别 | 恢复语义 | 依赖 | 当前数据来源／恢复目标 | 敏感 | 可删除 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 无障碍授权 | `accessibility-settings` | SETTINGS | REPLACE / MERGE | 无 | `accessibility_grant` SharedPreferences：替换全部设置，或合并收藏并应用传入的自动授权状态 | 否 | 是 |
| Phigros | `profiles` | SETTINGS | REPLACE | 无 | `phigros_data_studio_tokens` 中不含明文令牌的档案与选择；主页摘要设置 | 否 | 是 |
| Phigros | `analysis-data` | DATA | REPLACE | `profiles` | `files/phigros-data-studio/` 中除曲库和临时文件外的数据 | 否 | 是 |
| Phigros | `session-tokens` | SECRET | REPLACE | `profiles` | Android Keystore 解密后的现有 SessionToken，默认进入密码区 | 是 | 是，保留档案元数据 |
| Phigros | `song-catalog` | CACHE | REPLACE | 无 | `catalog.tsv` 或旧 `difficulty_tsv` 缓存 | 否 | 是 |
| 抽卡分析 | `gacha-settings` | SETTINGS | REPLACE / MERGE | 无 | `gacha-analysis-preferences` 的受支持标量与字符串集合；合并时保留包内未涉及的键 | 否 | 是 |
| 抽卡分析 | `genshin-records` | DATA | REPLACE / MERGE | 无 | 原神账号、记录与卡池完成状态；替换会在同一事务先清理原神数据，合并保留重复记录的当前版本 | 否 | 是，按游戏事务清理 |
| 抽卡分析 | `starrail-records` | DATA | REPLACE / MERGE | 无 | 星铁账号、记录与卡池完成状态；替换会在同一事务先清理星铁数据，合并保留重复记录的当前版本 | 否 | 是，按游戏事务清理 |
| 抽卡分析 | `mihoyo-session` | SECRET | REPLACE | 无 | Android Keystore 解密后的米游社会话，默认进入密码区 | 是 | 是 |

## 3. 宿主迁移项与明确不导出的内容

- `android_tool_suite/app-settings` 与 `android_tool_suite/plugin-enabled-state` 分别承载应用设置和插件启用状态。
- 每个外部插件使用独立的 `android_tool_suite/plugin-package.<pluginId>` 项，用户可逐个决定是否导出和导入。
- 所选宿主项目统一预检后在一个 MigrationTransaction 中应用；插件包替换失败时回滚对应包、设置和启用状态。
- 可再生成的 Gradle/Android 构建缓存。
- Phigros 临时文件；曲库作为 CACHE 默认不选。
- WebView Cookie、日志、截图、下载临时文件和调试输出。
- 无法由现有 Keystore 解密的凭据；不得静默导出密文占位或删除原值。

## 4. v3 归档规则

- `manifest.json`、`items.json`、`sections.json` 必须先于数据区；详细契约见 [data-package-v3.md](data-package-v3.md)。
- 明文区与密码区物理分离；每个项目有独立路径、大小与 SHA-256。
- SECRET 或 `sensitive=true` 默认进入密码区；允许用户在明确后果提示下选择明文，以便使用外部加密容器。
- 密码区使用 PBKDF2-HMAC-SHA256 派生密钥和 AES-256-GCM。
- Dataset 单项解压上限为 2 GiB；插件写入必须流式完成。
- 依赖必须在同一插件范围内解析，缺少依赖时拒绝导出。
- 原神和星铁记录必须分别形成 Dataset，禁止依赖当前 UI 选择后只导出其中一个游戏。
- 导入必须先把所选 Dataset 暂存到应用私有缓存，完成整包解密、AES-GCM 认证和 SHA-256/大小校验后才允许修改旧数据。
- 恢复按依赖顺序执行；设置与凭据提交后复核，SQLite 数据使用事务，文件类 Dataset 使用路径检查和暂存切换。
- 导入完成或失败后删除明文暂存文件并清零密码；凭据进入旧存储前使用目标安装的 Android Keystore 重新加密。
- 删除被依赖 Dataset 时自动选择 dependents，并按 dependents 到 dependency 的反向顺序执行。

## 5. 验收矩阵

| 场景 | 预期结果 |
| --- | --- |
| 无插件声明 Bridge | 提示没有可导出数据，不创建文件 |
| 导出三态 | 每项同时可选不导出、明文或加密；插件包可以逐个选择 |
| 选择依赖项 | 自动补齐其依赖；取消依赖时同时取消依赖它的 Dataset |
| 选择凭据 | 默认进入密码区 |
| 把凭据改为明文 | 主操作前显示文件可被直接读取的后果，不增加重复确认行 |
| 密码少于 8 位 | 禁止继续并显示原因 |
| 正确密码 | 能读取全部 Dataset，摘要与大小验证通过 |
| 错误密码 | AES-GCM 认证失败，不修改旧数据，删除暂存文件 |
| 截断或篡改 payload | 完整性验证失败，不修改旧数据 |
| Phigros 同时有 CN/GLOBAL 档案 | 档案、当前选择与令牌 ID 对应 |
| 抽卡数据库同时有两款游戏 | 两个 Dataset 互不混入账号和记录 |
| Keystore 缺失或损坏 | 敏感 Dataset 导出失败，原偏好和数据库不变 |
| 导出非敏感数据 | 可以不设置密码，完整性仍由 SHA-256 校验 |
| 清空目标安装后导入全部 Dataset | 九个 Dataset 均恢复，凭据可重新导出且不会复用旧 Keystore 密文 |
| 导入后再次导出 | 忽略 manifest 时间、来源版本和随机加密参数后，各 Dataset 内容与原包一致 |
| 导入到已有数据 | 每项注明已有数据；插件声明的替换／合并方式可选，不支持合并时禁用并说明 |
| 未安装插件及其数据 | 只有同时选择该插件自己的插件包时才允许导入数据；安装后重新探测已有数据和能力 |
| 只选择明文区导入混合包 | 不要求密码，不解密密码区，明文区完整性仍通过 |
| 删除 Phigros `profiles` | 自动同时选择 `analysis-data` 与 `session-tokens`，先删 dependents 再删档案 |
| 删除单一游戏记录 | 仅清理该游戏账号、记录和卡池状态，另一游戏保持不变 |

## 6. Runtime v2 迁移前置条件

1. 已完成：Debug 真机使用代表性数据完成导出、清空、导入、再次导出和逐 Dataset 内容比较，并覆盖正确密码和已有数据处理。
2. 已完成：以相同 v3/Dataset schema 发布 1.6.1 同包名正式 Bridge，读取正式版私有数据。
3. 新运行时必须完成 staging、业务校验、原子切换和空环境恢复。
4. 消费备份的新运行时只能在可回退 Bridge 之后发布；不得反向排序。
5. 保留至少一个正式版本的旧运行时回滚窗口，确认恢复后才删除 Bridge 接口。
