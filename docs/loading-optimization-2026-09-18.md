# 加载体验优化与模拟器验证

日期：2026-09-18。实现最初位于独立 `codex/loading-optimization` 工作树，随后转入 `codex/performance-optimization`。本文的“未提交”描述保留各验证阶段当时状态；当前提交状态以 Git 历史为准。

## 工作树迁移

- 新聚合工作树：`workspace/loading-optimization`，外层基线 `c7a59b3`，宿主基线 `c58f526`；六个组件均从主开发目录当前提交建立，包含最新 UI 修改。
- 旧 `workspace/p04-device/app` 工作树已移除；源码差异、历史报告和正式测试产物保留在 `workspace/loading-optimization-archive`，没有删除原始性能证据。
- 迁移了自动更新开关立即反馈的修复，复用简短 UI 操作辅助脚本。旧 Macrobenchmark、温度／电量采样和多组跑分留在历史归档，不加入新工程。
- 主开发目录源码未修改；其他任务新增的 UI 预览文件保持原状。新工作树的本地模拟器目录已加入忽略规则，不进入源码提交。

## 已实现

- [WidgetSnapshotStore](../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/WidgetSnapshotStore.kt)：摘要由进程持有，页面重建不重置为加载动画。自有 Worker 数据摘要持久化并校验插件包与数据代际；系统连接与权限状态始终重新确认。
- [DatasetService](../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/DatasetService.java)：只在成功提交、删除／恢复后通知对应插件失效。主页不可见时只记下变更，返回后合并刷新；权限撤销清除旧展示值。
- [HostAppUi](../app/app/src/main/java/com/androidtoolsuite/app/host/HostAppUi.kt)：主页保留在详情下方；最近两个插件页面保持 Compose/WebView 状态，第三个进入时释放最久未使用的页面。停用、更新、Activity 销毁时释放旧实例。隐藏页不参与显示、输入或可访问节点。
- Web 插件短加载不强制闪转圈；声明式文档预读并在插件实例中复用。隐藏／显示时发送真实可见性并暂停／恢复 WebView。
- 抽卡摘要计数与记录 SHA-256、大小绑定；导入／同步时记录计数，旧记录首次读取时重算；前台重复扫描任务改为手动入口。完整性校验未跳过。
- Phigros 先展示账号及本地成绩摘要，再补全曲库与分析包；两个游戏插件保存轻量页签及滚动位置，页面释放或进程重启后恢复。
- 设计规范与 HTML 样例同步；性能路线改为按具体体验问题做少量验证。

## 已验证

环境：专用 GUI 模拟器 `emulator-5580`，API 36，1080×2400。系统 WebView 134 缺少现有 Worker 必需的消息端口；已正常更新到 149.0.7827.160，与原 WebView 签名核对一致，未修改系统签名检查。Shizuku 使用官方包，通过界面请求及授权，连接 UID 2000。

恢复 `workspace/android-tool-suite-data-0918.atsbackup` 的游戏记录、成绩、曲库与设置；原始文件未改动，未恢复登录凭据或执行在线同步。

| 实际操作 | 结果 |
| --- | --- |
| 主页与 Phigros 往返 | 新增 WebView 加载 0 次；未变化的游戏摘要查询 0 次；成绩页签保留 |
| 第三个插件触发页面释放后返回抽卡 | 页面重新建立后恢复“记录”页签；调试目标数量为 2 |
| 进程重启 | 两个游戏摘要从缓存恢复，系统连接重新确认 |
| Phigros 成绩页滚动后重启 | “成绩”页签保留，停稳位置 754.6667 → 754.6667 CSS px |
| 在插件界面删除模拟器原神副本数据，再恢复 | 主页记录总数 7246 → 2996 → 7246 |
| 在管理界面撤销无障碍管理权限 | 相关组件清除旧状态，抽卡摘要保持；测试后恢复权限 |

证据：[往返结果](../temp/warm-final-result.json)、[冷启动恢复](../temp/cold-state-result.json)、[数据更新](../temp/summary-update-result.json)、[权限撤销](../temp/permission-revoke-result.json)、[最终主页](../artifacts/loading-home.png)。

曾发现并修复：原生系统 Provider 被误当成可持久摘要、插件重新加载后组件绑定旧对象、恢复页签时未重新挂载目标内容。滚动验证以停稳位置为准，不取惯性动画中的中间坐标。

一次 UI Automator 长流程因 WebView 暂未导出子节点而停止，原失败日志保留在 `temp/loading-journey.log`；对应页面状态另外通过真实画面与只读 DOM 确认，不把那段脚本写成整段通过。

## 构建与范围

- 初始 `tools/build-all.ps1` 全量构建、测试和包校验通过；之后仅为新修改重建受影响组件。
- 最终宿主 `clean collectArtifacts :app:assembleDebugAndroidTest` 通过；数据提交／读取／Worker 设备测试 **4/4** 通过。
- 最终抽卡 Node 契约测试 **28/28**，Phigros **11/11**，两者 `clean collectArtifacts` 及包验证通过。
- 三个修改组件和外层 `git diff --check`、HTML 预览脚本语法通过。
- 模拟器安装 APK 的 SHA-256、插件 generation 与最终集中产物一致。
- 依据本工作树已有的 2026-09-18 发布核对记录，沿用未发布版本：宿主 **1.8.0 (24)**、Phigros **3.0.0 (20)**、抽卡 **2.0.0 (19)**。SDK 无公开 API 变化，保持 2.0.0；更新日志分别补充。

产物位于本工作树 `artifacts/`，附 `SHA256SUMS.txt` 和 `build-manifest.json`；源码仍为未提交修改。未进行实体设备测试、在线账号同步、功耗／温度采集、长期压力测试或跨 OEM 验收；模拟器结果不用于承诺实体设备加载毫秒数。

## Shizuku 组件背景补正

用户反馈的卡片底部背景缺口来自新增的外层 Column：内部 SuiteCard 只包住内容高度，露出了外层底色。现移除额外容器，卡片明确填满可用尺寸，刷新错误提示移入卡片内部。宿主 `clean collectArtifacts` 通过，已安装模拟器并观察确认完整背景；两个游戏插件的数据加载逻辑本轮未改。版本继续沿用未发布 1.8.0（24），没有提交或推送。

## 性能优化分支与手机侧载

聚合工作树与六个组件现已切换到新建的 `codex/performance-optimization` 分支，原有未提交修改均保留。新增独立 `performance` 变体；参见 [构建与安装说明](../app/docs/performance-installation.md)。手机已安装独立性能版，原 Release 应用未覆盖。此安装不等于完成真机性能验收。
