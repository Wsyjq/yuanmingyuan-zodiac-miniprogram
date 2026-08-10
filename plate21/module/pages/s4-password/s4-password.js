// 第四站 · 末题 密码输入（采风修订版玩法核心主线收口）
// 剧情：之前每张卡片角落都有一个数字，连起来竟然是今日的日期。
// 校验口径：会话锁定日期 YYYYMMDD，对应一路收集的八张卡片。
// 输入正确 → 谜题与第四站原子落库 → 玩家确认后进入反转揭示 finale。
const session = require('../../store/session')

function currentDateKey() {
  const d = new Date()
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return yyyy + mm + dd
}

function dateText(key) {
  return key.slice(0, 4) + ' 年 ' + Number(key.slice(4, 6)) + ' 月 ' + Number(key.slice(6, 8)) + ' 日'
}

Page({
  data: {
    pwd: '',
    attempts: 0,
    showHint: false,
    hint: '密码从何而来？我突然想起来之前收集到的每张卡片角落都有一个数字，连起来试试看——那串数字，对应的是本次考察锁定的日期。',
    wrongTip: '',
    today: '',
    correct: false,
    advancing: false,
    progressError: '',
    collectedNums: []   // 已收集的卡片数字（主线：连起来 = 本次考察锁定日期）
  },

  onLoad() {
    session.viewPuzzle('s4-password')
    // 读取一路上收集的卡片数字，展示给玩家作为密码提示（剧情："连起来试试看"）
    const snap = session.getSnapshot() || {}
    const key = /^\d{8}$/.test(snap.sessionDate || '') ? snap.sessionDate : currentDateKey()
    this._dateKey = key
    const correct = session.isPuzzleComplete('s4-password')
    this.setData({
      today: dateText(key),
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
    const expected = this._dateKey || currentDateKey()
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
