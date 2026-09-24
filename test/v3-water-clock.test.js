'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const model = require('../plate21/module/play/water-clock')
const play = require('../plate21/module/play')

function doEvents(state, events) { return events.reduce(model.reduce, state) }
function question() { return model.reduce(model.createState(), { type: 'seek', time: 40 }) }
function revealing(prediction) {
  return doEvents(question(), [
    { type: 'answer14', id: 'sheep' }, { type: 'predict', id: prediction }, { type: 'confirm' }
  ])
}
function finish(state) {
  let next = state
  for (let i = 0; i < 50 && !next.completed; i++) next = model.reduce(next, { type: 'tick', seconds: 1 })
  return next
}

test('initial observation stops before the answer and cannot seek past the question', function () {
  const initial = model.createState()
  assert.equal(initial.playing, false)
  assert.equal(model.stage(initial), 'observe')
  let s = model.reduce(initial, { type: 'play' })
  for (let i = 0; i < 25; i++) s = model.reduce(s, { type: 'tick', seconds: 1 })
  assert.equal(s.time, 19.9)
  assert.equal(s.playing, false)
  assert.equal(model.stage(s), 'hour14')
  assert.equal(model.reduce(s, { type: 'seek', time: 40 }).time, 19.9)
  assert.deepEqual(model.scene(s.time).active, [])
  assert.deepEqual(initial, model.createState(), 'reducers must not mutate persisted input')
})

test('only a valid sheep selection passes 14h; repeated mistakes never auto-pass', function () {
  let s = question()
  for (let i = 0; i < 5; i++) s = model.reduce(s, { type: 'answer14', id: 'horse' })
  assert.equal(s.attempts14, 5)
  assert.equal(s.answer14, '')
  assert.equal(model.stage(s), 'hour14')
  s = model.reduce(s, { type: 'answer14', id: 'not sheep' })
  assert.equal(s.attempts14, 5, 'unknown IDs are ignored')
  s = model.reduce(s, { type: 'answer14', id: 'sheep' })
  assert.equal(model.stage(s), 'prediction')
  assert.equal(model.isComplete(s), false)
})

test('all three noon predictions unlock revelation, completion requires its end', function () {
  model.PREDICTIONS.forEach(function (option) {
    const s = revealing(option.id)
    assert.equal(s.prediction, option.id)
    assert.equal(s.time, 20)
    assert.equal(model.stage(s), 'reveal')
    assert.equal(play.submit('quiz-hour', { waterClock: s }).status, 'again')
    assert.equal(model.reduce(s, { type: 'seek', time: 40 }).time, 20)
    const done = finish(s)
    assert.equal(done.time, 40)
    assert.equal(done.playing, false)
    assert.equal(play.submit('quiz-hour', { waterClock: done }).status, 'solved')
  })
})

test('missing prediction and old free-text zodiac pairs do not complete the clock', function () {
  let s = model.reduce(question(), { type: 'answer14', id: 'sheep' })
  s = model.reduce(s, { type: 'confirm' })
  assert.equal(s.revealStarted, false)
  s = model.reduce(s, { type: 'predict', id: 'all and none' })
  assert.equal(s.prediction, '')
  assert.equal(play.submit('quiz-hour', { hour14: '羊', noon: '马' }).status, 'again')
  assert.equal(model.isComplete({ completed: true }), false)
  assert.equal(model.isComplete({ answer14: 'horse', prediction: 'all', revealStarted: true, completed: true }), false)
})

test('restore keeps answer, prediction and reveal position, but never autoplays', function () {
  let s = revealing('none')
  for (let i = 0; i < 9; i++) s = model.reduce(s, { type: 'tick', seconds: 1 })
  const restored = model.createState(JSON.parse(JSON.stringify(s)))
  assert.equal(restored.time, 29)
  assert.equal(restored.prediction, 'none')
  assert.equal(restored.answer14, 'sheep')
  assert.equal(restored.playing, false)
  assert.equal(model.stage(restored), 'reveal')
  assert.equal(finish(model.reduce(restored, { type: 'play' })).completed, true)
  const malicious = model.createState({ time: Infinity, playing: true, revealStarted: true })
  assert.equal(malicious.time, 0)
  assert.equal(malicious.revealStarted, false)
})

test('pause prevents time advance; full seeking and replay are available only after completion', function () {
  const paused = model.reduce(revealing('all'), { type: 'pause' })
  assert.equal(model.reduce(paused, { type: 'tick', seconds: 1 }).time, 20)
  const done = finish(revealing('all'))
  const replay = model.reduce(done, { type: 'replay', noon: true })
  assert.equal(replay.time, 24)
  assert.equal(replay.completed, true)
  assert.equal(model.reduce(replay, { type: 'seek', time: 35 }).time, 35)
  assert.equal(model.createState(replay).completed, true)
})

test('static mode shows the same sequence and cannot bypass either question', function () {
  let s = model.reduce(model.createState(), { type: 'static' })
  const times = []
  for (let i = 0; i < 3; i++) { s = model.reduce(s, { type: 'staticNext' }); times.push(s.time) }
  assert.deepEqual(times, [8, 12, 19.9])
  assert.equal(model.reduce(s, { type: 'staticNext' }).completed, false)
  s = doEvents(s, [{ type: 'answer14', id: 'sheep' }, { type: 'predict', id: 'horse' }, { type: 'confirm' }])
  assert.equal(s.playing, false)
  const revealTimes = []
  for (let i = 0; i < 3; i++) { s = model.reduce(s, { type: 'staticNext' }); revealTimes.push(s.time) }
  assert.deepEqual(revealTimes, [26, 32, 40])
  assert.equal(s.completed, true)
  assert.equal(model.scene(32).active.length, 12)
})

test('scene maps the prototype milestones and keeps noon hidden during observation', function () {
  assert.equal(model.scene(0).shot, 'paint')
  assert.equal(model.scene(5).shot, 'wide')
  assert.deepEqual(model.scene(8).active, [3])
  assert.deepEqual(model.scene(12).active, [4])
  assert.deepEqual(model.scene(20).active, [7])
  assert.equal(model.scene(28).lit.length, 6)
  assert.equal(model.scene(31).lit.length, 12)
  assert.equal(model.scene(31).active.length, 0)
  assert.equal(model.scene(32).active.length, 12)
})

test('choice IDs and exact legacy labels work; negation, mixed answers and ID fallback do not', function () {
  const correct = { 'quiz-direction': 'ne', 'quiz-lantern': 'lantern', 'quiz-height': 'high', 'quiz-pattern': 'wanzi' }
  Object.keys(correct).forEach(function (id) {
    play.CHOICES[id].forEach(function (option) {
      const expected = option.id === correct[id] ? 'solved' : 'again'
      assert.equal(play.submit(id, { optionId: option.id }).status, expected)
      assert.equal(play.submit(id, { value: option.label }).status, expected)
    })
  })
  assert.equal(play.submit('quiz-lantern', { value: '不是灯会' }).status, 'again')
  assert.equal(play.submit('quiz-lantern', { value: '灯会或者军事防御' }).status, 'again')
  assert.equal(play.submit('quiz-direction', { optionId: 'invalid', value: '东北' }).status, 'again')
  assert.equal(play.submit('prop-dial', { confirmed: true }).status, 'solved')
  assert.equal(play.submit('prop-dial', {}).status, 'again')
  assert.equal(play.submit('quiz-hour', { skip: true }).status, 'skipped')
})

function componentHarness(saved) {
  const filename = path.join(__dirname, '../plate21/module/components/water-clock/water-clock.js')
  const ownRequire = createRequire(filename)
  let definition
  const fakeBus = { register: function () {}, unregister: function () {}, activate: function () {}, release: function () {}, isActive: function () { return false }, stopKind: function () {} }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    Component: function (value) { definition = value },
    require: function (name) { return name.includes('audio-bus') ? fakeBus : ownRequire(name) },
    setTimeout: setTimeout, clearTimeout: clearTimeout, wx: {}
  }, { filename: filename })
  const events = [], frames = new Map(), cancelled = []
  let nextFrame = 1
  const instance = {
    data: JSON.parse(JSON.stringify(definition.data)), properties: { state: saved, active: true },
    setData: function (patch) { Object.assign(this.data, patch) },
    triggerEvent: function (name, detail) { events.push({ name: name, detail: detail }) }
  }
  Object.keys(definition.methods).forEach(function (name) { instance[name] = definition.methods[name].bind(instance) })
  definition.lifetimes.attached.call(instance)
  instance._canvas = {
    requestAnimationFrame: function (fn) { const id = nextFrame++; frames.set(id, fn); return id },
    cancelAnimationFrame: function (id) { cancelled.push(id); frames.delete(id) }
  }
  instance._paint = function () {}
  return { instance: instance, definition: definition, events: events, frames: frames, cancelled: cancelled }
}

test('component emits complete only once, after the final frame; echo does not stop playback', function () {
  const s = revealing('horse'); s.time = 39.98
  const h = componentHarness(s), c = h.instance
  c._dispatch({ type: 'play' })
  h.definition.observers.state.call(c, h.events[0].detail.state)
  assert.equal(c._state.playing, true)
  function frame(now) { const pair = h.frames.entries().next().value; h.frames.delete(pair[0]); pair[1](now) }
  frame(1000); frame(1040)
  assert.equal(h.events.filter(function (e) { return e.name === 'complete' }).length, 1)
  assert.equal(c._state.completed, true)
  c._dispatch({ type: 'seek', time: 40 })
  assert.equal(h.events.filter(function (e) { return e.name === 'complete' }).length, 1)
  const restored = componentHarness(c._state)
  assert.equal(restored.events.length, 0, 'restoring a completion does not advance the host again')
})

test('hiding or detaching pauses and persists, cancels the frame, and destroys sound', function () {
  const h = componentHarness(revealing('all')), c = h.instance
  c._dispatch({ type: 'play' })
  let stopped = 0, destroyed = 0
  c._audio = { stop: function () { stopped++ }, destroy: function () { destroyed++ } }
  c._audioPlayer = {}
  h.definition.pageLifetimes.hide.call(c)
  assert.equal(c._state.playing, false)
  assert.equal(h.frames.size, 0)
  assert.equal(stopped, 1); assert.equal(destroyed, 1)
  assert.equal(h.events[h.events.length - 1].detail.state.playing, false)
  h.definition.pageLifetimes.show.call(c)
  assert.equal(c._state.playing, false)
  h.definition.lifetimes.detached.call(c)
  assert.equal(c._alive, false)
  assert.equal(c._canvas, null)
})

test('canvas failure switches to an operable static sequence without claiming completion', function () {
  const h = componentHarness(revealing('none')), c = h.instance
  c._fallback('failed')
  assert.equal(c.data.loading, false)
  assert.equal(c._state.staticMode, true)
  assert.equal(c._state.completed, false)
  c.onPlay(); c.onPlay(); c.onPlay()
  assert.equal(c._state.completed, true)
  assert.equal(h.events.filter(function (e) { return e.name === 'complete' }).length, 1)
})

test('inactive hosts cannot accidentally advance a hidden clock', function () {
  const h = componentHarness(question()), c = h.instance
  c.properties.active = false
  c.onAnswer14({ currentTarget: { dataset: { id: 'sheep' } } })
  assert.equal(c._state.answer14, '')
  assert.equal(h.events.length, 0)
})
