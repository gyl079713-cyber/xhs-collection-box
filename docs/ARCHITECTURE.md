# 架构与数据流

## 总览

收藏观察是一个无构建步骤的 Chrome Manifest V3 扩展。侧边栏承担主要界面，收藏页和笔记页脚本只在小红书域名内工作，状态保存在 `chrome.storage.local`。

```text
小红书收藏页
   │ DOM + 收藏列表响应
   ▼
content-script.js / probe-main.js
   │ runtime message
   ▼
service-worker.js ── chrome.storage.local
   ▲                         │
   │                         ▼
sidepanel.js ◀──────── 盲盒、Notes、备份

小红书笔记页
   │ 用户选择正文
   ▼
annotation-script.js ── service-worker.js ── chrome.storage.local
```

## 文件职责

### `manifest.json`

声明 Manifest V3、Chrome 114 最低版本、侧边栏入口、权限、图标和在小红书页面加载的划线脚本。

### `sidepanel.html` / `sidepanel.css` / `sidepanel.js`

- 渲染收藏盲盒与 Notes。
- 维护同一轮不重复的随机抽取状态。
- 启动或停止收藏页辅助采集。
- 复用阅读标签页。
- 导入、导出及迁移本地数据。

### `content-script.js`

- 从收藏页当前 DOM 读取可见卡片。
- 用户主动启动后控制页面滚动。
- 单次最多读取约 500 条或滚动 100 次，达到保护上限后保留结果并进入 5 分钟冷却。
- 检测登录失效、安全验证或访问异常提示后立即停止；安全异常后进入 30 分钟冷却。
- 接收 `probe-main.js` 提供的收藏列表批次。
- 发送采集进度与新增记录。

### `probe-main.js`

在页面主世界中只观察路径匹配 `/note/collect/page` 的响应，并提取笔记 ID、标题、作者、封面、链接及是否还有下一页。它不发起额外网络请求。

### `annotation-script.js`

- 识别小红书笔记 ID 和正文容器。
- 在用户选择正文后显示 Note 浮窗。
- 使用 CSS Highlight API 恢复保存的划线。
- 点击高亮时打开 Note 编辑器。

评论区和图片文字当前不在划线范围内。

### `service-worker.js`

- 设置点击工具栏图标时打开侧边栏。
- 在侧边栏关闭后继续接收采集进度。
- 串行保存收藏缓存与划线记录。
- 标签页关闭时更新采集状态。

## 本地存储

主要键值：

| 键 | 内容 |
| --- | --- |
| `xhsCollectionOrganizerNotesV1` | 收藏索引。 |
| `xhsCollectionRevealV1` | 已出现、当前批次和本地移出记录。 |
| `xhsCollectionAnnotationsV1` | 划线与 Note。 |
| `xhsCollectionBackgroundCacheV1` | 采集过程中持久化的收藏缓存。 |
| `xhsCollectionBackgroundStatusV1` | 采集状态与进度。 |
| `xhsCollectionReaderTabV1` | 复用的阅读标签页 ID。 |

完整 JSON 备份包含收藏索引、设置、划线和盲盒状态。导出时会移除链接中的 `xsec_token` 与 `xsec_source`，但备份仍应作为私人数据文件保管。

## 平台差异

扩展逻辑只依赖 Chrome API 与标准 Web API，不调用 macOS 或 Windows 原生接口。平台差异主要体现在系统字体、Chrome 缩放和侧边栏实际宽度。发布说明应区分“代码预期兼容”和“已经完成真实设备测试”。
