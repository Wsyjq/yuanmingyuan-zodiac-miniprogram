// 第二站 · 黄花阵 对读一：灯戏图对空墙（V2.1 可用稿）
// 玩法：先对墙（画上墙的走向和眼前对得上）→ 再对人（画上有人、地上没有）。
// 开放作答，命中「中秋／灯／宫女／玩／赏」任一即过；可跳过（跳过不发该卡）。
// 答对弹史料卡（卡片角落数字 2，年1=2）。本页不是 S2 末题，不调 completeStation（由 s2-pattern 收口）。
const session = require('../../store/session')

const KEYWORDS = ['中秋', '灯', '宫女', '玩', '赏']

Page({
  data: {
    answer: '',
    attempts: 0,
    wrongTip: '',
    hint: '',
    solved: false,
    skipped: false,
    showHistory: false,
    cardNumber: 2,
    followup: false,
    advancing: false,
    historyLines: [
      '中秋夜，皇帝坐阵心凉亭，宫女跑阵，先到有赏。',
      '画上提灯往中心亭跑的人群，就是灯会本身。'
    ]
  },

  onInput(e) {
    this.setData({ answer: e.detail.value, wrongTip: '' })
  },

  onConfirm() {
    if (this.data.solved) return
    const value = String(this.data.answer || '').trim()
    if (!value) {
      wx.showToast({ title: '先写一句你的猜法', icon: 'none' })
      return
    }
    const hit = KEYWORDS.some(function (word) { return value.includes(word) })
    const attempts = this.data.attempts + 1
    if (hit) {
      session.attemptPuzzle('s2-purpose', attempts, true, 'text')
      this.setData({ solved: true, wrongTip: '', hint: '', showHistory: true })
      session.completePuzzle('s2-purpose', { answer: value, attempts: attempts }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
      return
    }
    session.attemptPuzzle('s2-purpose', attempts, false, 'text')
    if (attempts === 2) session.viewHint('s2-purpose', 1)
    this.setData({
      attempts: attempts,
      wrongTip: attempts >= 2 ? '再看看画里人手里都拿着什么。' : '先说说画上的人在干什么——猜错不扣什么。'
    })
  },

  // 卡住才出提示（V2.1：提示只在卡住时出现）
  onShowHint() {
    session.viewHint('s2-purpose', 1)
    this.setData({ hint: '夜里的阵、提灯的人、往中心亭跑——这是个节庆的场面。' })
  },

  // 可跳过：跳过不发该卡（V2.1 对读规则），直接进下一拍
  onSkip() {
    if (this.data.solved || this.data.skipped) return
    this.setData({ skipped: true, solved: true, showHistory: false, followup: true })
    session.attemptPuzzle('s2-purpose', this.data.attempts, true, 'skip')
    session.completePuzzle('s2-purpose', { action: 'skipped', attempts: this.data.attempts })
      .catch(function () { /* 进度失败不阻断浏览 */ })
  },

  onCloseHistory() {
    this.setData({ showHistory: false, followup: true })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true, showHistory: false })
    session.completePuzzle('s2-purpose', { attempts: this.data.attempts || 1 }, {
      collectCard: !this.data.skipped,
      checkpoint: 's2-name'
    }).then(function () {
      wx.redirectTo({ url: '/plate21/module/pages/s2-reveal/s2-reveal' })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  },

  onLoad() {
    this._timers = []
    session.viewPuzzle('s2-purpose')
    const puzzle = session.getPuzzle('s2-purpose')
    this.setData({
      cardNumber: Number(session.getCardDigit('s2-purpose')) || 2,
      solved: !!puzzle,
      skipped: !!(puzzle && puzzle.payload && puzzle.payload.action === 'skipped'),
      showHistory: !!puzzle && !!(puzzle.payload && puzzle.payload.answer),
      followup: !!puzzle && !!(puzzle.payload && puzzle.payload.action === 'skipped'),
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
