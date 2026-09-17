// 考察者留言簿：通关后的「档案 · 新增一页」。走完那条路的人留一句话，下一个来的人读到它。
// 状态机与 letter 同口径：notFinished（未完成考察）→ open（通关即可留言，不设日期门）。
// 数据：自己的话落 flags.boardDraft / boardSubmittedAt（与 report 明信片 messageDraft 语义分离——
// 明信片是写给整理档案的人的问题，留言簿是写给后来者的公开页）。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')
const boardSeeds = require('../../capabilities/board/seeds')

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
    // 留言墙确定性取张：同一会话固定看到同一面墙。
    const wall = boardSeeds.pickBoardMessages(snap.sessionId, WALL_COUNT).map((item, index) => ({
      text: item.text,
      from: item.from,
      date: item.date,
      tilt: index % 2 === 0 ? 'tilt-l' : 'tilt-r'
    }))
    this.setData({
      state: 'open',
      wall: wall,
      mine: flags.boardSubmittedAt ? { text: flags.boardDraft || '' } : null,
      editing: !flags.boardSubmittedAt,
      draftText: flags.boardDraft || '',
      letterReady: todayKey > sessionDay
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
    session.setFlag('boardDraft', text)
      .then(() => session.setFlag('boardSubmittedAt', Date.now()))
      .then(() => {
        this.setData({ submitting: false, mine: { text: text }, editing: false })
        wx.showToast({ title: '已在档案里了', icon: 'none' })
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
