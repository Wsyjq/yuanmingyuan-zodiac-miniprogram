// LXGW WenKai v1.522 OFL project subset. Base64 avoids a CDN dependency and
// loadFontFace local-path restrictions in the Mini Program runtime.
// 注意：base64 模块必须在主包（app.js 是主包，不能 require 分包文件）
const PLATE21_WENKAI_B64 = require('./fonts/Plate21WenKai-Subset.b64.js')

App({
  onLaunch() {
    // Handwritten annotations only; global:true covers the main package and subpackage.
    if (wx.loadFontFace) {
      wx.loadFontFace({
        family: 'Plate21WenKai',
        source: 'url("data:font/truetype;base64,' + PLATE21_WENKAI_B64 + '")',
        global: true,
        scopes: ['webview', 'native'],
        success: () => console.log('[font] Plate21WenKai 加载成功'),
        fail: (e) => console.warn('[font] Plate21WenKai 加载失败', e && e.errMsg)
      })
    }
  }
})
