// 门票门页（gate）：整体买票制入口（用户 2026-09-18 拍板：门在模块最前 cover 前）。
// 状态机：checking（查权益）→ locked（未解锁，门票卡）→ paid（已解锁，放行 cover）；
// unavailable=宿主未提供付费能力（iOS 差异/类目受限），隐藏购买入口。
// 权益权威=宿主订单（checkEntitlement）；本地 flags.premiumUnlockedAt 仅缓存。
const session = require('../../store/session')

const COVER_URL = '/plate21/module/pages/walk/walk'

// 演示占位价：正式价格由宿主商品库配置下发到展示文案，模块零金额逻辑（契约 v1.4.0）。
const PRICE_TEXT = '¥ 19.9'

Page({
  data: {
    state: 'checking',
    priceText: PRICE_TEXT,
    purchasing: false
  },

  onLoad() {
    if (session.getSnapshot()) this.refresh()
    else session.init({}).then(() => this.refresh())
  },

  refresh() {
    session.checkPremiumUnlocked().then((unlocked) => {
      if (unlocked) {
        this.setData({ state: 'paid' })
        wx.redirectTo({ url: COVER_URL })
      } else {
        this.setData({ state: 'locked' })
      }
    })
  },

  onUnlock() {
    if (this.data.purchasing) return
    this.setData({ purchasing: true })
    session.purchaseUnlock('plate21_full').then((res) => {
      const status = res && res.status
      if (status === 'paid') {
        this.setData({ state: 'paid', purchasing: false })
        setTimeout(() => wx.redirectTo({ url: COVER_URL }), 600)
        return
      }
      this.setData({ purchasing: false })
      if (status === 'unavailable') {
        this.setData({ state: 'unavailable' })
        return
      }
      if (status === 'cancelled') {
        wx.showToast({ title: '已取消，门票随时可解锁', icon: 'none' })
        return
      }
      wx.showToast({ title: (res && res.reason) || '支付失败，请重试', icon: 'none' })
    }).catch(() => {
      this.setData({ purchasing: false })
      wx.showToast({ title: '支付发起失败，请重试', icon: 'none' })
    })
  },

  onBackHome() {
    wx.navigateBack({
      fail: function () { wx.reLaunch({ url: '/pages/index/index' }) }
    })
  }
})
