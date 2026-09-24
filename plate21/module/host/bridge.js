'use strict'

let config = { mode: 'demo', host: {}, timeoutMs: 8000 }
function configure(input) {
  const next = input || {}
  config = Object.assign({ mode: 'demo', host: {}, timeoutMs: 8000 }, next)
  if (config.mode !== 'demo' && config.mode !== 'host') throw new Error('mode 必须是 demo 或 host')
  config.host = next.host || {}
  return getConfig()
}
function getConfig() { return Object.assign({}, config) }
function available(name) { return typeof config.host[name] === 'function' }
function call(name, input) {
  if (!available(name)) {
    const err = new Error('宿主未提供 ' + name); err.code = 'CAPABILITY_UNAVAILABLE'
    return Promise.reject(err)
  }
  const handler = config.host[name]
  return new Promise(function (resolve, reject) {
    let settled = false
    const timeout = setTimeout(function () {
      if (settled) return
      settled = true
      const err = new Error(name + ' 请求超时'); err.code = 'HOST_TIMEOUT'; reject(err)
    }, Math.max(1, Number(config.timeoutMs) || 8000))
    Promise.resolve().then(function () { return handler(input) }).then(function (value) {
      if (settled) return
      settled = true; clearTimeout(timeout); resolve(value)
    }, function (err) {
      if (settled) return
      settled = true; clearTimeout(timeout); reject(err)
    })
  })
}
module.exports = { configure, getConfig, available, call }
