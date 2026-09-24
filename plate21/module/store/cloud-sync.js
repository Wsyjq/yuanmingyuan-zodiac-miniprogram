'use strict'

// 微信云开发进度。未配置环境时什么都不做，本地档案照常。
// 在开发者工具云开发里建集合 plate21_progress，权限「仅创建者可读写」。
// 然后把环境 ID 写入本地存储 plate21_cloud_env。

const KIND = 'run'
const TIMEOUT_MS = 4000

function envId() {
  try {
    return String(wx.getStorageSync('plate21_cloud_env') || '').trim()
  } catch (err) {
    return ''
  }
}

function enabled() {
  if (typeof wx === 'undefined' || !wx.cloud || !envId()) return false
  if (!enabled.ready) {
    try {
      wx.cloud.init({ env: envId(), traceUser: true })
      enabled.ready = true
    } catch (err) {
      return false
    }
  }
  return true
}

function withTimeout(promise) {
  return new Promise(function (resolve) {
    let done = false
    const timer = setTimeout(function () {
      if (done) return
      done = true
      resolve(null)
    }, TIMEOUT_MS)
    Promise.resolve(promise).then(function (value) {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(value)
    }).catch(function () {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(null)
    })
  })
}

function pull() {
  if (!enabled()) return Promise.resolve(null)
  return withTimeout(
    wx.cloud.database().collection('plate21_progress').where({ kind: KIND }).limit(1).get()
      .then(function (res) {
        const row = res && res.data && res.data[0]
        return row && row.snapshot ? row.snapshot : null
      })
  )
}

function push(snapshot) {
  if (!enabled() || !snapshot) return Promise.resolve(false)
  const db = wx.cloud.database()
  const col = db.collection('plate21_progress')
  const data = { kind: KIND, snapshot: snapshot, updatedAt: snapshot.updatedAt || Date.now() }
  return withTimeout(
    col.where({ kind: KIND }).limit(1).get().then(function (res) {
      const row = res && res.data && res.data[0]
      if (row && row._id) return col.doc(row._id).update({ data: data })
      return col.add({ data: data })
    })
  ).then(function () { return true })
}

module.exports = {
  pull: pull,
  push: push
}
