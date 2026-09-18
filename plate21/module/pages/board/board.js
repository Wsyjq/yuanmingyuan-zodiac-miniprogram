// 考察者留言簿：「写」发生在通关当天 report 末尾，「读」在次日回访与信末。
// 状态机与 letter 同口径：notFinished（未完成考察）→ open（通关即可留言，不设日期门）。
// 数据：提交走 session.submitBoardMessage（宿主机检+人工审，rejected 不同意上墙不落已投递态）；
// 自己的话同时落 flags.boardDraft/boardSubmittedAt（本地卡片与 report 入口态）。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')

const WALL_COUNT = 6

Page({
  data: {
    state: 'loading',
    mine: null,
    editing: false,
    draftText: '',
    submitting: false,
    wall: [],
    letterReady: false
  },

  onLoad() {
    if (session.getSnapshot()) this.refresh()
    else session.init({}).then(() => this.refresh())
  },

  refresh() {
    const snap = session.getSnapshot() || {}
    const flags = snap.flags || {}
    const finished = !!(snap.finale || flags.experienceCompletedAt)
    if (!finished) {
      this.setData({ state: 'notFinished' })
      return
    }
    const todayKey = sessionDate.dateKeyFromTimestamp(Date.now())
    const sessionDay = sessionDate.isValidDateKey(snap.sessionDate) ? snap.sessionDate : todayKey
    this.setData({
      state: 'open',
      wall: [],
      mine: flags.boardSubmittedAt ? { text: flags.boardDraft || '' } : null,
      editing: !flags.boardSubmittedAt,
      draftText: flags.boardDraft || '',
      letterReady: todayKey > sessionDay
    })
    // 留言墙走 adapter 展示池（过审内容；宿主不可用回落官方种子池）
    session.listBoardMessages({ limit: WALL_COUNT }).then((res) => {
      const wall = (res && res.messages || []).map((item, index) => ({
        text: item.text,
        from: item.from,
        date: item.date,
        tilt: index % 2 === 0 ? 'tilt-l' : 'tilt-r'
      }))
      this.setData({ wall: wall })
    }).catch(() => {
      this.setData({ wall: [] })
    })
  },

  onInput(e) {
    this.setData({ draftText: e.detail.value })
  },

  onSubmit() {
    const text = (this.data.draftText || '').trim()
    if (!text) {
      wx.showToast({ title: '写下那句话，再投进档案', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    session.submitBoardMessage(text)
      .then((res) => {
        if (res && res.status === 'rejected') {
          this.setData({ submitting: false })
          wx.showToast({ title: res.reason || '这条话不能展示，改一句再投', icon: 'none' })
          return
        }
        this.setData({ submitting: false, mine: { text: text }, editing: false })
        wx.showToast({
          title: res && res.status === 'accepted' ? '已在档案里了' : '已收到，审核后会展示给后来的人',
          icon: 'none'
        })
      })
      .catch(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '投递失败，请重试', icon: 'none' })
      })
  },

  onEdit() {
    this.setData({ editing: true, draftText: this.data.mine ? this.data.mine.text : '' })
  },

  onOpenLetter() {
    if (!this.data.letterReady) {
      wx.showToast({ title: '明日启封', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/plate21/module/pages/letter/letter' })
  },

  onOpenReport() {
    wx.navigateTo({ url: '/plate21/module/pages/report/report' })
  },

  onBack() {
    wx.navigateBack({
      fail: function () { wx.reLaunch({ url: '/pages/index/index' }) }
    })
  }
})
