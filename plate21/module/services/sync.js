'use strict'
const runtime = require('../config/runtime'),
  session = require('../store/session')
let initialized = false,
  busy = false
const copy = (x) => JSON.parse(JSON.stringify(x)),
  id = () => 'sync-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12)
function available() {
  return !!(runtime.cloudEnv && typeof wx !== 'undefined' && wx.cloud)
}
async function call(data) {
  if (!available()) throw new Error('尚未配置云存档，内容保存在本机')
  if (!initialized) {
    wx.cloud.init({ env: runtime.cloudEnv, traceUser: false })
    initialized = true
  }
  const r = await wx.cloud.callFunction({ name: runtime.cloudFunction, data })
  if (!r.result || r.result.error)
    throw new Error((r.result && r.result.error) || '同步失败，本机内容已保留')
  return r.result
}
function remember(version) {
  wx.setStorageSync('plate21_cloud_version_' + runtime.cloudEnv, version)
}
// Replace media references in journal and original photo records, without touching written text.
async function mediaSnapshot(s) {
  const out = copy(s),
    cache = wx.getStorageSync('plate21_uploaded_media_' + runtime.cloudEnv) || {}
  async function path(p) {
    if (typeof p !== 'string' || !p || /^https:\/\//.test(p) || p.startsWith('cloud://')) return p
    if (cache[p]) return cache[p]
    const base64 = await new Promise((resolve, reject) =>
      wx.getFileSystemManager().readFile({
        filePath: p,
        encoding: 'base64',
        success: (r) => resolve(r.data),
        fail: reject
      })
    )
    const r = await call({ action: 'media', operationId: id(), base64 })
    cache[p] = r.fileID
    wx.setStorageSync('plate21_uploaded_media_' + runtime.cloudEnv, cache)
    return r.fileID
  }
  async function walk(value, key) {
    if (typeof value === 'string') return /photo|filePath/i.test(key || '') ? path(value) : value
    if (!value || typeof value !== 'object') return value
    if (Array.isArray(value)) return Promise.all(value.map((v) => walk(v, key)))
    for (const k of Object.keys(value)) {
      value[k] = await walk(value[k], /photos/i.test(key || '') ? 'photoPath' : k)
    }
    return value
  }
  return walk(out, '')
}
async function inspect() {
  const remote = await call({ action: 'load' })
  const known = wx.getStorageSync('plate21_cloud_version_' + runtime.cloudEnv)
  if (remote.snapshot && (typeof known !== 'number' || known !== remote.version))
    return { conflict: true, remote }
  return { conflict: false, remote }
}
async function push(expectedVersion) {
  if (busy) throw new Error('正在同步，请稍候')
  busy = true
  try {
    const snapshot = await mediaSnapshot(session.getSnapshot())
    let pending = wx.getStorageSync('plate21_cloud_pending_' + runtime.cloudEnv)
    const encoded = JSON.stringify(snapshot)
    if (!pending || pending.encoded !== encoded || pending.expectedVersion !== expectedVersion) {
      pending = { operationId: id(), expectedVersion, encoded }
      wx.setStorageSync('plate21_cloud_pending_' + runtime.cloudEnv, pending)
    }
    const result = await call({
      action: 'save',
      operationId: pending.operationId,
      expectedVersion,
      snapshot
    })
    if (!result.applied)
      return { conflict: true, remote: { version: result.version, snapshot: result.snapshot } }
    remember(result.version)
    wx.removeStorageSync('plate21_cloud_pending_' + runtime.cloudEnv)
    return { saved: true, version: result.version }
  } finally {
    busy = false
  }
}
async function pull(remote) {
  if (!remote || !remote.snapshot) throw new Error('云端暂无存档')
  // Download owned photos before replacing local snapshot, so old report pages stay usable offline.
  const s = copy(remote.snapshot),
    ids = new Set()
  function scan(v) {
    if (typeof v === 'string' && v.startsWith('cloud://')) ids.add(v)
    else if (v && typeof v === 'object') Object.values(v).forEach(scan)
  }
  scan(s)
  const paths = {},
    list = Array.from(ids)
  for (let i = 0; i < list.length; i += 20) {
    const result = await call({ action: 'urls', fileIDs: list.slice(i, i + 20) })
    for (const f of result.files) {
      if (!f.tempFileURL || f.status !== 0) throw new Error('云端照片读取失败，本机档案未替换')
      const tmp = await new Promise((resolve, reject) =>
        wx.downloadFile({
          url: f.tempFileURL,
          success: (r) =>
            r.statusCode === 200 ? resolve(r.tempFilePath) : reject(new Error('照片下载失败')),
          fail: reject
        })
      )
      paths[f.fileID] = await new Promise((resolve, reject) =>
        wx.saveFile({ tempFilePath: tmp, success: (r) => resolve(r.savedFilePath), fail: reject })
      )
    }
  }
  function replace(v) {
    if (typeof v === 'string' && paths[v]) return paths[v]
    if (v && typeof v === 'object') for (const k of Object.keys(v)) v[k] = replace(v[k])
    return v
  }
  await session.adoptCloud(replace(s))
  const cache = wx.getStorageSync('plate21_uploaded_media_' + runtime.cloudEnv) || {}
  Object.keys(paths).forEach((key) => {
    cache[paths[key]] = key
  })
  wx.setStorageSync('plate21_uploaded_media_' + runtime.cloudEnv, cache)
  remember(remote.version)
  return { saved: true }
}
async function sync() {
  const pending = wx.getStorageSync('plate21_cloud_pending_' + runtime.cloudEnv)
  if (pending) {
    const current = await mediaSnapshot(session.getSnapshot())
    if (JSON.stringify(current) === pending.encoded) return push(pending.expectedVersion)
    // Resolve the previous delivery first; a newer local edit remains intact for the next save.
    const r = await call({
      action: 'save',
      operationId: pending.operationId,
      expectedVersion: pending.expectedVersion,
      snapshot: JSON.parse(pending.encoded)
    })
    if (!r.applied) return { conflict: true, remote: { version: r.version, snapshot: r.snapshot } }
    remember(r.version)
    wx.removeStorageSync('plate21_cloud_pending_' + runtime.cloudEnv)
  }
  const status = await inspect()
  if (status.conflict) return status
  return push(status.remote.version)
}
module.exports = { available, call, inspect, push, pull, sync, mediaSnapshot }
