/**
 * audio-settings —— 独立音频开关（产品定位 2026-09-10：文字音频相辅相成 + 独立音频开关）。
 *
 * 两个开关，各自独立、默认全开、本地持久化（设备级偏好，不进剧情进度）：
 *   bgm    背景音乐（站点氛围曲）
 *   voice  人声讲述（台词/旁白/语音导览的播放按钮；关闭后退回纯文稿阅读态）
 *
 * 组件侧用法：attached 时 subscribe 并按当前值渲染，detached 时 unsubscribe；
 * 手册页放开关 UI。变更会即时生效：正在播的对应类别立即停。
 */
'use strict'

var STORAGE_KEY = 'plate21_audio_settings'
var listeners = []
var cached = null

var DEFAULTS = { bgm: true, voice: true }

function read() {
  if (cached) return cached
  var saved = null
  try { saved = wx.getStorageSync(STORAGE_KEY) } catch (e) { /* 存储不可用则用默认 */ }
  cached = { bgm: true, voice: true }
  if (saved && typeof saved === 'object') {
    if (typeof saved.bgm === 'boolean') cached.bgm = saved.bgm
    if (typeof saved.voice === 'boolean') cached.voice = saved.voice
  }
  return cached
}

function persist(next) {
  cached = next
  try { wx.setStorageSync(STORAGE_KEY, next) } catch (e) { /* 持久化失败不阻断本次会话 */ }
}

function get() {
  return read()
}

function set(key, value) {
  var cur = read()
  if (!(key in cur) || cur[key] === value) return cur
  var next = { bgm: cur.bgm, voice: cur.voice }
  next[key] = !!value
  persist(next)
  listeners.forEach(function (fn) {
    try { fn(next, key) } catch (e) { /* 单个订阅者异常不阻断广播 */ }
  })
  return next
}

function subscribe(fn) {
  if (listeners.indexOf(fn) === -1) listeners.push(fn)
}

function unsubscribe(fn) {
  var i = listeners.indexOf(fn)
  if (i !== -1) listeners.splice(i, 1)
}

module.exports = {
  DEFAULTS: DEFAULTS,
  get: get,
  set: set,
  subscribe: subscribe,
  unsubscribe: unsubscribe
}
