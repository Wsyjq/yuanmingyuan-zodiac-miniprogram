/**
 * 音频地址单点 —— V2.2 语音（TTS）与 BGM 经本地静态服务承载。
 *
 * 为什么不是包内路径：分包体积上限 2048KB，全量语音（台词+导览+旁白）
 * 必然超限（bgm/ 同理，见 project.config.json packOptions.ignore）。
 *
 * 开发：repo 根目录起 `python tools/serve_audio.py`（默认 8787 端口，
 * 文档根 = 仓库根，URL 形如 http://127.0.0.1:8787/audio/v22/xxx.mp3）。
 * 真机预览：把 AUDIO_BASE 换成开发机的局域网 IP（与手机同网）。
 * 生产：只改这一个常量指向 CDN。
 */
'use strict'

var AUDIO_BASE = 'http://127.0.0.1:8787/audio/v22'

function clip(id) {
  return id ? AUDIO_BASE + '/' + id + '.mp3' : ''
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
