'use strict'
// GPS is requested only after a deliberate tap; never saved to the game record.
function locate() {
  return new Promise((resolve, reject) => {
    if (typeof wx === 'undefined' || !wx.getLocation) return reject(new Error('当前环境不支持定位，请对照实体地图与现场标识。'))
    wx.getLocation({ type: 'gcj02', success: resolve, fail: () => reject(new Error('未能获取位置，请检查微信定位权限后重试；仍可查看考察路线。')) })
  })
}
module.exports = { locate }
