const test = require('node:test')
const assert = require('node:assert/strict')
const { segments } = require('../plate21/module/flow/glossary')
test('inline history preserves punctuation and prefers longest overlapping literal terms', () => {
  const text = '西洋楼铜版图，西洋楼。西洋楼铜版图！'
  const result = segments(text, [{ key: 'short', label: '西洋楼' }, { key: 'long', label: '西洋楼铜版图' }])
  assert.equal(result.map(x => x.text).join(''), text)
  assert.deepEqual(result.filter(x => x.key).map(x => x.key), ['long', 'short', 'long'])
  assert.deepEqual(segments('无标注正文', []), [{ text: '无标注正文', key: '' }])
})

test('encountered names remain linked later and page-specific homonyms choose the correct card', () => {
  const { inlineTermsFor } = require('../plate21/module/flow/glossary')
  const encountered = [{ key: 'sl06' }, { key: 'sl04' }, { key: 'sl08' }, { key: 'sl01' }]
  assert.equal(segments('水法', inlineTermsFor('XS2', encountered))[0].key, 'sl04')
  assert.equal(segments('水法', inlineTermsFor('X1', encountered))[0].key, 'sl06')
  assert.equal(segments('墙体和亭子', inlineTermsFor('H6', encountered))[0].key, 'sl08')
  assert.equal(segments('西洋楼铜板图', inlineTermsFor('LT4', encountered))[0].key, 'sl01')
  assert.deepEqual(inlineTermsFor('HY1', []), [])
})
