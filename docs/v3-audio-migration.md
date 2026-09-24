# v3 音频选择迁移与验收

本次以 main-4 为底座，只从 feature `2880cc213c29751559dfef8449db95a84f0f5722` 选择新版正文与来信录音。没有整分支合并旧 UI、入口或流程；后续只沿 v3 实际调用链清理旧资源。候选录音已核文件、SHA-256 和页面 ID 对应关系，**尚未逐条实听，不宣称录音与正文已逐字通过听审**。

## 资源与使用边界

- 新版录音迁入 37 文件：33 个新增、4 个序章录音替换。序章 handover 不接主流程，DJ-06 保留 main 的 30 秒、44.1kHz 双声道版本，不采用 feature 的 24kHz 单声道压缩版。
- `audio/v3-manifest.js` 为运行时禁播清单及录音来源、SHA 清单；`utils/voice-pkg-map.js` 为真实资源位置；两者共同决定可用录音。最终只保留清单列出的新版候选录音及 DJ-06 声景；没有 v3 消费者的 guide-*、dlg-* 与可选站旧旁白已退出映射和打包。
- 旧分支中的 `tools/narr_mainline.json`、`tools/voice_manifest.json` 仅作历史稿及来源证据，最终工作树可按清理范围移除；尤其旧来信只有 LT1—LT4，不能证明新增 LT1—LT8 的逐字内容。不得恢复运行旧 `tools/pack_voice.js` 覆盖本次资源；后续更新应以 v3 清单驱动打包。
- 不再用旧页面名 aliases 统一解禁，避免翻面前读答案、旧水显纸页与转盘共用音频。未知、缺失或禁播 clip 返回空，用户界面只隐藏播放控件，不出现技术错误解释。

## 接口

- `audioSrc.clips(narrId)` 返回可播放路径数组；`clip(narrId)` 只返回首条，保留老页面单音源兼容。**主流程必须用 clips，不可用 clip 播多段序章**。
- `cue.clipsFor(page, run)` 在映射前检查 revealOf 对应题已 solved/assisted；H3 需玩家明确翻面（`uiByPage.H3.flipped`）或 prop-flip 已 solved/assisted；单纯跳过不解锁录音，防止实体翻卡前读答案。来信可访问性由主流程的次日解锁控制，不对外暴露原始映射。
- `audioSrc.packageForSrc(src)` 从真实资源映射提取分包，未知路径返回空；`cue.voicePkg(id)` 基于它查询，XS 不会被 X 前缀误匹配。
- `<audio-clip clips="{{narrClips}}" active="{{pageVisible}}" bind:state="onAudioState" />`；`clips` 优先于 `src`。active=false 会暂停并使未完成的下载回调失效。
- state 事件 detail 为 `{ playing, loading, failed, segmentIndex }`；play、ended 事件保持兼容。分段数组只在玩家已点击播放后按自然结束连续播放；重播从第一段开始。

## 播放约定

首次进入由玩家选择听讲或阅读模式，保存在现有音频偏好中。阅读模式手动播放；听讲模式由页面提供明确 listenKey 后，每个剧情屏自动播放一次。旧 autoplay 属性仍不触发播放。音源变化、页面隐藏、应用后台、active=false、静音或组件卸载均暂停/取消待播；后台恢复不擅自重播，玩家可以点击继续。

分包加载成功后才创建播放上下文；失败有重试按钮。旧加载回调、旧音频 ended/error 事件不会操作当前音源。人声、史料和声景通过 audio-bus 互斥；后台会暂停全部注册声音，不恢复底层 BGM。没有正式地址的 BGM 文件名返回空，移除 localhost 兜底。正式 BGM 如需启用，需提供明确 HTTPS 或包内地址。

## 页面映射及补录清单

下列“可手动播放”仍是待听审候选，表示文件与用途映射已核，未完成音文逐字验收。内容负责人应结合最终屏幕正文逐条听审，确认前缀/尾句/停顿，不得只凭文件名通过。

| 主流程旁白 ID | 包内录音 | 当前处理 |
|---|---|---|
| narr-e1 | /voice-m/narr-e1.mp3 | 待听审候选，可手动播放 |
| narr-e2 | /voice-m/narr-e2.mp3 | 待听审候选，可手动播放 |
| narr-h1 | /voice-b/narr-h1.mp3 | 待听审候选，可手动播放 |
| narr-h2 | /voice-b/narr-h2.mp3 | 待听审候选，可手动播放 |
| narr-h3 | /voice-b/narr-h3.mp3 | 待听审候选，可手动播放 |
| narr-h4 | /voice-b/narr-h4.mp3 | 待听审候选，可手动播放 |
| narr-h5 | /voice-b/narr-h5.mp3 | 待听审候选，可手动播放 |
| narr-h6 | /voice-b/narr-h6.mp3 | 禁播：旧生成稿末段与当前 H6 方外观引入不同，需补录完整正文 |
| narr-fn1 | /voice-c/narr-fn1.mp3 | 禁播：包含屏幕演出说明，且终局多站照片采集范围待定 |
| narr-fn2 | /voice-c/narr-fn2.mp3 | 禁播：包含屏幕来信演出说明及“记录得完完整整”待修文案 |
| narr-fn3 | /voice-c/narr-fn3.mp3 | 禁播：包含“几秒后，一份新的档案生成”程序说明 |
| narr-hy1 | /voice-d/narr-hy1.mp3 | 待听审候选，可手动播放 |
| narr-hy2 | /voice-d/narr-hy2.mp3 | 禁播：旧生成稿含“答案确认后”程序演出句且兽首回归状态需核验；待试听及内容定稿 |
| narr-hy3 | /voice-d/narr-hy3.mp3 | 禁播：旧生成稿水源段与当前转盘后正文不同；实际录音待试听确认 |
| narr-hg1 | /voice-e/narr-hg1.mp3 | 禁播：雨果写作地点与史料冲突，地点及情绪承接定稿后补录 |
| narr-x1 | /voice-f/narr-x1.mp3 | 待听审候选，可手动播放 |
| narr-x2 | /voice-f/narr-x2.mp3 | 待听审候选，可手动播放 |
| narr-x3 | /voice-f/narr-x3.mp3 | 待听审候选，可手动播放 |
| narr-ds1 | /voice-g/narr-ds1.mp3 | 待听审候选，可手动播放 |
| narr-ds2 | /voice-g/narr-ds2.mp3 | 禁播：旧生成稿结尾“都没了，一场火过后”与当前 DS2 逐步对照段不同 |
| narr-f1 | /voice-h/narr-f1.mp3 | 待听审候选，可手动播放 |
| narr-f2 | /voice-h/narr-f2.mp3 | 禁播：旧生成稿将容妃爱情传说写为确凿，与当前正文不同；实际录音待试听，确认已重录后方可解禁 |
| narr-xs1 | /voice-i/narr-xs1.mp3 | 待听审候选，可手动播放 |
| narr-xs2 | /voice-i/narr-xs2.mp3 | 禁播：旧生成稿缺当前工程叙述和大水法转场；实际录音待试听确认 |
| narr-lt1 | /voice-k/narr-lt1.mp3 | 禁播：“昨天”不适合延期回访，需日期中性措辞 |
| narr-lt2 | /voice-k/narr-lt2.mp3 | 待听审候选，可手动播放 |
| narr-lt3 | /voice-k/narr-lt3.mp3 | 待听审候选，可手动播放 |
| narr-lt4 | /voice-k/narr-lt4.mp3 | 禁播：遗物流向和现藏位置需内容核验后确认录音 |
| narr-lt5 | /voice-l/narr-lt5.mp3 | 禁播：2026/第一位学生与当前读者关系、路线解释待统一 |
| narr-lt6 | /voice-l/narr-lt6.mp3 | 禁播：“这么多年来”与2026冲突，且前人记录可能为空 |
| narr-lt7 | /voice-l/narr-lt7.mp3 | 禁播：仅显示过前人记录后才能承接；“今天拍下”与翌日冲突 |
| narr-lt8 | /voice-l/narr-lt8.mp3 | 禁播：LT8已按真实提交或私人保存状态显示回执；旧固定审核承诺不匹配 |
| narr-p1 | /voice-a/narr-prologue-p01.mp3, /voice-a/narr-prologue-p02.mp3 | 待听审候选，可手动播放 |
| narr-p2 | /voice-a/narr-prologue-p03.mp3 | 待听审候选，可手动播放 |
| narr-p3 | /voice-a/narr-prologue-p04.mp3, /voice-a/narr-prologue-p05.mp3 | 待听审候选，可手动播放 |

P1 使用 prologue-p01+p02，P2 使用 p03，P3 使用 p04+p05，依据迁移源的 content/prologue.js pack 分段与 v3 flow/pages.js 的三页正文对应。未把 handover 额外读入 P3。

## 注册与打包

音频包按最终实际可播放资源在 app.json 注册，每包保留 pages/hold/hold 占位页。E1/E2 位于 voice-m；新增来信候选位于 voice-k/l，其中全部冻结的包可随最终清理移出注册。组件会按真实包名按需下载，预加载只作优化，不影响正确性。

所有录音文件均应在最终打包报告中确认包体上限。已精确删除 32 条旧主线音频和对应映射，并沿 v3 调用链清理不再使用的 guide-*、dlg-* 与可选站旧旁白。冻结的新版候选 MP3 保留在源目录供听审，由 project 打包忽略规则排除；运行时清单同步禁播。入口 E1/E2 移到 voice-m，避免为包体压缩而降低 DJ-06 原声景音质。

## 验证

`node --test test/v3-audio.test.js` 覆盖路径/SHA、分包体积、P1—P3 多段、XS 分包、默认 OFF、答前禁播、H3 明确翻面、异步失效、失败重试、静音、页面/后台/active 暂停、重播和播放器互斥。`test/v3-ui.test.js` 检查 WXML 动态绑定、事件方法和关键页面渲染；旧入口/旧页面测试随调用链清理，由 v3 回归覆盖。

真实微信端仍需验收首次分包下载、低网速/断网、来回切页、系统静音与蓝牙、后台返回、连续播放和音文听审。本地 VM 测试与浏览器 WXML 预览不能代替真机音频验收。

## 已清理旧资源（按禁用 ID 精确清理）

- narr-prologue-handover
- narr-s1-decode-sealed
- narr-s1-decode-reading
- narr-s1-decode-puzzle
- narr-s1-decode-solved
- narr-s2-quiz
- narr-s2-quiz-followup
- narr-s2-reveal
- narr-s2-reveal-followup
- narr-s2-blend
- narr-s2-pattern
- narr-s2-pattern-finale
- narr-finale-p01
- narr-finale-p02
- narr-finale-p03
- narr-s3-comic
- narr-s3-comic-followup
- narr-s3-zodiac
- narr-s3-water
- narr-s4-timeline
- narr-s4-timeline-mono
- narr-s4-password
- narr-waypoint-xieqiqu
- narr-waypoint-xieqiqu-followup
- narr-dashuifa-hunt
- narr-dashuifa-after
- narr-dashuifa-yuan
- narr-dashuifa-followup
- narr-waypoint-fangwaiguan
- narr-waypoint-fangwaiguan-followup
- narr-waypoint-xushuilou
- narr-waypoint-xushuilou-followup


## 最终听审数量

迁入的 37 个新版 MP3 全部尚未完成逐条听审；文件路径、来源及 SHA-256 已核。当前可手动播放候选为 19 个主流程旁白 ID，对应 21 个唯一 MP3（序章 P1/P3各两段）；其余 16 个新版 MP3因文案或状态风险冻结。DJ-06 既有声景不计入本次新版录音听审数，也不宣称重新听审通过。


## 听讲模式与三秒翻页（2026-09-25）

顶部播放条置于游戏导航栏上方，正文和彩蛋旧播放条移除，避免重复播音。首次选择“以听为主／以阅读为主”，顶部“切换”可随时重选。听讲模式仅对有可用 narrClips 的剧情屏启动音频；多文件录音全部自然结束后，显示 3→2→1 倒计时，再调用既有主线继续操作。下一剧情屏自动播放；剧情转玩法时停住，绝不自动回答、确认实体操作、保存署名或确认玩家已经到达。未接录音、冻结录音和失败状态不自动翻页。

触屏、滚动、切换模式、开史料卡、开路线、返回、手动继续、暂停/重播/静音、切后台和卸载都会取消倒计时。旧页面 ended 事件携带 contextKey，不能推动新页面。倒计时使用 generation 避免已取消回调影响后续计时。自动播放采用 listenKey，一屏仅触发一次，失败需主动重试，重新选择听讲模式属于新的明确播放请求。

本次不修改录音文件或解禁原补录清单；映射可用不等于已逐字听审。缺录音页面仍需阅读，因此目前不是全程无屏音频导览。148 项自动测试通过，包含组件分包加载/暂停/失败、偏好持久化、三秒计时、旧回调、玩法/导航边界和顶栏结构。开发者工具实查选择弹层及切换听讲后的顶栏与缺音停留提示；出现一次开发工具热重载 routeDone webviewId 系统报错，未作为业务音频错误处理。完整真实音频连续播完与 iOS/Android 真机尚待验收，未宣称已听审。
