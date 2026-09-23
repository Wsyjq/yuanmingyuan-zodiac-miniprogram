// 第四站 · 末题 密码输入（采风修订版玩法核心主线收口）
// 剧情：之前每张卡片角落都有一个数字，连起来是本次考察的锁定日期。
// 校验口径：会话锁定日期 YYYYMMDD，对应一路收集的八张卡片。
// 输入正确 → 谜题与第四站原子落库 → 玩家确认后进入反转揭示 finale。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')

Page({
  data: {
    pwd: '',
    attempts: 0,
    showHint: false,
    hint: '回看封面的考察凭证：系统建立本次档案时，已按设备本地日历锁定建档日。八张卡按考察顺序依次记录 YYYYMMDD 的一位；即使跨过午夜，仍以同一建档日为准。',
    wrongTip: '',
    archiveDate: '',
    correct: false,
    advancing: false,
    progressError: '',
    collectedNums: []   // 已收集的卡片数字（主线：连起来 = 本次考察锁定日期）
  },

  onLoad() {
    session.viewPuzzle('s4-password')
    const snap = session.getSnapshot()
    if (snap) {
      this._applySnapshot(snap)
      return
    }
    // 深链或开发者工具直接打开本页时，先恢复存档，不能用当前时钟覆盖建档日。
    session.init({}).then((restored) => {
      this._applySnapshot(restored || {})
    }).catch(() => {
      this.setData({ progressError: '考察档案日期读取失败，请返回封面后重试。' })
    })
  },

  _applySnapshot(snap) {
    const key = sessionDate.isValidDateKey(snap.sessionDate)
      ? snap.sessionDate
      : sessionDate.dateKeyFromTimestamp(Date.now())
    this._dateKey = key
    const correct = session.isPuzzleComplete('s4-password')
    this.setData({
      archiveDate: sessionDate.formatDateKey(key),
      collectedNums: session.getCardDigits(snap),
      correct: correct,
      pwd: correct ? key : ''
    })
  },

  onInput(e) {
    // 仅允许数字，最多 8 位
    let v = (e.detail.value || '').replace(/\D/g, '').slice(0, 8)
    this.setData({ pwd: v, wrongTip: '' })
  },

  onShowHint() {
    session.viewHint('s4-password', 1)
    this.setData({ showHint: true })
  },

  onSubmit() {
    if (this.data.correct) return
    const input = this.data.pwd
    if (input.length < 8) {
      this.setData({ wrongTip: '请输入 8 位数字。' })
      return
    }
    const attempts = this.data.attempts + 1
    const expected = this._dateKey || sessionDate.dateKeyFromTimestamp(Date.now())
    if (input === expected) {
      session.attemptPuzzle('s4-password', attempts, true, 'numeric')
      this.setData({ correct: true, attempts: attempts, wrongTip: '' })
      session.completePuzzle('s4-password', { answer: input, attempts: attempts }, { station: 's4' })
        .catch(() => {
          this.setData({ progressError: '解锁成功，但进度尚未保存；点击下一步会自动重试。' })
        })
    } else {
      session.attemptPuzzle('s4-password', attempts, false, 'numeric')
      // 错 2 次给提示
      this.setData({
        attempts: attempts,
        wrongTip: '不对。再想想那些卡片角落的数字。',
        showHint: attempts >= 2
      })
      if (attempts === 2) session.viewHint('s4-password', 1)
    }
  },

  onGoFinale() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s4-password', {
      answer: this._dateKey,
      attempts: this.data.attempts || 1
    }, { station: 's4', checkpoint: 'finale' }).then(function () {
      wx.redirectTo({ url: '/plate21/module/pages/finale/finale' })
    }).catch(() => {
      this.setData({ advancing: false, progressError: '进度保存失败，请再次点击重试。' })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  }
})
