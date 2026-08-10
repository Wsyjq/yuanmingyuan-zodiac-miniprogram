# 第二十一图 · 页面开发者手册（DEV_NOTES）

> 面向并行开发页面模块的开发者。本手册只描述**已落地的代码事实**，可直接照抄。
> 设计依据：`docs/UI-UX设计文档.md`（风格/页面/组件规范）、`docs/宿主接入方案.md`（Adapter 契约）。
>
> **采风修订版重构（2026-08）**：已按 `docs/剧情叙事_最新版.md` 整体重构为四站结构。
> 旧拆字线（氵+亡+口+月+女+凡=瀛→远瀛观）整条删除；新主线为「每张史料卡角落的数字
> 连起来 = 会话锁定日期 `YYYYMMDD` = 终局密码」。已删页：s2-rubbing/s3-restore/s3-char/s4-pattern/photo-check；
> 新增页：s2-blend/s2-pattern/s3-zodiac/s4-password；雨果站 s5→s4。详见路由表。

---

## 1. 工程结构速查

```
D:/kc/ymy
├─ app.json                  # 主包只有演示主页；分包 root = plate21/module，18 页已注册
├─ app.wxss                  # 全局设计 token + 通用类（见 §2）
├─ pages/index/              # 演示宿主主页（不要动）
└─ plate21/
   └─ module/
      ├─ contracts/adapter-api.js   # Host Adapter 契约（JSDoc 类型 + 常量）
      ├─ adapters/local-adapter.js  # 开发期 Adapter（wx.Storage 实现）
      ├─ store/session.js           # 模块侧唯一数据入口（见 §4）
      ├─ components/                # 6 个通用组件（见 §3）
       └─ pages/<页面名>/            # 18 个已实现页面
```

18 个页面路由（采风修订版四站结构，分包内相对路径，跳转时前缀 `/plate21/module/`）：

```
pages/cover/cover              封面
pages/prologue/prologue        序章（拆信封）
pages/s1-decode/s1-decode      第一站 西洋楼入口（拆信封拼半字）
pages/transit/transit          站间过渡（实例化 3 次：s1-s2 / s2-s3 / s3-s4）
pages/s2-quiz/s2-quiz          第二站 黄花阵 · 谜题1 作用选择题
pages/s2-reveal/s2-reveal      第二站 · 谜题2 名字由来（文字输入）
pages/s2-blend/s2-blend        第二站 · 谜题3 四图现场考察卡
pages/s2-pattern/s2-pattern    第二站 · 谜题4 万字纹（手绘路线图收口 s2）
pages/s3-comic/s3-comic        第三站 海晏堂·大水法 · 谜题1 时辰漫画推理
pages/s3-zodiac/s3-zodiac      第三站 · 谜题2 兽首回归选择
pages/s3-water/s3-water        第三站 · 谜题3 水显纸马首（收口 s3）
pages/s4-timeline/s4-timeline  第四站 雨果雕像 · 时间轴排序（5 事件）
pages/s4-password/s4-password  第四站 · 密码输入（收口 s4，答案=会话日期 YYYYMMDD）
pages/finale/finale            反转揭示
pages/report/report            考察报告
pages/ending/ending            结尾视频/完结
pages/handbook/handbook      P17 考察手册
```

---

## 2. 设计 token 速查（app.wxss 已全局定义，直接用变量名）

**禁止散落写死色值**，一律用 CSS 变量（v1.3「旧纸档案手账」色板）：

| 变量 | 色值 | 用途 |
|---|---|---|
| `--paper` | `#F4EDDC` | 旧纸黄：全局页面底色（暖、轻、微泛黄） |
| `--paper2` | `#EBE1CB` | 浅棕一档：卡片底、抽屉底 |
| `--paper3` | `#DED1B4` | 灰米深档：浮层、覆盖层 |
| `--ink` | `#46382A` | 暖褐墨：正文主文本、排线、双框线 |
| `--ink60` | `#8A7A60` | 褐墨淡：次要文本、来源标注 |
| `--patina` | `#4A6B64` | 铜绿：史料卡标题、已解锁、可交互提示 |
| `--olive` | `#6F7248` | 暗橄榄绿：编号标签、手写批注、和纸胶带（手账元素主色） |
| `--coffee` | `#7A5C3E` | 咖色：票据正文、次级强调 |
| `--brass` | `#A98F5F` | 旧金（哑光）：角花、铜钉、任务指引、进度标记 |
| `--cinnabar` | `#A63A2E` | 朱砂：印章、日期章、确认按钮（唯一红色，用量 ≤2%） |
| `--dash` | `#C0B49A` | 虚线灰：拖放目标位、缺失位轮廓 |
| `--night` | `#23282E` | 夜景墨蓝：拍照页底、反转揭示暗屏、图片预览遮罩 |

通用类（页面和组件 wxml 里都可用）：

- `.serif` —— 宋体（大标题/站名/按钮文字）
- `.kaiti` —— 楷体（铭文/题跋/引文）
- `.hand` —— 手写体兜底（行楷/手写，正式字体见素材 FNT-03）
- `.btn-seal` —— 朱砂描边方印式主按钮（含 :active 落印缩放）
- `.btn-line` —— 褐墨细线描边次按钮
- `.paper-grain` —— 旧纸纹底（极轻暖渐变 + 细纤维排线），每页根容器必加
- `.hatch-divider` —— 排线分隔带（纯 CSS，褐墨 45% 细排线，无需图片），块级、高 12rpx，用 width/margin 控制位置
- `.card-archive` —— 档案著录卡：`--paper2` 底 + 铜版画双框 + 顶部铜绿条（::before/::after 实现，容器会被 `overflow:hidden` 裁圆角）
- `.card-ticket` + `.ticket-edge` —— 票据卡：`--paper2` 底 + 底部撕票锯齿条（16rpx 高，紧跟卡片底部），用于线索票根/记录凭证
- `.double-frame` —— 铜版画双框线：外 2rpx 褐墨 50% + 内 1rpx 褐墨 35%（::after，内缩 6rpx）。重要卡片/图片占位块统一用它，容器自动带 position:relative
- `.corner` —— 巴洛克弧角角花（弧角 + 菱形点，旧金色）：四个一组（`.corner tl/tr/bl/br`）放在相对定位容器内，仅用于封面、finale 画布、report 画框
- `.arch` —— 拱券细线（半圆拱顶饰，160×72rpx，呼应大水法拱门），仅用于封面与转场路线图

手账六件套（v1.3 新增，克制：单屏合计 ≤4 件、批注 ≤2 处、胶带 ≤2 条、齿孔框 ≤1 个）：

- `.tag-no` —— 编号标签（橄榄绿细框小签，如 `No.021`/`PLATE XXI`），每页右上 1 枚
- `.stamp-date` —— 朱砂双圈日期章（年号/公元两行小字，旋转 -8°），绝对定位盖卡片边角；仅封面、各站完成卡、报告页使用
- `.tape` / `.tape.brass` —— 和纸胶带（半透明橄榄/旧金条，微旋转贴主图或卡片顶边；position:absolute，容器需 relative，标准定位 `top:-20rpx; left:50%; margin-left:-90rpx`）
- `.perfo-frame` —— 邮票齿孔框（主图外圈齿孔白边，包裹主图，padding 18rpx 即齿孔带宽），每屏至多 1 个主图使用
- `.note-hand` / `.note-hand.olive` —— 手写批注小字（页边/图旁，可配轻微 rotate 内联样式）

> 六个通用组件的 json 都已声明 `"styleIsolation": "apply-shared"`，所以以上全局类与 CSS 变量在组件 wxml 内同样生效。你自己写新组件时照做。

---

## 3. 通用组件 API

引用路径统一相对写法（页面在 `pages/<x>/` 下，组件在 `components/` 下）：

```json
{
  "navigationStyle": "custom",
  "usingComponents": {
    "nav-back": "../../components/nav-back/nav-back",
    "task-banner": "../../components/task-banner/task-banner",
    "novel-view": "../../components/novel-view/novel-view",
    "history-card": "../../components/history-card/history-card",
    "stamp-toast": "../../components/stamp-toast/stamp-toast"
  }
}
```

按需引用，别全挂。

### 3.1 nav-back —— 左上自绘返回钮

```xml
<nav-back />                          <!-- 默认 navigateBack(1) -->
<nav-back delta="{{2}}" />
<nav-back custom bind:back="onBack"/> <!-- 页面接管点击 -->
```

- 已自动适配状态栏高度（`wx.getWindowInfo().statusBarHeight`）。
- 栈内没有上一页时自动 `wx.reLaunch` 回演示主页（开发期兜底，宿主接入后可删）。
- props: `delta: Number=1`、`custom: Boolean=false`；事件: `bind:back`。

### 3.2 task-banner —— 顶部任务指引条

```xml
<task-banner icon="hand" text="从道具包取出《隐语对照表》与工牌拓本卡" visible="{{showBanner}}" />
```

- props: `icon: String`、`text: String`、`visible: Boolean`。
- `icon` 支持图标名映射（`hand/eye/camera/compare/lightbulb` → 内置 Lucide PNG，见 §6.1）；传其他文字时按原样显示（向后兼容旧 emoji/文字占位）。
- `visible` 置 true 从顶部滑下，false 收起。无事件。

### 3.3 novel-view —— 叙事阅读视图

```xml
<novel-view
  title="第一站 · 西洋楼入口"
  paragraphs="{{paragraphs}}"
  finish-text="前往"
  bind:finish="onNovelFinish"
/>
```

```js
paragraphs: [
  { text: '叙事段落正文……' },
  { text: '闻有第二十一图，未见。', quote: true },          // quote=true → 楷体引文卡
  { image: 'IMG-P02', caption: '民国著录卡片特写' }         // 插图段 → 占位图块（--paper2 底 + 虚线框 + 编号/说明两行小字）
]
```

- props: `title: String`、`paragraphs: Array<{text?, quote?, image?, caption?}>`、`finishText: String='继续'`。
- 段落项三选一：普通段（text）、引文卡（quote）、插图占位块（image + caption）。
- 段落逐段淡入（按序 delay）；滚动到底前底部显示下滑提示（chevron-down 图标 + 「下滑」），到底后显示按钮。
- 事件: `bind:finish`。组件整页高 100vh，页面里放它就别再叠加其他整页布局。

### 3.4 history-card —— 史料卡弹层

```xml
<history-card
  visible="{{showHistory}}"
  title="海晏堂 · 大水法"
  source="《圆明园四十景图咏》"
  lines="{{historyLines}}"
  bind:collect="onCollectHistory"
  bind:close="onCloseHistory"
/>
```

- props: `visible: Boolean`、`title: String`、`source: String`、`lines: Array<String>`。
- 底部滑入；点遮罩或右上 × 触发 `bind:close`（页面负责把 visible 置回 false）。
- `btn-text` 为空时，「收入考察手册」先触发 `bind:collect` 再触发 `bind:close`。
- 传入 `btn-text` 时触发 `bind:next`；组件在第一次点击后立即锁定，防止重复导航。

### 3.5 stamp-toast —— 朱砂盖章反馈

```xml
<stamp-toast id="stamp" />
```

```js
this.selectComponent('#stamp').show('考察记录已保存')
```

- 无 props。对外方法 `show(text)`：方印 1.3→1.0 落下 + 随机 ±3° 旋转，600ms 后淡出。
- 落下动画由 Anime.js 驱动（`utils/anime.js`，见 §6.2），onUpdate 里 setData 更新 transform；淡出仍走 CSS transition。
- 连续调用自动合并为最新一枚（内部清定时器重播）。

### 3.6 ~~prop-drawer —— 道具包抽屉~~（v1.5.0 已移除）

> **v1.5.0 移除**：6 件道具（隐语对照表、工牌拓本卡、砖纹卡、薄白纸、2B铅笔、考察手册）是**真实物理道具**，玩家手上有实物，小程序内不再虚拟显示。prop-drawer 组件、各页 `<prop-drawer>` 挂载、PROP_ITEMS 常量均已删除。需要玩家操作实物道具的环节，由 TaskBanner / 叙事段文字引导（如 s1-decode"取出《隐语对照表》与工牌拓本卡，逐词比对"）。详见 `docs/v1.5.0-实体道具引导规格.md`。

---

## 4. store/session.js —— 模块侧唯一数据入口

```js
const session = require('../../store/session')
```

**页面只调 session，绝不直接 require adapter、绝不直接读写 wx.Storage。**
所有写方法返回 Promise。交接/导航节点必须等待落库成功；失败时页面停留并允许重试。失败 mutation 同时写入本地持久化 outbox，后续写入前自动补发。

| API | 签名 | 说明 |
|---|---|---|
| `init(input?)` | `init({scene}) → Promise<SessionSnapshot>` | P00 封面进入时调用：getIdentity（失败匿名继续）→ startOrResumeSession |
| `getSnapshot()` | `→ SessionSnapshot \| null` | 内存缓存的当前快照 |
| `completePuzzle(puzzleId, payload?, options?)` | `('s3-water', payload, {collectCard:true, station:'s3', checkpoint:'s4-timeline'})` | 谜题、日期卡、站点和 checkpoint 可在一次 revision 中原子完成 |
| `setCheckpoint(checkpoint)` | `('s2-name') → Promise<snapshot>` | 单独推进谜题级恢复点；交接页优先用 `completePuzzle` 的原子选项 |
| `getPuzzle()` / `isPuzzleComplete()` | `(puzzleId) → state / Boolean` | 页面恢复答题完成态，不要求重答 |
| `completeStation(station, record?, options?)` | `('s2', {payload}, {checkpoint}) → Promise<snapshot>` | 无对应谜题的站点收口；`recordType`/`completedAt` 自动补齐 |
| `completeFinale()` | `→ Promise<snapshot>` | 完结时标记 `finale: true` |
| `setFlag(key, value)` | `('s2PhotoRecord', record) → Promise<snapshot>` | 写入自定义状态；当前用于四图草稿/成品与 `collectedReport` |
| `sign(name)` | `→ Promise<snapshot>` | P14 署名落库 |
| `claimEdition()` | `→ Promise<number \| null>` | P14 领版本号；失败返回 null，页面显示「第 — 版」 |
| `recognizeScene(scene, attempt, image)` | `('dashuifa', 1, {filePath}) → Promise<{pass, confidence?, failReason?}>` | P09 拍照校验；内部自动埋 `photo_check`，接口失败按 `{pass:false}` 返回 |
| `saveMedia(input)` | `({type:'report', image, meta}) → Promise<MediaReference \| null>` | P15 可选能力，null 时跳过宿主侧留存 |
| `viewPuzzle/attemptPuzzle/viewHint` | `→ void` | 统一谜题浏览、尝试与提示埋点；不记录答案原文 |
| `emit(event)` | `emit({name:'module_exit'})` | 自动补 `ts/sessionId/checkpoint/completed` |
| `reset()` | `→ Promise<SessionSnapshot>` | 清理旧进度、outbox 和本项目保存的现场照片，再开新会话 |

典型谜题完成时序（照抄）：

```js
session.completePuzzle('s3-water', { answer: '马首', attempts: 1 }, {
  collectCard: true,
  station: 's3',
  checkpoint: 's4-timeline'
}).then(() => wx.redirectTo({ url: '/plate21/module/pages/transit/transit?leg=s3-s4' }))
```

快照结构（断点恢复依据，字段见契约 §3.2）：

```js
{ schemaVersion:2, sessionId, revision, sessionDate, checkpoint, stations:{s1..s4}, puzzles, cards, records, flags, finale, name?, editionNo?, createdAt, updatedAt }
```

`updateSession` 失败会写入 `plate21_pending_mutations`，下次写入前按 operationId 幂等补发；页面会收到 reject 并保持在当前交接按钮。
`local-adapter.js` 顶部 `MOCK_FAIL = true` 可让 `recognizeScene` 恒失败，用于演示拍照兜底路径。

---

## 5. 页面样板（新页面照抄）

`<x>.json`：

```json
{
  "navigationStyle": "custom",
  "usingComponents": {
    "nav-back": "../../components/nav-back/nav-back"
  }
}
```

`<x>.wxml` 骨架：

```xml
<nav-back />
<view class="page">
  <!-- 页面内容；顶部预留状态栏 + 返回钮空间（约 200rpx） -->
</view>
<stamp-toast id="stamp" />
```

约束：

- 全部页面 `navigationStyle: custom`，返回一律用 `nav-back`。
- 尺寸一律 `rpx`，不用 px（组件内状态栏适配用的 px 是例外，已封装好）。
- 动效用 CSS transition/animation；转场在页内完成（设计文档 §6 备注），不依赖路由动画。
- 正反馈统一「铜钉点亮 + stamp-toast 盖章」；负反馈统一晃动/碎裂/弹回，不用红色错误态。

---

## 6. 素材引用约定

- 占位图已由他人生成，路径：`/plate21/module/assets/img/IMG-xxx.png`（编号见 `docs/素材需求清单.md`，如 `IMG-S1A.png`、`ICON-P1.png`）。**直接引用即可，不要问素材是否存在。**
- 素材未就位需要兜底时，用灰色/排线占位 view（排线 `repeating-linear-gradient` 写法，如各谜题页的空位占位），不要引外链图。
- 大图（铜版画五层、复原立面、地图）与视频最终走 CDN；原型期一律放 assets 占位路径，路径写成分包内绝对路径 `/plate21/module/assets/...`。

### 6.1 图标库（Lucide，ISC License）

通用小图标统一用开源图标库 [Lucide](https://lucide.dev)（ISC License，版权说明见 `plate21/module/assets/NOTICE.md`），由 `tools/render-icons.js` 渲染为 96×96 透明底 PNG，描边色即设计 token 色值。新增图标：在脚本的 `JOBS` 里加一行 `[lucide名, 色名]` 再跑 `node tools/render-icons.js` 即可（依赖装在 `test/node_modules`）。

引用方式：`<image src="/plate21/module/assets/img/icons/ic-xxx.png" mode="aspectFit" />`，给固定 rpx 尺寸（24~48rpx 视场景）。

可用图标速查（`plate21/module/assets/img/icons/`）：

| 文件 | 用途 |
|---|---|
| `ic-arrow-left-ink.png` | nav-back 返回钮 |
| `ic-notebook-pen-ink.png` | 考察手册入口（cover） |
| `ic-download-ink.png` | 保存相册（report） |
| `ic-camera-ink.png` | 拍照/快门 |
| `ic-x-ink60.png` | 关闭（弹层预览） |
| `ic-pencil-ink.png` | 拓印跟随图标（s2-rubbing） |
| `ic-hand-brass.png` | 任务条·取出/动手（task-banner `icon="hand"`） |
| `ic-eye-brass.png` | 任务条·观察（`icon="eye"`） |
| `ic-camera-brass.png` | 任务条·拍照（`icon="camera"`） |
| `ic-arrow-left-right-brass.png` | 任务条·对比（`icon="compare"`） |
| `ic-lightbulb-brass.png` | 提示（`icon="lightbulb"`） |
| `ic-map-pin-brass.png` | 站点定位（transit） |
| `ic-check-patina.png` | 完成勾选 |
| `ic-stamp-cinnabar.png` | 印章（辅助） |
| `ic-play-ink.png` | 播放（ending） |
| `ic-skip-forward-ink60.png` | 跳过（ending） |
| `ic-chevron-down-ink60.png` | 下拉提示（novel-view） |
| `ic-clock-brass.png` | 时辰/时间（s5-timeline 今日槽） |

> v1.5.0 已删除的图标（prop-drawer 专用，组件移除后无引用）：`ic-backpack-ink` / `ic-lock-ink60` / `ic-scroll-ink` / `ic-id-card-ink` / `ic-brick-wall-ink` / `ic-file-ink` / `ic-notebook-ink`。

色名对应（v1.3）：`ink #46382A` / `paper #F4EDDC` / `brass #A98F5F` / `patina #4A6B64` / `cinnabar #A63A2E` / `ink60 #8A7A60`。注：图标 PNG 按 v1.2 色值（ink #453526 等）渲染，与 v1.3 色差肉眼不可辨，不重渲染。

### 6.2 动画引擎（Anime.js，MIT License）

数值动画统一用开源引擎 [Anime.js](https://animejs.com) v4.5.0（MIT License，版权说明见 `plate21/module/assets/NOTICE.md`）。vendor 包（官方 UMD 构建，未改动）在 `plate21/module/vendor/anime.umd.min.js`，**一律通过封装入口引用**：

```js
const anime = require('../../utils/anime')   // 组件内则为 '../../utils/anime' 同路径规则

// 对普通对象做补间，onUpdate 里读数值再 setData（引擎不碰 DOM）
const state = { s: 1.3 }
this._anim = anime.animate(state, {
  s: { to: 1, ease: 'outBack' },   // 支持逐属性 ease
  duration: 450,
  ease: 'outQuad',
  onUpdate: () => this.setData({ scale: state.s })
})
// 取消：this._anim.cancel()（重播 / onUnload 前先取消）
```

- `utils/anime.js` 在 require vendor 前补了 `setImmediate/clearImmediate` 垫片（小程序无 window 时引擎主循环回退到这两个 API），所以**不要直接 require vendor 文件**。
- 只用对象补间能力（`animate` / `easings` / `stagger`）；`$`、`svg`、`text`、`waapi` 等 DOM 模块在小程序里不可用。
- 当前使用点：stamp-toast 盖章落下（§3.5）、finale 幕3 五层擦除、s5-timeline 金线流动 + 轻震。

---

## 7. 路由跳转示例

分包内互跳（写完整绝对路径）：

```js
wx.navigateTo({ url: '/plate21/module/pages/prologue/prologue' })
wx.redirectTo({ url: '/plate21/module/pages/finale/finale' })   // 完成链上防回退用 redirectTo
wx.navigateBack({ delta: 1 })
```

带参数（P03 过渡页靠 query 实例化）：

```js
wx.navigateTo({ url: '/plate21/module/pages/transit/transit?leg=s1-s2' })
// 页面内：onLoad(options) 里读 options.leg
```

返回宿主：`wx.navigateBack()`（封面页 nav-back 已含兜底）。

---

## 8. 页面变更约定

当前 18 个页面均已实现。新增或调整玩法时同步更新 `progress-flow.js`、页面恢复逻辑、`test/page-flow.test.js`、H5 关键状态和剧情验收矩阵；不要只改页面跳转而遗漏 checkpoint。
