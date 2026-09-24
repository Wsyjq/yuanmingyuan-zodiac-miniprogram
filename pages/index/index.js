// 次日回访：通关（finale || experienceCompletedAt）且过了 sessionDate 次日，
// 在入口处显示「档案 · 新增一页」回访卡，直达留言簿。
// 主包页面不 require 分包 JS（微信分包规则），改直读演示宿主的会话存储约定：
// key = plate21_session，envelope = { snapshot, ops }（local-adapter 写入）。
// 真实接入（A1 宿主 Adapter）时，宿主自行决定该数据源。
const SESSION_ENVELOPE_KEY = 'plate21_session'

// 与 plate21/module/utils/session-date.js 同口径的轻量实现（主包内联，避免跨分包引用）。
function dateKeyFromTimestamp(timestamp) {
  const date = new Date(Number(timestamp))
  return String(date.getFullYear()) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
}

function isValidDateKey(value) {
  return /^\d{8}$/.test(String(value || ''))
}

function readRevisitState() {
  try {
    const env = wx.getStorageSync(SESSION_ENVELOPE_KEY)
    const snap = env && env.snapshot
    if (!snap) return { revisitReady: false, revisitDone: false }
    const flags = snap.flags || {}
    const finished = !!(snap.finale || flags.experienceCompletedAt)
    const todayKey = dateKeyFromTimestamp(Date.now())
    const sessionDay = isValidDateKey(snap.sessionDate) ? snap.sessionDate : null
    return {
      revisitReady: finished && !!sessionDay && todayKey > sessionDay,
      revisitDone: !!flags.boardSubmittedAt
    }
  } catch (err) {
    return { revisitReady: false, revisitDone: false }
  }
}

Page({
  data: {
    revisitReady: false,
    revisitDone: false
  },

  onLoad(options) {
    this.entry = options || {}
  },

  onShow() {
    this.setData(readRevisitState())
  },

  goPlate21() {
    let url = '/pages/ticket/ticket'
    const entry = this.entry || {}
    if (entry.from === 'nfc' && entry.prop === 'dj06') {
      url += '?from=nfc&prop=dj06&next=xieqiqu'
    }
    wx.navigateTo({
      url: url,
      fail: function () { wx.reLaunch({ url: url }) }
    })
  },

  goRevisit() {
    wx.navigateTo({ url: '/plate21/module/pages/board/board' })
  },

  goAtlas() {
    wx.navigateTo({ url: '/plate21/module/pages/atlas/atlas' })
  },

  goArchive() {
    wx.navigateTo({ url: '/plate21/module/pages/archive/archive' })
  },

  goHandbook() {
    wx.navigateTo({
      url: '/plate21/module/pages/handbook/handbook',
      fail: function () { wx.showToast({ title: '完成一次考察后可打开手册', icon: 'none' }) }
    })
  }
})
