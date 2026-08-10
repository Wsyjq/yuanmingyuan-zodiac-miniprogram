// 第二站 · 谜题4 墙体花纹观察（采风修订版玩法）
// 给出 4 种花纹图样，让用户选出迷宫墙体上看到的花纹（万字回纹）。
// 答案：万字纹 → 寓意「福寿绵长」；下一站由资料袋中的手绘路线图给出。
// 卡片角落数字：6（固定）。
// 点击路线交接后，以原子命令完成第二站并推进至 s3-hour。
//
// TODO（下轮迭代）：终版应为真实墙体高清图 + 多花纹识别；当前为 4 选 1 简化版。
const session = require('../../store/session')

// 4 种候选花纹（correct = 万字纹）
// 素材：万字纹用 AI 生成中式回纹（IMG-P-WANZI，待生），其余复用铜版画纹样母题 S4B 系列
const PATTERNS = [
  { key: 'wanzi', name: '万字回纹', img: '/plate21/module/assets/img/IMG-P-WANZI.jpg', desc: '回转连绵，万字不断', correct: true },
  { key: 'lianhua', name: '莲花纹', img: '/plate21/module/assets/img/IMG-S4B4.jpg', desc: '对称花瓣图案', correct: false },
  { key: 'juanco', name: '卷草饰', img: '/plate21/module/assets/img/IMG-S4B1.jpg', desc: '卷曲枝条与花朵', correct: false },
  { key: 'haishui', name: '海水江岸纹', img: '/plate21/module/assets/img/IMG-S4B3.jpg', desc: '波浪状水纹', correct: false }
]

// 史料卡：仅剧情原文（"通水意"是开发脑补，已移除）
const HISTORY_LINES = [
  '迷宫墙体刻满万字回纹，寓意福寿绵长。'
]

const REVEAL_TEXT = '回转不断的万字纹，寄托的是福寿绵长。纹样本身不指向下一站，真正的路线线索还在资料袋里。'

Page({
  data: {
    patterns: PATTERNS,
    picked: null,       // 用户选中的 key
    attempts: 0,
    showHistory: false,
    historyLines: HISTORY_LINES,
    cardNumber: 6,
    showCardNumber: false,
    showHint: false,
    solved: false,
    showRoute: false,
    advancing: false,
    revealText: '',     // 解谜后独白（剧情原文，引出下一站）
    hint: '再仔细看看墙体的回转连绵纹路。',
    today: ''           // 会话锁定日期（日期章用，跨午夜不变化）
  },

  onLoad() {
    session.viewPuzzle('s2-pattern')
    const snap = session.getSnapshot() || {}
    const key = /^\d{8}$/.test(snap.sessionDate || '') ? snap.sessionDate : ''
    const d = key
      ? new Date(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, Number(key.slice(6, 8)))
      : new Date()
    const puzzle = session.getPuzzle('s2-pattern')
    this.setData({
      today: (d.getMonth() + 1) + '月' + d.getDate() + '日',
      cardNumber: Number(session.getCardDigit('s2-pattern')),
      picked: puzzle ? 'wanzi' : null,
      solved: !!puzzle,
      showHistory: !!puzzle,
      showCardNumber: !!puzzle,
      revealText: puzzle ? REVEAL_TEXT : '',
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onPick(e) {
    if (this.data.showHistory || this.data.solved) return
    const key = e.currentTarget.dataset.key
    this.setData({ picked: key })
  },

  onConfirm() {
    if (!this.data.picked || this.data.showHistory) return
    const right = PATTERNS.find((p) => p.key === this.data.picked).correct
    const attempts = this.data.attempts + 1
    session.attemptPuzzle('s2-pattern', attempts, right, 'tap')
    if (right) {
      this.setData({ solved: true, showHistory: true, showCardNumber: true, revealText: REVEAL_TEXT, attempts: attempts })
      session.completePuzzle('s2-pattern', { answer: 'wanzi', attempts: attempts }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
    } else {
      // 错误：错 2 次给提示
      this.setData({ attempts: attempts, showHint: attempts >= 2 })
      if (attempts === 2) session.viewHint('s2-pattern', 1)
      wx.showToast({ title: '再看看墙体纹路', icon: 'none' })
    }
  },

  onCloseHistory() {
    this.setData({ showHistory: false, showRoute: this.data.solved })
  },

  onNext() {
    this.setData({ showHistory: false, showRoute: true })
  },

  onGoS3() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s2-pattern', { answer: 'wanzi', attempts: this.data.attempts || 1 }, {
      collectCard: true,
      station: 's2',
      checkpoint: 's3-hour'
    }).then(() => {
      wx.redirectTo({ url: '/plate21/module/pages/transit/transit?leg=s2-s3' })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  }
})
