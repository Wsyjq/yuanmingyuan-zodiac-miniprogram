'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const ROOT = path.join(__dirname, '..')
const audioSrc = require('../plate21/module/utils/audio-src')
const manifest = require('../plate21/module/audio/v3-manifest')
const cue = require('../plate21/module/audio/cue')

function harness(initialVoice = true) {
  delete require.cache[require.resolve('../plate21/module/utils/audio-bus')]
  const bus = require('../plate21/module/utils/audio-bus')
  const preference = { voice: initialVoice, bgm: true }
  const listeners = []
  const settings = {
    get: () => ({ ...preference }),
    set(key, value) { preference[key] = value; listeners.slice().forEach(fn => fn({ ...preference })) },
    subscribe(fn) { listeners.push(fn) },
    unsubscribe(fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1) }
  }
  const loads = [], contexts = [], hides = [], shows = []
  const wx = {
    loadSubpackage(opts) { loads.push(opts) },
    onAppHide(fn) { hides.push(fn) }, offAppHide(fn) { hides.splice(hides.indexOf(fn), 1) },
    onAppShow(fn) { shows.push(fn) }, offAppShow(fn) { shows.splice(shows.indexOf(fn), 1) },
    createInnerAudioContext() {
      const ctx = { plays: 0, pauses: 0, destroyed: false, handlers: {}, currentTime: 0, duration: 10,
        play() { this.plays++ }, pause() { this.pauses++ }, destroy() { this.destroyed = true },
        onTimeUpdate(fn) { this.handlers.time = fn }, onEnded(fn) { this.handlers.end = fn }, onError(fn) { this.handlers.error = fn }
      }
      contexts.push(ctx); return ctx
    }
  }
  let spec
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'plate21/module/components/audio-clip/audio-clip.js'), 'utf8'), {
    wx, Component(value) { spec = value },
    require(name) {
      if (name.endsWith('audio-settings')) return settings
      if (name.endsWith('audio-bus')) return bus
      if (name.endsWith('audio-src')) return audioSrc
      throw new Error(name)
    }
  })
  function player(props = {}) {
    const defaults = Object.fromEntries(Object.entries(spec.properties).map(([key, val]) => [key, val.value]))
    const p = { data: { ...JSON.parse(JSON.stringify(spec.data)), ...defaults, ...props }, events: [],
      setData(values) { Object.assign(this.data, values) },
      triggerEvent(name, detail) { this.events.push({ name, detail }) }
    }
    Object.entries(spec.methods).forEach(([name, fn]) => { p[name] = fn.bind(p) })
    p.change = function (key, value) { this.data[key] = value; if (spec.observers[key]) spec.observers[key].call(this, value) }
    p.hide = () => spec.pageLifetimes.hide.call(p)
    p.show = () => spec.pageLifetimes.show.call(p)
    p.detach = () => spec.lifetimes.detached.call(p)
    spec.lifetimes.attached.call(p)
    return p
  }
  return { player, settings, bus, loads, contexts, hides, shows }
}

test('fresh device narration is off; existing explicit preference persists; unsupported keys cannot be set', () => {
  const original = global.wx
  let saved = ''
  global.wx = { getStorageSync: () => saved, setStorageSync: (_, value) => { saved = value } }
  const file = require.resolve('../plate21/module/utils/audio-settings')
  try {
    delete require.cache[file]
    const settings = require(file)
    assert.deepEqual(settings.get(), { voice: false, bgm: true })
    settings.set('voice', true)
    settings.set('toString', false)
    const copy = settings.get(); copy.voice = false
    assert.equal(settings.get().voice, true)
    delete require.cache[file]
    assert.equal(require(file).get().voice, true)
  } finally { global.wx = original; delete require.cache[file] }
})

test('all migrated resource paths and sha256 values exist; no claim of listening verification', () => {
  assert.equal(manifest.listeningVerified, false)
  for (const [id, entry] of Object.entries(manifest.entries)) {
    entry.files.forEach((file, index) => {
      const bytes = fs.readFileSync(path.join(ROOT, file))
      assert.ok(bytes.length > 0, id)
      if (entry.sha256) assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256[index], id)
    })
  }
  const map = require('../plate21/module/utils/voice-pkg-map')
  Object.values(map).forEach(file => assert.ok(fs.existsSync(path.join(ROOT, file)), file))
})

test('P1/P2/P3 keep stable ids and exact prologue pack groups; xs uses real voice-i package', () => {
  assert.deepEqual(audioSrc.clips('narr-p1'), ['/voice-a/narr-prologue-p01.mp3', '/voice-a/narr-prologue-p02.mp3'])
  assert.deepEqual(audioSrc.clips('narr-p2'), ['/voice-a/narr-prologue-p03.mp3'])
  assert.deepEqual(audioSrc.clips('narr-p3'), ['/voice-a/narr-prologue-p04.mp3', '/voice-a/narr-prologue-p05.mp3'])
  assert.equal(cue.voicePkg('narr-xs1'), 'voice-i')
  assert.equal(cue.voicePkg('narr-x1'), 'voice-f')
  assert.equal(audioSrc.packageForSrc('/voice-i/unknown.mp3'), '')
})

test('unknown, retired, and known mismatched narration are silent; optional history remains mapped', () => {
  for (const id of ['narr-missing', 'narr-s2-reveal', 'narr-s3-water', 'narr-h6', 'narr-ds2', 'narr-hg1', 'narr-fn1', 'narr-lt7']) assert.equal(audioSrc.clip(id), '', id)
  assert.match(audioSrc.clip('guide-s2-base'), /^\/voice-c\//)
  assert.equal(audioSrc.bgm('track.mp3'), '')
  assert.equal(audioSrc.bgm('http://127.0.0.1:8787/test.mp3'), '')
  assert.equal(audioSrc.bgm('https://127.0.0.1/test.mp3'), '')
  assert.equal(audioSrc.clip('constructor'), '')
  assert.equal(audioSrc.clip('totally-unknown'), '')
})

test('selected audio migration fits each project 2 MiB package budget', () => {
  function size(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
      const file = path.join(dir, entry.name)
      return sum + (entry.isDirectory() ? size(file) : fs.statSync(file).size)
    }, 0)
  }
  for (const name of fs.readdirSync(ROOT).filter(name => /^voice-[a-z]+$/.test(name))) {
    assert.ok(size(path.join(ROOT, name)) < 2 * 1024 * 1024, name)
  }
})

test('answer recordings cannot play before a solved or assisted puzzle, including physical flip', () => {
  const page = { id: 'H2', kind: 'read', narrId: 'narr-h2', revealOf: 'quiz-lantern' }
  assert.deepEqual(cue.clipsFor(page, { puzzles: {} }), [])
  assert.deepEqual(cue.clipsFor(page, { puzzles: { 'quiz-lantern': 'skipped' } }), [])
  assert.equal(cue.clipsFor(page, { puzzles: { 'quiz-lantern': 'solved' } }).length, 1)
  const flip = { id: 'H3', kind: 'puzzle', narrId: 'narr-h3', playId: 'prop-flip' }
  assert.deepEqual(cue.clipsFor(flip, { puzzles: {} }), [])
  assert.equal(cue.clipsFor(flip, { puzzles: { 'prop-flip': 'assisted' } }).length, 1)
})

test('enabling voice and legacy autoplay never start audio; manual play loads the actual package', () => {
  const h = harness(false), p = h.player({ clips: audioSrc.clips('narr-xs1'), autoplay: true })
  assert.equal(p.data.enabled, false)
  p.onMute()
  assert.equal(p.data.enabled, true)
  assert.equal(h.loads.length, 0)
  p.onToggle()
  assert.equal(h.loads[0].name, 'voice-i')
  assert.equal(h.contexts.length, 0)
  h.loads[0].success()
  assert.equal(h.contexts[0].plays, 1)
  assert.equal(p.events.at(-1).name, 'play')
})

test('changing sources pauses and stale loader or old context callbacks cannot start new content', () => {
  const h = harness(), p = h.player({ clips: audioSrc.clips('narr-p1') })
  p.onToggle(); const oldLoad = h.loads[0]
  p.change('clips', audioSrc.clips('narr-e1'))
  oldLoad.success()
  assert.equal(h.contexts.length, 0)
  p.onToggle(); h.loads[1].success()
  const oldCtx = h.contexts[0]
  p.change('clips', audioSrc.clips('narr-e2'))
  oldCtx.handlers.end(); oldCtx.handlers.error()
  assert.equal(p.data.playing, false)
  assert.equal(p.data.failed, false)
  assert.equal(h.loads.length, 2)
  assert.equal(oldCtx.destroyed, true)
})

test('sub-package failure is visible and retryable; its obsolete callbacks are ignored', () => {
  const h = harness(), p = h.player({ clips: audioSrc.clips('narr-e1') })
  p.onToggle(); h.loads[0].fail()
  assert.equal(p.data.failed, true)
  p.onToggle(); h.loads[0].success()
  assert.equal(h.contexts.length, 0)
  h.loads[1].success()
  assert.equal(p.data.failed, false)
  assert.equal(h.contexts[0].plays, 1)
  h.contexts[0].handlers.error()
  assert.equal(p.data.failed, true)
  p.onToggle(); h.loads[2].success()
  assert.equal(h.contexts[1].plays, 1)
})

test('page hide, active=false, settings off, and detach invalidate pending loads', () => {
  for (const stop of [p => p.hide(), p => p.change('active', false), (p, h) => h.settings.set('voice', false), p => p.detach()]) {
    const h = harness(), p = h.player({ clips: audioSrc.clips('narr-e1') })
    p.onToggle(); stop(p, h); h.loads[0].success()
    assert.equal(h.contexts.length, 0)
    assert.equal(p.data.playing, false)
    p.show(); p.change('active', true)
    assert.equal(h.loads.length, 1)
  }
})

test('background pauses every registered sound without automatic resume on return', () => {
  const h = harness(), p = h.player({ clips: audioSrc.clips('narr-e1') })
  p.onToggle(); h.loads[0].success()
  h.hides.slice().forEach(fn => fn())
  h.shows.slice().forEach(fn => fn())
  assert.equal(p.data.playing, false)
  assert.equal(h.contexts[0].plays, 1)
  p.onToggle()
  assert.equal(h.contexts[0].plays, 2)
})

test('playlist continues only after natural end, replay starts first segment, and stale ended is harmless', () => {
  const h = harness(), p = h.player({ clips: audioSrc.clips('narr-p1') })
  p.onToggle(); h.loads[0].success(); h.contexts[0].handlers.end()
  assert.equal(p.data.segmentIndex, 1)
  h.loads[1].success()
  assert.match(h.contexts[1].src, /p02.mp3$/)
  p.onReplay()
  h.contexts[1].handlers.end()
  assert.equal(p.data.segmentIndex, 0)
  h.loads[2].success()
  assert.match(h.contexts[2].src, /p01.mp3$/)
})

test('two pending players remain exclusive and a canceled first download cannot interrupt second', () => {
  const h = harness(), first = h.player({ clips: audioSrc.clips('narr-e1') }), second = h.player({ clips: audioSrc.clips('narr-e2') })
  first.onToggle(); second.onToggle()
  h.loads[0].success()
  assert.equal(h.contexts.length, 0)
  h.loads[1].success()
  assert.equal(second.data.playing, true)
  assert.equal(first.data.loading, false)
})
