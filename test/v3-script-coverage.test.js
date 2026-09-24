'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fixture = require('./fixtures/v3-script-coverage.json')
const pages = require('../plate21/module/flow/pages')
const { buildScreen } = require('../plate21/module/flow/screen')
const { createRun } = require('../plate21/module/flow/contract')
const normalized = text => String(text).replace(/\s/g, '')
function visibleAt(id, extra) {
  const run = Object.assign(createRun(), { pageId: id, resumePageId: id, completedAt: 1790270000000, letterAvailable: true })
  for (const page of pages.list) if (page.playId) run.puzzles[page.playId] = 'solved'
  return buildScreen(Object.assign(run, extra), { flipped: true, arrived: true, relay: { status: 'ready', viewed: true, records: [{ id: 'real', status: 'published', text: '真实记录' }] } })
}
test('every non-bracketed main-script paragraph has a verified visible destination', () => {
  assert.equal(fixture.paragraphs.filter(p => p.text).length, 165)
  for (const p of fixture.paragraphs) {
    if (!p.text) { assert.equal(p.destination.field, 'program-marker'); continue }
    if (p.displayText === '') continue // User explicitly removed stage directions; original remains in the source fixture.
    const expected = p.displayText == null ? p.text : p.displayText
    const { page, field } = p.destination
    const screen = visibleAt(page)
    if (field === 'choices') {
      const labels = page === 'H1' ? p.text.split(/[A-D]\./).filter(Boolean) : [p.text.replace(/^[a-d]\s*/, '')]
      for (const label of labels) assert.ok(screen.choices.some(choice => normalized(choice.label) === normalized(label)), 'missing option ' + label)
      continue
    }
    if (field === 'signature') {
      assert.equal(screen.signature.date, screen.completedDate)
      assert.equal(screen.signature.edition, '暂无全局版号')
      assert.ok(screen.signature.name)
      continue
    }
    if (field === 'document-section') { assert.ok(screen.sectionTitle); continue }
    const actual = field === 'sectionTitle' ? screen.sectionTitle : field === 'interaction' ? screen.interaction.title + screen.interaction.lines.join('\n') : screen.lines.join('\n')
    assert.ok(normalized(actual).includes(normalized(expected)), 'paragraph ' + p.paragraph + ' → ' + page + '.' + field + ': ' + p.text)
    assert.doesNotMatch(actual, /【|】/)
  }
})
test('restored passages retain action gates without being discarded or replacing the ending', () => {
  const h4 = visibleAt('H4')
  for (const phrase of ['西式穹顶', '檐角立兽', '莲花基座', '双天鹅']) assert.match(h4.interaction.lines.join(''), new RegExp(phrase === '檐角立兽' ? '檐角位置' : phrase))
  assert.match(visibleAt('H2').interaction.lines.join(''), /最先到达中心的人会得到皇帝的赏赐/)
  assert.match(visibleAt('DS2').interaction.lines.join(''), /鹿角喷水/)
  assert.match(visibleAt('FN1').lines.join(''), /密集交错的线条/)
  assert.match(visibleAt('FN2').lines.join(''), /如果你看到这里/)
  assert.doesNotMatch(visibleAt('FN4', { completedAt: null }).lines.join(''), /生成完成/)
  assert.match(visibleAt('FN4').lines.join(''), /西洋楼铜版图/)
  assert.match(visibleAt('LT8').lines.join(''), /你留下的内容，在经过审核之后，也许会出现在/)
})

test('all 17 history cards preserve the source layers and figure captions', () => {
  const cards = require('../plate21/module/utils/sl-cards')
  assert.equal(new Set(fixture.history.map(p => p.key)).size, 17)
  for (const p of fixture.history) {
    const card = cards.get(p.key)
    assert.ok(normalized(card.layers.join('') + (card.caption || '')).includes(normalized(p.text)), 'history paragraph ' + p.paragraph + ' → ' + p.key)
  }
})
