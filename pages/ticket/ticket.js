const paid = require('./paid')

function readEnvelope() {
  try {
    const env = wx.getStorageSync(paid.SESSION_KEY)
    return env && typeof env === 'object' ? env : {}
  } catch (err) {
    return {}
  }
}

function markPaid() {
  const next = paid.withPaidFlags(readEnvelope(), Date.now())
  wx.setStorageSync(paid.SESSION_KEY, next)
}

function failText(err) {
  return (err && err.errMsg) || '分包没有打开'
}

function openDestination(url, done) {
  let settled = false
  function finish(err) {
    if (settled) return
    settled = true
    if (typeof done === 'function') done(err || null)
  }

  function go() {
    wx.redirectTo({
      url: url,
      fail: function (err) {
        wx.reLaunch({
          url: url,
          fail: function (err2) {
            wx.showModal({
              title: '没有跳转出去',
              content: failText(err2 || err),
              showCancel: false
            })
            finish(err2 || err)
          },
          success: function () { finish(null) }
        })
      },
      success: function () { finish(null) }
    })
  }

  go()
  setTimeout(function () {
    if (settled) return
    wx.showModal({
      title: '没有跳转出去',
      content: '封面没有打开',
      showCancel: false
    })
    finish({ errMsg: '跳转超时，封面没有打开' })
  }, 6000)
}

Page({
  data: {
    label: '解锁完整考察',
    busy: false
  },

  onLoad(options) {
    this.entry = options || {}
  },

  onShow() {
    this.setData({
      busy: false,
      label: paid.alreadyPaid(readEnvelope()) ? '进入考察' : '解锁完整考察'
    })
  },

  onUnlock() {
    if (this.data.busy) return
    this.setData({ busy: true, label: '正在进入……' })
    try {
      markPaid()
    } catch (err) {
      this.setData({ busy: false, label: '解锁完整考察' })
      wx.showModal({
        title: '没有记下门票',
        content: (err && err.message) || '本地档案写失败',
        showCancel: false
      })
      return
    }
    const self = this
    openDestination(paid.destination(this.entry), function (err) {
      if (!err) return
      self.setData({
        busy: false,
        label: paid.alreadyPaid(readEnvelope()) ? '进入考察' : '解锁完整考察'
      })
    })
  },

  onBack() {
    if (this.data.busy) return
    wx.navigateBack({
      fail: function () { wx.reLaunch({ url: '/pages/index/index' }) }
    })
  }
})
