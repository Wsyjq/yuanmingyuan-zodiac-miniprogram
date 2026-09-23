'use strict'

// 谐奇趣音乐贴片。NFC 只负责把声景播出来，不是一道门。
// 贴片写成 NDEF 文本记录，正文正好是 xieqiqu（UTF-8）。
// 微信小程序只在安卓上有 wx.getNFCAdapter；没有这张贴片或这台手机读不了时，
// 页面上另有「直接听」 ，读到与否都不挡住下一页。

const TAG_TEXT = 'xieqiqu'
const SOUND = '/voice-a/dj06-xieqiqu-soundscape-30s-v2.mp3'

function bytesOf(payload) {
  if (!payload) return []
  if (typeof ArrayBuffer !== 'undefined' && payload instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(payload))
  }
  if (ArrayBuffer.isView(payload)) {
    return Array.from(new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength))
  }
  if (Array.isArray(payload)) return payload.slice()
  return []
}

function decodeUtf8(bytes) {
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) {
    const c = bytes[i]
    if (c < 0x80) out += String.fromCharCode(c)
    else if (c < 0xe0) {
      out += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i + 1] & 0x3f))
      i += 1
    } else {
      out += String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f))
      i += 2
    }
  }
  return out
}

function readTextPayload(bytes) {
  if (!bytes.length) return ''
  const langLen = bytes[0] & 0x3f
  const utf16 = (bytes[0] & 0x80) !== 0
  const data = bytes.slice(1 + langLen)
  if (!utf16) return decodeUtf8(data)
  let out = ''
  for (let i = 0; i + 1 < data.length; i += 2) {
    out += String.fromCharCode((data[i] << 8) | data[i + 1])
  }
  return out
}

function textFromMessage(message) {
  const records = (message && message.records) || []
  const found = []
  records.forEach(function (record) {
    const text = readTextPayload(bytesOf(record && record.payload))
    if (text) found.push(text)
  })
  return found.join('\n')
}

function matches(res) {
  const messages = (res && res.messages) || []
  for (let i = 0; i < messages.length; i += 1) {
    const text = textFromMessage(messages[i]).toLowerCase()
    if (text.indexOf(TAG_TEXT) >= 0) return true
  }
  return false
}

function explainFail(err) {
  const code = err && (err.errCode || err.code)
  if (code === 13000) return '这台手机的微信读不了贴片'
  if (code === 13001) return '先在系统里打开 NFC'
  if (code === 13013) return '把贴片再靠近一点'
  return '没有读到贴片'
}

function start(handlers) {
  const hooks = handlers || {}
  if (typeof wx === 'undefined' || typeof wx.getNFCAdapter !== 'function') {
    if (hooks.onStatus) hooks.onStatus('unsupported')
    return { stop: function () {} }
  }
  let adapter
  try {
    adapter = wx.getNFCAdapter()
  } catch (err) {
    if (hooks.onStatus) hooks.onStatus('unsupported')
    return { stop: function () {} }
  }
  function onDiscovered(res) {
    if (matches(res)) {
      if (hooks.onTag) hooks.onTag(res)
      return
    }
    if (hooks.onStatus) hooks.onStatus('foreign')
  }
  if (typeof adapter.onDiscovered === 'function') adapter.onDiscovered(onDiscovered)
  adapter.startDiscovery({
    fail: function (err) {
      if (hooks.onStatus) hooks.onStatus(explainFail(err))
    }
  })
  return {
    stop: function () {
      try {
        if (typeof adapter.offDiscovered === 'function') adapter.offDiscovered(onDiscovered)
        adapter.stopDiscovery()
      } catch (err) {}
    }
  }
}

module.exports = {
  TAG_TEXT: TAG_TEXT,
  SOUND: SOUND,
  bytesOf: bytesOf,
  readTextPayload: readTextPayload,
  matches: matches,
  explainFail: explainFail,
  start: start
}
