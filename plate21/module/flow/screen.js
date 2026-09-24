'use strict'

// Pure display projection: no wx, storage, judgement or progress writes.
const pages = require('./pages')
const play = require('../play/index')
const nav = require('../capabilities/map/nav-model')
const glossary = require('./glossary')
const props = require('./props')
const taskGuide = require('./task-guide')

const PATTERN_FIGURES = [
  { id: 'wanzi', label: '万字纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-WANZI.jpg' },
  { id: 'shell', label: '贝壳纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SHELL.jpg' },
  { id: 'scroll', label: '卷草纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SCROLL.jpg' },
  { id: 'basket', label: '花篮纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-BASKET.jpg' }
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


const PLAY_TYPES = {
  'quiz-direction': 'choice', 'listen-nfc': 'soundscape', 'quiz-envelope': 'text',
  'quiz-lantern': 'choice', 'prop-flip': 'physical-flip', 'photo-pavilion': 'photo',
  'quiz-pattern': 'picture-choice', 'quiz-hour': 'water-clock', 'prop-dial': 'physical-confirm',
  'quiz-height': 'choice', 'place-animals': 'placement'
}
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)) }
function safeText(value) { return typeof value === 'string' ? value : '' }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)) }
function beijingDate(timestamp) {
  if (timestamp == null || timestamp === '') return ''
  const millis = typeof timestamp === 'string' && !/^\d+$/.test(timestamp) ? Date.parse(timestamp) : Number(timestamp)
  if (!Number.isFinite(millis) || millis <= 0) return ''
  const date = new Date(millis + 8 * 60 * 60 * 1000)
  return date.getUTCFullYear() + '年' + (date.getUTCMonth() + 1) + '月' + date.getUTCDate() + '日'
}
function previousSite(pageId) {
  const order = ['gate', 'xieqiqu', 'maze', 'fangwaiguan', 'haiyantang', 'xushuilou', 'dashuifa', 'hugo']
  const index = order.indexOf(pages.byId[pageId].siteId)
  return index > 0 ? order[index - 1] : ''
}
function relayState(run, state) {
  const allUi = run.uiByPage || {}
  const prior = allUi.LT6 || {}, editor = allUi.LT7 || {}
  const source = state.relay || prior.relay || {}
  const status = state.relayStatus || source.status || 'unavailable'
  const supplied = state.relayRecords || state.relayItems || source.records || []
  const records = (Array.isArray(supplied) ? supplied : []).filter(function (record) {
    return record && !record.demo && !record.seeded && record.source !== 'seed' &&
      record.status === 'published' &&
      (safeText(record.text).trim() || safeText(record.url).trim())
  }).map(clone)
  const hasRecord = status === 'ready' && records.length > 0
  const viewed = hasRecord && !!(state.relayViewed || source.viewed || prior.relayViewed)
  const submitStatus = state.submitStatus || source.submitStatus || editor.submitStatus ||
    (editor.relay && editor.relay.submitStatus) || ''
  let message = ''
  if (status === 'loading') message = '正在读取接力记录……'
  else if (status === 'failed') message = '这次暂时没有读到记录，可以重试或继续。'
  else if (!hasRecord) message = '暂时没有可展示的接力记录，你仍可以留下自己的考察记录。'
  return { kind: '', status: status, records: hasRecord ? records : [], hasRecord, viewed, submitStatus,
    saved: !!(state.relaySaved || editor.relaySaved), message }
}
function bodyLines(page, run, ui) {
  const state = ui || {}
  if (page.revealOf && ['solved', 'assisted'].indexOf((run.puzzles || {})[page.revealOf]) < 0) return []
  if (page.id.indexOf('LT') === 0 && (!run.completedAt || !run.letterAvailable)) return []
  if (page.id === 'H3') return state.flipped === true ? page.lines.slice() : []
  let lines = page.lines.slice()
  const choices = play.CHOICES[page.playId] || []
  lines = lines.filter(function (line) {
    return !choices.some(function (choice) { return choice.label === line }) &&
      !(page.id === 'DS1' && /^(梅花鹿|十只猎狗|两只大型卷尾铜兽) → /.test(line))
  })
  // Non-bracketed script is screen copy, including scene descriptions.
  // Arrival, physical reveal, real submission and real records still gate their own content.
  if (page.id === 'H4' && !state.arrived) lines = ['接下来请走到黄花阵中心亭，对照现场标识确认到达，再留下你的观察。']
  if (page.id === 'FN4' && run.completedAt) lines = page.signedLines.slice()
  const relay = relayState(run, state)
  if (page.id === 'LT6' && relay.hasRecord) lines = lines.concat(page.relayLines || [])
  if (page.id === 'LT7' && relay.viewed) lines = (page.relayLines || []).concat(lines)
  if (page.id === 'LT8') {
    if (relay.saved && ['', 'unavailable'].indexOf(relay.submitStatus) >= 0) lines.unshift('这份记录已保存在你的私人档案里。')
    if (relay.submitStatus === 'submitted') lines.unshift('这份记录已提交，正在等待审核。通过审核后，才可能与后来者分享。')
    if (relay.submitStatus === 'published') lines.unshift('这份记录已通过审核。你也成为了这份接力档案的一部分。')
    if (relay.submitStatus === 'rejected') lines.unshift('这份投稿未通过审核，不会展示给后来者；你的私人记录仍可保留。')
    if (relay.submitStatus === 'withdrawn') lines.unshift('这份投稿已撤回，不再作为公开接力记录展示。')
    if (relay.submitStatus === 'failed') lines.unshift('这份记录暂未提交成功，你可以回去重试，也可以先收好档案。')
  }
  return lines
}
function nextIsUnlocked(run, page) {
  if (!page.next) return false
  const unlocked = (run.unlocked || {})[page.next] || (run.visited || {})[page.next]
  const target = pages.byId[page.next]
  if (target.revealOf && ['solved', 'assisted'].indexOf((run.puzzles || {})[target.revealOf]) < 0) return false
  if (target.id.indexOf('LT') === 0 && (!run.completedAt || !run.letterAvailable)) return false
  return !!unlocked
}
function buttons(model, page, run, state) {
  model.primary = page.next ? '继续' : '收好这份档案'
  model.primaryAction = page.next ? 'continue' : 'finish'
  model.primaryDisabled = !!(state.saving || state.submitting)
  model.showSkip = !model.review && !!page.skipTo
  model.skipLabel = page.kind === 'nav' ? '这次不去' : (page.id.charAt(0) === 'P' ? '先去园里' : '这题先跳过')
  if (model.review) {
    const next = nextIsUnlocked(run, page)
    model.primary = next ? '继续回看' : '返回当前进度'
    model.primaryAction = next ? 'review-next' : 'resume'
    return
  }
  if (page.kind === 'nav') { model.primary = '我到达了'; model.primaryAction = 'arrive' }
  else if (page.kind === 'puzzle') {
    model.primaryAction = 'submit'
    model.primary = '确认答案'
    if (page.playId === 'prop-flip') {
      model.primary = state.flipped ? '继续' : '我已翻到背面'
      model.primaryAction = state.flipped ? 'submit' : 'flip'
    }
    if (page.playId === 'listen-nfc') model.primary = '听完了，继续'
    if (page.playId === 'photo-pavilion') model.primary = '保存观察记录'
    if (page.playId === 'prop-dial') model.primary = '我已操作转盘'
    if (page.playId === 'place-animals') model.primary = '确认复原'
    if (page.playId === 'quiz-hour') model.primary = '继续考察'
  } else if (page.kind === 'sign') {
    model.primary = run.completedAt ? '查看我的作品' : '保存考察记录'
    model.primaryAction = run.completedAt ? 'result' : 'sign'
  }
}
function buildScreen(run, ui) {
  const page = pages.byId[run && run.pageId]
  if (!page) throw new Error('unknown page ' + (run && run.pageId))
  const state = Object.assign({}, (run.uiByPage || {})[page.id] || {}, ui || {})
  const site = nav.listSites().filter(function (item) { return item.id === page.siteId })[0]
  const review = !!(run.resumePageId && run.pageId !== run.resumePageId)
  const status = page.playId ? ((run.puzzles || {})[page.playId] || '') : ''
  const selected = state.optionId || state.choice || ''
  const choices = (play.CHOICES[page.playId] || []).map(function (item) {
    return { id: item.id, label: item.label, selected: selected === item.id || selected === item.label }
  })
  const playSpec = page.playId ? play.start(page.playId) : null
  const index = pages.list.indexOf(page)
  const completedDate = beijingDate(run.completedAt || run.signedAt)
  const relay = relayState(run, state)
  relay.kind = page.id === 'LT6' ? 'read' : (page.id === 'LT7' ? 'editor' : (page.id === 'LT8' ? 'ack' : ''))
  const locked = (page.id.indexOf('LT') === 0 && (!run.completedAt || !run.letterAvailable)) ||
    (page.revealOf && ['solved', 'assisted'].indexOf((run.puzzles || {})[page.revealOf]) < 0)
  const photos = Array.isArray(state.photos) ? clone(state.photos) : (Array.isArray(state.records) ? state.records.filter(function (record) {
    return record.purpose === 'field' && record.kind === 'photo' && (!record.siteId || record.siteId === page.siteId)
  }).map(clone) : [])
  const selectedPhoto = photos.filter(function (record) { return !state.spot || record.spot === state.spot })[0]
  let interaction = page.interaction && !locked ? clone(page.interaction) : null
  if (interaction && interaction.requires && !['solved', 'assisted'].includes((run.puzzles || {})[interaction.requires])) interaction = null
  if (interaction) {
    interaction.lines = interaction.lines || []
    if (page.id === 'H3' && state.flipped) interaction.lines = interaction.lines.concat(interaction.revealLines || [])
    if (page.id === 'H4' && !state.arrived) interaction.lines = []
  }
  const model = {
    pageId: page.id, kind: page.kind, sectionTitle: page.sectionTitle, title: page.title || ('前往' + (site ? site.name : '下一站')),
    siteId: page.siteId, siteTitle: site ? site.name : '', pageIndex: index + 1, pageCount: pages.list.length,
    task: taskGuide.get(page.playId), stageLabel: site ? '第 ' + (nav.listSites().findIndex(item => item.id === site.id) + 1) + ' / 8 站' : (page.id.startsWith('LT') ? '次日来信' : page.id.startsWith('FN') ? '我的考察记录' : '考察序章'),
    interaction: interaction, lines: bodyLines(page, run, state), prop: props.forPage(page.id), propPrompt: page.propPrompt || '',
    play: playSpec ? { id: page.playId, type: PLAY_TYPES[page.playId], choices: clone(choices), fields: clone(playSpec.fields), readOnly: review } : null,
    choices: choices, inputs: [], toggles: [], figures: [], spots: [],
    photo: safeText(state.photo) || (selectedPhoto ? safeText(selectedPhoto.filePath || selectedPhoto.url) : ''), photos: photos,
    spotDetail: '', holdReveal: page.id === 'H3' && !state.flipped,
    revealLines: page.id === 'H3' && state.flipped ? page.lines.slice() : [],
    locked: !!locked, review: review, reviewLabel: review ? '正在回看 · 不改变当前进度' : '',
    completionHint: status === 'skipped' ? '这一步已跳过。' : ((run.completedPages || {})[page.id] ? '这一步已经完成。' : ''),
    sideMap: !!(page.siteId && page.kind !== 'nav'), sideProgress: page.id.charAt(0) !== 'P',
    nav: null, terms: glossary.termsFor(page.id), again: !!state.again, feedback: safeText(state.feedback),
    completedDate: completedDate, completionDateLabel: completedDate ? '考察完成于' + completedDate : '',
    presentation: clone(page.presentation), board: null, waterClock: clone(state.waterClock || null),
    fountain: page.id === 'DS2', fountainProgress: clamp(state.fountainProgress == null ? state.fade : state.fountainProgress, 0, 100),
    portrait: page.id === 'F2' ? '/assets/fig/rongfei.jpg' : '',
    teacher: page.id === 'LT2' ? '/assets/fig/letter-teacher.jpg' : '',
    nfc: page.playId === 'listen-nfc', nfcLine: page.playId === 'listen-nfc' ? '喷泉声、少数民族音乐和西洋音乐' : '',
    nfcStatus: safeText(state.nfcStatus), nfcAside: safeText(state.nfcAside), heard: !!state.heard,
    relay: relay, letterRead: page.id === 'LT6', letterLeave: page.id === 'LT7',
    leaveText: safeText(state.leaveText), wish: safeText(state.wish), name: safeText(state.name || run.name),
    signature: { name: safeText(state.name || run.name) || '未署名', date: completedDate || '完成考察后记录', edition: run.editionNo == null ? '暂无全局版号' : '第 ' + run.editionNo + ' 版' },
    signed: !!run.completedAt
  }
  if (page.playId === 'quiz-pattern') {
    model.figures = PATTERN_FIGURES.map(function (figure) {
      return Object.assign({}, figure, { selected: selected === figure.id || selected === figure.label })
    })
  }
  if (page.playId === 'photo-pavilion') {
    model.spots = SPOTS.map(function (spot) {
      return { id: spot.id, title: spot.title, src: spot.src, on: state.spot === spot.id }
    })
    const chosen = SPOTS.filter(function (spot) { return spot.id === state.spot })[0]
    if (chosen && model.photo) model.spotDetail = chosen.detail
  }
  if (page.playId === 'quiz-envelope') model.inputs = [{ key: 'text', label: '填写拼出的站名', value: safeText(state.text), placeholder: '填写站名' }]
  if (page.playId === 'place-animals') {
    const placed = state.placed || {}
    model.board = {
      selected: state.selectedPiece || '',
      pieces: PIECES.map(function (piece) { return { id: piece.id, label: piece.label, placed: placed[piece.id] || '', text: piece.label + (placed[piece.id] ? ' · 已放下' : ''), on: state.selectedPiece === piece.id } }),
      slots: SLOTS.map(function (slot) {
        const piece = PIECES.filter(function (item) { return placed[item.id] === slot.id })[0]
        return { id: slot.id, label: slot.label, pieceId: piece ? piece.id : '', piece: piece ? piece.label : '', text: slot.label + (piece ? ' · ' + piece.label : '') }
      })
    }
  }
  if (page.id === 'DS2') model.presentation = { kind: 'fountain-fade', progress: model.fountainProgress, opacity: 1 - model.fountainProgress / 100 }
  if (page.kind === 'nav') {
    const from = previousSite(page.id)
    model.nav = from ? nav.leg(from, page.siteId) : null
  }
  buttons(model, page, run, state)
  if (locked) {
    model.title = '这一页尚未解锁'; model.teacher = ''; model.relay.records = [];
    model.primary = '返回当前进度'; model.primaryAction = 'resume'; model.showSkip = false
  }
  return model
}
module.exports = { buildScreen, screen: buildScreen, bodyLines, beijingDate, PIECES, SLOTS, BEASTS, PATTERN_FIGURES, SPOTS }
