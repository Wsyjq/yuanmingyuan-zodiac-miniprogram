'use strict'

// 把 statusBarHeight 写入 data，供页面根元素设 --sbh CSS 变量，
// 使绝对定位的页签 / 贴纸能避开状态栏与微信胶囊。
module.exports = Behavior({
  data: {
    statusBarHeight: 20
  },
  lifetimes: {
    attached: function () {
      try {
        var info = wx.getWindowInfo()
        this.setData({ statusBarHeight: info.statusBarHeight || 20 })
      } catch (e) {
        this.setData({ statusBarHeight: 20 })
      }
    }
  }
})
