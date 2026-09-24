'use strict'

// 不能把 resetBusy 挂在 Behavior 的 module.exports 上：
// 微信分包把 Behavior 导出编成字符串模块 id，赋值会抛
// "Cannot create property 'resetBusy' on string"。

let busy = false

function isBusy() {
  return busy
}

function setBusy(value) {
  busy = !!value
}

function resetBusy() {
  busy = false
}

module.exports = {
  isBusy: isBusy,
  setBusy: setBusy,
  resetBusy: resetBusy
}
