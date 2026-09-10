'use strict'
const crypto = require('crypto')
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex')
const clone = (x) => JSON.parse(JSON.stringify(x))
function validate(snapshot, media) {
  if (
    !snapshot ||
    snapshot.schemaVersion !== 3 ||
    typeof snapshot.sessionId !== 'string' ||
    !Number.isInteger(snapshot.revision) ||
    snapshot.revision < 0
  )
    throw new Error('invalid_snapshot')
  const text = JSON.stringify(snapshot)
  if (Buffer.byteLength(text) > 512 * 1024) throw new Error('snapshot_too_large')
  const next = JSON.parse(text)
  delete next.editionNo
  delete next.editionAuthority
  if (!next.journal || Array.isArray(next.journal) || Object.keys(next.journal).length > 200)
    throw new Error('invalid_journal')
  for (const [id, e] of Object.entries(next.journal)) {
    if (
      !/^[\w-]{1,80}$/.test(id) ||
      !e ||
      e.id !== id ||
      typeof e.text !== 'string' ||
      e.text.length > 1000 ||
      typeof e.name !== 'string' ||
      e.name.length > 40 ||
      !Array.isArray(e.photos) ||
      e.photos.length > 4 ||
      !['draft', 'sealed'].includes(e.status)
    )
      throw new Error('invalid_entry')
  }
  function walk(v, depth) {
    if (depth > 18) throw new Error('snapshot_too_deep')
    if (
      typeof v === 'string' &&
      v.startsWith('cloud://') &&
      !Object.values(media || {}).some((m) => m.fileID === v)
    )
      throw new Error('foreign_media')
    if (v && typeof v === 'object')
      for (const k of Object.keys(v)) {
        if (['__proto__', 'constructor', 'prototype'].includes(k)) throw new Error('invalid_key')
        walk(v[k], depth + 1)
      }
  }
  walk(next, 0)
  return next
}
// OPENID is supplied exclusively by the cloud entry point, never by event data.
function createHandler(repo, storage) {
  return async function handle(openid, event) {
    if (!openid) throw new Error('unauthenticated')
    const owner = hash(openid),
      e = event || {}
    if (e.action === 'load') {
      const doc = await repo.read(owner)
      return { version: doc ? doc.version : 0, snapshot: doc ? doc.snapshot : null }
    }
    if (e.action === 'urls') {
      const ids = e.fileIDs
      if (!Array.isArray(ids) || ids.length > 20) throw new Error('invalid_media_request')
      const doc = await repo.read(owner),
        allowed = Object.values((doc && doc.media) || {}).map((m) => m.fileID)
      if (ids.some((id) => !allowed.includes(id))) throw new Error('forbidden_media')
      return storage.urls(ids)
    }
    if (!/^[\w-]{1,100}$/.test(e.operationId || '')) throw new Error('invalid_operation')
    if (e.action === 'media') {
      if (
        typeof e.base64 !== 'string' ||
        e.base64.length > 1400000 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(e.base64)
      )
        throw new Error('invalid_image')
      const bytes = Buffer.from(e.base64, 'base64'),
        jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
        png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      if (!bytes.length || bytes.length > 1024 * 1024 || (!jpeg && !png))
        throw new Error('invalid_image')
      const digest = hash(bytes),
        key = e.operationId
      // Content-addressed object prevents concurrent retries from overwriting another payload.
      const fileID = await storage.upload(
        'private/' + owner + '/' + digest + (png ? '.png' : '.jpg'),
        bytes
      )
      return repo.transaction(owner, (doc) => {
        const d = doc || { version: 0, snapshot: null, media: {}, ops: {} }
        d.media = d.media || {}
        if (d.media[key] && d.media[key].digest !== digest) throw new Error('operation_reused')
        if (Object.keys(d.media).length >= 800 && !d.media[key]) throw new Error('media_limit')
        d.media[key] = { fileID, digest }
        return { doc: d, result: { fileID } }
      })
    }
    if (e.action === 'save')
      return repo.transaction(owner, (doc) => {
        const d = doc || { version: 0, snapshot: null, media: {}, ops: {} }
        const next = validate(e.snapshot, d.media),
          digest = hash(JSON.stringify(next))
        if (d.ops && d.ops[e.operationId]) {
          if (d.ops[e.operationId].digest !== digest) throw new Error('operation_reused')
          return { doc: d, result: { applied: true, version: d.ops[e.operationId].version } }
        }
        if (e.expectedVersion !== d.version)
          return {
            doc: d,
            result: { applied: false, conflict: true, version: d.version, snapshot: d.snapshot }
          }
        d.snapshot = next
        d.version++
        d.updatedAt = Date.now()
        d.ops = d.ops || {}
        d.ops[e.operationId] = { digest, version: d.version }
        // Older retries still fail CAS; bounded receipts avoid unbounded owner documents.
        const keys = Object.keys(d.ops)
        keys.slice(0, Math.max(0, keys.length - 100)).forEach((k) => delete d.ops[k])
        return { doc: d, result: { applied: true, version: d.version } }
      })
    throw new Error('unsupported_action')
  }
}
module.exports = { createHandler, validate }
