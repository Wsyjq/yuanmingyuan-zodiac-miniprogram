'use strict'

// 把页表收成屏幕上的块。选项只出现一次，并且是按钮，不写进正文。
const pages = require('./pages')
const play = require('../play/index')
const nav = require('../capabilities/map/nav-model')

const PATTERN_OPTIONS = ['万字纹', '贝壳纹', '卷草纹', '花篮纹']

const PIECES = [
  { key: 'deer', label: '梅花鹿 → 喷水池中央' },
  { key: 'dogs', label: '十只猎狗 → 环绕梅花鹿' },
  { key: 'beasts', label: '两只大型卷尾铜兽 → 水池东西两端' }
]

function optionSet(page, started) {
  const set = {}
  const fields = (started && started.fields) || []
  fields.forEach(function (field) {
    ;(field.options || []).forEach(function (option) { set[option] = true })
  })
  if (page.playId === 'quiz-pattern') {
    PATTERN_OPTIONS.forEach(function (option) { set[option] = true })
  }
  if (page.playId === 'quiz-height') {
    set['高'] = true
    set['低'] = true
  }
  if (page.playId === 'place-animals') {
    PIECES.forEach(function (piece) { set[piece.label] = true })
  }
  return set
}

function bodyLines(page, run) {
  if (page.playId === 'prop-flip') return []
  let lines = page.lines || []
  if (page.id === 'X2' && run.puzzles['listen-nfc'] === 'skipped') {
    lines = lines.filter(function (line) { return line.indexOf('如此悠扬') !== 0 })
  }
  const started = page.playId ? play.start(page.playId) : null
  const options = optionSet(page, started)
  return lines.filter(function (line) { return !options[line] })
}

function choicesFor(page) {
  if (!page.playId) return []
  const started = play.start(page.playId)
  const field = (started.fields || []).filter(function (item) { return item.type === 'choice' })[0]
  if (field && field.options) return field.options
  if (page.playId === 'quiz-pattern') return PATTERN_OPTIONS.slice()
  return []
}

function screen(run, ui) {
  const page = pages.byId[run.pageId]
  if (!page) throw new Error('unknown page ' + run.pageId)
  const state = ui || {}
  const side = nav.sideButton(page.siteId)
  const choices = choicesFor(page)
  const model = {
    pageId: page.id,
    kind: page.kind,
    lines: bodyLines(page, run),
    propPrompt: page.propPrompt || '',
    choices: choices.map(function (label) {
      return { label: label, selected: state.choice === label }
    }),
    toggles: page.playId === 'place-animals' ? PIECES.map(function (piece) {
      return { key: piece.key, label: piece.label, on: !!state[piece.key] }
    }) : [],
    inputs: [],
    holdReveal: page.playId === 'prop-flip' && !state.flipped,
    revealLines: page.playId === 'prop-flip' && state.flipped ? (page.lines || []) : [],
    primary: '',
    skipLabel: '',
    showSkip: false,
    sideMap: !!(side.visible && page.kind !== 'nav'),
    sideProgress: page.id.charAt(0) !== 'P',
    nav: null,
    again: !!state.again
  }
  if (page.playId === 'quiz-hour') {
    model.inputs = [
      { key: 'hour14', label: '14时对应由哪个兽首喷水', value: state.hour14 || '' },
      { key: 'noon', label: '正午时候由哪个兽首喷水', value: state.noon || '' }
    ]
  }
  if (page.playId === 'quiz-envelope') {
    model.inputs = [{ key: 'text', label: '拼出来的两个字', value: state.text || '' }]
  }
  if (page.kind === 'nav') {
    const fromId = previousSite(page.id)
    model.nav = fromId ? nav.leg(fromId, page.siteId) : null
    model.primary = '走到了'
    model.skipLabel = '这次不去'
    model.showSkip = true
  } else if (page.kind === 'puzzle') {
    model.primary = primaryLabel(page, state)
    model.skipLabel = '这题先跳过'
    model.showSkip = true
  } else if (page.id === 'P1') {
    model.primary = '继续'
    model.skipLabel = '先去园里'
    model.showSkip = true
  } else if (page.kind === 'sign') {
    model.primary = '写好了'
  } else if (page.next) {
    model.primary = '继续'
  }
  return model
}

function primaryLabel(page, state) {
  if (page.playId === 'prop-flip' && !state.flipped) return '我已翻开'
  if (page.playId === 'prop-flip') return '继续'
  if (page.playId === 'listen-nfc') return '贴片已播完'
  if (page.playId === 'photo-pavilion') return '拍好了'
  if (page.playId === 'prop-dial') return '我已用过转盘'
  return '就这样'
}

function previousSite(pageId) {
  const order = ['gate', 'xieqiqu', 'maze', 'fangwaiguan', 'haiyantang', 'xushuilou', 'dashuifa', 'hugo']
  const page = pages.byId[pageId]
  const index = order.indexOf(page.siteId)
  if (index <= 0) return ''
  return order[index - 1]
}

module.exports = {
  screen: screen,
  bodyLines: bodyLines
}
