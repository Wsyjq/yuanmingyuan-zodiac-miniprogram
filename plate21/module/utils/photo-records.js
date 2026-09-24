'use strict'
const session = require('../store/session')
const pipeline = require('./photo-pipeline')
function choose() {
  return new Promise(function (resolve, reject) {
    const success = function (res) {
      const file = res.tempFiles && res.tempFiles[0]
      const path = file && (file.tempFilePath || file.path) || res.tempFilePaths && res.tempFilePaths[0]
      if (path) resolve({ path, size: file && file.size })
      else reject(new Error('没有取得照片，请重试或改用文字记录'))
    }
    if (wx.chooseMedia) wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['camera', 'album'], success, fail: reject })
    else if (wx.chooseImage) wx.chooseImage({ count: 1, sizeType: ['compressed'], success, fail: reject })
    else reject(new Error('此设备不能选择照片，请用文字记录'))
  })
}
async function pickRecord(input, sessionId) {
  const file = await choose()
  const normalized = await pipeline.normalizePhoto(file.path, { api: wx, fileSize: file.size, maxEdge: 1600 })
  const saved = await session.saveMedia({ filePath: normalized.path, upload: false })
  if (saved.status !== 'local') throw new Error('照片未能持久保存，请重试或用文字记录')
  return session.saveRecord(Object.assign({}, input, { kind: 'photo', filePath: saved.filePath,
    width: normalized.width, height: normalized.height, status: 'private' }), sessionId)
}
module.exports = { choose, pickRecord }
