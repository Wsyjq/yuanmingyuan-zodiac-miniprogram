'use strict'

const contract = require('../contracts/adapter-api')
function clone(value) { return JSON.parse(JSON.stringify(value)) }
function storage() {
  if (typeof wx === 'undefined' || !wx.getStorageSync || !wx.setStorageSync) {
    const err = new Error('设备存储不可用'); err.code = 'STORAGE_UNAVAILABLE'; throw err
  }
  return wx
}
function keyFor(mode, userId) { return contract.STORAGE_PREFIX + mode + ':' + encodeURIComponent(userId) }
function load(key) {
  const value = storage().getStorageSync(key)
  if (!value) return null
  if (!value.snapshot || value.snapshot.schemaVersion !== 3 || !Array.isArray(value.pending)) {
    const err = new Error('V3 存档格式损坏，未覆盖原存档'); err.code = 'INVALID_SNAPSHOT'; throw err
  }
  return clone(value)
}
function save(key, envelope) { storage().setStorageSync(key, clone(envelope)); return envelope }
function saveLocalMedia(filePath) {
  if (typeof wx === 'undefined' || typeof wx.saveFile !== 'function') {
    return Promise.resolve({ available: false, status: 'unavailable', reason: 'local_media_unavailable' })
  }
  return new Promise(function (resolve) {
    wx.saveFile({ tempFilePath: filePath,
      success: function (res) {
        if (!res || !res.savedFilePath) return resolve({ available: false, status: 'failed', reason: 'invalid_local_media_ack' })
        resolve({ available: true, status: 'local', localPath: res.savedFilePath, filePath: res.savedFilePath })
      },
      fail: function () { resolve({ available: false, status: 'failed', reason: 'local_media_failed' }) }
    })
  })
}
module.exports = { keyFor, load, save, saveLocalMedia }
