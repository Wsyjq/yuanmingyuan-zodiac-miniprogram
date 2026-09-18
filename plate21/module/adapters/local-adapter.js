/**
 * Local Adapter —— 开发期宿主适配器实现（Mock + wx.Storage）。
 * mutation 使用显式 applied/conflict 结果，避免 revision 冲突被误判为成功。
 */

const contract = require('../contracts/adapter-api')
const progressFlow = require('../store/progress-flow')
const sessionDate = require('../utils/session-date')

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
    // 本地适配器没有识别模型；显式声明不可用，不能以高置信 Mock 冒充服务。
    return Promise.resolve({ available: false, pass: false, confidence: 0, failReason: 'unknown' })
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

  // —— 留言簿（UGC）本地降级 ——
  // 本地无审核后台：提交一律收件待审（pending_review），永不进公池；
  // 展示池恒为官方种子（official_seed）。真实宿主实现见 contracts/adapter-api.js v1.3.0。
  submitBoardMessage(input) {
    const text = String(input && input.text || '').trim()
    if (!text) return Promise.reject(new Error('留言为空'))
    return Promise.resolve({
      status: 'pending_review',
      messageId: 'local-' + now().toString(36)
    })
  },

  listBoardMessages(input) {
    const seeds = require('../capabilities/board/seeds')
    const limit = Math.min(Number(input && input.limit) || 6, seeds.SEED_MESSAGES.length)
    return Promise.resolve({
      messages: seeds.pickBoardMessages(input && input.sessionId, limit).map(function (m) {
        return { text: m.text, from: m.from, date: m.date, source: 'official_seed' }
      })
    })
  },

  emitEvent(event) {
    console.log('[plate21:event]', event)
  },

  // —— 门票付费（gate）本地演示 ——
  // 本地无支付工程：requestPayment 模拟支付成功（演示门页放行全流程）；
  // 权益以 storage envelope 的 flags 为准（模拟宿主订单库）。
  // 真实宿主对接已有付费工程（接口级/页面级）见 contracts/adapter-api.js v1.4.0。
  requestPayment(input) {
    const sku = input && input.sku || 'plate21_full'
    // 模拟宿主权益落库：写入 envelope flags，checkEntitlement 据此返回
    const env = readEnvelope()
    if (env.snapshot) {
      env.snapshot.flags = env.snapshot.flags || {}
      env.snapshot.flags.premiumEntitlement = {
        sku: sku,
        entitlementId: 'local-ent-' + now().toString(36),
        unlockedAt: now()
      }
      writeEnvelope(env)
    }
    return Promise.resolve({
      status: 'paid',
      orderId: 'local-order-' + now().toString(36),
      entitlementId: env.snapshot && env.snapshot.flags.premiumEntitlement.entitlementId
    })
  },

  checkEntitlement() {
    const env = readEnvelope()
    const snap = env.snapshot
    const ent = snap && snap.flags && snap.flags.premiumEntitlement
    if (!ent) return Promise.resolve({ unlocked: false })
    return Promise.resolve({
      unlocked: true,
      entitlementId: ent.entitlementId,
      unlockedAt: ent.unlockedAt
    })
  }
}

module.exports = localAdapter
