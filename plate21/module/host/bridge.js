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
  const requestConfig = config
  function contextError() { const err = new Error('宿主身份配置已变化，请重新进入'); err.code = 'CONTEXT_CHANGED'; return err }
  return new Promise(function (resolve, reject) {
    let settled = false
    const timeout = setTimeout(function () {
      if (settled) return
      settled = true
      const err = new Error(name + ' 请求超时'); err.code = 'HOST_TIMEOUT'; reject(config !== requestConfig ? contextError() : err)
    }, Math.max(1, Number(config.timeoutMs) || 8000))
    Promise.resolve().then(function () {
      if (config !== requestConfig) throw contextError()
      return handler(input)
    }).then(function (value) {
      if (settled) return
      settled = true; clearTimeout(timeout)
      if (config !== requestConfig) reject(contextError())
      else resolve(value)
    }, function (err) {
      if (settled) return
      settled = true; clearTimeout(timeout); reject(config !== requestConfig ? contextError() : err)
    })
  })
}
module.exports = { configure, getConfig, available, call }
