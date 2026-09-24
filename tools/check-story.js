'use strict'
const { compile } = require('../plate21/module/flow/compile-story')
const pack = require('../plate21/module/content/story')
const props = require('../plate21/module/content/props')
const history = require('../plate21/module/content/history')
const tasks = require('../plate21/module/content/tasks')
const puzzles = require('../plate21/module/content/puzzles')
const fs = require('fs'), path = require('path')
const root = path.resolve(__dirname, '..')
try {
  const { list, byId } = compile(pack, { props, history })
  for (const [id, stable] of Object.entries(require('./story-compatibility.json'))) {
    if (!byId[id] || byId[id].kind !== stable.kind || byId[id].playId !== stable.playId) throw new Error(id + ' 已用于存档，删除/改类型/换玩法必须先制定迁移，不能直接覆盖')
  }
  if (pack.entryId !== 'P1') throw new Error('入口 P1 是存档契约，不可直接更名')
  // Specialized record/animation pages are stable capabilities, not ordinary text nodes.
  for (const [id, kind] of Object.entries({ H3: 'puzzle', H4: 'puzzle', HY1: 'puzzle', DS2: 'read', FN1: 'read', FN4: 'sign', LT1: 'letter', LT6: 'letter', LT7: 'letter', LT8: 'letter' })) {
    if (!byId[id] || byId[id].kind !== kind) throw new Error(id + ' 是特殊能力节点，删除或改变类型需同步迁移存档/能力')
  }
  for (const [key, item] of Object.entries(props)) if (!item.what || !Array.isArray(item.how) || item.how.some(x => typeof x !== 'string') || !item.returnWhen) throw new Error('道具说明不完整：' + key)
  for (const [key, card] of Object.entries(history)) {
    if (!card.title || !Array.isArray(card.layers) || !card.layers.length || card.layers.some(x => typeof x !== 'string')) throw new Error('史料格式无效：' + key)
    if (card.image && !fs.existsSync(path.join(root, card.image))) throw new Error('史料图片缺失：' + key)
  }
  for (const node of list) {
    if (node.playId && !tasks[node.playId]) throw new Error('缺少任务文案：' + node.id)
    if (node.narrId && !require('../plate21/module/audio/v3-manifest').entries[node.narrId]) console.log('提示：' + node.id + ' 无同名音频映射，请确认录音；文本不受影响。')
  }
  for (const [id, options] of Object.entries(puzzles.choices)) {
    if (!Array.isArray(options) || !options.length || options.some(x => !x.id || !x.label) || new Set(options.map(x => x.id)).size !== options.length || !options.some(x => x.id === puzzles.answers[id])) throw new Error('选项或答案无效：' + id)
  }
  if (!Array.isArray(puzzles.envelopeAnswers) || !puzzles.envelopeAnswers.length || puzzles.envelopeAnswers.some(x => typeof x !== 'string' || !x.trim())) throw new Error('拼字答案不能为空')
  console.log('OK: 剧本 ' + pack.revision + '，' + list.length + ' 节点；流程、史料、道具与答案引用完整')
} catch (err) { console.error(err.message); process.exitCode = 1 }
