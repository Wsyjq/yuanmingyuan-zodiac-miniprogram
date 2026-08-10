// 第二站 · 谜题1 黄花阵作用选择题（采风修订版玩法）
// 谜题 S2-1：固定答案 C（中秋皇家娱乐·迷宫灯会）；答错不锁，第二次错给排除提示。
// 答对弹史料卡（卡片角落数字 2）。本页不是 S2 末题，不调 completeStation（由 s2-pattern 收口）。
const session = require('../../store/session')

Page({
  data: {
    options: [
      { key: 'A', text: '军事防御工事', wrong: false },
      { key: 'B', text: '皇家藏书楼', wrong: false },
      { key: 'C', text: '中秋皇家娱乐 · 迷宫灯会', wrong: false },
      { key: 'D', text: '皇子秘密议事厅', wrong: false }
    ],
    selected: '',
    attempts: 0,
    shakeKey: '',   // INT-404：错误项晃动反馈
    hint: '',
    solved: false,
    showHistory: false,
    cardNumber: 2,
    followup: false,
    advancing: false,
    historyLines: [
      '每逢中秋之夜，皇帝坐阵中心凉亭。',
      '观宫女持灯竞走，最先到达中心者得皇帝赏赐。'
    ]
  },

  onSelect(e) {
    if (this.data.solved) return
    this.setData({ selected: e.currentTarget.dataset.key })
  },

  onConfirm() {
    const { selected, options, attempts, solved } = this.data
    if (!selected || solved) return

    if (selected === 'C') {
      session.attemptPuzzle('s2-purpose', attempts + 1, true, 'tap')
      // 铜钉点亮（wxml 中由 solved 驱动）→ 史料卡弹出
      this.setData({ solved: true, hint: '', showHistory: true })
      // 收集黄花阵作用卡片角落数字 2 ——主线：卡片数字 → 日期密码
      session.completePuzzle('s2-purpose', { answer: 'C', attempts: attempts + 1 }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
      return
    }

    const idx = options.findIndex(o => o.key === selected)
    const n = attempts + 1
    session.attemptPuzzle('s2-purpose', n, false, 'tap')
    if (n === 2) session.viewHint('s2-purpose', 1)
    this.setData({
      ['options[' + idx + '].wrong']: true,
      shakeKey: selected,   // INT-404：错误项晃动
      attempts: n,
      hint: n >= 2 ? '排除提示：与战事无关，与藏书也无关。' : ''
    })
    this._timers.push(setTimeout(() => this.setData({ shakeKey: '' }), 450))
  },

  onCloseHistory() {
    this.setData({ showHistory: false, followup: true })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true, showHistory: false })
    session.completePuzzle('s2-purpose', { answer: 'C', attempts: this.data.attempts || 1 }, {
      collectCard: true,
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
      cardNumber: Number(session.getCardDigit('s2-purpose')),
      selected: puzzle ? 'C' : '',
      solved: !!puzzle,
      showHistory: !!puzzle,
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
