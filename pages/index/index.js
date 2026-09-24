Page({
  data: { opening: false },
  onRestart() {
    wx.navigateTo({ url: '/plate21/module/pages/walk/walk?entry=restart' })
  },
  onStart() {
    if (this.data.opening) return
    this.setData({ opening: true })
    wx.navigateTo({ url: '/plate21/module/pages/walk/walk', complete: () => this.setData({ opening: false }) })
  }
})
