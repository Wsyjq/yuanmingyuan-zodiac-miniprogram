const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database(),
  collection = 'plate21_private_archives'
async function readFrom(api, id) {
  try {
    const r = await api.collection(collection).doc(id).get()
    return r.data
  } catch (e) {
    if (e.errCode === -1 && /not exist|不存在/.test(e.message || e.errMsg || '')) return null
    if (
      /DATABASE_DOCUMENT_NOT_EXIST|document.*not exist|document.*不存在/i.test(
        String(e.errMsg || e.message)
      )
    )
      return null
    throw e
  }
}
const repo = {
  read: (id) => readFrom(db, id),
  transaction: (id, fn) =>
    db.runTransaction(async (tx) => {
      const result = fn(await readFrom(tx, id))
      const data = Object.assign({}, result.doc)
      delete data._id
      await tx.collection(collection).doc(id).set({ data })
      return result.result
    })
}
const storage = {
  upload: async (cloudPath, fileContent) =>
    (await cloud.uploadFile({ cloudPath, fileContent })).fileID,
  urls: async (fileList) => {
    const r = await cloud.getTempFileURL({ fileList })
    return { files: r.fileList }
  }
}
const handle = require('./core').createHandler(repo, storage)
exports.main = async (event) => {
  try {
    return await handle(cloud.getWXContext().OPENID, event)
  } catch (e) {
    console.error('[archive]', e.message)
    return { error: e.message || 'archive_failed' }
  }
}
