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
由 `plate21/module/utils/anime.js` 封装引用（补 `setImmediate` 环境垫片）。
仅使用其对普通 JS 对象的数值补间能力，不涉及其 DOM 相关模块。

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

## 待核验图片

以下图片已逐文件固定 SHA-256，但尚未达到闭源商业发布证据标准，状态以
`assets/third-party-lock.json` 为准：

- `IMG-HOLD-AI`：35 个 AI 来源 JPEG，其中 13 个当前进入小程序包。缺账号主体、订单/套餐、原始请求响应、生成日条款和底层模型授权链。逐文件记录见 `docs/compliance/IMG-HOLD-AI-evidence.md`。
- `IMG-HOLD-SHUGE`：5 个历史扫描 JPEG 及 1 个宿主副本，其中 4 个路径当前进入小程序包。古画原作年代与数字扫描使用权分开判断；当前缺 Manchester item-level 商业许可、原始下载包和页码映射。逐文件记录见 `docs/compliance/IMG-HOLD-SHUGE-evidence.md`。

这两项均为 `hold`，不得因文件存在于仓库、原作年代久远或生成日志存在而标记为可商用。整改提交书见 `docs/compliance/commercial-image-remediation.md`。
