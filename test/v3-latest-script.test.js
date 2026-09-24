'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const pages = require('../plate21/module/flow/pages')
const play = require('../plate21/module/play')
const engine = require('../plate21/module/flow/engine')
const cue = require('../plate21/module/audio/cue')
const changes = require('../docs/v3-latest-script-changes.json')
test('new Fangwai questions require their own answers and preserve honest skipping', () => {
  let run = engine.createRun()
  while (run.pageId !== 'F1') run = engine.complete(run, run.pageId)
  run = engine.complete(run, 'F1'); assert.equal(run.pageId, 'FQ1')
  assert.equal(play.submit('quiz-fang-person', { optionId: 'qianlong' }).status, 'again')
  assert.equal(play.submit('quiz-fang-person', { optionId: 'rongfei' }).status, 'solved')
  run = engine.complete(run, 'FQ1'); assert.equal(run.pageId, 'FQ2')
  assert.equal(play.submit('quiz-fang-use', { optionId: 'library' }).status, 'again')
  assert.equal(play.submit('quiz-fang-use', { optionId: 'worship' }).status, 'solved')
  const skipped = engine.skip(run, 'FQ2')
  assert.equal(skipped.pageId, 'F2'); assert.equal(skipped.puzzles['quiz-fang-use'], 'skipped')
  assert.equal(engine.canEnter(skipped, 'FR1'), false)
  run = engine.complete(run, 'FQ2'); assert.equal(run.pageId, 'FR1')
  assert.equal(engine.canEnter(run, 'FR1'), true)
})
test('old saves can continue reviewing existing Fangwai content without marking new quizzes complete', () => {
  const run = Object.assign(engine.createRun(), { pageId: 'F1', resumePageId: 'HY1', unlocked: { F1: true, F2: true, HY1: true } })
  assert.equal(engine.reviewNext(run, 'F1'), 'F2')
  assert.equal(run.puzzles['quiz-fang-person'], undefined)
  assert.equal(run.puzzles['quiz-fang-use'], undefined)
  assert.equal(engine.canEnter(run, 'FQ1'), false)
})
test('latest text is present and changed narration cannot autoplay an obsolete script', () => {
  for (const item of changes.changes) {
    if (!item.after) continue
    const node = pages.byId[item.page]
    assert.ok(node.lines.concat(node.interaction ? node.interaction.lines : []).join('').includes(item.after), item.page)
  }
  for (const page of pages.list.filter(p => p.narrationPending)) assert.deepEqual(cue.clipsFor(page, { puzzles: {} }), [], page.id)
  assert.ok(cue.clipsFor(pages.byId.X1, { puzzles: {} }).length)
  const visible = pages.list.map(p => p.lines.concat(p.interaction ? p.interaction.lines : []).join('')).join('')
  assert.doesNotMatch(visible, /这个道具上面|作为互动设计|这里可以出现一个老者|收集nfc|他们着代表|景象。。。/)
})
