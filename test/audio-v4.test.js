const test = require('node:test'),
  assert = require('node:assert/strict')
const { createAudioManager } = require('../plate21/module/services/audio')
function setup(storage = {}) {
  const events = {},
    voiceEvents = {},
    musicEvents = {}
  let voices = 0,
    musics = 0
  function ctx(handlers, auto) {
    let src = ''
    const c = {
      plays: 0,
      pauses: 0,
      currentTime: 0,
      duration: 100,
      volume: 1,
      seek(p) {
        this.currentTime = p
        this.sought = p
      },
      play() {
        this.plays++
        handlers.Play && handlers.Play()
      },
      pause() {
        this.pauses++
        handlers.Pause && handlers.Pause()
      },
      stop() {
        handlers.Stop && handlers.Stop()
      },
      destroy() {}
    }
    for (const n of ['Play', 'Pause', 'Stop', 'TimeUpdate', 'Canplay', 'Error', 'Ended'])
      c['on' + n] = (fn) => (handlers[n] = fn)
    Object.defineProperty(c, 'src', {
      get: () => src,
      set: (v) => {
        src = v
        if (auto) c.play()
      }
    })
    return c
  }
  const voice = ctx(voiceEvents, true),
    music = ctx(musicEvents, false),
    api = {
      getStorageSync: (k) => storage[k],
      setStorageSync: (k, v) => (storage[k] = JSON.parse(JSON.stringify(v))),
      getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
      getBackgroundAudioManager() {
        voices++
        return voice
      },
      createInnerAudioContext() {
        musics++
        return music
      },
      onAppHide: (f) => (events.hide = f),
      onAppShow: (f) => (events.show = f),
      onAudioInterruptionBegin: (f) => (events.interrupt = f)
    }
  storage.plate21_dev_media_base = 'http://127.0.0.1:8878'
  const a = createAudioManager(api)
  return {
    a,
    voice,
    music,
    voiceEvents,
    musicEvents,
    events,
    storage,
    counts: () => ({ voices, musics })
  }
}
const track = { id: 'voice-one', title: '正式讲解', src: 'https://example.org/one.mp3' }
test('user initiation, same station no restart, singleton contexts and UI subscription detach do not stop audio', () => {
  const x = setup()
  x.a.setStation('s2')
  assert.equal(x.counts().musics, 0)
  x.a.toggleBgm()
  assert.equal(x.counts().musics, 1)
  const plays = x.music.plays
  x.a.setStation('s2')
  assert.equal(x.music.plays, plays)
  x.a.playVoice(track)
  const off = x.a.subscribe(() => {})
  off()
  assert.equal(x.a.getState().playing, true)
  x.a.playVoice(track)
  assert.equal(x.counts().voices, 1)
  x.a.destroy()
})
test('progress, seek and resume survive manager recreation', () => {
  const x = setup()
  x.a.playVoice(track)
  x.voice.currentTime = 38
  x.voiceEvents.TimeUpdate()
  x.a.pause()
  assert.equal(x.storage.plate21_audio_positions[track.id], 38)
  x.a.seek(48)
  x.a.destroy()
  const y = setup(x.storage)
  y.a.playVoice(track)
  y.voiceEvents.Canplay()
  assert.equal(y.voice.sought, 48)
  y.a.destroy()
})
test('BGM ducks for narration, stops in background, narration stays active', async () => {
  const x = setup()
  x.a.setStation('s2')
  x.a.toggleBgm()
  x.a.playVoice(track)
  await new Promise((r) => setTimeout(r, 250))
  assert.ok(Math.abs(x.music.volume - 0.06) < 0.01)
  x.events.hide()
  assert.equal(x.a.getState().bgmPlaying, false)
  assert.equal(x.a.getState().playing, true)
  x.events.show()
  assert.equal(x.a.getState().bgmPlaying, true)
  x.a.destroy()
})
test('quiet and overlapping video blockers cannot resume each other prematurely', () => {
  const x = setup()
  x.a.playVoice(track)
  x.a.suspend('video')
  x.a.suspend('quiet')
  x.a.release('video')
  assert.equal(x.a.getState().playing, false)
  x.a.release('quiet')
  assert.equal(x.a.getState().playing, true)
  x.events.interrupt()
  x.a.release('quiet')
  assert.equal(x.a.getState().playing, false)
  x.a.resume()
  assert.equal(x.a.getState().playing, true)
  x.a.destroy()
})
test('no narrator is not treated as BGM narration; media failure surfaces retry state', () => {
  const x = setup()
  assert.equal(x.a.playVoice({ id: 'missing' }), false)
  assert.equal(x.counts().voices, 0)
  x.a.playVoice(track)
  x.voiceEvents.Error()
  assert.match(x.a.getState().error, /加载失败/)
  x.a.retry()
  assert.equal(x.a.getState().playing, true)
  x.a.destroy()
})
test('mute is persisted and does not destroy narrator; queue advances only published media', () => {
  const x = setup()
  x.a.setStation('s3')
  x.a.toggleBgm()
  x.a.prefs({ muted: true, continuous: true })
  assert.equal(x.a.getState().bgmPlaying, false)
  x.a.setQueue(
    [
      track,
      { id: 'missing' },
      Object.assign({}, track, { id: 'two', src: 'https://example.org/two.mp3' })
    ],
    0
  )
  x.a.playVoice(track)
  x.voiceEvents.Ended()
  assert.equal(x.a.getState().trackId, 'two')
  assert.equal(x.storage.plate21_audio_device.muted, true)
  x.a.destroy()
})
