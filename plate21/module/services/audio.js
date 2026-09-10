'use strict'
const runtime = require('../config/runtime')
const media = require('../config/media')
function createAudioManager(api) {
  const listeners = new Set(),
    blockers = new Set()
  let quietUntil = 0,
    quietTimer = null
  let voice = null,
    music = null,
    fadeTimer = null,
    transitionTimer = null,
    station = '',
    foreground = true,
    pendingSeek = 0,
    lastSaved = 0
  let voiceIntent = false,
    bgmIntent = false,
    currentMusicTrack = null,
    queue = [],
    queueIndex = 0
  const saved = read('plate21_audio_device') || {},
    positions = read('plate21_audio_positions') || {}
  const state = {
    playing: false,
    bgmPlaying: false,
    title: '',
    trackId: '',
    position: 0,
    duration: 0,
    error: '',
    bgmError: '',
    muted: !!saved.muted,
    volume: Number.isFinite(saved.volume) ? saved.volume : 0.24,
    continuous: !!saved.continuous
  }
  function read(k) {
    try {
      return api.getStorageSync(k)
    } catch (e) {
      return null
    }
  }
  function write(k, v) {
    try {
      api.setStorageSync(k, v)
    } catch (e) {}
  }
  function snapshot() {
    const clock = (seconds) => {
      const n = Math.floor(Number(seconds) || 0)
      return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0')
    }
    return Object.assign({}, state, {
      quiet: blockers.has('quiet'),
      remaining: Math.max(0, Math.ceil((quietUntil - Date.now()) / 1000)),
      timeLabel: clock(state.position),
      durationLabel: clock(state.duration)
    })
  }
  function emit() {
    listeners.forEach((f) => f(snapshot()))
  }
  function listen(ctx, name, cb) {
    if (ctx && typeof ctx[name] === 'function') ctx[name](cb)
  }
  function persist() {
    if (state.trackId) positions[state.trackId] = state.position
    write('plate21_audio_positions', positions)
  }
  function dev() {
    try {
      return api.getAccountInfoSync().miniProgram.envVersion === 'develop'
    } catch (e) {
      return false
    }
  }
  function source(track) {
    if (!track) return ''
    if (track.src && /^https:\/\//.test(track.src)) return track.src
    const base = runtime.mediaBaseUrl || (dev() ? read('plate21_dev_media_base') : '')
    if (base && !dev() && !/^https:\/\//.test(base)) return ''
    return base && track.file
      ? String(base).replace(/\/$/, '') + '/' + encodeURIComponent(track.file)
      : ''
  }
  function volume() {
    const gain =
      currentMusicTrack && Number.isFinite(currentMusicTrack.volume)
        ? currentMusicTrack.volume / 0.24
        : 1
    return state.muted || blockers.size
      ? 0
      : Math.min(1, Math.max(0, state.volume * gain)) * (state.playing ? 0.25 : 1)
  }
  function fade(target, ms) {
    clearInterval(fadeTimer)
    if (!music) return
    const from = Number(music.volume) || 0,
      start = Date.now(),
      duration = Math.max(0, Number(ms) || 0)
    if (!duration) {
      music.volume = target
      return
    }
    fadeTimer = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration)
      if (music) music.volume = from + (target - from) * p
      if (p === 1) clearInterval(fadeTimer)
    }, 40)
  }
  function updateVolume() {
    fade(volume(), 200)
  }
  function ensureVoice() {
    if (voice) return true
    if (!api.getBackgroundAudioManager) {
      state.error = '当前环境不支持后台讲解，请阅读文稿。'
      emit()
      return false
    }
    voice = api.getBackgroundAudioManager()
    listen(voice, 'onPlay', () => {
      if (blockers.size || !voiceIntent) {
        voice.pause()
        return
      }
      state.playing = true
      state.error = ''
      updateVolume()
      emit()
    })
    listen(voice, 'onPause', () => {
      if (!blockers.size) voiceIntent = false
      state.playing = false
      persist()
      updateVolume()
      emit()
    })
    listen(voice, 'onStop', () => {
      voiceIntent = false
      state.playing = false
      persist()
      updateVolume()
      emit()
    })
    listen(voice, 'onTimeUpdate', () => {
      state.position = Number(voice.currentTime) || 0
      state.duration = Number(voice.duration) || 0
      if (Date.now() - lastSaved > 3000) {
        persist()
        lastSaved = Date.now()
      }
      emit()
    })
    listen(voice, 'onCanplay', () => {
      if (pendingSeek > 0) {
        voice.seek(pendingSeek)
        pendingSeek = 0
      }
    })
    listen(voice, 'onError', () => {
      state.playing = false
      state.error = '讲解加载失败，可重试或继续阅读。'
      updateVolume()
      emit()
    })
    listen(voice, 'onEnded', () => {
      positions[state.trackId] = 0
      state.position = 0
      state.playing = false
      write('plate21_audio_positions', positions)
      updateVolume()
      if (state.continuous && voiceIntent && queueIndex + 1 < queue.length) {
        queueIndex++
        playVoice(queue[queueIndex])
      } else {
        voiceIntent = false
        emit()
      }
    })
    return true
  }
  function ensureMusic() {
    if (music) return true
    if (!api.createInnerAudioContext) {
      state.bgmError = '当前环境不支持配乐试听。'
      emit()
      return false
    }
    if (api.setInnerAudioOption)
      api.setInnerAudioOption({ mixWithOther: true, obeyMuteSwitch: true })
    music = api.createInnerAudioContext()
    music.autoplay = false
    music.obeyMuteSwitch = true
    listen(music, 'onPlay', () => {
      if (!bgmIntent || !foreground || blockers.size || state.muted) {
        music.pause()
        return
      }
      state.bgmPlaying = true
      state.bgmError = ''
      emit()
    })
    listen(music, 'onPause', () => {
      state.bgmPlaying = false
      emit()
    })
    listen(music, 'onStop', () => {
      state.bgmPlaying = false
      emit()
    })
    listen(music, 'onError', () => {
      state.bgmPlaying = false
      state.bgmError = '配乐加载失败，请重试。'
      emit()
    })
    return true
  }
  function playVoice(track) {
    if (blockers.size) {
      state.error = '请先结束视频、录音或静默，再播放讲解。'
      emit()
      return false
    }
    const src = source(track)
    if (!src) {
      state.error = '本节尚无已发布讲解音频，可阅读文字。'
      emit()
      return false
    }
    if (!ensureVoice()) return false
    voiceIntent = true
    state.error = ''
    if (state.trackId === track.id && voice.src === src && !state.error) {
      voice.play()
      return true
    }
    persist()
    state.trackId = track.id
    state.title = track.title || '第廿一图 · 讲解'
    pendingSeek = positions[track.id] || 0
    state.position = pendingSeek
    voice.title = state.title
    voice.epname = '第廿一图'
    voice.singer = '圆明园文化体验'
    voice.startTime = pendingSeek
    voice.src = src
    emit()
    return true
  }
  function startMusic(track, force) {
    currentMusicTrack = track || null
    if (!track) {
      if (music) music.pause()
      state.bgmPlaying = false
      emit()
      return
    }
    const src = source(track)
    if (!src) {
      state.bgmError = '配乐暂未上架。'
      emit()
      return
    }
    if (!ensureMusic()) return
    if (music.src !== src || force) {
      music.loop = track.loop !== false
      music.volume = 0
      music.src = src
      state.bgmTitle = track.title
    }
    if (bgmIntent && foreground && !blockers.size && !state.muted) {
      music.play()
      fade(volume(), track.fadeMs)
    }
  }
  function stationTrack() {
    return media.tracks.find((t) => t.id === media.stationTracks[station])
  }
  function setStation(id) {
    if (station === id) return
    station = id
    clearTimeout(transitionTimer)
    if (!bgmIntent) return
    if (music && state.bgmPlaying) {
      fade(0, 250)
      transitionTimer = setTimeout(() => startMusic(stationTrack()), 260)
    } else startMusic(stationTrack())
  }
  function toggleBgm(track) {
    bgmIntent = track ? true : !bgmIntent
    if (bgmIntent) startMusic(track || currentMusicTrack || stationTrack())
    else if (music) music.pause()
    emit()
  }
  function suspend(reason) {
    if (reason === 'quiet' && !blockers.has(reason)) {
      quietUntil = Date.now() + 120000
      clearInterval(quietTimer)
      quietTimer = setInterval(() => {
        emit()
        if (Date.now() >= quietUntil) clearInterval(quietTimer)
      }, 1000)
    }
    blockers.add(reason)
    if (voice) voice.pause()
    if (music) music.pause()
    persist()
    emit()
  }
  function release(reason) {
    blockers.delete(reason)
    if (reason === 'quiet') clearInterval(quietTimer)
    if (blockers.size) {
      emit()
      return
    }
    if (voiceIntent && voice) voice.play()
    if (bgmIntent && foreground && !state.muted && music) music.play()
    updateVolume()
    emit()
  }
  function prefs(p) {
    if (typeof p.muted === 'boolean') state.muted = p.muted
    if (Number.isFinite(p.volume)) state.volume = Math.min(1, Math.max(0, p.volume))
    if (typeof p.continuous === 'boolean') state.continuous = p.continuous
    write('plate21_audio_device', {
      muted: state.muted,
      volume: state.volume,
      continuous: state.continuous
    })
    if (state.muted && music) music.pause()
    else if (bgmIntent && foreground && !blockers.size && music) music.play()
    updateVolume()
    emit()
  }
  function hide() {
    foreground = false
    if (music) music.pause()
    persist()
  }
  function show() {
    foreground = true
    if (bgmIntent && !state.muted && !blockers.size && music) music.play()
  }
  if (api.onAppHide) api.onAppHide(hide)
  if (api.onAppShow) api.onAppShow(show)
  if (api.onAudioInterruptionBegin)
    api.onAudioInterruptionBegin(() => {
      voiceIntent = false
      bgmIntent = false
      if (voice) voice.pause()
      if (music) music.pause()
      persist()
      state.error = '声音已中断，请主动恢复播放。'
      emit()
    })
  return {
    subscribe(fn) {
      listeners.add(fn)
      fn(snapshot())
      return () => listeners.delete(fn)
    },
    getState: snapshot,
    source,
    setStation,
    toggleBgm,
    playVoice,
    setQueue(tracks, index) {
      queue = (tracks || []).filter((t) => !!source(t))
      queueIndex = Math.max(0, Number(index) || 0)
    },
    pause() {
      voiceIntent = false
      if (voice) voice.pause()
      persist()
    },
    resume() {
      if (blockers.size) return
      if (voice) {
        voiceIntent = true
        voice.play()
      }
    },
    seek(seconds) {
      if (!voice) return
      const p = Math.max(0, Math.min(Number(seconds) || 0, state.duration || Infinity))
      voice.seek(p)
      state.position = p
      persist()
      emit()
    },
    retry() {
      const t = queue.find((t) => t.id === state.trackId)
      if (t) {
        state.trackId = ''
        playVoice(t)
      } else if (voice && voice.src) {
        const src = voice.src
        voiceIntent = true
        voice.startTime = state.position
        voice.src = src
      }
    },
    retryBgm() {
      bgmIntent = true
      startMusic(currentMusicTrack || stationTrack(), true)
    },
    prefs,
    suspend,
    release,
    hide,
    show,
    destroy() {
      persist()
      clearInterval(fadeTimer)
      clearInterval(quietTimer)
      clearTimeout(transitionTimer)
      if (music) music.destroy()
      if (voice) voice.stop()
      if (api.offAppHide) api.offAppHide(hide)
      if (api.offAppShow) api.offAppShow(show)
      listeners.clear()
    }
  }
}
let instance
function get() {
  if (!instance) instance = createAudioManager(typeof wx === 'undefined' ? {} : wx)
  return instance
}
module.exports = { createAudioManager, get }
