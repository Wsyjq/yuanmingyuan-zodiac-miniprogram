'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const engine = require('../plate21/module/flow/engine')
const { screen } = require('../plate21/module/flow/screen')

test('direction choices are buttons, not a second copy in the paragraph', () => {
  const view = screen(engine.createRun(), {})
  const run = { pageId: 'E1', sites: {}, puzzles: {} }
  const e1 = screen(run, {})
  assert.equal(e1.choices.length, 4)
  assert.equal(e1.lines.some(function (line) { return line === '东北' }), false)
  assert.equal(e1.lines.some(function (line) { return line.indexOf('长春园') >= 0 }), true)
  assert.equal(view.pageId, 'P1')
})

test('flip page hides the answer until the prop is confirmed', () => {
  const run = { pageId: 'H3', sites: {}, puzzles: {} }
  const before = screen(run, {})
  assert.equal(before.holdReveal, true)
  assert.equal(before.lines.length, 0)
  assert.equal(before.primary, '我已翻开')
  const after = screen(run, { flipped: true })
  assert.equal(after.revealLines.length > 0, true)
  assert.equal(after.primary, '继续')
})

test('skipped listen does not leave the praise sentence on the envelope page', () => {
  const run = { pageId: 'X2', sites: {}, puzzles: { 'listen-nfc': 'skipped' } }
  const view = screen(run, {})
  assert.equal(view.lines.some(function (line) { return line.indexOf('如此悠扬') === 0 }), false)
  assert.equal(view.lines.some(function (line) { return line.indexOf('下一站') === 0 }), true)
})

test('nav page is the map itself and site pages keep a side button', () => {
  const navPage = screen({ pageId: 'M1', sites: {}, puzzles: {} }, {})
  assert.equal(navPage.kind, 'nav')
  assert.equal(navPage.sideMap, false)
  assert.equal(navPage.showSkip, true)
  assert.equal(navPage.skipLabel, '这次不去')
  assert.equal(navPage.nav.to.id, 'xieqiqu')
  const site = screen({ pageId: 'X1', sites: {}, puzzles: {} }, {})
  assert.equal(site.sideMap, true)
  assert.equal(site.sideProgress, true)
  const prologue = screen(engine.createRun(), {})
  assert.equal(prologue.sideMap, false)
  assert.equal(prologue.sideProgress, false)
})

test('animal pieces are toggles, not plain sentences', () => {
  const view = screen({ pageId: 'DS1', sites: {}, puzzles: {} }, {})
  assert.equal(view.toggles.length, 3)
  assert.equal(view.lines.some(function (line) { return line.indexOf('梅花鹿') === 0 }), false)
  assert.equal(view.lines.some(function (line) { return line.indexOf('水池中间') >= 0 }), true)
})
