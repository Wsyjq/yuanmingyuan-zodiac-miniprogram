'use strict'

/**
 * 开放作答的语音入口。
 * 优先微信同声传译插件（需后台开通，本包不预装）；否则 RecorderManager 录音。
 * 无转写能力时不上传音频，回到文字框。权限在使用时申请，拒绝不卡主流程。
 */

const MAX_RECORD_MS = 8000

function loadWechatSI() {
  try {
    if (typeof requirePlugin !== 'function') return null
    const plugin = requirePlugin('WechatSI')
    if (plugin && typeof plugin.getRecordRecognitionManager === 'function') {
      return plugin.getRecordRecognitionManager()
    }
  } catch (err) { /* 未开通插件 */ }
  return null
}

function getAuthSetting(scope) {
  return new Promise(function (resolve) {
    if (typeof wx === 'undefined' || !wx.getSetting) {
      resolve(undefined)
      return
    }
    wx.getSetting({
      success: function (res) {
        const setting = res && res.authSetting ? res.authSetting : {}
        resolve(setting[scope])
      },
      fail: function () { resolve(undefined) }
    })
  })
}

function authorizeRecord() {
  return new Promise(function (resolve, reject) {
    if (typeof wx === 'undefined' || !wx.authorize) {
      resolve()
      return
    }
    wx.authorize({
      scope: 'scope.record',
      success: function () { resolve() },
      fail: function (err) { reject(err || new Error('auth_denied')) }
    })
  })
}

function createVoiceInput(handlers) {
  const onText = handlers && handlers.onText || function () {}
  const onState = handlers && handlers.onState || function () {}
  const onError = handlers && handlers.onError || function () {}

  let pluginMgr = null
  let recorder = null
  let recording = false
  let starting = false
  let stopTimer = null
  let pluginBound = false
  let recorderBound = false

  function clearTimer() {
    if (!stopTimer) return
    clearTimeout(stopTimer)
    stopTimer = null
  }

  function setRecording(next) {
    recording = !!next
    onState(recording ? 'recording' : 'idle')
  }

  function fail(code, message) {
    setRecording(false)
    onError({ code: code, message: message })
  }

  function bindPlugin(mgr) {
    if (pluginBound) return
    pluginBound = true
    mgr.onStart(function () { setRecording(true) })
    mgr.onStop(function (res) {
      clearTimer()
      setRecording(false)
      const text = String(res && (res.result || res.transcript) || '').trim()
      if (text) onText(text)
      else fail('empty', '没听清，再说一遍或改用文字')
    })
    mgr.onError(function () {
      clearTimer()
      fail('plugin', '语音转写暂不可用，请改用文字')
    })
  }

  function bindRecorder(mgr) {
    if (recorderBound) return
    recorderBound = true
    mgr.onStart(function () { setRecording(true) })
    mgr.onStop(function () {
      clearTimer()
      setRecording(false)
      fail('no_asr', '语音转写暂不可用，请把刚才说的写进框里')
    })
    mgr.onError(function () {
      clearTimer()
      fail('recorder', '没开麦克风，改用文字也行')
    })
  }

  function startPlugin(mgr) {
    bindPlugin(mgr)
    mgr.start({ duration: MAX_RECORD_MS, lang: 'zh_CN' })
    clearTimer()
    stopTimer = setTimeout(function () {
      try { mgr.stop() } catch (err) { /* 忽略 */ }
    }, MAX_RECORD_MS)
  }

  function startRecorder() {
    if (typeof wx === 'undefined' || !wx.getRecorderManager) {
      fail('unavailable', '这台设备不能录音，请用文字')
      return
    }
    if (!recorder) recorder = wx.getRecorderManager()
    bindRecorder(recorder)
    recorder.start({
      duration: MAX_RECORD_MS,
      format: 'mp3',
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000
    })
    clearTimer()
    stopTimer = setTimeout(function () {
      try { recorder.stop() } catch (err) { /* 忽略 */ }
    }, MAX_RECORD_MS)
  }

  function start() {
    if (recording || starting) return Promise.resolve()
    starting = true
    onState('preparing')
    return getAuthSetting('scope.record').then(function (flag) {
      if (flag === false) {
        starting = false
        fail('denied', '没开麦克风，改用文字也行')
        return
      }
      return authorizeRecord().then(function () {
        starting = false
        pluginMgr = pluginMgr || loadWechatSI()
        if (pluginMgr) startPlugin(pluginMgr)
        else startRecorder()
      }).catch(function () {
        starting = false
        fail('denied', '没开麦克风，改用文字也行')
      })
    }).catch(function () {
      starting = false
    })
  }

  function stop() {
    clearTimer()
    if (!recording) {
      setRecording(false)
      return
    }
    try {
      if (pluginMgr && pluginMgr.stop) pluginMgr.stop()
      else if (recorder && recorder.stop) recorder.stop()
      else setRecording(false)
    } catch (err) {
      setRecording(false)
    }
  }

  function destroy() {
    clearTimer()
    try {
      if (recording && pluginMgr && pluginMgr.stop) pluginMgr.stop()
      if (recording && recorder && recorder.stop) recorder.stop()
    } catch (err) { /* 卸载时忽略 */ }
    recording = false
    pluginMgr = null
    recorder = null
  }

  return {
    start: start,
    stop: stop,
    destroy: destroy,
    isRecording: function () { return recording }
  }
}

module.exports = {
  MAX_RECORD_MS: MAX_RECORD_MS,
  createVoiceInput: createVoiceInput
}
