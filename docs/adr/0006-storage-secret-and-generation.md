# ADR-0006：Dataset 存储、SecretStore 与 generation 切换

- 状态：Accepted
- 日期：2026-08-21
- 影响阶段：Runtime v2 阶段 2、5、6

## 背景

V2 需要插件命名空间、事务、备份、敏感信息保护、升级/降级和空环境恢复。WebView DOM Storage、
插件自选物理路径或在原目录上直接改写都无法满足这些要求。

## 决策

### 物理布局

宿主为每个规范化插件 ID 派生不可逆 `origin-key`，存储在应用私有目录：

```text
runtime-v2/
  plugins/<origin-key>/
    descriptor.json
    active-generation
    generations/<generation-id>/
      kv.sqlite
      blobs/
      datasets.json
    staging/<transaction-id>/
  cache/<origin-key>/
```

插件只看到逻辑 key、blob 和 dataset ID。所有路径 segment 由宿主生成；插件不能提交物理路径。

### KV、blob 与配额

- KV 使用宿主管理的 SQLite 事务；value 是带 schema/version 的 JSON 或 bytes；
- blob 先写临时文件，`fsync`/摘要通过后原子重命名；
- 默认每插件持久配额 64 MiB、单 blob 32 MiB、缓存 64 MiB，manifest 可请求但不能自行提高；
- `cache` 不进入备份且可随时清理；超限返回 `RESOURCE_LIMIT`，不部分写入。

### SecretStore

- secret 与普通 KV 分离，值使用 Android Keystore 包装的应用主密钥进行 AES-GCM 加密；
- AAD 绑定 plugin ID、dataset ID、key、format version；日志和 UI 不返回完整 secret；
- 默认不导出。用户显式选择备份时，使用 `.atsbackup` 受保护区的独立密码派生密钥重新加密；
- 不把不可导出的 Keystore key 假装成可跨设备恢复。需要跨设备的凭据必须保存可重加密的密文值，
  并在业务上支持失效与重新登录。

### Dataset 与 generation

每个 Dataset 声明稳定 ID、category、format version、依赖、敏感默认值、支持的 restore mode、validator
和估算大小。导入/迁移流程为：

1. 创建 staging generation；
2. 按依赖顺序写入并校验摘要、schema 和业务 validator；
3. 完成整组一致性检查；
4. 用 `AtomicFile` 写 active generation 指针；
5. 保留前一 generation 作为有界回滚点；
6. 后台清理更旧 generation。

升级迁移也写新 generation，不在 active 数据上原地修改。失败只删除 staging；切换失败仍指向旧
generation。事务与 TaskRun 绑定时，task 结束前 generation 不被回收。

### 兼容与备份

- manifest 声明可读/可写 Dataset format 范围，路由在插件降级前检查；
- `.atsbackup` v3 的 Dataset、依赖、明文/加密分区语义继续使用；V2 adapter 读写 generation，
  Migration Bridge 只负责 API1 旧存储；
- 空环境导入、再次导出和业务摘要比较是发布门槛，不以“解压成功”替代恢复验证。

## 结果

插件数据由宿主统一治理，Web、JavaScript worker、WASM 和 Provider 使用相同逻辑接口。generation
付出额外磁盘空间，但换来升级、导入和崩溃时明确的原子边界。

## 验证

- SQLite/AtomicFile 故障注入覆盖写入、校验、切换和清理各断点；
- blob 覆盖截断、摘要不符、配额、重复 handle 和跨插件访问；
- secret 覆盖错误密码、AAD 变化、Keystore 丢失和日志脱敏；
- 三个现有插件逐 Dataset 完成 API1 导出、空环境 V2 恢复、再次导出和语义比较。

