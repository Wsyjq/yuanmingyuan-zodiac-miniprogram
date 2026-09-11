# V2.2 语音工作流（TTS）

> 本目录（tools/）与产物（audio/）均不进小程序包（`project.config.json` packOptions 忽略 / `audio` gitignore）。

## 一次性看懂

- **产物**：`audio/v22/*.mp3` —— 台词（`dlg-站点-序号`）39 条 + 语音导览两层（`guide-站点-base/-deep`）18 条 + 各页旁白（`narr-页面`）18 条，共 75 条、约 33.7 分钟。
- **声源**：edge-tts（免费、多中文音色）。声部表与全部文本在 `tools/voice_manifest.json`（台词/旁白以 `docs/剧情可用稿-人物对话版-V2.2.md` 为源逐字抄录；导览两层对应 `capabilities/audio-guide/scripts.js`）。
- **播放**：小程序不打包音频，经 `plate21/module/utils/audio-src.js` 的 `AUDIO_BASE` 单常量取流。

## 开发预览（三步）

```bash
# 1. 起本地静态服务（仓库根）
python tools/serve_audio.py            # 127.0.0.1:8787，文档根=仓库根
                                     # 真机预览：--host 0.0.0.0，AUDIO_BASE 换开发机局域网 IP

# 2. 微信开发者工具打开本仓库（urlCheck 已关，http 可播）
#    页面「听 · 本页讲述」/「听这句」/语音导览播放器即出声；
#    谐奇趣页另有「听 · 左右同响」（bgm-07x 双声道曲，请戴耳机）。

# 3. 音频没起服务时：audio-clip 自动隐藏、导览退回文稿阅读态，不出现坏按钮。
```

## 独立开关与互斥（V2.2 音频控制）

- 考察手册 →「音频 · 独立开关」：**背景音乐** / **人声讲述** 两个 switch 各自独立、默认全开、本地持久化（`plate21_audio_settings`）。
- 人声关＝台词「听这句」、旁白「听 · 本页讲述」、语音导览播放器全部隐藏，退回纯文稿；背景音乐关＝各站氛围曲即停。
- 单路互斥（`utils/audio-bus.js`）：任意一路开播，其余在播的暂停；人声结束自动恢复被压低的氛围 BGM；人声换手不丢账。
- 站点氛围曲映射（`components/bgm-ambience`）：序章/入口=bgm-01、黄花阵=bgm-02、海晏堂=bgm-04、雨果=bgm-12、终章=bgm-06、回响信=bgm-13、谐奇趣=bgm-07x、养雀笼=bgm-09、方外观=bgm-03、蓄水楼=bgm-10、线法画=bgm-11；**大水法零配乐（两分钟静默设计）、观水法/转场/枢纽页不挂曲**。
- iOS 真机注意：无手势自动播放可能被微信拦，首次进入页面若没声，开关一次「背景音乐」或点任意播放键即恢复（开关本身即手势）。

## 重生成 / 改文本

```bash
python tools/gen_voice.py                       # 增量（已存在跳过）
python tools/gen_voice.py --force --post        # 全量 + ffmpeg mono/loudnorm 后处理
python tools/gen_voice.py --only dlg-yugao-4    # 单条
python tools/gen_voice.py --report              # 时长报告 + 单站人声 ≤90s 红线核对
```

改台词文本：先改页面/文稿，再同步 `voice_manifest.json` 同 id 的 text，重生成该 id。
音频内容与页面文案目前是「抄录对齐」，页面文案以测试断言为准——改文案请同步两处。

## 时长红线核对（2026-09-11 实测）

| 站点 | 人声合计 | 红线 ≤90s |
|---|---|---|
| 黄花阵 | **102.5s** | **超**（V2.2 四稿把台词加长成段的内在张力：宫女×3+匠人×2+砌墙师傅合计超预算，文稿为准，待台词终审时裁决） |
| 雨果 | 81.5s | ok（贴近上限） |
| 蓄水楼 | 75.7s | ok |
| 谐奇趣 | 66.3s | ok |
| 海晏堂 | 57.0s | ok |
| 其余各站 | ≤37s | ok |

旁白最长：序章 132.7s、谐奇趣 108.4s（旁白不属「人声≤90s」口径，红线条款只限人物台词）。

## 注意

- **新 worktree 没有 `bgm/`**（gitignore 不随分支走）：谐奇趣「左右同响」等 BGM 试听前，先 `cp -r D:/kc/ymy/bgm ./bgm`。
- 服务器默认只绑 127.0.0.1（真机预览用 `--host 0.0.0.0` 并换局域网 IP）。

## 生产切换

只改 `utils/audio-src.js` 的 `AUDIO_BASE` 指向 CDN（与 bgm/ 的挂账 CDN 方案同路）。

## 大水法

零人声零旁白（V2.2 设计：两分钟静默只留现场声），不生成任何 clip，页面也无听书按钮。
