# 运行时发布前待核事项

核对日期：2026-09-19。来源为原 `follow-up-task-list.md` 和架构文档中的阶段记录，经源码、发布列表及本地验证记录重新核对后筛选。本文是短期工作材料，不替代长期规范，也不代表全量验收已经完成。

适用源码：主体 `bfd107b`、Shizuku `297a27d`、无障碍 `9c4e0cb`、Phigros `a3cde9d`、抽卡分析 `27d815e`。这里只标识核对的组件提交，不声明它们已经成为外层主分支锁定的组合；之后有实现变化时应重新核查。

## 已核实的基础与证据边界

| 事项 | 本次核实依据 | 可以支持的结论与限制 |
| --- | --- | --- |
| API1 安装限制 | [RuntimePackageInstaller.java](../../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/RuntimePackageInstaller.java)、[DebugCommandReceiver.java](../../app/app/src/debug/java/com/androidtoolsuite/app/debug/DebugCommandReceiver.java) | 本地／备份公共安装入口和 Debug 入口明确拒绝旧 API1 包；不等于所有升级路径已重新进行设备测试 |
| 声明式 UI 与后台执行 | [WebToolPlugin.kt](../../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/WebToolPlugin.kt)、[JavaScriptWorkerEngine.java](../../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/JavaScriptWorkerEngine.java)、[SchedulerService.java](../../app/app/src/main/java/com/androidtoolsuite/app/plugin/runtime/SchedulerService.java) | 可定位到独立 WebView renderer、Worker 与持久调度实现；本次仅作静态核对 |
| 插件业务契约测试 | [Phigros 测试目录](../../plugins/phigros-advisor/src/test-js)、[抽卡测试目录](../../plugins/gacha-analysis/src/test-js) | 有 RKS、存档、分页、缓存、合并等测试；测试存在不能代替真实账号业务验收 |
| 全量本地构建 | 核对本地 `temp/runtime-version-consolidation-build.log` 与 `artifacts/build-manifest.json` | 对应运行已完成构建、单元测试及包校验；本次文档整理没有重新构建。清单记录的是构建时 HEAD，当时版本字段尚未提交，不能据此声称后来提交已被原清单精确锁定 |
| 手机安装 | 核对本地 `temp/phone-downgrade-backup/` 的安装前后元数据 | 四插件启用，九个 Dataset 的存在状态与字节数一致；不是逐字节内容比较，也不是业务验收。该记录只反映当次安装，不持续跟踪手机状态 |
| 正式发布 | 用 `gh release list` 查询五个组件仓库 | 最新正式版仍为主体 1.6.1、无障碍 1.4.1、Phigros 2.3.1、抽卡 1.7.1；独立 Shizuku 无正式 Release。迁移组合的正式发布仍待完成 |

本地日志和安装元数据不纳入本目录。若这些证据不再可访问，应重新执行对应检查，不能仅凭本文的历史核对替代验收。

## 替换旧任务清单中的过时结论

- 不再恢复“全部迁移、降级和实体设备场景均已完成”的勾选。历史清单没有逐项绑定构建、设备、数据 fixture 和结果，本次证据不足以重新确认这些笼统结论。
- 不再保留“性能工作暂缓”的状态。主体 [构建配置](../../app/app/build.gradle) 有 `performance` 变体，两个游戏插件已有首屏加载与缓存相关实现和测试；仍不能据此认定已有可重复的 Macrobenchmark 基线。
- 不再把 API1 执行路径退出列成等待新实现的任务；后续重点是回归验证及兼容性说明。
- AI、发布平台和跨平台的长期计划已集中在 [路线图](../plans/roadmap.md)，不在这里复制一份完成清单。

## 发布前需要补齐或重新确认

1. 确认最终源码组合，使用该组合生成可追溯产物；将构建 SHA、产物摘要和测试结果关联起来，不能只引用较早的构建日志。
2. 重新确认 renderer 生命周期、权限撤销、Provider 冷启动和重连、Scheduler 失败恢复等设备用例的运行结果。已有 [生命周期测试](../../app/app/src/androidTest/java/com/androidtoolsuite/app/host/HostLifecycleInstrumentedTest.java) 和 [旧运行时退役测试](../../app/app/src/androidTest/java/com/androidtoolsuite/app/plugin/runtime/LegacyRuntimeRetirementInstrumentedTest.java) 可作为入口。
3. 用明确的旧数据 fixture 覆盖导出、空环境恢复、业务读取、错误密码、损坏包、单游戏删除及降级边界。真机安装成功和 Dataset 字节数一致不能替代这些结果。
4. 确认正式签名、宿主兼容范围、权限变化和升级说明，再按 [发布流程](../development/releasing.md) 发布组件并验证签名索引。
5. 性能工作单独建立 profileable／Release 实体设备基线。`performance` 变体是测量入口，不等于基准模块、Baseline Profile 或性能结论已齐备；这项工作是否成为本次发布门槛需单独确定。

## 清理条件

当正式发布的 Issue、PR 或 Release 已承载上述验证证据时，删除本文；若发现新的长期兼容规则，只提炼规则到架构、数据或发布规范，不继续累计每次运行的状态。
