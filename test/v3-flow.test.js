'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const engine = require('../plate21/module/flow/engine')
const { byId } = require('../plate21/module/flow/pages')
const { SITE_IDS } = require('../plate21/module/flow/contract')
const { buildProgress } = require('../plate21/module/progress/build')

function advance(run, target) {
  let next = run
  for (let i = 0; next.pageId !== target && i < 80; i++) next = engine.complete(next, next.pageId)
  assert.equal(next.pageId, target)
  return next
}
test('v3 starts with one unlocked node; arbitrary page and reveal deep links cannot jump ahead', () => {
  const run = engine.createRun()
  assert.equal(SITE_IDS.length, 8)
  assert.equal(run.resumePageId, 'P1')
  for (const id of ['E1', 'FN4', 'LT1', 'X3']) {
    assert.equal(engine.canEnter(run, id), false)
    assert.throws(() => engine.enter(run, id), { code: 'PAGE_LOCKED' })
  }
  assert.throws(() => engine.complete(run, 'E1'), { code: 'NOT_CURRENT_PAGE' })
})
test('transitions preserve nested custom fields and never mutate the caller', () => {
  const run = engine.createRun()
  run.uiByPage.P1 = { scrollTop: 120, text: '草稿' }
  run.extra = { nested: [{ saved: true }] }
  const before = JSON.stringify(run)
  const next = engine.complete(run, 'P1')
  assert.equal(next.resumePageId, 'P2')
  assert.deepEqual(next.extra, run.extra)
  next.extra.nested[0].saved = false
  assert.equal(JSON.stringify(run), before)
  assert.equal(next.uiByPage.P1.text, '草稿')
})
test('review never demotes a completed station or changes the resume point', () => {
  const run = advance(engine.createRun(), 'M2')
  assert.equal(run.sites.xieqiqu, 'done')
  const reviewed = engine.enter(run, 'X1')
  const moved = engine.complete(reviewed, 'X1')
  assert.equal(moved.pageId, 'X2')
  assert.equal(moved.resumePageId, 'M2')
  assert.equal(moved.sites.xieqiqu, 'done')
  assert.deepEqual(moved.puzzles, run.puzzles)
  assert.equal(engine.resume(moved).pageId, 'M2')
  const row = buildProgress(reviewed).rows.find(r => r.id === 'xieqiqu')
  assert.equal(row.state, '已看完')
})
test('skipped site remains skipped during review and its never-visited interior stays locked', () => {
  const atNav = advance(engine.createRun(), 'M1')
  const skipped = engine.skip(atNav, 'M1')
  assert.equal(skipped.resumePageId, 'M2')
  assert.equal(skipped.sites.xieqiqu, 'skipped')
  const review = engine.enter(skipped, 'M1')
  assert.equal(engine.complete(review, 'M1').pageId, 'M1')
  assert.equal(engine.complete(review, 'M1').sites.xieqiqu, 'skipped')
  assert.equal(engine.canEnter(review, 'X1'), false)
})
test('skipped puzzle cannot disclose its reveal when revisited', () => {
  const skipped = engine.skip(advance(engine.createRun(), 'X2'), 'X2')
  assert.equal(skipped.pageId, 'M2')
  assert.equal(skipped.puzzles['quiz-envelope'], 'skipped')
  assert.equal(engine.canEnter(skipped, 'X3'), false)
  const review = engine.enter(skipped, 'X2')
  assert.equal(engine.complete(review, 'X2').pageId, 'X2')
  assert.equal(engine.complete(review, 'X2').puzzles['quiz-envelope'], 'skipped')
  assert.equal(engine.skip(review, 'X2').resumePageId, 'M2')
})
test('sign page never auto-opens letter; verified letter finishes without an empty route', () => {
  let run = advance(engine.createRun(), 'FN4')
  assert.equal(engine.complete(run, 'FN4').pageId, 'FN4')
  assert.throws(() => engine.openLetter(run), { code: 'LETTER_LOCKED' })
  run.completedAt = 1000
  run.letterAvailable = true
  run = engine.openLetter(run)
  assert.equal(run.resumePageId, 'LT1')
  run = advance(run, 'LT8')
  const done = engine.complete(run, 'LT8')
  assert.equal(done.pageId, 'LT8')
  assert.equal(done.resumePageId, 'LT8')
  assert.equal(done.letterRead, true)
})
test('progress exposes only unlocked destinations and separates review from current progress', () => {
  const first = buildProgress(engine.createRun())
  assert.equal(first.openPageId('hugo'), '')
  assert.equal(first.openPageId('gate', 'quiz-direction'), '')
  assert.equal(first.openPageId('prologue'), 'P1')
  const run = advance(engine.createRun(), 'H1')
  const view = buildProgress(engine.enter(run, 'P2'), byId)
  assert.equal(view.resumePageId, 'H1')
  assert.equal(view.viewingPageId, 'P2')
  assert.equal(view.isReview, true)
  assert.equal(view.rows.find(r => r.id === 'maze').state, '进行中')
  assert.equal(view.openPageId('maze', 'quiz-lantern'), 'H1')
  assert.equal(view.openPageId('maze', 'quiz-hour'), '')
})
test('assisted solves unlock the reveal but remain visibly assisted on review', () => {
  const atPuzzle = advance(engine.createRun(), 'X2')
  const assisted = engine.complete(atPuzzle, 'X2', { assisted: true })
  assert.equal(assisted.pageId, 'X3')
  assert.equal(assisted.puzzles['quiz-envelope'], 'assisted')
  const view = buildProgress(assisted)
  assert.equal(view.rows.find(r => r.id === 'xieqiqu').puzzles.find(p => p.playId === 'quiz-envelope').state, '协助完成')
  const reviewed = engine.enter(assisted, 'X2')
  assert.equal(engine.complete(reviewed, 'X2').puzzles['quiz-envelope'], 'assisted')
})
