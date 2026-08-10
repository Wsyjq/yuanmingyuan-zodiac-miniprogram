/**
 * Anime.js 入口封装（Anime.js v4.5.0，MIT License，见 vendor/anime.umd.min.js 文件头与 assets/NOTICE.md）
 *
 * 环境垫片：小程序 JSCore 无 window/document，anime 引擎主循环回退到 setImmediate/clearImmediate，
 * 而小程序同样没有这两个 API（且在 require vendor 包时就会取值），因此必须先把垫片挂到全局
 * 再 require vendor 文件。用 setTimeout(~16ms) 近似 requestAnimationFrame 帧率。
 *
 * 只使用对普通 JS 对象的数值补间能力（animate / easings / stagger），
 * 不碰任何 DOM 相关模块（$ / svg / text / waapi 等）。数值经 onUpdate 回读后再 setData。
 */

var g = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : {})
if (typeof g.setImmediate === 'undefined') {
  g.setImmediate = function (fn) { return setTimeout(fn, 16) }
  g.clearImmediate = function (id) { clearTimeout(id) }
}

module.exports = require('../vendor/anime.umd.min.js')
