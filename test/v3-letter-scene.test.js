'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
function make(cursor = 0) {
  let definition, tick
  const events = []
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../plate21/module/components/letter-scene/letter-scene.js'), 'utf8'), {
    Component: d => { definition = d }, setTimeout: fn => { tick = fn; return 1 }, clearTimeout: () => { tick = null }
  })
  const instance = Object.assign({ properties: { chapter: 'LT2', lines: ['第一句。第二句！', '下一段。仍在同一段里。'], cursor, active: true, busy: false }, data: Object.assign({}, definition.data),
    setData(patch) { Object.assign(this.data, patch) }, triggerEvent(name, detail) { events.push({ name, detail }) }
  }, definition.methods)
  definition.lifetimes.attached.call(instance)
  return { instance, definition, events, tick() { if (tick) tick() }, timer() { return tick } }
}
test('first click completes current text; next click advances; completion occurs only after last line', () => {
  const h = make(); h.tick(); assert.equal(h.instance.data.text, '第')
  h.instance.onNext(); assert.equal(h.instance.data.text, '第一句。第二句！'); assert.equal(h.events.length, 0)
  h.instance.onNext(); assert.equal(h.instance.data.index, 1); assert.equal(h.events[0].detail.index, 1)
  h.instance.onNext(); assert.equal(h.instance.data.text, '下一段。仍在同一段里。')
  h.instance.onNext(); assert.equal(h.events.at(-1).name, 'complete')
})
test('saved cursor resumes, history contains no future text, hiding and disposal cancel typing', () => {
  const h = make(1); assert.equal(h.instance.data.index, 1)
  h.instance.onHistory(); assert.deepEqual(Array.from(h.instance.data.past), ['第一句。第二句！']); assert.equal(h.timer(), null)
  h.instance.onHistory(); assert.ok(h.timer())
  h.definition.pageLifetimes.hide.call(h.instance); assert.equal(h.timer(), null)
  h.definition.lifetimes.detached.call(h.instance); assert.equal(h.instance._alive, false)
})
test('inactive or busy scene cannot advance or emit completion', () => {
  const h = make(); h.instance.properties.active = false; h.instance.onNext(); assert.equal(h.events.length, 0)
  h.instance.properties.active = true; h.instance.properties.busy = true; h.instance.onNext(); assert.equal(h.instance.data.text, '')
})

test('epilogue semantic groups preserve all prose and no paragraph is cut at punctuation or 85 characters', () => {
  const pages = require('../plate21/module/flow/pages')
  const paragraphs = require('../plate21/module/flow/letter-paragraphs')
  let total = 0
  for (const page of pages.list.filter(p => p.id.startsWith('LT'))) {
    const grouped = paragraphs.build(page, page.lines)
    assert.equal(grouped.join(''), page.lines.join(''), page.id)
    assert.equal(grouped.length, page.dialogueGroups.length, page.id)
    total += grouped.length
  }
  assert.equal(total, 18)
  const page = pages.byId.LT2
  assert.ok(paragraphs.build(page, page.lines)[0].length > 85)
  const dynamic = paragraphs.build(pages.byId.LT8, ['这份记录已保存。', ...pages.byId.LT8.lines])
  assert.equal(dynamic[0], '这份记录已保存。')
  assert.equal(dynamic.join(''), '这份记录已保存。' + pages.byId.LT8.lines.join(''))
})

test('old sentence cursor resumes inside its semantic paragraph, new paragraph cursor stays stable', () => {
  const p = require('../plate21/module/flow/letter-paragraphs')
  const lines = ['第一句。第二句！', '第三句。第四句。']
  assert.equal(p.cursor(lines, lines, 1), 0)
  assert.equal(p.cursor(lines, lines, 2), 1)
  assert.equal(p.cursor(lines, lines, 1, 2), 1)
  assert.equal(p.cursor(lines, lines, 999, 2), 1)
})
