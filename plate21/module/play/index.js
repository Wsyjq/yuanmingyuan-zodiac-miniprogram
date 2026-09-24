'use strict'

// 主线玩法的判定。不渲染页面，也不给出下一页。
// propPrompt 只摘 docs/飞书分页接入方案.md 里已有的提示，不描写道具外观。

const { PLAY_IDS } = require('../flow/contract')
const waterClock = require('./water-clock')

const config = require('../content/puzzles')
const CHOICES = config.choices
const DIRECTION_OPTIONS = CHOICES['quiz-direction'].map(item => item.label)
const HEIGHT_OPTIONS = CHOICES['quiz-height'].map(item => item.label)
const LANTERN_OPTIONS = CHOICES['quiz-lantern'].map(item => item.label)

function choiceIs(playId, action, answerId) {
  const choices = CHOICES[playId] || []
  if (Object.prototype.hasOwnProperty.call(action, 'optionId')) {
    return action.optionId === answerId && choices.some(function (item) { return item.id === action.optionId })
  }
  return choices.some(function (item) { return item.id === answerId && action.value === item.label })
}

const PLAYS = {
  'quiz-direction': {
    propPrompt: '打开地图再做方位题',
    fields: [{ name: 'value', type: 'choice', options: DIRECTION_OPTIONS }],
    solved: function (action) { return choiceIs('quiz-direction', action, config.answers['quiz-direction']) }
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
      return typeof action.value === 'string' && config.envelopeAnswers.includes(action.value.replace(/\s/g, ''))
    }
  },
  'quiz-lantern': {
    propPrompt: '',
    fields: [{ name: 'value', type: 'choice', options: LANTERN_OPTIONS }],
    solved: function (action) {
      return choiceIs('quiz-lantern', action, config.answers['quiz-lantern'])
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
    solved: function (action) { return choiceIs('quiz-pattern', action, config.answers['quiz-pattern']) }
  },
  'quiz-hour': {
    propPrompt: '',
    fields: [{ name: 'waterClock', type: 'water-clock' }],
    solved: function (action) { return waterClock.isComplete(action.waterClock) }
  },
  'prop-dial': {
    propPrompt: '提示使用转盘',
    fields: [{ name: 'confirmed', type: 'boolean' }],
    solved: function (action) { return action.confirmed === true }
  },
  'quiz-height': {
    propPrompt: '提示看特刊',
    fields: [{ name: 'value', type: 'choice', options: HEIGHT_OPTIONS }],
    solved: function (action) { return choiceIs('quiz-height', action, config.answers['quiz-height']) }
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

;['quiz-fang-person', 'quiz-fang-use'].forEach(id => {
  PLAYS[id] = { propPrompt: '', fields: [{ name: 'value', type: 'choice', options: CHOICES[id].map(item => item.label) }],
    solved: action => choiceIs(id, action, config.answers[id]) }
})

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
  submit: submit,
  CHOICES: CHOICES
}
