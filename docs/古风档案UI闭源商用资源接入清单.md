# 古风档案 UI 闭源商用资源接入清单

> 版本：v1.0 · 核验日期：2026-08-09  
> 适用工程：`D:/kc/ymy` 原生微信小程序  
> 目标：在不公开业务源码、允许收费与商业盈利的前提下，继续迭代「中国古风 × 旧纸档案 × 考察手账」页面 UI。
> 执行状态：P0、P1、P2 已于 2026-08-09 落地；P3、P4 经视觉与技术评估暂不触发。AI 图片和书格扫描已完成逐文件哈希登记，但商业闸门仍被两项 `hold` 阻断。

## 0. 商用放行口径

本清单只将以下许可证列入生产候选：

- 软件与样式：MIT、ISC、BSD-2-Clause、BSD-3-Clause、Apache-2.0。
- 字体：SIL Open Font License 1.1（OFL-1.1）。
- 图片与纹理：CC0 1.0 或来源页明确标注的 Public Domain。

这些许可证允许闭源商业使用和收费分发，但不等于「无需履行义务」：

1. MIT、ISC、BSD、Apache 资源必须随复制或实质改写部分保留版权和许可证声明。
2. OFL 字体可嵌入收费软件，但不得单独出售字体；子集、改名和 Reserved Font Name 必须按 OFL 处理。
3. 仓库许可证只覆盖仓库明确声明的代码，不自动覆盖示例图片、字体、商标、文案和外链数据。
4. CC0/Public Domain 素材仍需保存来源页、下载日期和原始文件哈希，防止来源页变化后无法举证。
5. GPL、AGPL、SSPL、Commons Clause、CC BY-NC、CC BY-ND、无许可证仓库和授权证据不完整的素材不得进入生产包。

本清单是工程合规执行基线，不代替正式法律意见；商业发布前仍应由项目责任人完成最终版权确认。

## 1. 已放行资源白名单

### 1.1 P0：可以立即用于下一轮 UI

| ID | 资源与固定版本 | 许可证 | 闭源盈利 | 用于本项目 | 接入方式 | 必须保留 |
|---|---|---|---|---|---|---|
| UI-01 | [YangMann/Paper](https://github.com/YangMann/Paper) `21d1d43ddbaf86880085e5f336e336635220d3a3` | MIT，Copyright 2015 YangMann | 允许 | 中文旧报纸、红头文件、档案编号、印章留白和正文层级 | 只选取并转写少量 CSS 规则为 WXSS；不引入其页面工程 | MIT 全文、版权行、固定 commit、改写文件列表 |
| UI-02 | [PaperCSS](https://github.com/papercss/papercss) `v1.9.2` | ISC，Copyright 2017–2018 Rhyne Vlaservich | 允许 | 纸张卡片、轻微不规则边、表单层级、按钮按压反馈 | 不安装运行时框架；只转写经筛选的卡片/表单规则 | ISC 全文、版本、来源文件、改写说明 |
| FNT-01 | [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) `v1.522` | OFL-1.1，含上游 Additional Permission | 允许 | 手写批注、史料旁注、短提示 | 从官方 `LXGWWenKai-Regular.ttf` 生成项目字符子集并以内联字体加载 | `OFL.txt`、版权行、版本、原文件 SHA-256、子集字符表 |
| ICO-01 | [Lucide](https://github.com/lucide-icons/lucide) 当前工程 `lucide-static@1.28.0` | ISC；部分 Feather 派生图标为 MIT | 允许 | 返回、相机、提示、时间、确认等功能图标 | 继续使用已生成 PNG；不额外引入运行时库 | Lucide ISC 与 Feather MIT 两部分声明 |
| ANI-01 | [Anime.js](https://github.com/juliangarnier/anime) 当前工程 `v4.5.0` | MIT | 允许 | 数值补间、弹回、落印和演出动画 | 继续使用已有 UMD 封装；不调用 DOM 模块 | MIT 全文、vendor 文件头、版本 |
| AST-01 | [OpenClipart](https://openclipart.org/) 已登记贴纸 | CC0 1.0 | 允许 | 吊牌、票根、回形针、植物标本、邮戳 | 继续使用本地 PNG；逐文件保留来源页 | CC0 链接、作者、来源页、文件映射 |
| AST-02 | Wikimedia Commons 已登记素材 | Public Domain | 允许 | 旧邮票、旧纸纹理 | 继续使用本地图片；仅使用来源页明确标记 Public Domain 的文件 | 来源页、作者/扫描者、PD 依据、下载日期 |

### 1.2 P1：允许商用，但只作为离线工具或算法参考

| ID | 资源与固定版本 | 许可证 | 适合用途 | 本项目限制 |
|---|---|---|---|---|
| TOOL-01 | [roughjs](https://github.com/rough-stuff/rough) `4.6.6`，npm integrity `sha512-ZUz/69+SYpFN/g/lUlo2FXcIjRkSu3nDarreVdGGndHEBJ6cXPdKguS8JGxwj5HA5xIbVKSmLgr5b3AWxtRfvQ==` | MIT | 离线生成手绘边框、铜版排线和交叉阴影 | 只放在 `test` 开发依赖；不得打入小程序运行包 |
| TOOL-02 | [textures](https://github.com/riccardoscalco/textures) `v1.2.3`，npm integrity `sha512-Ehg2adOcyfCR5DPOzBauXERJN4cXF1Bh4dITY2pPQ3+CvBBU0SZAep6pq5cCWp8K+k3OlXYh5dc2stgEQlqAWg==` | MIT | 离线生成点纹、线纹和交叉排线 | 与 roughjs 二选一；不把 SVG/D3 运行时带进原生小程序 |
| ALG-01 | [StPageFlip](https://github.com/Nodlik/StPageFlip) `2.0.7` 源码线 | MIT，Copyright 2020 Nodlik | 翻页状态、阴影、软硬页和手势阈值参考 | 入口依赖 `HTMLElement`、`document` 和 DOM 事件，禁止直接打包；只人工移植通用算法思想 |
| FNT-02 | [Adobe Source Han Serif](https://github.com/adobe-fonts/source-han-serif) `2.003R` | OFL-1.1 | 需要跨设备一致时的宋体标题与史料正文 | 完整 CJK 字体过大；仅在系统宋体真机差异不可接受时生成按需子集 |

### 1.3 技术上不接入

以下项目即使许可证允许，也不适合作为当前原生小程序依赖：

- `react-pageflip`：React 包装层，当前工程不是 React。
- `Binary-Being`：Next.js/Tailwind 西式报纸博客，视觉母题偏西式报刊。
- `mosslight-ui`：React 组件库，风格偏奇幻且会引入无关运行时。
- `survival-parchment`：FiveM 游戏资源，与小程序架构无关。

### 1.4 固定许可证证据

- Paper MIT：<https://github.com/YangMann/Paper/blob/21d1d43ddbaf86880085e5f336e336635220d3a3/LICENSE>
- PaperCSS ISC：<https://github.com/papercss/papercss/blob/v1.9.2/LICENSE.md>
- LXGW WenKai OFL：<https://github.com/lxgw/LxgwWenKai/blob/v1.522/OFL.txt>
- Lucide ISC + Feather MIT：<https://github.com/lucide-icons/lucide/blob/main/LICENSE>
- Anime.js MIT：<https://github.com/juliangarnier/anime/blob/v4.5.0/LICENSE.md>
- roughjs MIT：<https://github.com/rough-stuff/rough/blob/56a2762171b1294d643501e8d14f120db6b27bd7/LICENSE>
- textures MIT：<https://github.com/riccardoscalco/textures/blob/v1.2.3/license>
- StPageFlip MIT：<https://github.com/Nodlik/StPageFlip/blob/master/LICENSE>
- Source Han Serif OFL：<https://github.com/adobe-fonts/source-han-serif/blob/2.003R/LICENSE.txt>

## 2. 商业发布禁入与待核验区

| 资源 | 当前结论 | 处理动作 |
|---|---|---|
| MasaFont / 衡山毛笔行书 | 仓库 README 声称 OFL/可商用，但 2026-08-09 通过 GitHub License API 未发现独立许可证文件；证据链不满足本项目严格口径 | 现有版本仅限原型；P0 替换为 LXGW WenKai 子集，替换完成前不得作为商用版本放行 |
| Chinese-Traditional-Culture/CTC-MiniProgram | 仓库未声明许可证 | 不复制代码、样式、图片或文案，只能观察通用设计思想 |
| zerosoul/chinese-colors 的整套数据与页面 | 代码仓库为 MIT，但传统色数据来源和演示素材边界不够清晰 | 只人工参考颜色名称；不复制整套数据、页面或图片 |
| 书格铜版画扫描 | 已固定 6 个路径及哈希；原作年代足以进入公共领域，但书格指向的曼彻斯特数字馆默认条款限制商业使用和修改，且缺 item-level 许可、原始下载包及页码映射 | 保持 `IMG-HOLD-SHUGE`；取得具体数字文件的书面商用/改编许可，或替换为明确 CC0/PD Mark 的扫描；详见 `docs/compliance/IMG-HOLD-SHUGE-evidence.md` |
| 当前 AI 生成大图 | 已固定 35 个路径及哈希；本地生成日志不是许可证，仍缺账号主体、订单/套餐、请求/响应、生成日条款和底层模型授权链 | 保持 `IMG-HOLD-AI`；证据闭环后单独审批，不能用 MIT 标签替代平台授权；详见 `docs/compliance/IMG-HOLD-AI-evidence.md` |
| 小红书、Pinterest、设计站截图 | 仅可作为风格观察，不是可复用素材 | 禁止复制图片、贴纸、字体文件或高度独创的成套版式 |
| 任意无 LICENSE 仓库 | 默认保留全部权利 | 不接入，不接受“网上能下载”作为授权依据 |

## 3. 固定的接入架构

为了保持原生小程序、低包体和古风档案感，资源按三层接入：

1. **运行层**：保留原生 WXML/WXSS、自研 `novel-view` 和现有 Anime.js，不新增 Web DOM 框架。
2. **样式层**：从 Paper/PaperCSS 转写少量规则到项目自有古风档案组件，不复制整套框架。
3. **离线生产层**：roughjs 或 textures 只在 `test/` 生成透明 PNG/WebP；运行时只加载压缩后的静态图。

统一视觉方向：

- 保持低饱和旧纸黄、近黑棕重墨、暗橄榄绿、旧金和少量朱砂。
- PaperCSS 的“不规则”只用于纸边和卡片偏转，幅度必须克制，不能变成卡通手绘风。
- YangMann/Paper 负责中文文档秩序；PaperCSS 负责纸张触感；现有铜版画、印章、活页孔继续负责题材识别。
- 单屏贴纸、章、胶带、手写批注合计不超过 4 件。

## 4. 可直接执行的迭代顺序

### P0：建立商用许可闸门并替换高风险字体

预计：0.5–1 天。完成前不进入商业发布候选。

- [x] 新建 `plate21/module/assets/licenses/`，保存实际接入资源的原始许可证全文，不只保存网页链接。
- [x] 新建 `plate21/module/assets/third-party-lock.json`，逐项记录名称、固定版本/commit、SPDX、证据 URL、SHA-256、接入文件、修改说明和核验日期。
- [x] 补全 Lucide/Feather、Anime.js、OpenClipart、Wikimedia 的现有记录；让每个第三方文件都能反查到一项资源。
- [x] 下载 LXGW WenKai `v1.522` 官方 Regular 字体，校验官方资产 SHA-256：`39ad71264b588165b469e35e6afb162a378dacd1f95348160240ba9038ac3009`。
- [x] 将原字体放在 `test/vendor-src/fonts/`，修改 `test/subset-wenkai.js`，输出 `plate21/module/assets/fonts/Plate21WenKai-Subset.ttf`，实际大小 94.8 KiB。
- [x] 内嵌字体 family 使用项目名 `Plate21WenKai`，更新 `app.js`、`app.wxss`、`novel-view.wxss` 和 H5 台架，运行时不再依赖 `MasaFont` 名称。
- [x] 将 OFL 全文和实际子集字符表写入许可证目录；删除 MasaFont 二进制、base64 模块和旧子集脚本。
- [x] 增加 `test/check-third-party.js`：结构检查进入 `npm test`，严格商业检查由 `npm run check:commercial` 执行。

验收：

- `grep` 不再出现运行时 `MasaFont` 引用。
- 字体加载失败时仍能回退到系统楷体，不阻塞页面。
- `npm test`、`node test/check-font.js`、`npm run package:report` 全部通过。

### P1：把 Paper/PaperCSS 转成项目自有“档案任务单”组件

预计：1 天。先升级四个实体操作界面，形成可复用样板。

- [x] 在 `app.wxss` 增加 `--ink-deep: #2E1F0D`，只用于大标题、重要框线和铜版排线，不替换正文 `--ink`。
- [x] 在 `app.wxss` 新增六个项目自有原语：`.archive-sheet`、`.archive-tab`、`.archive-rule`、`.archive-steps`、`.record-field`、`.record-action`。
- [x] 每段实质改写规则旁标注 `Source: YangMann/Paper@21d1d43 / MIT` 或 `Source: PaperCSS@v1.9.2 / ISC`；同时把完整许可证加入 `assets/licenses/`。
- [x] 不导入 `paper.css`，不增加 npm 运行依赖，不复制 Paper/PaperCSS 的字体、示例图片和站点内容。
- [x] 修复实体页当前未定义 token：`--verm`、`--paper-d`、`--ink10/20/30/80`、`--font-serif`、`--font-mono`，统一替换为现有正式 token 或明确的 `rgba()`，避免样式声明在真机失效。
- [x] 按顺序应用到 `prologue` 完成态、`s1-decode`、`s3-zodiac`、`s3-water`。
- [x] 视觉结构统一为：档案编号 → 主标题 → 行动说明 → 实体道具任务单 → 提示 → 记录字段 → 朱砂确认。

四页验收：

- 实体道具区一眼可识别为“线下操作”，但不绘制虚拟信封、转盘或水显动画。
- 步骤编号有连续阅读路径，输入区与说明卡有明显层级。
- 朱砂面积不超过首屏约 2%，正文对比度不因纸纹下降。
- `02b-prologue-envelope.png`、`03-s1-decode.png`、`10-s3-zodiac.png`、`11-s3-water.png` 在 375×812 下无截断和横向溢出。

### P2：推广到全局组件和关键成果页

预计：1 天。P1 样板确认后执行。

- [x] `task-banner`：增加行动签、重墨正文、内框和纸张投影。
- [x] `history-card`：增加史料收录 kicker、全宽排线、来源分区和重墨标题。
- [x] `novel-view`：只补重墨页码、页角阴影和纸张厚度；未改现有手势阈值和触觉逻辑。
- [x] `cover`：仅校准标题、主图、开始按钮三层对比，没有增加贴纸。
- [x] `report`：减少框中框感并统一主图为低饱和铜版档案色。
- [x] `handbook`：统一记录编号、史料编号和动态已录状态，并修正“四份记录”文案。

验收：

- 全站仍保持一套古风档案语言，不出现西式报纸模板感或卡通 PaperCSS 感。
- 现有页面流转、触觉、输入校验和 session 状态不发生变化。
- H5 全量截图无 JS 错误，微信开发者工具真机尺寸至少检查 iPhone 12/13、常见安卓 360dp 和大字体模式。

### P3：按需增加离线铜版排线纹理

预计：0.5 天。只有纯 CSS 层次不足时执行。

当前评估：**暂不触发**。P1/P2 的纯 CSS 排线、纸边与框线已达到视觉目标，避免增加无必要的开发依赖和静态纹理包体。

- [ ] 首选 `roughjs@4.6.6` 作为 `test` 的 devDependency；不同时安装 textures。
- [ ] 新建离线脚本生成 `tx-hatch-fine.png`、`tx-hatch-cross.png`、`tx-paper-edge.png`，每张压缩后不超过 20 KiB。
- [ ] 纹理只用于标题分隔、任务单局部和报告画框，透明度控制在 0.04–0.12。
- [ ] 输出文件和生成脚本都在 `third-party-lock.json` 记录 roughjs 来源；MIT 全文随工程保留。
- [ ] 若 roughjs 不能稳定复现目标纹理，再切换到 `textures@1.2.3`，二者不并存。

### P4：翻页与宋体一致性，仅在真机问题出现时执行

当前评估：**暂不触发**。自研 `novel-view` 的翻页、阴影、阈值和触觉已稳定；系统宋体回退暂未发现需要额外引入第二套 CJK 字体的问题。

- [ ] `novel-view` 只参考 StPageFlip 的软页阴影与状态划分，不复制 DOM 入口和事件层。
- [ ] 若系统宋体跨设备差异明显，再引入 Source Han Serif OFL 子集；否则继续使用系统字体，避免主包增长。
- [ ] 任何字体新增后重新跑包体报告，单个子集建议不超过 250 KiB。

## 5. `third-party-lock.json` 记录模板

```json
{
  "id": "UI-02",
  "name": "PaperCSS",
  "upstream": "https://github.com/papercss/papercss",
  "version": "v1.9.2",
  "license": "ISC",
  "licenseFile": "plate21/module/assets/licenses/ISC-PaperCSS-v1.9.2.txt",
  "evidenceUrl": "https://github.com/papercss/papercss/blob/v1.9.2/LICENSE.md",
  "integrity": "sha512-6pOXUbuNgjdufXu4F34BYCXzel0YyB25FS9jWwq38PWEyzcWU3SWUneCHmvM5zUK7omCQ2/VdMXf8hlJC73/mA==",
  "usage": "selected paper card and form rules rewritten for WXSS",
  "bundled": false,
  "derivedFiles": ["app.wxss"],
  "modified": true,
  "status": "approved",
  "reviewedAt": "2026-08-09"
}
```

`status` 只允许：

- `approved`：证据完整，可进入生产包。
- `hold`：有授权线索但证据未归档，不得发布。
- `rejected`：许可证或使用条件不符合本项目。

## 6. 每轮迭代的固定检查

### 开始前

- [ ] 固定版本或 commit，不直接跟随 `main/master`。
- [ ] 下载并保存原始许可证全文。
- [ ] 确认许可证覆盖的是要使用的具体文件，而不只是仓库代码。
- [ ] 记录原文件哈希和来源页。
- [ ] 判断是运行依赖、开发工具还是静态产物，禁止技术层级混用。

### 完成后

```powershell
npm test
node test/check-font.js
node test/harness/render.js
npm run package:report
```

- [ ] 检查 `test/shots-h5/` 的全量截图和四张实体操作重点截图。
- [ ] 微信开发者工具无 WXML/WXSS 编译错误、无未定义 CSS token。
- [ ] 新增运行包体积有记录；P1 目标为 0 KiB 新依赖，P3 静态纹理合计不超过 60 KiB。
- [ ] `NOTICE.md`、许可证全文、lock 记录和实际文件四者一致。
- [ ] 页面中没有从参考网站直接复制的图片、文案、商标或未登记字体。

## 7. 推荐执行结论

直接按 `P0 → P1 → 截图确认 → P2` 推进。第一轮只引入 Paper、PaperCSS 的少量样式规则和 LXGW WenKai 字体子集；roughjs、StPageFlip、Source Han Serif 暂不进入运行包。这样可以在许可证证据完整、闭源商用可行的前提下，继续强化古风档案质感，同时把代码改动、包体和回归风险控制在最小范围。
