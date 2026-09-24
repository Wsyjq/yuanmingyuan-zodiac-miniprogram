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
