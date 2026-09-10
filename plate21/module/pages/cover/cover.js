// P00 封面 / 入口（设计文档 §5-P00）
// 进入时 init 会话恢复进度；按快照决定「开始考察」或「继续考察 + 重新考察」。
const session = require('../../store/session')
const progressFlow = require('../../store/progress-flow')
const sessionDate = require('../../utils/session-date')
const PROLOGUE_URL = '/plate21/module/pages/prologue/prologue'

Page({
  data: {
    hasRecord: false,
    completed: false,
    showHelp: false,
    helpClosing: false,   // INT-301：玩法浮层离场动画中间态
    showRestartConfirm: false,
    restarting: false,
    loading: true,
    navigating: false,
    archiveDate: ''
  },

  onLoad() {
    session.init({}).then((snap) => {
      this.setData({
        hasRecord: this.hasProgress(snap),
        completed: this.isCompleted(snap),
        archiveDate: sessionDate.formatArchiveDate(snap.sessionDate),
        loading: false
      })
    }).catch(() => {
      this.setData({ loading: false })
      wx.showToast({ title: '档案恢复失败，可重新进入', icon: 'none' })
    })
  },

  onShow() { this.setData({ navigating: false }); const snap=session.getSnapshot(); if(snap)this.setData({hasRecord:this.hasProgress(snap),completed:this.isCompleted(snap)}) },

  onJourney() { wx.navigateTo({url:"/plate21/module/pages/journey/journey"}) },

  // 快照中是否有任何完成记录或进行中的现场照片。
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

  // 「继续考察」精确恢复到谜题或交接状态。
  resumeUrl() {
    const snap = session.getSnapshot() || {}
    return progressFlow.routeForCheckpoint(progressFlow.deriveCheckpoint(snap))
  },

  onStart() {
    if (this.data.navigating) return
    this.setData({ navigating: true })
    wx.navigateTo({ url: PROLOGUE_URL, fail: () => this.setData({ navigating: false }) })
  },

  onContinue() {
    if (this.data.navigating) return
    this.setData({ navigating: true })
    wx.navigateTo({ url: this.resumeUrl(), fail: () => this.setData({ navigating: false }) })
  },

  onRestart() {
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
        archiveDate: sessionDate.formatArchiveDate(snap.sessionDate)
      })
      wx.navigateTo({ url: PROLOGUE_URL })
    }).catch(() => {
      this.setData({ restarting: false })
      wx.showToast({ title: '重新考察失败，请重试', icon: 'none' })
    })
  },

  onHandbook() {
    wx.navigateTo({ url: '/plate21/module/pages/handbook/handbook' })
  },

  onShowHelp() {
    this.setData({ showHelp: true })
  },

  // INT-301：玩法浮层关闭走淡出动画（0.25s）后再卸载
  onCloseHelp() {
    if (this.data.helpClosing) return
    this.setData({ helpClosing: true })
    this._helpTimer = setTimeout(() => {
      this._helpTimer = null
      this.setData({ showHelp: false, helpClosing: false })
    }, 250)
  },

  onUnload() {
    if (this._helpTimer) clearTimeout(this._helpTimer)
  },

  noop() {}
})
