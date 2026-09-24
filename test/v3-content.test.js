'use strict'
const test = require('node:test'), assert = require('node:assert/strict')
const pack = require('../plate21/module/content/story')
const { compile } = require('../plate21/module/flow/compile-story')
const { createEngine } = require('../plate21/module/flow/engine')
const catalogs = { history: require('../plate21/module/content/history'), props: require('../plate21/module/content/props') }
function copy(x) { return JSON.parse(JSON.stringify(x)) }
test('editor inserts a reading paragraph/page and changes flow without modifying engine or page UI', () => {
  const edited = copy(pack), first = edited.nodes.find(n => n.id === 'P1')
  const node = { id: 'P1_note', kind: 'read', title: '补充档案', lines: ['新剧情段落'], next: first.next, terms: [{ key: 'sl01', label: '铜版图' }], props: ['map'] }
  first.next = node.id; edited.nodes.splice(1, 0, node)
  const table = compile(edited, catalogs), engine = createEngine(table)
  let run = engine.complete(engine.createRun(), 'P1')
  assert.equal(run.pageId, 'P1_note')
  assert.deepEqual(table.byId[run.pageId].lines, ['新剧情段落'])
  assert.equal(table.byId[run.pageId].terms[0].key, 'sl01')
  run = engine.complete(run, run.pageId)
  assert.equal(run.pageId, 'P2')
  assert.equal(pack.nodes[0].next, 'P2')
})
test('bad editorial links, duplicate IDs, loops and missing content references fail before release', () => {
  for (const [change, pattern] of [
    [p => { p.nodes[0].next = 'missing' }, /不存在/],
    [p => { p.nodes.push(copy(p.nodes[0])) }, /重复/],
    [p => { p.nodes[1].next = 'P1' }, /循环/],
    [p => { p.nodes[0].terms = [{ key: 'missing', label: '词' }] }, /无效史料/],
    [p => { p.nodes[0].props = ['missing'] }, /未知道具/],
    [p => { p.nodes[0].lines = '一段文字' }, /文字数组/]
  ]) { const p = copy(pack); change(p); assert.throws(() => compile(p, catalogs), pattern) }
})
test('text-only revision preserves old run progress, completed dates and personal records', () => {
  const edited = copy(pack); edited.revision = 'next-copy'; edited.nodes[1].lines = ['修订正文']
  const engine = createEngine(compile(edited, catalogs))
  const run = engine.complete(engine.createRun(), 'P1')
  run.completedAt = 123456789; run.extra = { photo: '/saved/mine.jpg' }; run.uiByPage.P2 = { scrollTop: 30 }
  const resumed = engine.resume(run)
  assert.equal(resumed.pageId, 'P2'); assert.equal(resumed.completedAt, 123456789)
  assert.deepEqual(resumed.extra, run.extra); assert.deepEqual(resumed.uiByPage, run.uiByPage)
})
