// v2 大水法 · 留白站（顺路支线）：不给道具、不设谜题、不要求任何输入。
// 结构按 v2 逐秒规格：一句话 → 两分钟完全静默（无旁白无配乐，只留现场声音）
// → 一句话三选一（可跳过，全程唯一一次操作）→ 玩家自行离开。
const session = require('../../store/session')

const SILENCE_SECONDS = 120
const CHOICES = ['风声', '人声与鸟鸣', '几乎什么都听不到']

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m + ':' + (s < 10 ? '0' + s : s)
}

Page({
  data: {
    stage: 'intro', // intro → silence → question → done
    remain: SILENCE_SECONDS,
    remainLabel: fmt(SILENCE_SECONDS),
    progress: 0,
    choices: CHOICES,
    choice: ''
  },

  onStart() {
    this.setData({ stage: 'silence', remain: SILENCE_SECONDS, remainLabel: fmt(SILENCE_SECONDS), progress: 0 })
    this.recordVisit()
    this._timer = setInterval(() => {
      const remain = this.data.remain - 1
      if (remain <= 0) {
        this.finishSilence()
        return
      }
      this.setData({
        remain: remain,
        remainLabel: fmt(remain),
        progress: Math.round(((SILENCE_SECONDS - remain) / SILENCE_SECONDS) * 100)
      })
    }, 1000)
  },

  // 静默可提前结束（轻推），不强迫滞留——正式落地前需与园方确认现场秩序（v2 待确认项）。
  onEndSilenceEarly() {
    this.finishSilence()
  },

  finishSilence() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
    this.setData({ stage: 'question', remain: 0, progress: 100 })
  },

  onChoose(e) {
    if (this.data.stage !== 'question') return
    const choice = e.currentTarget.dataset.choice
    this.setData({ stage: 'done', choice: choice })
    this.recordChoice(choice)
  },

  onSkipQuestion() {
    if (this.data.stage !== 'question') return
    this.setData({ stage: 'done', choice: '' })
    this.recordChoice('skipped')
  },

  // 三选一不评判、不统计展示；只落一份记录。
  recordChoice(value) {
    try {
      const snap = session.getSnapshot()
      if (snap) session.setFlag('dashuifaChoice', value).catch(() => {})
    } catch (e) { /* 忽略 */ }
  },

  recordVisit() {
    try {
      const snap = session.getSnapshot()
      if (!snap || (snap.flags && snap.flags.sideVisited_dashuifa)) return
      session.setFlag('sideVisited_dashuifa', Date.now())
        .then(() => { session.emit({ name: 'side_visited', site: 'dashuifa' }) })
        .catch(() => {})
    } catch (e) { /* 忽略 */ }
  },

  onNext() {
    wx.redirectTo({
      url: '/plate21/module/pages/waypoint/waypoint?site=xianfahua',
      fail: () => wx.showToast({ title: '页面跳转失败，请重试', icon: 'none' })
    })
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  }
})
