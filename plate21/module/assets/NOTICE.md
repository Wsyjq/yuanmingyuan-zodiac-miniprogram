# 第三方素材版权说明（NOTICE）

## Lucide 图标

`img/icons/` 目录下的 `ic-*.png` 文件由开源图标库 **Lucide** 的 SVG 源文件渲染生成
（渲染脚本：`tools/render-icons.js`，96×96 透明底 PNG，描边色替换为项目设计 token 色值）。

- 项目主页：https://lucide.dev
- 源码仓库：https://github.com/lucide-icons/lucide
- 许可证：**ISC License**，Copyright (c) Lucide Icons and Contributors
- 许可证全文：https://github.com/lucide-icons/lucide/blob/main/LICENSE

### ISC License 要点

1. 允许以任何目的使用、复制、修改和分发，免费或收费均可；
2. 须在所有副本中保留版权声明与许可声明（即本文件）；
3. 软件按「原样」提供，作者不承担任何担保与赔偿责任。

部分 Lucide 图标派生自 Feather 项目（同为 ISC License，© Cole Bemis），
详见上述 LICENSE 文件附录。

## Anime.js 动画引擎

`plate21/module/vendor/anime.umd.min.js` 为 **Anime.js v4.5.0** 官方 UMD 构建（未改动），
`plate21/module/utils/anime.js` 是其历史封装。当前运行时代码已改用 CSS/有限状态动画，
vendor 目录与封装文件均由 `project.config.json` 排除，不进入小程序发布包。

- 项目主页：https://animejs.com
- 源码仓库：https://github.com/juliangarnier/anime
- 许可证：**MIT License**，Copyright (c) 2026 Julian Garnier（许可声明保留在 vendor 文件头注释中）
- 许可证全文：https://github.com/juliangarnier/anime/blob/master/LICENSE.md

### MIT License 要点

1. 允许以任何目的使用、复制、修改、合并、发布和分发，免费或收费均可；
2. 须在所有副本或重要部分中保留版权声明与许可声明；
3. 软件按「原样」提供，作者不承担任何担保与赔偿责任。

## 复古手账贴纸素材（img/stickers/）

`img/stickers/` 目录下的 `st-*.png` / `st-paper-texture-01.jpg` 为考察手账风贴纸素材，
来源均为 CC0 / Public Domain，可自由商用、修改，无需署名（署名信息仍记录如下）。
SVG 源文件经 `test/stickers-src/build.js` 渲染/缩放为 PNG。

### OpenClipart 素材（许可证：CC0 1.0，https://creativecommons.org/publicdomain/zero/1.0/）

| 文件 | 内容 | 来源页面 | 直链 | 作者 |
| --- | --- | --- | --- | --- |
| st-postmark-02.png | 做旧 AIR MAIL 飞翼航空邮戳 | https://openclipart.org/detail/28924/vintage-air-mail-rubber-stamp | https://openclipart.org/download/28924/vintage-air-mail-rubber-stamp.svg | uroesch |
| st-ticket-01.png | 英国国铁橙白火车票 | https://openclipart.org/detail/335477/train-ticket-uk | https://openclipart.org/download/335477/train-ticket-uk.svg | anarres |
| st-ticket-02.png | 红色 ADMIT ONE 票根（含蓝色销票戳） | https://openclipart.org/detail/125365/ticket-admit-one-with-stamp | https://openclipart.org/download/125365/ticket-admit-one-with-stamp.svg | rg1024 |
| st-hang-tag-01.png | 牛皮纸色吊牌（加强绳孔+麻绳） | https://openclipart.org/detail/159937/clothing-label-with-rope | https://openclipart.org/download/159937/clothing-label-with-rope.svg | J32 |
| st-hang-tag-02.png | 做旧吊牌（圆环绳） | https://openclipart.org/detail/3755/roped-label | https://openclipart.org/download/3755/roped-label.svg | najsbajs |
| st-botanical-01.png | 蕨类叶片 | https://openclipart.org/detail/171185/fern-leaf | https://openclipart.org/download/171185/fern-leaf.svg | Moini |
| st-botanical-02.png | 小麦穗 | https://openclipart.org/detail/175150/wheat-trigo | https://openclipart.org/download/175150/wheat-trigo.svg | leandrosciola |
| st-paperclip-01.png | 金属回形针（竖向写实） | https://openclipart.org/detail/174141/paper-clip | https://openclipart.org/download/174141/paper-clip.svg | jarda |
| st-paperclip-02.png | 金属回形针（横向扁平） | https://openclipart.org/detail/23304/paperclip | https://openclipart.org/download/23304/paperclip.svg | tom |
| st-binder-clip-01.png | 长尾夹（本项目将原红色改为深金属色） | https://openclipart.org/detail/250083/office-stationery-binder-clip-simplifiedflat | https://openclipart.org/download/250083/office-stationery-binder-clip-simplifiedflat.svg | oldifluff |

### Wikimedia Commons 素材（许可证：Public Domain）

| 文件 | 内容 | 来源页面 | 直链 | 作者/扫描者 |
| --- | --- | --- | --- | --- |
| st-stamp-01.png | 英国红便士邮票（Plate 148，带齿孔） | https://commons.wikimedia.org/wiki/File:Stamp_UK_Penny_Red_pl148.jpg | https://upload.wikimedia.org/wikipedia/commons/c/c1/Stamp_UK_Penny_Red_pl148.jpg | Royal Mail，基于 William Wyon 设计（1841 年发行，版权早已过期） |
| st-stamp-02.png | 美国 1861 年 2 分 Jackson 邮票（带齿孔） | https://commons.wikimedia.org/wiki/File:US_stamp_1861_2c_Jackson_sc0073.jpg | https://upload.wikimedia.org/wikipedia/commons/3/34/US_stamp_1861_2c_Jackson_sc0073.jpg | 扫描：R. A. Nonenmacher（1861 年发行，版权早已过期） |
| st-paper-texture-01.jpg | 暖黄旧纸纹理（污渍/纤维/边缘晕影） | https://commons.wikimedia.org/wiki/File:Old_Paper_texture.jpg | https://upload.wikimedia.org/wikipedia/commons/9/9b/Old_Paper_texture.jpg | leonardoai（上传者以 Public Domain 发布） |

### 《西洋楼铜版图》铜版画（许可证：Public Domain）

`img/plate-*.jpg` 四张为 1783 年（乾隆四十八年）清宫铜版画《西洋楼铜版图》册页扫描，
原作出自宫廷画师/刻工，著作权保护期早已届满，属公有领域；
扫描件为平面原作的忠实数字化复制，不产生新的著作权。
扫描来源：故宫博物院数字文物库（藏品页 https://www.dpm.org.cn/collection/paint/228650.html ），
经 `tools/fetch-plates-20.py` 获取 1024px 图档，本项目压缩为 800px 生产尺寸。

| 文件 | 内容 |
| --- | --- |
| plate-xieqiqu.jpg | 谐奇趣南面 |
| plate-fangwaiguan.jpg | 方外观正面 |
| plate-xushuilou.jpg | 蓄水楼东面（谐奇趣西北，第3开；蓄水楼站不再用它当主图） |
| plate-haiyantang-north.jpg | 海晏堂北面（第11开，蓄水楼站主图） |
| plate-zhuting.jpg | 竹亭北面（第9开，方外观站） |
| plate-dashuifa.jpg | 大水法正面 |
| assets/fig/letter-teacher.jpg | 次日彩蛋老师伏案图，取自飞书正文插图，压缩为 720px。放在主包，避开 plate21 分包 2MB 上限 |
| assets/fig/rongfei.jpg | 方外观页渐显的容妃画像，也是史料卡 SL-10 配图。取自《第廿一图》史料表（飞书素材 FCupb5kogoqJPAx0a6GcVhQTnic），不是馆藏肖像原件 |
| assets/sl/sl00-ganzhi.jpg | 史料卡 SL-00 配图，干支纪年表 |
| assets/sl/sl01-dpm-catalog.png | 史料卡 SL-01 配图，故宫藏品页《圆明园铜版画》册著录截图 |
| assets/sl/sl02-jin-yufeng-1980.jpg | 史料卡 SL-02 配图，金毓丰 1980 西洋楼全景示意图 |
| assets/sl/sl03-ohlmer-1873.jpg | 史料卡 SL-03 配图，奥尔末 1873 谐奇趣南面 |
| assets/sl/sl07-huanghuazhen.jpg | 史料卡 SL-07 配图，文档所附黄花阵灯戏图 |
| assets/sl/sl11-zhuting-north.jpg | 史料卡 SL-11 配图，竹亭北面铜版 |
| assets/sl/sl13-xihai-earth.jpg | 史料卡 SL-13 配图，海晏堂蓄水楼（锡海）夯土台。Word 图注在蓄水楼一行 |
| assets/sl/sl17-hugo.jpg | 史料卡 SL-17 配图，圆明园雨果雕像 |

### 项目自制素材

- `st-postmark-01.png`：经典圆形邮政戳（外圈字 "YUANMINGYUAN · PEKING" + 中间日期行
  "18 OCT 1860" + 右侧波浪销票线），由本项目手写 SVG 生成
  （源文件 `test/stickers-src/postmark-classic.svg`），本项目以 CC0 发布，可自由使用。

## 手写字体

`fonts/Plate21WenKai-Subset.ttf` 为 **LXGW WenKai v1.522** 的项目字符子集（94.8 KiB），
用于 `.hand` / `.note-hand` 手写批注。小程序运行时使用主包内的
`fonts/Plate21WenKai-Subset.b64.js` 通过 `wx.loadFontFace` 加载，不依赖外部 CDN。

- 项目主页：https://github.com/lxgw/LxgwWenKai
- 固定版本：v1.522
- 原始字体 SHA-256：`39ad71264b588165b469e35e6afb162a378dacd1f95348160240ba9038ac3009`
- 许可证：SIL Open Font License 1.1，允许嵌入闭源收费软件，字体文件不得单独出售
- 许可证全文：`assets/licenses/OFL-LXGW-WenKai-v1.522.txt`
- 子集字符表：`assets/licenses/OFL-LXGW-WenKai-v1.522-characters.txt`
- 子集生成脚本：`test/subset-wenkai.js`

## 项目 AI 图片

项目方于 2026-08-11 确认：41 个源 JPEG 均由项目使用允许商业用途的平台与账号生成，并授权这些图片及其衍生文件用于本项目商业生产版本。此前 6 个文件的“历史扫描”内部分类已撤销。

- `IMG-AI-SOURCES`：41 个哈希锁定源文件，全部由 `project.config.json` 排除，不直接进入包。
- `IMG-AI-RUNTIME`：18 个通过 `test/build-runtime-images.js` 生成的生产衍生文件，全部进入当前小程序包。
- 商业使用确认：`assets/licenses/PROJECT-AI-ASSET-AUTHORIZATION-2026-08-11.txt`。
- 源到衍生映射：`docs/compliance/ai-runtime-manifest.json`。
- 综合证据与变更控制：`docs/compliance/IMG-AI-PROJECT-evidence.md`。

所有 59 个受控路径均在 `assets/third-party-lock.json` 固定 SHA-256。新增、覆盖或重新生成图片后必须同步 manifest 与 lock，并重新运行图片、商业和包体门禁。


## Lucide 图标（实地导引浮钮）

2026-09-25 起，实地导引浮钮的指南针图标取自 Lucide Icons v1.48.0 的 compass（ISC 许可，允许商用与再分发）。图标以 base64 内联在 pages/walk/walk.wxss 的 .nav-symbol 样式中，不作为独立资源文件分发。

- 项目地址：https://github.com/lucide-icons/lucide
- 许可证全文：ssets/licenses/lucide-icons-ISC.txt
