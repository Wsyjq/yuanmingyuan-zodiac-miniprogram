// 黄花阵 · 修建目的。飞书 v3 原文选项。三次揭晓仍发卡。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const audioBus = require('../../utils/audio-bus')
const ladder = require('../../utils/attempt-ladder')
const playGuide = require('../../capabilities/play-guide/guide')
const coachHost = require('../../capabilities/play-guide/coach-host')
const glossHost = require('../../utils/gloss-host')

const OPTIONS = [
  { key: 'A', text: '作为军事防御工事，用于迷惑和阻挡入侵的敌人。' },
  { key: 'B', text: '作为皇家藏书楼，利用复杂路径保护珍贵书籍。' },
  { key: 'C', text: '作为中秋节的皇家娱乐场所，举办“迷宫灯会”游戏。' },
  { key: 'D', text: '作为皇子们的秘密议事厅，以防外人窃听。' }
]
const CORRECT = 'C'
const HINTS = [
  '再看看这座阵夜里会不会亮起来。',
  '中秋之夜，有人提着灯往中心亭跑。'
]
const REVEAL = '每逢中秋之夜，皇帝会坐在阵中心的凉亭里，观赏宫女们在迷宫路径中奔跑嬉戏。最先到达中心的人会得到皇帝的赏赐。'

Page({
  behaviors: [coachHost, glossHost],
  data: {
    options: OPTIONS,
    selected: '',
    attempts: 0,
    hint: '',
    solved: false,
    revealed: false,
    showHistory: false,
    cardNumber: 2,
    followup: false,
    advancing: false,
    narrSrc: audioSrc.clip('narr-s2-quiz'),
    // 「黄花阵」= SL-07 史料卡挂点（v3 rev 3346：四道题之前只说是迷宫）
    introParts: [
      { t: '到了' },
      { t: '黄花阵', g: 'sl07' },
      { t: '的入口处，眼前景观让我有些震惊——一个皇家宫苑中竟有一座迷宫！不过皇家宫苑中为什么会有一座迷宫呢？' }
    ],
    historyLines: [
      '黄花阵的作用：每逢中秋之夜，皇帝会坐在阵中心的凉亭里，观赏宫女们在迷宫路径中奔跑嬉戏。最先到达中心的人会得到皇帝的赏赐。'
    ]
  },

  onSelect(e) {
    if (this.data.solved) return
    this.setData({ selected: e.currentTarget.dataset.key })
  },

  onConfirm() {
    audioBus.stopKind('voice')
    if (this.data.solved || !this.data.selected) return
    const ok = this.data.selected === CORRECT
    const result = ladder.submit({
      ok: ok,
      attempts: this.data.attempts,
      hints: HINTS,
      revealText: REVEAL
    })
    session.attemptPuzzle('s2-purpose', result.attempts, ok, 'tap')
    if (result.solved) {
      if (result.revealed) session.viewHint('s2-purpose', 3)
      this.setData({
        attempts: result.attempts,
        solved: true,
        revealed: result.revealed,
        hint: result.hint,
        selected: CORRECT,
        showHistory: true
      })
      session.completePuzzle('s2-purpose', {
        answer: CORRECT,
        attempts: result.attempts,
        revealed: result.revealed
      }, { collectCard: true }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    session.viewHint('s2-purpose', result.attempts)
    this.setData({ attempts: result.attempts, hint: result.hint })
  },

  onCloseHistory() {
    this.setData({
      showHistory: false,
      followup: true,
      narrSrc: audioSrc.clip('narr-s2-quiz-followup')
    })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true, showHistory: false })
    session.completePuzzle('s2-purpose', { attempts: this.data.attempts || 1, answer: CORRECT }, {
      collectCard: true,
      checkpoint: 's2-name'
    }).then(function () {
      wx.redirectTo({ url: '/plate21/module/pages/s2-reveal/s2-reveal' })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  },

  onLoad(options) {
    this._timers = []
    if (playGuide.enterTourPage('pages/s2-quiz/s2-quiz', options)) {
      this.setData({ touring: true, solved: false, followup: false, showHistory: false })
      return
    }
    session.viewPuzzle('s2-purpose')
    const puzzle = session.getPuzzle('s2-purpose')
    this.setData({
      cardNumber: Number(session.getCardDigit('s2-purpose')) || 2,
      solved: !!puzzle,
      selected: puzzle ? CORRECT : '',
      showHistory: !!puzzle,
      followup: false,
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
