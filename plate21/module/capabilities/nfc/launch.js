'use strict'

// DJ-06 只负责打开谐奇趣。query：from=nfc&prop=dj06。
// 贴到了不算过关，也不改当前页。

const PROP = 'dj06'
const SITE = 'xieqiqu'
const LINE = '喷泉声、少数民族音乐和西洋音乐'

function queryOf(input) {
  if (!input) return null
  if (typeof input === 'string') return parseSearch(input)
  if (input.query && typeof input.query === 'object') return input.query
  return input
}

function parseSearch(text) {
  const out = {}
  String(text).replace(/^\?/, '').split('&').forEach(function (part) {
    if (!part) return
    const bits = part.split('=')
    const key = decodeURIComponent(bits[0] || '')
    if (!key) return
    out[key] = decodeURIComponent(bits[1] || '')
  })
  return out
}

function parse(input) {
  const query = queryOf(input)
  if (!query) return null
  if (String(query.from || '') !== 'nfc') return null
  if (String(query.prop || '') !== PROP) return null
  return { from: 'nfc', prop: PROP, site: SITE }
}

function waypointUrl(launch) {
  const base = '/plate21/module/pages/waypoint/waypoint?site=' + SITE
  if (!launch) return base
  return base + '&from=nfc&prop=' + PROP
}

function gateUrl() {
  return '/pages/ticket/ticket?from=nfc&prop=' + PROP + '&next=' + SITE
}

module.exports = {
  PROP: PROP,
  SITE: SITE,
  LINE: LINE,
  parse: parse,
  waypointUrl: waypointUrl,
  gateUrl: gateUrl
}
