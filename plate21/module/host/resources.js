'use strict'
const bridge = require('./bridge')
function validRemote(value) { return typeof value === 'string' && /^https:\/\//i.test(value) && !/^https:\/\/(localhost|127(?:\.\d+){3}|\[::1\])(?=[:/]|$)/i.test(value) }
function resolve(path, type) {
  if (!path || typeof path !== 'string') return ''
  const config = bridge.getConfig().resources || {}
  const exact = (config.overrides || {})[path]
  if (validRemote(exact)) return exact
  const base = type === 'audio' ? config.audioBaseUrl : config.assetBaseUrl
  return validRemote(base) && path.charAt(0) === '/' ? base.replace(/\/$/, '') + path : path
}
module.exports = { resolve, validRemote }
