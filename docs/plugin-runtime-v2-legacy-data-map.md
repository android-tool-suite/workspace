# Migration Bridge 旧数据映射与验收清单

状态：Bridge Debug 基线
更新日期：2026-08-14

## 1. 范围

Migration Bridge 从当前 API1 同进程插件只读导出 `.atsbackup` v2。它不恢复、不搬移、不删除数据，也不初始化新运行时存储。

Debug 宿主使用 `com.androidtoolsuite.app.debug`，只能读取该 Debug 安装自己的应用私有目录。Debug 预发布用于验证格式、选择、加密、数据完整性和插件适配器；它不能完成正式版 `com.androidtoolsuite.app` 的真实私有数据迁移。

## 2. Dataset 映射

| 插件 | Dataset ID | 类别 | 恢复语义 | 依赖 | 当前数据来源 | 敏感 |
| --- | --- | --- | --- | --- | --- | --- |
| 无障碍授权 | `accessibility-settings` | SETTINGS | REPLACE | 无 | `accessibility_grant` SharedPreferences：收藏与自动授权 | 否 |
| Phigros | `profiles` | SETTINGS | REPLACE | 无 | `phigros_data_studio_tokens` 中不含明文令牌的档案与选择；主页摘要设置 | 否 |
| Phigros | `analysis-data` | DATA | REPLACE | `profiles` | `files/phigros-data-studio/` 中除曲库和临时文件外的数据 | 否 |
| Phigros | `session-tokens` | SECRET | REPLACE | `profiles` | Android Keystore 解密后的现有 SessionToken，仅流入加密导出 | 是 |
| Phigros | `song-catalog` | CACHE | REPLACE | 无 | `catalog.tsv` 或旧 `difficulty_tsv` 缓存 | 否 |
| 抽卡分析 | `gacha-settings` | SETTINGS | REPLACE | 无 | `gacha-analysis-preferences` 的受支持标量与字符串集合 | 否 |
| 抽卡分析 | `genshin-records` | DATA | MERGE | 无 | 只读打开 `gacha-analysis.db` 后筛选原神账号、记录与卡池完成状态 | 否 |
| 抽卡分析 | `starrail-records` | DATA | MERGE | 无 | 同一数据库中单独筛选星铁账号、记录与卡池完成状态 | 否 |
| 抽卡分析 | `mihoyo-session` | SECRET | REPLACE | 无 | Android Keystore 解密后的米游社会话，仅流入加密导出 | 是 |

## 3. 明确不导出的内容

- 宿主布局、插件包和启用状态：继续由旧版宿主迁移包负责，不与 Dataset Bridge 混合。
- 可再生成的 Gradle/Android 构建缓存。
- Phigros 临时文件；曲库作为 CACHE 默认不选。
- WebView Cookie、日志、截图、下载临时文件和调试输出。
- 无法由现有 Keystore 解密的凭据；不得静默导出密文占位或删除原值。

## 4. 归档规则

- `manifest.json`、`datasets.json` 必须先于 payload。
- 每个 Dataset 有独立路径、大小与 SHA-256。
- 包含 SECRET 或 `sensitive=true` 时必须设置至少 8 位密码。
- 加密使用 PBKDF2-HMAC-SHA256 派生密钥和 AES-256-GCM；明文中不得出现凭据。
- Dataset 单项解压上限为 2 GiB；插件写入必须流式完成。
- 依赖必须在同一插件范围内解析，缺少依赖时拒绝导出。
- 原神和星铁记录必须分别形成 Dataset，禁止依赖当前 UI 选择后只导出其中一个游戏。

## 5. Debug 验收矩阵

| 场景 | 预期结果 |
| --- | --- |
| 无插件声明 Bridge | 提示没有可导出数据，不创建文件 |
| 默认选择 | 选中设置和小型业务数据，不选缓存与凭据 |
| 选择依赖项 | 自动补齐其依赖；取消依赖时同时取消依赖它的 Dataset |
| 选择凭据但无密码 | 禁止继续 |
| 密码少于 8 位 | 禁止继续并显示原因 |
| 正确密码 | 能读取全部 Dataset，摘要与大小验证通过 |
| 错误密码 | AES-GCM 认证失败，不向恢复方交付数据 |
| 截断或篡改 payload | 完整性验证失败 |
| Phigros 同时有 CN/GLOBAL 档案 | 档案、当前选择与令牌 ID 对应 |
| 抽卡数据库同时有两款游戏 | 两个 Dataset 互不混入账号和记录 |
| Keystore 缺失或损坏 | 敏感 Dataset 导出失败，原偏好和数据库不变 |
| 导出非敏感数据 | 可以不设置密码，完整性仍由 SHA-256 校验 |

## 6. 正式迁移前置条件

1. Debug 真机填入代表性数据并完成导出、解包检查和密码错误测试。
2. 新运行时完成 staging、业务校验、原子切换和空环境恢复。
3. 以相同 Dataset schema 构建同包名 Release Bridge，读取正式版私有数据。
4. 先发布可回退的 Bridge，再发布消费备份的新运行时；不得反向排序。
5. 保留至少一个正式版本的旧运行时回滚窗口，确认恢复后才删除 Bridge 接口。
