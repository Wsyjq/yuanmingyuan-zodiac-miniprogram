// P00 封面 / 入口（设计文档 §5-P00）
// 进入时 init 会话恢复进度；按快照决定「开始考察」或「继续考察 + 重新考察」。
// 门票守卫（2026-09-18）：深链直达 cover 时自查权益，未解锁 redirect 回 gate 门页。
// 开玩引导：封面短标签两步，再短暂跳后页分别指听/导览/地图/提示/翻页。玩法说明仅事后查阅。
const session = require('../../store/session')
const progressFlow = require('../../store/progress-flow')
const sessionDate = require('../../utils/session-date')
const playGuide = require('../../capabilities/play-guide/guide')
const coachHost = require('../../capabilities/play-guide/coach-host')
const coachBusy = require('../../capabilities/play-guide/coach-busy')
const PROLOGUE_URL = '/plate21/module/pages/prologue/prologue'
const GATE_URL = '/pages/ticket/ticket'

function windowSize() {
  const info = (wx.getWindowInfo && wx.getWindowInfo()) || wx.getSystemInfoSync() || {}
  return {
    windowWidth: info.windowWidth || 375,
    windowHeight: info.windowHeight || 812
  }
}

Page({
  behaviors: [coachHost],
  data: {
    hasRecord: false,
    completed: false,
    showGuide: false,
    guideClosing: false,
    showRestartConfirm: false,
    restarting: false,
    loading: false,
    navigating: false,
    archiveDate: ''
  },

  onLoad() {
    this.setData({ coachWin: windowSize() })
    session.init({}).then((snap) => {
      return session.checkPremiumUnlocked().then((unlocked) => {
        if (!unlocked) {
          this.setData({ loading: false, navigating: false, hasRecord: false })
          return
        }
        const hasRecord = this.hasProgress(snap)
        const completed = this.isCompleted(snap)
        const steps = playGuide.coverSteps(hasRecord, completed)
        const showCoach = playGuide.shouldShow(snap) && !hasRecord
        this.setData({
          hasRecord: hasRecord,
          completed: completed,
          archiveDate: sessionDate.formatArchiveDate(snap.sessionDate),
          loading: false,
          navigating: false
        })
        if (showCoach) {
          playGuide.resetTour()
          const self = this
          const kick = function () { self.beginCoach(steps, null) }
          if (wx.nextTick) wx.nextTick(kick)
          else setTimeout(kick, 0)
        }
      })
    }).catch(() => {
      this.setData({ loading: false })
      wx.showToast({ title: '档案恢复失败，可重新进入', icon: 'none' })
    })
  },

  onShow() {
    this.setData({ navigating: false })
  },

  hasProgress(snap) {
    if (!snap) return false
    if (progressFlow.deriveCheckpoint(snap) !== 'prologue') return true
    if (Object.keys(snap.puzzles || {}).length || Object.keys(snap.cards || {}).length) return true
    const flags = snap.flags || {}
    return !!(snap.records && snap.records.length) || !!snap.finale ||
      !!flags.s2PhotoDraft || !!flags.s2PhotoRecord
  },

  isCompleted(snap) {
    return !!(snap && snap.flags && snap.flags.experienceCompletedAt)
  },

  resumeUrl() {
    const snap = session.getSnapshot() || {}
    return progressFlow.routeForCheckpoint(progressFlow.deriveCheckpoint(snap))
  },

  onStart() {
    if (this.data.navigating || this.data.showGuide) return
    if (this.data.showCoach) {
      playGuide.resetTour()
      coachBusy.resetBusy()
      this.setData({ showCoach: false, coachHole: null })
      session.setFlag(playGuide.FLAG, Date.now()).catch(function () {})
    }
    this.goPrologue()
  },

  goPrologue() {
    if (this.data.navigating) return
    this.setData({ navigating: true })
    wx.navigateTo({ url: PROLOGUE_URL, fail: () => this.setData({ navigating: false }) })
  },

  onContinue() {
    if (this.data.navigating) return
    if (this.data.showCoach) {
      playGuide.resetTour()
      coachBusy.resetBusy()
      this.setData({ showCoach: false, coachHole: null })
    }
    this.setData({ navigating: true })
    wx.navigateTo({ url: this.resumeUrl(), fail: () => this.setData({ navigating: false }) })
  },

  onRestart() {
    if (this.data.showCoach) return
    this.setData({ showRestartConfirm: true })
  },

  onCancelRestart() {
    if (this.data.restarting) return
    this.setData({ showRestartConfirm: false })
  },

  onConfirmRestart() {
    if (this.data.restarting) return
    this.setData({ restarting: true })
    return session.reset().then((snap) => {
      this.setData({
        restarting: false,
        showRestartConfirm: false,
        hasRecord: false,
        completed: false,
        navigating: false,
        showCoach: false,
        archiveDate: sessionDate.formatArchiveDate(snap.sessionDate)
      })
    }).catch(() => {
      this.setData({ restarting: false })
      wx.showToast({ title: '重新考察失败，请重试', icon: 'none' })
    })
  },

  onHandbook() {
    if (this.data.showCoach) {
      this.onCoachNext()
      return
    }
    wx.navigateTo({ url: '/plate21/module/pages/handbook/handbook' })
  },

  onShowHelp() {
    if (this.data.navigating) return
    if (this.data.showCoach) {
      this.onCoachNext()
      return
    }
    this.setData({ showGuide: true, guideClosing: false })
  },

  onGuideNext() {
    this.closeCatalog()
  },

  onGuideSkip() {
    this.closeCatalog()
  },

  closeCatalog() {
    if (this.data.guideClosing) return
    this.setData({ guideClosing: true })
    this._guideTimer = setTimeout(() => {
      this._guideTimer = null
      this.setData({ showGuide: false, guideClosing: false })
    }, 250)
  },

  onReady() {
    if (this.data.showCoach) this.measureCoach()
  },

  onUnload() {
    if (this._coachTimer) clearTimeout(this._coachTimer)
    if (this._guideTimer) clearTimeout(this._guideTimer)
  },

  noop() {}
})
