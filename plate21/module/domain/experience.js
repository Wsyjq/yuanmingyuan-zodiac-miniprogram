'use strict'
const config = require('../config/experience')
const COPY = (x) => JSON.parse(JSON.stringify(x))
const validId = (id) =>
  typeof id === 'string' &&
  /^[a-zA-Z0-9_-]{1,80}$/.test(id) &&
  !['__proto__', 'constructor', 'prototype'].includes(id)
function fields(s) {
  s.preferences = Object.assign({ mode: 'adult' }, s.preferences || {})
  s.visits = s.visits || {}
  s.reading = s.reading || {}
  s.journal = s.journal || {}
  s.echo = s.echo || {}
  return s
}
function apply(input, c, now) {
  const s = fields(COPY(input))
  const at = Number(now) || Date.now()
  if (c.type === 'visit') {
    if (!config.node(c.nodeId) || !['visited', 'later', 'skipped'].includes(c.status))
      throw new Error('无效游览状态')
    const prior = s.visits[c.nodeId] || {}
    const status = c.status === 'visited' && prior.status ? prior.status : c.status
    s.visits[c.nodeId] = { status, visitedAt: prior.visitedAt || at, updatedAt: at }
    s.visitCheckpoint = c.nextId || c.nodeId
    if (!config.node(s.visitCheckpoint)) throw new Error('无效游览位置')
  } else if (c.type === 'preferences') {
    if (!config.MODES.some((x) => x.id === c.mode)) throw new Error('无效参与方式')
    s.preferences.mode = c.mode
  } else if (c.type === 'reading') {
    if (!validId(c.id)) throw new Error('无效资料编号')
    const old = s.reading[c.id] || {}
    s.reading[c.id] = Object.assign({}, old, { updatedAt: at })
    for (const key of ['favorite', 'later', 'completed'])
      if (typeof c[key] === 'boolean') s.reading[c.id][key] = c[key]
    if (Number.isFinite(c.position)) s.reading[c.id].position = Math.max(0, c.position)
  } else if (c.type === 'journal_save') {
    if (!validId(c.entry.id)) throw new Error('无效记录编号')
    const old = s.journal[c.entry.id]
    if (old && c.expectedUpdatedAt !== old.updatedAt)
      throw new Error('记录已更新，请重新打开后编辑')
    const e = c.entry
    if (
      typeof e.text !== 'string' ||
      e.text.length > 1000 ||
      typeof e.name !== 'string' ||
      e.name.length > 40
    )
      throw new Error('记录内容过长')
    if (
      !Array.isArray(e.photos) ||
      e.photos.length > 4 ||
      e.photos.some((p) => typeof p !== 'string' || p.length > 2048)
    )
      throw new Error('照片无效')
    if (!['draft', 'sealed'].includes(e.status)) throw new Error('无效记录状态')
    s.journal[e.id] = {
      id: e.id,
      text: e.text,
      name: e.name,
      photos: e.photos.slice(),
      status: e.status,
      createdAt: old ? old.createdAt : at,
      updatedAt: Math.max(at, ((old && old.updatedAt) || 0) + 1),
      sealedAt: e.status === 'sealed' ? (old && old.sealedAt) || at : null
    }
  } else if (c.type === 'journal_delete') {
    const old = s.journal[c.id]
    if (old && c.expectedUpdatedAt !== old.updatedAt)
      throw new Error('记录已更新，请重新打开后删除')
    delete s.journal[c.id]
  } else if (c.type === 'echo_progress') {
    if (!validId(c.id)) throw new Error('无效附页编号')
    s.echo[c.id] = {
      position: Math.max(0, Number(c.position) || 0),
      completed: !!c.completed,
      updatedAt: at
    }
  } else return null
  return s
}
function visitStatus(s, id) {
  return s.puzzles && s.puzzles[id]
    ? 'completed'
    : (s.visits && s.visits[id] && s.visits[id].status) || ''
}
function unlockAt(completedAt, hour) {
  if (!Number.isFinite(completedAt) || completedAt <= 0) return null
  const d = new Date(completedAt + 8 * 3600000)
  return (
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + 1,
      Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 9
    ) -
    8 * 3600000
  )
}
module.exports = { fields, apply, visitStatus, unlockAt }
