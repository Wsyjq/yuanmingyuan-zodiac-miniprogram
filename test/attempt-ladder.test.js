'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const ladder = require('../plate21/module/utils/attempt-ladder')

test('third miss reveals and still counts as solved', () => {
  let state = { attempts: 0 }
  state = ladder.submit({ ok: false, attempts: 0, hints: ['h1', 'h2'], revealText: '答案' })
  assert.equal(state.solved, false)
  assert.equal(state.hint, 'h1')
  state = ladder.submit({ ok: false, attempts: 1, hints: ['h1', 'h2'], revealText: '答案' })
  assert.equal(state.hint, 'h2')
  state = ladder.submit({ ok: false, attempts: 2, hints: ['h1', 'h2'], revealText: '答案' })
  assert.equal(state.solved, true)
  assert.equal(state.revealed, true)
  assert.equal(state.hint, '答案')
})

test('soundscape pass rule: three hits and one miss still pass', () => {
  assert.equal(ladder.judgeMulti(['A', 'B', 'C', 'F'], ['A', 'B', 'C', 'F']), true)
  assert.equal(ladder.judgeMulti(['A', 'B', 'C'], ['A', 'B', 'C', 'F']), true)
  assert.equal(ladder.judgeMulti(['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'F']), true)
  assert.equal(ladder.judgeMulti(['A', 'B', 'D', 'E'], ['A', 'B', 'C', 'F']), false)
})
