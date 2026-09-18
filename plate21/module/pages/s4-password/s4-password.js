// 第四站收口 · 八位日期（V2.1：密码是加料，不是门）
// 剧情：八张卡片角落的数字连起来 = 建档日 YYYYMMDD。连上就填进空栏；缺卡也出报告，不卡死。
// 校验口径：会话锁定日期 YYYYMMDD；跳过通道与答对通道都完成第四站并进入 finale。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')
const audioSrc = require('../../utils/audio-src')
const audioBus = require('../../utils/audio-bus')

Page({
  data: {
    narrSrc: audioSrc.clip('narr-s4-password'),
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

  // 缺卡通道（V2.1：密码缺卡不卡死）：不连数字，直接摊开档案进结局。
  onSkipPassword() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.attemptPuzzle('s4-password', this.data.attempts, true, 'skip')
    session.completePuzzle('s4-password', { action: 'skipped', attempts: this.data.attempts }, {
      station: 's4',
      checkpoint: 'finale'
    }).then(function () {
      wx.redirectTo({ url: '/plate21/module/pages/finale/finale' })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  },

  onSubmit() {
    // V2.3：答题交互起，压停正在播的人声（做题与听讲不打架）
    audioBus.stopKind('voice')
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
