'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { eligible, createCountdown } = require('../plate21/module/audio/listen-flow')
const base = () => ({ listenMode: 'listen', voiceEnabled: true, pageVisible: true,
  screen: { screenPart: 'story', kind: 'read' }, narrClips: ['narr.mp3'] })
test('only narrated story screens can auto-progress, never gameplay, navigation or forms', () => {
  assert.equal(eligible(base()), true)
  for (const patch of [{ listenMode: 'read' }, { voiceEnabled: false }, { pageVisible: false }, { busy: true },
    { drawer: 'history' }, { restartScreen: true }, { showModeChoice: true }, { review: true }, { error: 'failure' }, { narrClips: [] },
    { screen: { screenPart: 'activity', kind: 'puzzle' } }, { screen: { screenPart: 'story', kind: 'nav' } },
    { screen: { screenPart: 'story', kind: 'sign' } }]) assert.equal(!!eligible(Object.assign(base(), patch)), false)
})
test('three idle seconds advance exactly once; touch, hidden state and stale callbacks cancel', () => {
  let valid = true, count = 0, current = 0, id = 0
  const jobs = new Map(), values = []
  const countdown = createCountdown({ set(fn, delay) { assert.equal(delay, 1000); jobs.set(++id, fn); return id },
    clear(key) { jobs.delete(key) }, valid: () => valid, update: n => { current = n; values.push(n) }, advance: () => count++ })
  function tick() { const [key, fn] = jobs.entries().next().value; jobs.delete(key); fn() }
  countdown.start(); assert.equal(current, 3)
  tick(); assert.equal(current, 2); tick(); assert.equal(current, 1); assert.equal(count, 0)
  tick(); assert.equal(count, 1); assert.equal(jobs.size, 0)
  countdown.start(); const stale = [...jobs.values()][0]; countdown.cancel(); stale()
  assert.equal(count, 1); assert.equal(current, 0)
  countdown.start(); stale(); assert.equal(current, 3); valid = false; tick(); assert.equal(count, 1); assert.equal(jobs.size, 0)
})
