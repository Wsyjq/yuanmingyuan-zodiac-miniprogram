// 走过的页面。前进用 redirectTo 会清掉页面栈，返回只沿这条记录退，不提供跳到后面的入口。
'use strict'

const KEY = 'plate21_trail'

function read() {
  try {
    const list = wx.getStorageSync(KEY)
    return Array.isArray(list) ? list : []
  } catch (err) {
    return []
  }
}

function write(list) {
  try {
    wx.setStorageSync(KEY, list)
  } catch (err) {}
}

function currentUrl() {
  const pages = getCurrentPages()
  const cur = pages[pages.length - 1]
  if (!cur || !cur.route) return ''
  const route = '/' + cur.route
  if (route.indexOf('/pages/index/index') >= 0) return ''
  const opt = cur.options || {}
  const query = Object.keys(opt).map(function (key) {
    return key + '=' + encodeURIComponent(opt[key] == null ? '' : opt[key])
  }).join('&')
  return query ? route + '?' + query : route
}

function remember() {
  const url = currentUrl()
  if (!url) return
  const trail = read()
  if (trail[trail.length - 1] === url) return
  trail.push(url)
  write(trail.length > 40 ? trail.slice(-40) : trail)
}

function popBack() {
  const url = currentUrl()
  const trail = read()
  if (url && trail[trail.length - 1] === url) trail.pop()
  const prev = trail[trail.length - 1] || ''
  write(trail)
  if (!prev || prev === url) return ''
  return prev
}

function clear() {
  write([])
}

module.exports = {
  KEY: KEY,
  remember: remember,
  popBack: popBack,
  clear: clear
}
