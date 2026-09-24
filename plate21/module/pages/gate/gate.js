// 门票门页：未解锁显示支付；已支付过则直接进入封面。
const session = require('../../store/session')
const nfcLaunch = require('../../capabilities/nfc/launch')

const COVER_URL = '/plate21/module/pages/cover/cover'
const PRICE_TEXT = '¥ 19.9'

Page({
  data: {
    state: 'locked',
    priceText: PRICE_TEXT,
    purchasing: false
  },

  onShow() {
    try { require('../../store/trail').remember() } catch (err) {}
  },

  onLoad(options) {
    this.entry = options || {}
    const ready = session.getSnapshot()
      ? Promise.resolve()
      : session.init({}).catch(function () { return null })
    const self = this
    ready.then(function () { self.refresh() }).catch(function () {
      self.setData({ state: 'locked', purchasing: false })
    })
  },

  destination() {
    const launch = nfcLaunch.parse(this.entry)
    if (launch && this.entry.next === nfcLaunch.SITE) return nfcLaunch.waypointUrl(launch)
    return COVER_URL
  },

  refresh() {
    const self = this
    session.checkPremiumUnlocked().then(function (unlocked) {
      if (unlocked) {
        self.setData({ state: 'paid' })
        wx.redirectTo({ url: self.destination() })
        return
      }
      self.setData({ state: 'locked', purchasing: false })
    }).catch(function () {
      self.setData({ state: 'locked', purchasing: false })
    })
  },

  onUnlock() {
    if (this.data.purchasing || this.data.state === 'unavailable') return
    const self = this
    this.setData({ purchasing: true })
    session.purchaseUnlock('plate21_full').then(function (res) {
      const status = res && res.status
      if (status === 'paid') {
        self.setData({ state: 'paid', purchasing: false })
        wx.redirectTo({ url: self.destination() })
        return
      }
      self.setData({ purchasing: false })
      if (status === 'unavailable') {
        self.setData({ state: 'unavailable' })
        return
      }
      if (status === 'cancelled') {
        wx.showToast({ title: '已取消', icon: 'none' })
        return
      }
      wx.showToast({ title: (res && res.reason) || '支付失败，请重试', icon: 'none' })
    }).catch(function () {
      self.setData({ purchasing: false })
      wx.showToast({ title: '支付发起失败，请重试', icon: 'none' })
    })
  },

  onBackHome() {
    wx.navigateBack({
      fail: function () { wx.reLaunch({ url: '/pages/index/index' }) }
    })
  }
})
