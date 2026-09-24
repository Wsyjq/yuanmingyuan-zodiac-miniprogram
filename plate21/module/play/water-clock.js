'use strict'

// Serializable state only. Rendering, audio, storage and wall time belong to the host.
const DURATION = 40
const QUESTION_AT = 19.9
const NAMES = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const HOURS = ['23–01', '01–03', '03–05', '05–07', '07–09', '09–11', '11–13', '13–15', '15–17', '17–19', '19–21', '21–23']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const HOUR_OPTIONS = [
  { id: 'horse', label: '马首' }, { id: 'sheep', label: '羊首' },
  { id: 'monkey', label: '猴首' }, { id: 'rooster', label: '鸡首' }
]
const PREDICTIONS = [
  { id: 'horse', label: '只有马首喷水' },
  { id: 'all', label: '十二兽首同时喷水' },
  { id: 'none', label: '所有兽首停止喷水' }
]

function clamp(value, min, max) {
  const n = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min))
}

function validPrediction(id) { return PREDICTIONS.some(function (item) { return item.id === id }) }

function normalize(saved, resume) {
  const source = saved && typeof saved === 'object' ? saved : {}
  const answer14 = source.answer14 === 'sheep' ? 'sheep' : ''
  const prediction = answer14 && validPrediction(source.prediction) ? source.prediction : ''
  const revealStarted = !!(answer14 && prediction && source.revealStarted === true)
  const completed = !!(revealStarted && source.completed === true)
  let time = clamp(source.time, 0, completed || revealStarted ? DURATION : QUESTION_AT)
  if (revealStarted && !completed) time = Math.max(20, Math.min(39.999, time))
  return {
    version: 1, time: time, answer14: answer14, prediction: prediction,
    revealStarted: revealStarted, completed: completed,
    playing: !!(!resume && source.playing && (completed || revealStarted || time < QUESTION_AT)),
    attempts14: Math.floor(clamp(source.attempts14, 0, 999)),
    staticMode: source.staticMode === true
  }
}

// Restored sessions always wait for an explicit tap before replaying sound/animation.
function createState(saved) { return normalize(saved, true) }
function isComplete(saved) { return normalize(saved, true).completed }
function stage(state) {
  if (state.completed) return 'complete'
  if (state.revealStarted) return 'reveal'
  if (state.time < QUESTION_AT) return 'observe'
  return state.answer14 ? 'prediction' : 'hour14'
}

function reduce(saved, event) {
  const s = normalize(saved, false)
  const e = event || {}
  const phase = stage(s)
  if (e.type === 'pause') s.playing = false
  if (e.type === 'play' && (phase === 'observe' || phase === 'reveal' || phase === 'complete')) {
    if (s.time >= DURATION) s.time = 0
    s.playing = !s.staticMode
  }
  if (e.type === 'seek' && phase !== 'reveal') {
    s.time = clamp(e.time, 0, s.completed ? DURATION : QUESTION_AT)
    if (!s.completed && s.time >= QUESTION_AT) s.playing = false
  }
  if (e.type === 'tick' && s.playing) {
    s.time = Math.min(DURATION, s.time + clamp(e.seconds, 0, 1))
    if (!s.revealStarted && !s.completed && s.time >= QUESTION_AT) {
      s.time = QUESTION_AT
      s.playing = false
    } else if (s.time >= DURATION) {
      s.playing = false
      s.completed = s.revealStarted
    }
  }
  if (e.type === 'answer14' && phase === 'hour14' && HOUR_OPTIONS.some(function (o) { return o.id === e.id })) {
    s.attempts14 += 1
    if (e.id === 'sheep') s.answer14 = 'sheep'
  }
  if (e.type === 'predict' && phase === 'prediction' && validPrediction(e.id)) s.prediction = e.id
  if (e.type === 'confirm' && phase === 'prediction' && validPrediction(s.prediction)) {
    s.revealStarted = true
    s.time = 20
    s.playing = !s.staticMode
  }
  if (e.type === 'static') {
    s.staticMode = true
    s.playing = false
  }
  // A manual sequence preserves the same observation → question → revelation order.
  if (e.type === 'staticNext' && s.staticMode) {
    if (phase === 'observe') s.time = s.time < 8 ? 8 : s.time < 12 ? 12 : QUESTION_AT
    if (phase === 'reveal') {
      s.time = s.time < 26 ? 26 : s.time < 32 ? 32 : DURATION
      if (s.time === DURATION) s.completed = true
    }
  }
  if (e.type === 'replay' && s.completed) {
    s.time = e.noon ? 24 : 0
    s.playing = !s.staticMode
    // Static replay uses the time slider; completion remains earned.
  }
  return s
}

function scene(time) {
  const t = clamp(time, 0, DURATION)
  const all = NAMES.map(function (_, i) { return i })
  let active = [], lit = [], label = '铜版画 · 海晏堂西面', clock = '入画'
  let caption = '海晏堂，取意“河清海晏”，寓意天下太平。'
  let shot = 'paint', start = 0
  if (t >= 4) { shot = 'wide'; label = '复原场景 · 实景参考'; clock = '寻迹'; caption = '十二兽首对应十二时辰，一个时辰是两小时。' }
  if (t >= 8) shot = 'close'
  if (t >= 8 && t < 12) { active = [3]; lit = [3]; start = 8; clock = '05:00'; label = '卯时 · 兔首报时'; caption = '05—07 时为卯时，兔首喷水报时。' }
  if (t >= 12 && t < 16) { active = [4]; lit = [4]; start = 12; clock = '07:00'; label = '辰时 · 龙首报时'; caption = '07—09 时为辰时，轮到龙首喷水。' }
  if (t >= 16 && t < 20) { clock = '14:00'; label = '下午两点 · 谁来报时？'; caption = '观察时辰的变化，再预测正午的景象。' }
  if (t >= 20 && t < 24) { active = [7]; lit = [7]; start = 20; clock = '14:00'; label = '未时 · 羊首报时'; caption = '14 时为未时，由羊首喷水报时。' }
  if (t >= 24 && t < 26) { clock = '回溯'; label = '回到正午之前'; caption = '如果回到正午，会出现怎样的景象？' }
  if (t >= 26 && t < 32) { lit = all.filter(function (i) { return t >= 26 + i * 0.4 }); clock = t >= 31 ? '12:00' : '11:59'; label = '正午将至 · 十二生肖依次唤醒'; caption = '鼠、牛、虎、兔……十二生肖依次亮起。' }
  if (t >= 32) { active = all; lit = all; start = 32; clock = '12:00'; label = '十二生肖 · 共报正午'; caption = '正午，十二兽首同时喷水。'; }
  return { active: active, lit: lit, start: start, label: label, clock: clock, caption: caption, shot: shot, central: t >= 8 }
}

module.exports = {
  DURATION: DURATION, QUESTION_AT: QUESTION_AT, NAMES: NAMES,
  HOURS: HOURS, BRANCHES: BRANCHES, HOUR_OPTIONS: HOUR_OPTIONS, PREDICTIONS: PREDICTIONS,
  createState: createState, reduce: reduce, stage: stage, scene: scene, isComplete: isComplete
}
