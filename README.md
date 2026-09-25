# 第廿一图 · 圆明园游戏模块 v3

以 main `16af879` 为基线的微信原生小程序游戏分包。保留纸质档案视觉，统一八站考察、照片/文字记录、个人作品及次日来信。无购票、支付或独立后端。

## 本地运行

在微信开发者工具导入此目录，使用项目 AppID 或有权限的测试 AppID，编译 `pages/index/index`。点击“开始 / 继续考察”。默认是设备本地演示；首次进入选择“以听为主”或“以阅读为主”，之后可在顶部切换。听讲模式下，剧情录音结束并停留三秒后继续；互动、到达确认及无录音页会停留。

- 唯一游戏页面：`plate21/module/pages/walk/walk`、`plate21/module/pages/report/report`。
- 46 个剧情节点由 `content/story.js` 配置、`flow/pages.js` 编译驱动，不等于 46 个微信页面。
- 八站：西洋楼入口 → 谐奇趣 → 黄花阵 → 方外观 → 海晏堂 → 蓄水楼 → 大水法 → 雨果雕像。
- 地图为路线顺序示意，需结合实体地图与现场标识；没有采用旧仓库未经实测的精确坐标。
- 可跳过题目或站点。照片至少一张即可，也可文字替代。只有完成署名才记为完成考察。
- 完成署名后可点击“直接进入彩蛋”立即阅读；也可按原计划在次日回访，晚到仍可阅读。重新考察保留已完成作品。

## 开发和验证

Node.js 22+，自动测试无需安装运行时依赖：

```sh
npm test
npm run test:unit
npm run package:report
```

`npm test` 同时检查 JS/JSON、页面/组件引用、WXML、行为测试、资源哈希与发布预算。更新素材后，核实来源与音频映射，再执行 `npm run resources:refresh`。

工程预算为主包和每个分包各 2 MiB、总计 20 MiB；它是项目自设检查，不替代微信开发者工具的最终代码包分析。源文件统计及真实工具检查见 [验收记录](docs/v3-validation.md)。

## 官方小程序接入

保留游戏分包及 app.json 中实际注册的音频包，同时复制 `assets/sl/`、`assets/fig/`（史料与剧情插图）。`assets/cover.jpg` 和 `pages/index/` 仅供独立演示。

官方 App 提供 `plate21Host` 配置后，跳转游戏入口即可；主包不要直接 require 分包 JS。游戏样式和存档独立命名；无硬编码回官方首页、无云开发旁路。

详见 [宿主接口与示例](docs/v3-host-integration.md)。宿主可提供身份、存档、可信来信状态、资源地址、媒体上传、接力、提醒、全局版号和退出/完成通知。未接上传和投稿服务时，只保留真实私人草稿，不显示“审核中”。

## 维护资料

- [已批准范围与实现记录](docs/v3-implementation-log.md)
- [删除与保留文件清单](docs/v3-cleanup-manifest.json)
- [音频迁移、冻结与补录清单](docs/v3-audio-migration.md)
- [当前资源与发布状态](docs/v3-resource-manifest.json)
- [测试及人工验收边界](docs/v3-validation.md)
- [工作区清理清单（2026-09-25）](docs/v3-cleanup-20260925.json)
- [v3 剧本原始提取](docs/feishu-import/第廿一图v3-docx.txt)

37 个新版录音已迁入并核对静态映射；尚未逐条听审。16 个存在稿件/演出提示风险的录音已冻结、排除发布，页面仍能通过文字完成。需根据迁移清单完成听审/补录，之后才能放行相应音源。

海晏堂原型位于 `reference/海晏堂水力钟-谜题互动版.html`，不进入发布包。实际玩法使用原生 WXML + Canvas 2D。

本地 Git 基线标签 `baseline/main-20260924`，整合分支 `feat/game-module-v3`。原始资料和删除内容可从 Git 找回；未推送远程。

## 后续剧本调整

剧情、史料、道具与既有题库集中在 `plate21/module/content/`。普通文字/关联/阅读页调整不需要重写页面。详见 [剧本内容包与快速调整指南](docs/v3-content-authoring.md)，执行 `npm run check:story` 可提前检查结构及存档兼容问题。
