'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')

const cue = require('../plate21/module/audio/cue')

test('M1 不播', () => {
  const page = { id: 'M1', kind: 'nav', narrId: 'narr-m1' }
  assert.equal(cue.narrIdFor(page), '')
  assert.equal(cue.shouldPlay(page, { puzzles: {} }), false)
  assert.equal(cue.soundscapeFor(page), '')
})

test('FN4 不播', () => {
  const page = { id: 'FN4', kind: 'sign', narrId: 'narr-fn4' }
  assert.equal(cue.narrIdFor(page), '')
  assert.equal(cue.shouldPlay(page, { puzzles: {} }), false)
  assert.equal(cue.soundscapeFor(page), '')
})

test('普通 read 页返回 narr-p1 这类 id', () => {
  const page = { id: 'P1', kind: 'read', narrId: 'narr-p1' }
  assert.equal(cue.narrIdFor(page), 'narr-p1')
  assert.equal(cue.shouldPlay(page, { puzzles: {} }), true)
  assert.equal(cue.narrIdFor({ id: 'E2', kind: 'read' }), '')
  assert.equal(cue.shouldPlay({ id: 'E2', kind: 'read', narrId: '' }, { puzzles: {} }), false)
})

test('revealOf 的题已 skipped 时不播', () => {
  const page = {
    id: 'H2',
    kind: 'read',
    narrId: 'narr-h2',
    revealOf: 'quiz-lantern'
  }
  assert.equal(cue.narrIdFor(page), 'narr-h2')
  assert.equal(cue.shouldPlay(page, { puzzles: { 'quiz-lantern': 'skipped' } }), false)
  assert.equal(cue.shouldPlay(page, { puzzles: { 'quiz-lantern': 'solved' } }), true)
})

test('listen-nfc 有声景', () => {
  const page = {
    id: 'X1',
    kind: 'puzzle',
    playId: 'listen-nfc',
    narrId: 'narr-x1'
  }
  assert.equal(cue.soundscapeFor(page), 'xieqiqu-nfc')
  assert.equal(cue.narrIdFor(page), 'narr-x1')
  assert.notEqual(cue.soundscapeFor(page), cue.narrIdFor(page))
  assert.equal(cue.soundscapeFor({ id: 'P1', kind: 'read', narrId: 'narr-p1' }), '')
  assert.equal(cue.shouldPlay(page, { puzzles: {} }), true)
})
