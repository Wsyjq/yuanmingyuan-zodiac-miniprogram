/**
 * Local Adapter —— 开发期宿主适配器实现（Mock + wx.Storage）。
 * mutation 使用显式 applied/conflict 结果，避免 revision 冲突被误判为成功。
 */

const contract = require('../contracts/adapter-api')
const progressFlow = require('../store/progress-flow')

/** Mock 开关：置 true 则 recognizeScene 恒返回失败 */
const MOCK_FAIL = false

const STORAGE_KEY = 'plate21_session'
const EDITION_KEY = 'plate21_edition_counter'

function now() {
  return Date.now()
}

function uuid() {
  return 'local-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function dateKey(timestamp) {
  const d = new Date(timestamp)
  return String(d.getFullYear()) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
}

function createInitialSnapshot() {
  const createdAt = now()
  return {
    schemaVersion: contract.SESSION_SCHEMA_VERSION,
    sessionId: uuid(),
    revision: 0,
    sessionDate: dateKey(createdAt),
    checkpoint: 'prologue',
    stations: { s1: false, s2: false, s3: false, s4: false },
    puzzles: {},
    cards: {},
    records: [],
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

function applyCommand(current, command) {
  let next = clone(current)
  let changed = true

  function applyCheckpoint(checkpoint) {
    if (!checkpoint) return
    const normalized = progressFlow.normalizeCheckpoint(checkpoint)
    if (!normalized) throw new Error('未知 checkpoint: ' + checkpoint)
    if (next.checkpoint !== normalized) {
      next.checkpoint = normalized
      changed = true
    }
  }

  function applyStation(station, record) {
    if (!station) return
    next.stations = next.stations || {}
    next.records = next.records || []
    const index = next.records.findIndex(function (item) { return item.station === station })
    if (!next.stations[station]) {
      next.stations[station] = true
      changed = true
    }
    if (index < 0 && record) {
      next.records.push(record)
      changed = true
    }
  }

  if (command.type === 'complete_station') {
    changed = false
    applyStation(command.station, command.record)
    applyCheckpoint(command.checkpoint)
  } else if (command.type === 'complete_finale') {
    next.finale = true
  } else if (command.type === 'sign') {
    next.name = command.name
  } else if (command.type === 'set_flag') {
    next.flags = next.flags || {}
    next.flags[command.key] = command.value
  } else if (command.type === 'collect_card') {
    next.cards = next.cards || {}
    const card = command.card
    if (next.cards[card.cardId]) {
      changed = false
    } else {
      next.cards[card.cardId] = card
    }
  } else if (command.type === 'complete_puzzle') {
    if (!progressFlow.isValidPuzzle(command.puzzleId)) {
      return Promise.reject(new Error('未知 puzzleId: ' + command.puzzleId))
    }
    changed = false
    next.puzzles = next.puzzles || {}
    if (!next.puzzles[command.puzzleId]) {
      next.puzzles[command.puzzleId] = {
        completedAt: command.completedAt || now(),
        payload: clone(command.payload || {})
      }
      changed = true
    }
    if (command.card) {
      next.cards = next.cards || {}
      if (!next.cards[command.card.cardId]) {
        next.cards[command.card.cardId] = clone(command.card)
        changed = true
      }
    }
    applyStation(command.station, command.record)
    applyCheckpoint(command.checkpoint)
  } else if (command.type === 'set_checkpoint') {
    const checkpoint = progressFlow.normalizeCheckpoint(command.checkpoint)
    if (!checkpoint) return Promise.reject(new Error('未知 checkpoint: ' + command.checkpoint))
    if (next.checkpoint === checkpoint) changed = false
    else next.checkpoint = checkpoint
  } else if (command.type === 'migrate_snapshot') {
    next = clone(command.snapshot)
    next.sessionId = current.sessionId
  } else {
    return Promise.reject(new Error('未知 SessionCommand: ' + command.type))
  }

  if (!changed) return Promise.resolve(current)
  next.revision = current.revision + 1
  next.updatedAt = now()
  return Promise.resolve(next)
}

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
        snapshot: stored.snapshot || stored,
        applied: true,
        conflict: false
      })
    }

    if (input.expectedRevision !== env.snapshot.revision) {
      return Promise.resolve({ snapshot: env.snapshot, applied: false, conflict: true })
    }

    return applyCommand(env.snapshot, input.command).then(function (next) {
      env.snapshot = next
      env.ops[input.operationId] = next
      writeEnvelope(env)
      return { snapshot: next, applied: true, conflict: false }
    })
  },

  resetSession() {
    wx.removeStorageSync(STORAGE_KEY)
    const snapshot = createInitialSnapshot()
    writeEnvelope({ snapshot: snapshot, ops: {} })
    return Promise.resolve(snapshot)
  },

  recognizeScene() {
    if (MOCK_FAIL) {
      return Promise.resolve({ pass: false, confidence: 0.2, failReason: 'not_target' })
    }
    return Promise.resolve({ pass: true, confidence: 0.95 })
  },

  saveMedia() {
    return Promise.resolve(null)
  },

  claimEdition(input) {
    const env = readEnvelope()
    if (env.snapshot && env.snapshot.sessionId === input.sessionId && env.snapshot.editionNo) {
      return Promise.resolve({ editionNo: env.snapshot.editionNo })
    }
    const counter = (wx.getStorageSync(EDITION_KEY) || 0) + 1
    wx.setStorageSync(EDITION_KEY, counter)
    if (env.snapshot && env.snapshot.sessionId === input.sessionId) {
      env.snapshot.editionNo = counter
      writeEnvelope(env)
    }
    return Promise.resolve({ editionNo: counter })
  },

  emitEvent(event) {
    console.log('[plate21:event]', event)
  }
}

module.exports = localAdapter
