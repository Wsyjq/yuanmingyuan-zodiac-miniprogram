App({
  // Official hosts provide this same configuration on their App instance.
  plate21Host: { mode: 'demo' },
  onShow(options) {
    const query = options && options.query || {}
    if (query.from === 'nfc' && query.prop === 'dj06') {
      const stack = getCurrentPages()
      const top = stack[stack.length - 1]
      if (!top || top.route !== 'plate21/module/pages/walk/walk') wx.navigateTo({ url: '/plate21/module/pages/walk/walk?from=nfc&prop=dj06' })
    }
  }
})
