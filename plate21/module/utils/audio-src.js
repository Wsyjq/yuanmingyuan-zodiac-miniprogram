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

function clip(id) {
  if (!id) return ''
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
