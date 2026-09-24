'use strict'
const PROP = 'dj06'
function parse(input) {
  let query = input && input.query || input || {}
  if (typeof query === 'string') {
    const parsed = {}
    try { query.replace(/^\?/, '').split('&').forEach(function (part) {
      const pair = part.split('='); parsed[decodeURIComponent(pair[0] || '')] = decodeURIComponent(pair.slice(1).join('='))
    }) } catch (err) { return null }
    query = parsed
  }
  return query.from === 'nfc' && query.prop === PROP ? { from: 'nfc', prop: PROP, site: 'xieqiqu' } : null
}
function walkUrl() { return '/plate21/module/pages/walk/walk?from=nfc&prop=dj06' }
module.exports = { PROP, SITE: 'xieqiqu', LINE: '喷泉声、少数民族音乐和西洋音乐', parse, walkUrl }
