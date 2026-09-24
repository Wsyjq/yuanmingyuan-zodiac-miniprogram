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
var MAINLINE_BASE = 'http://127.0.0.1:8787/audio/mainline'

// 1.2.3 各页仍用旧 clip id。新录的旁白是 narr-p1 这种页号，这里转过去，页面外观不动。
var ALIAS = {
  'narr-s1-arrive': 'narr-e1',
  'narr-s1-decode-sealed': 'narr-e1',
  'narr-s1-decode-reading': 'narr-e2',
  'narr-s1-decode-puzzle': 'narr-e1',
  'narr-s1-decode-solved': 'narr-e2',
  'narr-waypoint-xieqiqu': 'narr-x1',
  'narr-waypoint-xieqiqu-followup': 'narr-x2',
  'narr-s2-quiz': 'narr-h1',
  'narr-s2-quiz-followup': 'narr-h2',
  'narr-s2-reveal': 'narr-h3',
  'narr-s2-reveal-followup': 'narr-h3',
  'narr-s2-blend': 'narr-h4',
  'narr-s2-pattern': 'narr-h5',
  'narr-s2-pattern-finale': 'narr-h6',
  'narr-waypoint-fangwaiguan': 'narr-f1',
  'narr-waypoint-fangwaiguan-followup': 'narr-f2',
  'narr-s3-comic': 'narr-hy1',
  'narr-s3-comic-followup': 'narr-hy2',
  'narr-s3-zodiac': 'narr-hy3',
  'narr-s3-water': 'narr-hy3',
  'narr-waypoint-xushuilou': 'narr-xs1',
  'narr-waypoint-xushuilou-followup': 'narr-xs2',
  'narr-dashuifa-hunt': 'narr-ds1',
  'narr-dashuifa-after': 'narr-ds2',
  'narr-dashuifa-yuan': 'narr-ds2',
  'narr-dashuifa-followup': 'narr-ds2',
  'narr-s4-timeline': 'narr-hg1',
  'narr-s4-timeline-mono': 'narr-hg1',
  'narr-s4-password': 'narr-hg1',
  'narr-finale-p01': 'narr-fn1',
  'narr-finale-p02': 'narr-fn2',
  'narr-finale-p03': 'narr-fn3'
}

function clip(id) {
  if (!id) return ''
  id = ALIAS[id] || id
  if (bundled[id]) return bundled[id]
  if (/^narr-(p|e|x|h|f|hy|xs|ds|hg|fn|lt)/.test(id)) return MAINLINE_BASE + '/' + id + '.mp3'
  return AUDIO_BASE + '/' + id + '.mp3'
}

// bgm/ 与 audio/ 同级（同一本地服务下），单独一个入口避免散落拼接
function bgm(file) {
  if (!file) return ''
  if (file.charAt(0) === '/' || /^https?:/.test(file)) return file
  return AUDIO_BASE.replace(/\/audio\/v22$/, '') + '/bgm/' + file
}

module.exports = {
  AUDIO_BASE: AUDIO_BASE,
  clip: clip,
  bgm: bgm
}
