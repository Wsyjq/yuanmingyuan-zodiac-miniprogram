'use strict'
// 术语剧透门控：信封谜题（quiz-envelope）答案“黄花阵”揭晓前，所有显示文本不得出现该词。
const test = require('node:test')
const assert = require('node:assert/strict')
const gate = require('../plate21/module/flow/term-gate')
const pages = require('../plate21/module/flow/pages')
const { buildScreen } = require('../plate21/module/flow/screen')
const { createRun } = require('../plate21/module/flow/contract')
const progress = require('../plate21/module/progress/build')
const renderer = require('../plate21/module/utils/report-renderer')
const cards = require('../plate21/module/utils/sl-cards')

const FULL_UI = { flipped: true, arrived: true, confirmed: true, screenPart: 'activity', name: '测试员',
  relay: { status: 'ready', viewed: true, records: [{ id: 'r', status: 'published', text: '接力' }] } }

function runAt(id, opts) {
  const o = opts || {}
  const run = createRun()
  run.pageId = id; run.resumePageId = id
  for (const page of pages.list) {
    if (page.id === id) break
    run.unlocked[page.id] = true; run.visited[page.id] = true; run.completedPages[page.id] = true
    if (page.playId && !(o.skipped && page.playId === 'quiz-envelope')) run.puzzles[page.playId] = 'solved'
  }
  run.unlocked[id] = true
  if (o.visitedM2) run.visited.M2 = true
  if (o.mazeDone) run.sites = { maze: 'done' }
  return run
}

test('gate reveals the term only after the envelope answer or reaching the site', () => {
  assert.equal(gate.revealed({ puzzles: {}, visited: {} }), false)
  assert.equal(gate.revealed({ puzzles: { 'quiz-envelope': 'skipped' }, visited: {} }), false)
  assert.equal(gate.revealed({ puzzles: { 'quiz-envelope': 'solved' }, visited: {} }), true)
  assert.equal(gate.revealed({ puzzles: { 'quiz-envelope': 'assisted' }, visited: {} }), true)
  assert.equal(gate.revealed({ puzzles: { 'quiz-envelope': 'skipped' }, visited: { M2: true } }), true)
  assert.equal(gate.maskText('黄花阵图', { puzzles: {}, visited: {} }), '？？？图')
  assert.equal(gate.maskText('黄花阵图', { puzzles: { 'quiz-envelope': 'solved' }, visited: {} }), '黄花阵图')
})

test('before the envelope is solved no screen text leaks the answer term', () => {
  // M2（前往黄花阵的导航站）之前是悬念期；到达 M2 起恢复显示。
  const beforeM2 = pages.list.slice(0, pages.list.findIndex(p => p.id === 'M2'))
  for (const page of beforeM2) {
    for (const patch of [{}, FULL_UI]) {
      const model = buildScreen(runAt(page.id, { skipped: true }), Object.assign({}, FULL_UI, patch))
      assert.doesNotMatch(JSON.stringify(model), /黄花阵/, page.id + ' leaks the masked term')
    }
  }
})

test('placeholders show and text restores after the reveal or reaching the site', () => {
  const hidden = runAt('X2', { skipped: true, mazeDone: true })
  assert.match(JSON.stringify(progress.buildProgress(hidden)), /？？？/)
  assert.match(JSON.stringify(gate.maskDeep(cards.get('sl02'), hidden)), /？？？/)
  const solved = runAt('X2', { skipped: true, mazeDone: true })
  solved.puzzles['quiz-envelope'] = 'solved'
  assert.match(JSON.stringify(progress.buildProgress(solved)), /黄花阵/)
  // 诚实跳过者走到 M2 即自然知晓站名
  const arrived = runAt('X2', { skipped: true, mazeDone: true, visitedM2: true })
  assert.match(JSON.stringify(progress.buildProgress(arrived)), /黄花阵/)
  // 到达黄花阵站后正文恢复原文
  assert.match(buildScreen(runAt('H1', { visitedM2: true }), FULL_UI).lines.join(''), /到了黄花阵的入口时/)
  // X3 揭晓页只在解出后显示答案词；诚实跳过者不揭答案（术语在到达站点后恢复）
  const x3 = runAt('X3', { skipped: true })
  x3.puzzles['quiz-envelope'] = 'solved'
  assert.match(buildScreen(x3, FULL_UI).interaction.lines.join(''), /黄花阵/)
  assert.equal(buildScreen(runAt('X3', { skipped: true, visitedM2: true }), FULL_UI).interaction, null)
  assert.match(buildScreen(runAt('H3', { visitedM2: true }), FULL_UI).interaction.revealLines.join(''), /黄花阵名字由来/)
})

test('history cards, progress rows and report stations obey the same gate', () => {
  const hiddenRun = runAt('M2', { skipped: true, mazeDone: true })
  for (const key of Object.keys(cards.SL_CARDS)) {
    assert.doesNotMatch(JSON.stringify(gate.maskDeep(cards.get(key), hiddenRun)), /黄花阵/, key + ' card leaks')
  }
  assert.doesNotMatch(JSON.stringify(progress.buildProgress(hiddenRun)), /黄花阵/)
  const snapshot = { run: Object.assign(hiddenRun, { completedAt: Date.now(), name: '测试员', signedAt: Date.now() }), records: [] }
  assert.doesNotMatch(JSON.stringify(renderer.buildModel(snapshot)), /黄花阵/)
  const shownRun = runAt('M2', { skipped: true, mazeDone: true, visitedM2: true })
  const shown = { run: Object.assign(shownRun, { completedAt: Date.now(), name: '测试员', signedAt: Date.now() }), records: [] }
  assert.match(JSON.stringify(renderer.buildModel(shown)), /黄花阵/)
  assert.match(JSON.stringify(progress.buildProgress(shownRun)), /黄花阵/)
})
