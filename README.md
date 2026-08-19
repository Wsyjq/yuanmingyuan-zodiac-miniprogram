# 西洋楼铜版图·第二十一图

原生微信小程序原型。玩家沿四站完成实体道具与屏幕谜题，收集八张日期卡，在终章生成并保存「第二十一图」考察报告。

## 当前状态

截至 2026-08-11，代码侧 P0/P1/P2 维护项已关闭：

- 生产路由共 17 条：主包宿主首页 1 条，`plate21/module` 分包 16 条。
- `plate21/module/pages/ending/` 仅保留未来视频页源码，不注册生产路由，也不进入小程序包。
- 报告页是主线终点；完成时间保存到 `flags.experienceCompletedAt`，完成后可从封面回看报告。
- 八位密码、页面日期和报告日期统一使用 `SessionSnapshot.sessionDate`。
- 四张现场照片会压缩为最长边不超过 1280px 的 JPEG；目标约 600 KiB，硬预算 1 MiB。
- 终章、时间轴、阅读器和盖章反馈使用 CSS/有限状态动画；Anime.js 源码仅作历史留档，不进入运行包。
- 项目方确认 41 个源 JPEG 均为可商用 AI 生成图片；生产页已接入 18 个可追溯压缩衍生文件，原始源图继续排除以控制包体。
- 独立 `h5/` 是内部历史镜像，不是当前发布端。
- 2026-08-19 起新增页面能力系统（`plate21/module/capabilities/`）：12 个站点页面经 `<page-overlays />` 挂载悬浮入口——实地导引地图抽屉（`wx.getLocation` + `wx.openLocation`，拒绝授权有降级态）与三站语音导览（音频素材待录制，当前为文稿阅读态）；geofence 到场打卡默认关闭，运营实测后再开。
- 成就系统（`store/achievements.js`）订阅 session 事件流，六枚印记幂等落库到 `flags.achievements.*`，解锁经 overlay-host 弹印章 toast，手册页「第伍折 · 成就印记」汇总展示。

## 工程结构

```text
app.json                         主包与分包路由
pages/index/                     演示宿主首页
components/archive-illustration 项目自制档案图形降级组件
plate21/module/pages/            业务页面
plate21/module/components/       5 个业务通用组件
plate21/module/store/            Session v2、恢复点、outbox
plate21/module/adapters/         当前本地 Adapter
plate21/module/contracts/        Host Adapter 契约
plate21/module/utils/            日期、答案、照片和动画策略
docs/                            规格、验收和合规记录
test/                            Node 测试、H5 台架和门禁脚本
```

## 本地运行

1. 使用微信开发者工具打开工程根目录 `D:/kc/ymy`。
2. `project.config.json` 当前已配置正式 AppID（`wxa284707129230b80`），可本地编译与预览；上传和真机验收需在该 AppID 的合法域名与体验权限下进行。
3. 如测试依赖未安装，运行 `npm --prefix test ci`。
4. Playwright 视觉台架还要求本机可用的 Playwright Chromium。

常用命令：

```powershell
npm test
npm run build:runtime-images
npm run test:visual
npm run audit:images
npm run check:commercial
npm run package:report
node test/check-font.js
```

## 已验证基线

2026-08-19 增量复验（能力系统 + 成就系统合入后）：

| 门禁 | 结果 |
|---|---|
| 静态检查 | `syntax=91 json=43 routes=17` |
| Node 测试 | 99 项通过，0 失败 |

其余门禁沿用 2026-08-11 基线：

| 门禁 | 结果 |
|---|---|
| 静态检查 | `syntax=82 json=39 routes=17` |
| Node 测试 | 89 项通过，0 失败 |
| H5 台架 | 30 个页面/关键状态，0 个 JS 错误 |
| 响应式检查 | `320×568`、`375×812`、`430×932` 无意外横向溢出 |
| 图片证据审计 | 59 个受控路径与 lock 一致：41 个源文件 ignored，18 个生产衍生图 bundled |
| 严格商业检查 | `holds=0 mode=commercial` |
| 字体检查 | `Plate21WenKai:loaded`，字体文件 HTTP 200 |
| 包体报告 | 主包 `0.22 MiB`，分包 `1.26 MiB`，总计 `1.48 MiB` |

视觉台架仍会渲染仓库保留的 `ending` 页，以防未来恢复时腐化；它不计入 17 条生产路由。

## 外部交付条件

以下事项不能由当前仓库独立完成：

- 正式 AppID、合法请求/下载域名和 iOS/Android 真机矩阵。
- 宿主全局原子版号服务；本地版号只用于开发。
- 实体水显纸供应方确认的用水量、显影、晾干、复用和安全说明。
- 如未来恢复语音、照片辅助识别或视频：供应商、隐私文本、授权素材、失败降级和真机验收。

## 文档优先级

1. 当前工程事实与维护状态：本文档、`plate21/DEV_NOTES.md`、`docs/小程序维护优化技术方案-v2.0.md`。
2. 剧情验收：`docs/剧情玩法验收矩阵-rev2174.md`。
3. 宿主接入：`docs/宿主接入方案.md`。
4. 商业资源：`plate21/module/assets/third-party-lock.json`、`plate21/module/assets/NOTICE.md`、`docs/compliance/`。
5. `v1.x` 规格、旧 UI 设计和 `.zcode/plans/` 只用于追溯历史，不作为当前路由、资源或实现依据。
