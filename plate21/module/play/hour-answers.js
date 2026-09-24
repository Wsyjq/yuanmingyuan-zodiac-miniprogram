'use strict'

// 14 时 = 未时羊。正午：午时值班是马，盛景是十二首齐喷。两种都算对。

function compact(text) {
  return String(text || '').replace(/\s+/g, '').replace(/[＋+、，,./／]/g, '')
}

function matchHour14(text) {
  const s = compact(text)
  if (!s) return false
  if (/不是羊|并非羊/.test(s)) return false
  return /羊/.test(s)
}

function matchNoon(text) {
  const s = compact(text)
  if (!s) return false
  if (/全部|十二|都喷|一起|同时|齐喷/.test(s)) return true
  if (/不是马|并非马/.test(s)) return false
  return /马/.test(s)
}

module.exports = {
  matchHour14: matchHour14,
  matchNoon: matchNoon
}
