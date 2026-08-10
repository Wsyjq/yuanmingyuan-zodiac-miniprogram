/**
 * WXSS → CSS：rpx→vw（750rpx = 100vw）、page 选择器 → body，
 * 变量 / keyframes / transition 原样保留。
 */
'use strict'

function convert(css) {
  if (!css) return ''
  // rpx → vw，使同一份台架 HTML 可验证 320 / 375 / 430 三类视口。
  css = css.replace(/(-?\d*\.?\d+)rpx\b/g, (m, num) => {
    const value = Math.round((parseFloat(num) / 7.5) * 1000000) / 1000000
    return value + 'vw'
  })
  // page 选择器 → body（只替换作为独立选择器出现的 page）
  css = css.replace(/(^|[}\r\n,])\s*page(?=[\s,{])/gm, '$1\nbody')
  return css
}

module.exports = { convert }
