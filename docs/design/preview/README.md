# UI 交互预览源码

本目录维护 [UI 设计规范](../ui-guidelines.md) 配套预览的模块化源码。唯一阅读与交付入口是 [ui-preview.html](../ui-preview.html)，样式、脚本、图标和合成数据全部内嵌，可以直接离线打开。

## 生成和查看

从工作区根目录执行：

```powershell
node docs/design/preview/build.mjs
```

生成器先检查合并脚本语法，只输出 `docs/design/ui-preview.html`。需要浏览器本地服务器时执行：

```powershell
node docs/design/preview/serve.mjs
```

服务器仅监听本机回环地址，输出可打开的预览地址；不提供工作区文件访问。页面本身没有服务器或 Node.js 运行依赖。

## 维护边界

- 导航、页面职责、主题、组件与操作层级按 UI 规范和公开 SDK 校准；修改源码后重新生成 HTML。
- 主题、画布与缩放偏好可保存在浏览器本地，业务演示状态只保留于当前页面会话；重置会清空样例状态。
- 手机、宽屏、浅色和深色场景用于设计审阅。账号、记录、统计、版本、任务和文件选择都是合成演示；不访问网络、读取真实备份、授权系统或修改 Android 应用。
- 加载时长与帧采样仅模拟交互条件；成绩算法、数据恢复、权限和设备行为须由对应测试验证。构建、截图和验收记录使用临时目录或 CI。
- 生成图片带 UI PREVIEW 标记，不能当作真实成绩报告；二维码不可登录。

图标许可见 [ui-preview-assets/LICENSE](../ui-preview-assets/LICENSE)。交互参考包括 [Neo Backup](https://github.com/NeoApplications/Neo-Backup)、[Aegis FAQ](https://github.com/beemdevelopment/Aegis/blob/master/FAQ.md)、[Carbon DataTable](https://github.com/carbon-design-system/carbon-components-react/blob/master/src/components/DataTable/README.md) 和 [Atlassian 拖动设计](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines)；具体取舍以本项目规范为准。
