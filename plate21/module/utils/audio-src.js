/**
 * 音频地址单点 —— V2.2 语音（TTS）与 BGM 双通道（方案C，issue #0028）。
 *
 * 人声（clip）：包内优先。75 条语音经 tools/pack_voice.js 拆进 voice-a..e
 * 音频分包（各 ≤3.4MB，随包分发，离线可播）；映射表 voice-pkg-map 由生成器
 * 维护，勿手改。映射表没有的 id 回落 AUDIO_BASE（开发期增量试听用）。
 *
 * BGM（bgm）：不进包（体积 32MB 超分包限额），走 AUDIO_BASE 同源流式——
 * 开发：repo 根目录起 `python tools/serve_audio.py`（默认 8787 端口，
 * 文档根 = 仓库根，URL 形如 http://127.0.0.1:8787/bgm/xxx.mp3）。
 * 真机预览：把 AUDIO_BASE 换成开发机的局域网 IP（与手机同网）。
 * 生产：只改这一个常量指向 CDN；人声已随包，无需 CDN。
 */
'use strict'

var bundled = require('./voice-pkg-map')

var AUDIO_BASE = 'http://127.0.0.1:8787/audio/v22'

// 2026-09-23 飞书剧情对齐 rev4379：主线页面文案已按 v3 逐字改写，
// 既有 narr-* 人声录音仍是 V2.2 旧词，与屏上文字不符。重录待 MiniMax 账户充值
// （1008 insufficient balance）。在重录完成前，下列主线叙述类 clip 一律静音，
// 避免「音不对字」；散页 dlg-* 台词（养雀笼/观水法/线法画）与音乐声景不受影响。
// 重录后从本清单移除对应 id 即可恢复。
var STALE_CLIPS = {
  'narr-prologue-p01': 1, 'narr-prologue-p02': 1, 'narr-prologue-p03': 1, 'narr-prologue-p04': 1, 'narr-prologue-p05': 1,
  'narr-prologue-handover': 1,
  'narr-s1-arrive': 1, 'narr-s1-decode-sealed': 1, 'narr-s1-decode-reading': 1, 'narr-s1-decode-puzzle': 1, 'narr-s1-decode-solved': 1,
  'narr-s2-quiz': 1, 'narr-s2-quiz-followup': 1,
  'narr-s2-reveal': 1, 'narr-s2-reveal-followup': 1,
  'narr-s2-blend': 1,
  'narr-s2-pattern': 1, 'narr-s2-pattern-finale': 1,
  'narr-waypoint-xieqiqu': 1, 'narr-waypoint-xieqiqu-followup': 1,
  'narr-waypoint-fangwaiguan': 1, 'narr-waypoint-fangwaiguan-followup': 1,
  'narr-waypoint-xushuilou': 1, 'narr-waypoint-xushuilou-followup': 1,
  'narr-s3-comic': 1, 'narr-s3-comic-followup': 1,
  'narr-s3-zodiac': 1, 'narr-s3-water': 1,
  'narr-dashuifa-hunt': 1, 'narr-dashuifa-after': 1, 'narr-dashuifa-yuan': 1, 'narr-dashuifa-followup': 1,
  'narr-s4-timeline': 1, 'narr-s4-timeline-mono': 1,
  'narr-s4-password': 1,
  'narr-finale-p01': 1, 'narr-finale-p02': 1, 'narr-finale-p03': 1
}

function clip(id) {
  if (!id) return ''
  if (STALE_CLIPS[id]) return ''
  return bundled[id] || (AUDIO_BASE + '/' + id + '.mp3')
}

// bgm/ 与 audio/ 同级（同一本地服务下），单独一个入口避免散落拼接
function bgm(file) {
  return file ? AUDIO_BASE.replace(/\/audio\/v22$/, '') + '/bgm/' + file : ''
}

module.exports = {
  AUDIO_BASE: AUDIO_BASE,
  clip: clip,
  bgm: bgm
}
