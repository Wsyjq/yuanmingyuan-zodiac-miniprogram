exports.error = function (e) {
  wx.showToast({ title: (e && e.message) || '保存失败，请重试', icon: 'none' })
}
exports.go = function (name) {
  const url = '/plate21/module/pages/' + name + '/' + name
  wx.navigateTo({ url, fail: () => wx.redirectTo({ url }) })
}
