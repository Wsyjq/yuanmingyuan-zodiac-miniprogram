/**
 * Local Adapter —— 开发期宿主适配器实现（Mock + wx.Storage）。
 * mutation 使用显式 applied/conflict 结果，避免 revision 冲突被误判为成功。
 */

const contract = require('../contracts/adapter-api')
const progressFlow = require('../store/progress-flow')
const sessionDate = require('../utils/session-date')

const STORAGE_KEY = 'plate21_session'

function now() {
  return Date.now()
}

function uuid() {
  return 'local-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createInitialSnapshot() {
  const createdAt = now()
  return {
    schemaVersion: contract.SESSION_SCHEMA_VERSION,
    sessionId: uuid(),
    revision: 0,
    sessionDate: sessionDate.dateKeyFromTimestamp(createdAt),
    checkpoint: 'prologue',
    stations: { s1: false, s2: false, s3: false, s4: false },
    puzzles: {},
    cards: {},
    records: [],
    preferences: {mode: "adult"}, visits: {}, reading: {}, journal: {}, echo: {},
    flags: {},
    finale: false,
    name: undefined,
    editionNo: undefined,
    createdAt: createdAt,
    updatedAt: createdAt
  }
}

function readEnvelope() {
  const env = wx.getStorageSync(STORAGE_KEY)
  if (env && env.snapshot) {
    env.ops = env.ops || {}
    return env
  }
  return { snapshot: null, ops: {} }
}

function writeEnvelope(env) {
  wx.setStorageSync(STORAGE_KEY, env)
}

const applyCommand = require('../domain/commands').applyCommand

const localAdapter = {
  getIdentity() {
    return Promise.resolve({ userId: 'local-dev' })
  },

  startOrResumeSession() {
    const env = readEnvelope()
    if (env.snapshot) return Promise.resolve(env.snapshot)
    const snapshot = createInitialSnapshot()
    writeEnvelope({ snapshot: snapshot, ops: {} })
    return Promise.resolve(snapshot)
  },

  updateSession(input) {
    const env = readEnvelope()
    if (!env.snapshot) env.snapshot = createInitialSnapshot()

    if (env.ops[input.operationId]) {
      const stored = env.ops[input.operationId]
      return Promise.resolve({
        snapshot: env.snapshot,
        applied: true,
        conflict: false
      })
    }

    if (input.expectedRevision !== env.snapshot.revision) {
      return Promise.resolve({ snapshot: env.snapshot, applied: false, conflict: true })
    }

    return applyCommand(env.snapshot, input.command).then(function (next) {
      env.snapshot = next
      env.ops[input.operationId] = {revision:next.revision}
      const keys=Object.keys(env.ops);keys.slice(0,Math.max(0,keys.length-512)).forEach(k=>delete env.ops[k])
      writeEnvelope(env)
      return { snapshot: next, applied: true, conflict: false }
    })
  },

  resetSession() {
    const previous=readEnvelope();if(previous.snapshot)wx.setStorageSync("plate21_before_reset",previous.snapshot)
    wx.removeStorageSync(STORAGE_KEY)
    const snapshot = createInitialSnapshot()
    writeEnvelope({ snapshot: snapshot, ops: {} })
    return Promise.resolve(snapshot)
  },

  recognizeScene() {
    // 本地适配器没有识别模型；显式声明不可用，不能以高置信 Mock 冒充服务。
    return Promise.resolve({ available: false, pass: false, confidence: 0, failReason: 'unknown' })
  },

  saveMedia(input) {
    const path=input&&input.image&&input.image.filePath
    if(!path||!wx.saveFile)return Promise.resolve({available:false,location:'local'})
    return new Promise((resolve,reject)=>wx.saveFile({tempFilePath:path,success:r=>resolve({available:true,location:'local',filePath:r.savedFilePath}),fail:reject}))
  },

  claimEdition() {
    return Promise.resolve({ editionNo: null, available: false })
  },

  replaceSnapshot(snapshot) {
    const env=readEnvelope()
    if(env.snapshot) wx.setStorageSync('plate21_before_cloud_replace', clone(env.snapshot))
    writeEnvelope({snapshot:clone(snapshot),ops:{}})
    return Promise.resolve(snapshot)
  },

  emitEvent(event) {
    console.log('[plate21:event]', event)
  }
}

module.exports = localAdapter
