'use strict'

const SESSION_KEY = 'plate21_session'
const COVER_URL = '/plate21/module/pages/cover/cover'
const TICKET_URL = '/pages/ticket/ticket'
const WAYPOINT_XIEQIQU = '/plate21/module/pages/waypoint/waypoint?site=xieqiqu&from=nfc&prop=dj06'

function dateKey(now) {
  const date = new Date(Number(now) || Date.now())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return String(date.getFullYear()) + month + day
}

function newSnapshot(now) {
  return {
    schemaVersion: 2,
    sessionId: 'local-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 10),
    revision: 0,
    sessionDate: dateKey(now),
    checkpoint: 'prologue',
    stations: { s1: false, s2: false, s3: false, s4: false },
    puzzles: {},
    cards: {},
    records: [],
    flags: {},
    finale: false,
    createdAt: now,
    updatedAt: now
  }
}

function alreadyPaid(env) {
  const flags = env && env.snapshot && env.snapshot.flags
  return !!(flags && (flags.premiumUnlockedAt || flags.premiumEntitlement))
}

function withPaidFlags(env, now) {
  const at = Number(now) || Date.now()
  const next = env && typeof env === 'object' ? JSON.parse(JSON.stringify(env)) : {}
  if (!next.snapshot || typeof next.snapshot !== 'object') {
    next.snapshot = newSnapshot(at)
  } else if (!next.snapshot.sessionId) {
    next.snapshot.sessionId = 'local-' + at.toString(36) + '-' + Math.random().toString(36).slice(2, 10)
    if (!next.snapshot.schemaVersion) next.snapshot.schemaVersion = 2
    if (!next.snapshot.createdAt) next.snapshot.createdAt = at
  }
  if (!next.ops || typeof next.ops !== 'object') next.ops = {}
  if (!next.snapshot.flags || typeof next.snapshot.flags !== 'object') next.snapshot.flags = {}
  const prevEnt = next.snapshot.flags.premiumEntitlement
  next.snapshot.flags.premiumUnlockedAt = at
  next.snapshot.flags.premiumEntitlement = {
    sku: 'plate21_full',
    entitlementId: (prevEnt && prevEnt.entitlementId) || ('local-ent-ticket-' + at.toString(36)),
    unlockedAt: at
  }
  next.snapshot.updatedAt = at
  return next
}

function destination(query) {
  const q = query || {}
  if (String(q.from || '') === 'nfc' && String(q.prop || '') === 'dj06') return WAYPOINT_XIEQIQU
  return COVER_URL
}

function ticketUrl(query) {
  const q = query || {}
  const keys = Object.keys(q)
  if (!keys.length) return TICKET_URL
  const search = keys.map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(q[key] == null ? '' : q[key])
  }).join('&')
  return TICKET_URL + '?' + search
}

module.exports = {
  SESSION_KEY: SESSION_KEY,
  COVER_URL: COVER_URL,
  TICKET_URL: TICKET_URL,
  alreadyPaid: alreadyPaid,
  withPaidFlags: withPaidFlags,
  destination: destination,
  ticketUrl: ticketUrl
}
