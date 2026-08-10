/**
 * WXSS → CSS：rpx→px（750rpx = 375px 视口）、page 选择器 → body，
 * 变量 / keyframes / transition 原样保留。
 */
'use strict'

function convert(css) {
  if (!css) return ''
  // rpx → px
  css = css.replace(/(-?\d*\.?\d+)rpx\b/g, (m, num) => (parseFloat(num) / 2) + 'px')
  // page 选择器 → body（只替换作为独立选择器出现的 page）
  css = css.replace(/(^|[}\r\n,])\s*page(?=[\s,{])/gm, '$1\nbody')
  return css
}

module.exports = { convert }
