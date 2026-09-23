# 西洋楼铜版图·第二十一图

原生微信小程序。玩家沿四站完成实体道具与屏幕谜题，收集八张日期卡，在终章生成并保存「第二十一图」考察报告。

正式 AppID：`wxa284707129230b80`。代码权威 = `main`（tag `v1.0.0` @ `d2412df`，其后含全站 UI 审查修复）。

## 当前状态

- 生产路由 **32** 条：主包宿主首页 1 + `plate21/module` 分包 21（含门票 `gate` 与留言簿 `board`）+ `voice-a`…`voice-j` 音频分包 10（占位页 `pages/hold`）。权威清单在 `app.json`。
- 主线：门票 → 封面 → 序章 → 入口拆信 → 黄花阵 → 海晏堂 → 大水法（120s 静默三选一）→ 雨果 → 终章 → 考察报告。
- 顺路散页全部可选（谐奇趣 / 养雀笼 / 方外观 / 蓄水楼 / 观水法 / 线法画），不玩不影响主线。
- 通关当天可在报告页写留言；次日起首页回访卡进入留言簿与次日之信。
- 完成态锚定 `flags.experienceCompletedAt`。八位密码、页面日期、报告日期统一取 `SessionSnapshot.sessionDate`。
- 人声按站进入 `voice-*` 分包（平台硬限：单包 ≤2MB）。BGM 不入库、不进包，本地在 `/bgm/`，发布走 CDN（`AUDIO_BASE`）。
- `ending` 源码保留，不注册生产路由。独立 `h5/` 是内部历史镜像，不是发布端。

## 工程结构

```text
app.json                         主包与分包路由（32）
pages/index/                     演示宿主首页
components/archive-illustration  档案图形降级组件
plate21/module/pages/            业务页面（gate / 主线 / 散页 / letter / board）
plate21/module/capabilities/     导引地图、语音导览等页面能力
plate21/module/store/            Session、恢复点、outbox、成就
plate21/module/adapters/         当前本地 Adapter
plate21/module/contracts/        Host Adapter 契约 v1.4.0
voice-a … voice-j                人声音频分包
docs/                            规格、史料、接入与合规
test/                            Node 测试、H5 台架和门禁脚本
```

## 本地运行

1. 用微信开发者工具打开工程根目录 `D:/kc/ymy`。
2. `project.config.json` 已配置正式 AppID，可本地编译与预览；上传和真机验收需在该 AppID 的合法域名与体验权限下进行。
3. 测试依赖未安装时运行 `npm --prefix test ci`。

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

`npm test` = 静态检查 + 许可证 + 单元测试（`test/package.json` 里显式列出的 `*.test.js`）+ 包体报告。

## 文档从哪读

主线有两份设计稿。改某一页的字、图或玩法，或改模块怎么接，先看这两份：

- `docs/飞书分页接入方案.md` 定每一页的字、图和玩法。
- `docs/主线模块技术设计.md` 定支付、流程、地图、音频、玩法、进程怎么接。

1. 工程事实：本文档、`plate21/DEV_NOTES.md`
2. 宿主接入（外发）：`docs/完全接入对接文档-V2.2.md`
3. 剧情结构：`docs/剧情总设定-入口世界观-点位串联-支线系统.md`；讲述层：`docs/剧情可用稿-人物对话版-V2.3.md`；骨架走一遍：`docs/剧情可用稿-主线走一遍.md`
4. 史料（已入库）：`docs/西洋楼遗址核对详本.md` 与同目录信源/出处/内涵三件套。二十幅对照与 SL 卡是本地工作稿，不进仓库。
5. 合规：`docs/compliance/`、`docs/留言板-后台管理与合规要求.md`

`docs/宿主接入方案.md`、`docs/小程序维护优化技术方案-v2.0.md`、`docs/剧情玩法验收矩阵-rev2174.md` 和 `v1.x` 规格只作历史快照，不作为当前路由、契约或测试基线。
