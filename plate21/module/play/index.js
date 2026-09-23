'use strict'

// 主线十一道玩法的判定。不渲染页面，也不给出下一页。
// propPrompt 只摘 docs/飞书分页接入方案.md 里已有的提示，不描写道具外观。

const { PLAY_IDS } = require('../flow/contract')

const DIRECTION_OPTIONS = ['西北', '东南', '西南', '东北']
const HEIGHT_OPTIONS = ['高', '低']
const LANTERN_OPTIONS = [
  '作为军事防御工事，用于迷惑和阻挡入侵的敌人。',
  '作为皇家藏书楼，利用复杂路径保护珍贵书籍。',
  '作为中秋节的皇家娱乐场所，举办“迷宫灯会”游戏。',
  '作为皇子们的秘密议事厅，以防外人窃听。'
]

const PLAYS = {
  'quiz-direction': {
    propPrompt: '打开地图再做方位题',
    fields: [{ name: 'value', type: 'choice', options: DIRECTION_OPTIONS }],
    solved: function (action) { return action.value === '东北' }
  },
  'listen-nfc': {
    propPrompt: '提示用音乐贴片',
    fields: [{ name: 'played', type: 'boolean' }],
    solved: function (action) { return action.played === true }
  },
  'quiz-envelope': {
    propPrompt: '提示：信封的封口处和信的背面都有一半的字，拼接起来看一下！',
    fields: [{ name: 'value', type: 'text' }],
    solved: function (action) {
      return typeof action.value === 'string' && action.value.replace(/\s/g, '') === '黄花阵'
    }
  },
  'quiz-lantern': {
    propPrompt: '',
    fields: [{ name: 'value', type: 'choice', options: LANTERN_OPTIONS }],
    solved: function (action) {
      return typeof action.value === 'string' && action.value.includes('灯会')
    }
  },
  'prop-flip': {
    propPrompt: '提示翻黄花阵图',
    fields: [{ name: 'confirmed', type: 'boolean' }],
    solved: function (action) { return action.confirmed === true }
  },
  'photo-pavilion': {
    propPrompt: '',
    fields: [{ name: 'count', type: 'number' }],
    solved: function (action) {
      return typeof action.count === 'number' && Number.isFinite(action.count) && action.count >= 1
    }
  },
  'quiz-pattern': {
    propPrompt: '选出看到的花纹',
    fields: [{ name: 'value', type: 'choice' }],
    solved: function (action) { return action.value === '万字纹' }
  },
  'quiz-hour': {
    propPrompt: '',
    fields: [
      { name: 'hour14', type: 'text' },
      { name: 'noon', type: 'text' }
    ],
    solved: function (action) { return action.hour14 === '羊' && action.noon === '马' }
  },
  'prop-dial': {
    propPrompt: '提示使用转盘',
    fields: [{ name: 'confirmed', type: 'boolean' }],
    solved: function (action) { return action.confirmed === true }
  },
  'quiz-height': {
    propPrompt: '提示看特刊',
    fields: [{ name: 'value', type: 'choice', options: HEIGHT_OPTIONS }],
    solved: function (action) { return action.value === '高' }
  },
  'place-animals': {
    propPrompt: '提示对照《大水法南面》',
    fields: [
      { name: 'deer', type: 'boolean' },
      { name: 'dogs', type: 'boolean' },
      { name: 'beasts', type: 'boolean' }
    ],
    solved: function (action) { return !!(action.deer && action.dogs && action.beasts) }
  }
}

if (Object.keys(PLAYS).length !== PLAY_IDS.length) {
  throw new Error('play table does not match PLAY_IDS')
}
for (let i = 0; i < PLAY_IDS.length; i += 1) {
  if (!PLAYS[PLAY_IDS[i]]) throw new Error('missing play: ' + PLAY_IDS[i])
}

function playById(playId) {
  if (PLAY_IDS.indexOf(playId) < 0 || !PLAYS[playId]) {
    throw new Error('unknown playId')
  }
  return PLAYS[playId]
}

function cloneFields(fields) {
  return fields.map(function (field) {
    const copy = { name: field.name, type: field.type }
    if (field.options) copy.options = field.options.slice()
    return copy
  })
}

function asAction(action) {
  if (!action || typeof action !== 'object') return {}
  return action
}

function start(playId) {
  const play = playById(playId)
  return {
    playId: playId,
    propPrompt: play.propPrompt,
    fields: cloneFields(play.fields)
  }
}

function submit(playId, action) {
  const play = playById(playId)
  const given = asAction(action)
  if (given.skip === true) return { status: 'skipped' }
  return { status: play.solved(given) ? 'solved' : 'again' }
}

module.exports = {
  start: start,
  submit: submit
}
