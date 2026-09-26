'use strict'
const assert = require('node:assert/strict')
const test = require('node:test')

const guard = require('../plate21/module/utils/input-guard')

test('live cleaning strips control and invisible characters without touching spacing', () => {
  assert.equal(guard.cleanLive('黄\u200B花\uFEFF阵', {}), '黄花阵')
  assert.equal(guard.cleanLive('a\u0000b\u0007c\u001Fd', {}), 'abcd')
  assert.equal(guard.cleanLive(' 黄花阵 ', {}), ' 黄花阵 ')
  assert.equal(guard.cleanLive('黄\u202E花阵', {}), '黄花阵')
})

test('live cleaning keeps line breaks only in multiline fields and normalizes NFC', () => {
  assert.equal(guard.cleanLive('黄花\n阵', {}), '黄花阵')
  assert.equal(guard.cleanLive('黄花\t阵', {}), '黄花阵')
  assert.equal(guard.cleanLive('黄花\n阵', { multiline: true }), '黄花\n阵')
  assert.equal(guard.cleanLive('a\r\nb\rc', { multiline: true }), 'a\nb\nc')
  assert.equal(guard.cleanLive('e\u0301', {}), '\u00e9')
})

test('clamp reports over-limit input instead of silently cutting it', () => {
  const guarded = guard.clampText('黄'.repeat(520), { max: guard.LIMITS.text, multiline: true })
  assert.equal(guarded.truncated, true)
  assert.equal(Array.from(guarded.text).length, 500)
  assert.equal(guarded.length, 500)
  assert.equal(guard.clampText('黄花阵', { max: guard.LIMITS.text }).truncated, false)
  assert.equal(guard.clampText('', { max: guard.LIMITS.text }).empty, true)
  assert.equal(guard.clampText('  \u200B ', { max: guard.LIMITS.text }).empty, true)
})

test('clamp counts code points so emoji cannot inflate the visible limit', () => {
  const emoji = '\u{1F600}'
  const guarded = guard.clampText(emoji + emoji + emoji, { max: 2, multiline: true })
  assert.equal(guarded.text, emoji + emoji)
  assert.equal(guarded.truncated, true)
  assert.equal(guard.count(emoji + emoji), 2)
  assert.equal(emoji.length, 2, 'UTF-16 units differ from code points')
})

test('clamp trims edges and collapses extra blank lines only in multiline text', () => {
  assert.equal(guard.clampText('  黄花阵  ', { max: 10, multiline: false }).text, '黄花阵')
  assert.equal(guard.clampText('a\n\n\n\nb', { max: 10, multiline: true }).text, 'a\n\nb')
  assert.equal(guard.clampText('a  b', { max: 10, multiline: false }).text, 'a  b')
})

test('field limits keep the agreed caps for name, answer and long text', () => {
  assert.equal(guard.LIMITS.name, 40)
  assert.equal(guard.LIMITS.answer, 10)
  assert.equal(guard.LIMITS.text, 500)
  assert.equal(guard.sanitizeName('名'.repeat(45)), '名'.repeat(40))
  assert.equal(guard.sanitizeName('  考察\u200B者  '), '考察者')
  assert.equal(guard.sanitizeName(''), '')
})

test('truncate notice names the field and the limit', () => {
  const notice = guard.truncateNotice('接力文字', guard.LIMITS.text)
  assert.ok(notice.includes('接力文字'))
  assert.ok(notice.includes('500'))
})

test('rate gate blocks bursts and forgets them after the window', async () => {
  const gate = guard.createRateGate({ max: 3, intervalMs: 40 })
  assert.equal(gate(), true)
  assert.equal(gate(), true)
  assert.equal(gate(), true)
  assert.equal(gate(), false)
  assert.equal(gate(), false)
  await new Promise((resolve) => setTimeout(resolve, 50))
  assert.equal(gate(), true)
})
