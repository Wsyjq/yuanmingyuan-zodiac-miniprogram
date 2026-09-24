Page({
  onLoad(options) {
    const query = options || {}
    const keys = Object.keys(query)
    let url = '/pages/ticket/ticket'
    if (keys.length) {
      url += '?' + keys.map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(query[key] == null ? '' : query[key])
      }).join('&')
    }
    wx.redirectTo({
      url: url,
      fail: function (err) {
        wx.reLaunch({
          url: url,
          fail: function (err2) {
            wx.showModal({
              title: '门票没有打开',
              content: (err2 && err2.errMsg) || (err && err.errMsg) || '请从首页进入',
              showCancel: false
            })
          }
        })
      }
    })
  }
})
