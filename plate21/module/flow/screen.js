'use strict'

// 把页表收成屏幕上的块。选项只出现一次，并且是按钮，不写进正文。
const pages = require('./pages')
const play = require('../play/index')
const nav = require('../capabilities/map/nav-model')
const glossary = require('./glossary')

const PATTERN_FIGURES = [
  { label: '万字纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-WANZI.jpg' },
  { label: '贝壳纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SHELL.jpg' },
  { label: '卷草纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SCROLL.jpg' },
  { label: '花篮纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-BASKET.jpg' }
]

const SPOTS = [
  {
    id: 'dome',
    title: '穹顶与飞檐',
    src: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-DOME.jpg',
    detail: '亭子整体「西式穹顶 + 中式八角飞檐混搭结构」'
  },
  {
    id: 'beast',
    title: '檐角立兽',
    src: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-BEAST.jpg',
    detail: '亭子八角飞檐的八个檐角位置，全部标注有小型立式装饰物；西方原版欧式凉亭檐角无任何立兽，纯光面檐口，证明这个构件是中式附加增设；'
  },
  {
    id: 'lotus',
    title: '莲座宝瓶',
    src: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-LOTUS.jpg',
    detail: '版画里该构件基座为中式莲座（中式走兽标配莲花基座），上部花苞造型是西洋园林宝瓶花苞样式。'
  },
  {
    id: 'swan',
    title: '双天鹅与蝙蝠',
    src: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-SWAN.jpg',
    detail: '弧形基座浮雕：这一圈弧形壁面分为两种交替排布的浮雕版式，西式巴洛克基底，局部混入中式吉祥元素主体核心是对称双天鹅巴洛克纹样，中式本土化改造：清宫石匠在天鹅胸腹位置悄悄刻了简化蝙蝠纹路（藏在浮雕中心交汇处），把西方天鹅，叠加中式「蝙蝠寓意福气」的吉祥内涵'
  }
]

const BEASTS = [
  { branch: '子', name: '鼠', range: '23–1' },
  { branch: '丑', name: '牛', range: '1–3' },
  { branch: '寅', name: '虎', range: '3–5' },
  { branch: '卯', name: '兔', range: '5–7' },
  { branch: '辰', name: '龙', range: '7–9' },
  { branch: '巳', name: '蛇', range: '9–11' },
  { branch: '午', name: '马', range: '11–13', noon: true },
  { branch: '未', name: '羊', range: '13–15', at14: true },
  { branch: '申', name: '猴', range: '15–17' },
  { branch: '酉', name: '鸡', range: '17–19' },
  { branch: '戌', name: '狗', range: '19–21' },
  { branch: '亥', name: '猪', range: '21–23' }
]

const SLOTS = [
  { id: 'center', label: '喷水池中央' },
  { id: 'ring', label: '环绕梅花鹿' },
  { id: 'ends', label: '水池东西两端' }
]

const PIECES = [
  { id: 'deer', label: '梅花鹿', slot: 'center' },
  { id: 'dogs', label: '十只猎狗', slot: 'ring' },
  { id: 'beasts', label: '两只大型卷尾铜兽', slot: 'ends' }
]

function optionSet(page, started) {
  const set = {}
  const fields = (started && started.fields) || []
  fields.forEach(function (field) {
    ;(field.options || []).forEach(function (option) { set[option] = true })
  })
  if (page.playId === 'quiz-pattern') {
    PATTERN_FIGURES.forEach(function (figure) { set[figure.label] = true })
  }
  if (page.playId === 'quiz-height') {
    set['高'] = true
    set['低'] = true
  }
  if (page.playId === 'place-animals') {
    PIECES.forEach(function (piece) {
      const slot = SLOTS.filter(function (item) { return item.id === piece.slot })[0]
      set[piece.label + ' → ' + slot.label] = true
    })
  }
  return set
}

function bodyLines(page, run) {
  if (page.playId === 'prop-flip') return []
  let lines = page.lines || []
  if (page.id === 'X2' && run.puzzles['listen-nfc'] === 'skipped') {
    lines = lines.filter(function (line) { return line.indexOf('如此悠扬') !== 0 })
  }
  if (page.playId === 'photo-pavilion') {
    return lines.filter(function (line) {
      return line.indexOf('终于到了中心亭') === 0 || line.indexOf('你能找到这座亭子') === 0
    })
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
  if (page.playId === 'quiz-pattern') return PATTERN_FIGURES.map(function (figure) { return figure.label })
  return []
}

function pieceAt(placed, slotId) {
  const found = PIECES.filter(function (piece) { return placed[piece.id] === slotId })[0]
  return found ? found.label : ''
}

function screen(run, ui) {
  const page = pages.byId[run.pageId]
  if (!page) throw new Error('unknown page ' + run.pageId)
  const state = ui || {}
  const side = nav.sideButton(page.siteId)
  const choices = choicesFor(page)
  const placed = state.placed || {}
  const model = {
    pageId: page.id,
    kind: page.kind,
    lines: bodyLines(page, run),
    propPrompt: page.propPrompt || '',
    choices: choices.map(function (label) {
      return { label: label, selected: state.choice === label }
    }),
    toggles: [],
    inputs: [],
    holdReveal: page.playId === 'prop-flip' && !state.flipped,
    revealLines: page.playId === 'prop-flip' && state.flipped ? (page.lines || []) : [],
    primary: '',
    skipLabel: '',
    showSkip: false,
    sideMap: !!(side.visible && page.kind !== 'nav'),
    sideProgress: page.id.charAt(0) !== 'P',
    nav: null,
    again: !!state.again,
    terms: glossary.termsFor(page.id),
    figures: [],
    spots: [],
    photo: state.photo || '',
    spotDetail: '',
    beasts: [],
    beastFinale: page.id === 'HY2',
    noonWatch: !!state.noonWatch,
    board: null,
    portrait: page.id === 'F2' ? '/plate21/module/assets/img/rongfei.jpg' : '',
    teacher: page.id === 'LT2' ? '/plate21/module/assets/img/letter-teacher.jpg' : '',
    fountain: page.id === 'DS2',
    nfc: page.playId === 'listen-nfc',
    nfcStatus: state.nfcStatus || '',
    heard: !!state.heard,
    letterRead: page.id === 'LT6',
    letterLeave: page.id === 'LT7',
    prevNote: state.prevNote || '',
    leftAck: state.leftAck || '',
    leaveText: state.leaveText || '',
    wish: state.wish || ''
  }
  if (page.playId === 'quiz-pattern') {
    model.figures = PATTERN_FIGURES.map(function (figure) {
      return { label: figure.label, src: figure.src, selected: state.choice === figure.label }
    })
    model.choices = []
  }
  if (page.playId === 'photo-pavilion') {
    model.spots = SPOTS.map(function (spot) {
      return { id: spot.id, title: spot.title, src: spot.src, on: state.spot === spot.id }
    })
    const chosen = SPOTS.filter(function (spot) { return spot.id === state.spot })[0]
    if (chosen && state.photo) model.spotDetail = chosen.detail
  }
  if (page.playId === 'quiz-hour' || page.id === 'HY2') {
    model.beasts = BEASTS.map(function (beast, index) {
      const selected = state.beast === beast.branch
      return {
        branch: beast.branch,
        name: beast.name,
        range: beast.range,
        at14: !!beast.at14,
        noon: !!beast.noon,
        index: index,
        delayStyle: 'animation-delay:' + (index * 0.18) + 's',
        on: page.id === 'HY2' || !!state.noonWatch || selected
      }
    })
  }
  if (page.playId === 'place-animals') {
    model.board = {
      selected: state.selectedPiece || '',
      pieces: PIECES.map(function (piece) {
        return {
          id: piece.id,
          label: piece.label,
          placed: placed[piece.id] || '',
          text: placed[piece.id] ? piece.label + ' · 已放下' : piece.label,
          on: state.selectedPiece === piece.id
        }
      }),
      slots: SLOTS.map(function (slot) {
        const holding = pieceAt(placed, slot.id)
        return {
          id: slot.id,
          label: slot.label,
          piece: holding,
          text: holding ? slot.label + ' · ' + holding : slot.label
        }
      })
    }
  }
  if (page.playId === 'quiz-hour') {
    model.inputs = [
      { key: 'hour14', label: '14时对应由哪个兽首喷水', value: state.hour14 || '' },
      { key: 'noon', label: '正午时候由哪个兽首喷水', value: state.noon || '' }
    ]
  }
  if (page.playId === 'quiz-envelope') {
    model.inputs = [{ key: 'text', label: '拼出来的三个字', value: state.text || '' }]
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
  if (page.playId === 'listen-nfc') return state.heard ? '贴片已播完' : ''
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
  bodyLines: bodyLines,
  BEASTS: BEASTS,
  PIECES: PIECES,
  SLOTS: SLOTS
}
