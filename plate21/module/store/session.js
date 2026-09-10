/**
 * 模块侧唯一数据入口 —— v3 会话状态、串行 mutation、卡片账本与存档迁移。
 */

const adapter = require('../adapters/local-adapter')
const contract = require('../contracts/adapter-api')
const progressFlow = require('./progress-flow')
const sessionDate = require('../utils/session-date')

const OUTBOX_KEY = 'plate21_pending_mutations'
const MAX_CONFLICT_RETRIES = 3

let snapshot = null
let pendingMutations = readOutbox()
let mutationChain = Promise.resolve()
let moduleEnterEmitted = false

function readOutbox() {
  try {
    const stored = wx.getStorageSync(OUTBOX_KEY)
    return Array.isArray(stored) ? stored : []
  } catch (err) {
    return []
  }
}

function persistOutbox() {
  try {
    if (pendingMutations.length) wx.setStorageSync(OUTBOX_KEY, pendingMutations)
    else wx.removeStorageSync(OUTBOX_KEY)
  } catch (err) {
    console.warn('[plate21] 待补发队列持久化失败', err && err.message)
  }
}

function uuid() {
  return 'op-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function migrateSnapshot(input) {
  const original = input || {}
  const next = clone(original)
  const legacy = !next.schemaVersion || next.schemaVersion < 2
  if (next.schemaVersion !== contract.SESSION_SCHEMA_VERSION && original.sessionId) {
    const key = "plate21_backup_" + original.sessionId
    if (!wx.getStorageSync(key)) wx.setStorageSync(key, clone(original))
  }
  const hadPuzzleState = Object.keys(next.puzzles || {}).length > 0
  const baseTime = next.createdAt || next.updatedAt || Date.now()

  require("../domain/experience").fields(next)
  next.schemaVersion = contract.SESSION_SCHEMA_VERSION
  if (next.editionNo && !next.editionAuthority) {
    next.legacyEditionNo = next.editionNo
    delete next.editionNo
  }
  next.sessionDate = sessionDate.isValidDateKey(next.sessionDate)
    ? next.sessionDate
    : sessionDate.dateKeyFromTimestamp(baseTime)
  next.createdAt = next.createdAt || baseTime
  next.updatedAt = next.updatedAt || baseTime
  next.stations = Object.assign({ s1: false, s2: false, s3: false, s4: false }, next.stations)
  next.puzzles = next.puzzles || {}
  next.cards = next.cards || {}
  next.records = next.records || []
  next.flags = next.flags || {}
  next.finale = !!next.finale

  if (legacy) {
    if (next.finale || next.stations.s4) {
      next.stations.s1 = true
      next.stations.s2 = true
      next.stations.s3 = true
    } else if (next.stations.s3) {
      next.stations.s1 = true
      next.stations.s2 = true
    } else if (next.stations.s2) {
      next.stations.s1 = true
    }

    let collected = 0
    if (next.finale || next.stations.s4) collected = 8
    else if (next.stations.s3) collected = 7
    else if (next.stations.s2) collected = 4

    for (let i = 0; i < collected; i++) {
      const cardId = contract.CARD_ORDER[i]
      next.cards[cardId] = next.cards[cardId] || {
        cardId: cardId,
        position: i,
        digit: next.sessionDate.charAt(i),
        collectedAt: next.updatedAt
      }
    }
    delete next.flags.cardNumbers
  }

  if (original.schemaVersion !== 3) {
  for (const [cardId, card] of Object.entries(next.cards || {})) {
    if (!progressFlow.isValidPuzzle(cardId) || next.puzzles[cardId]) continue
    next.puzzles[cardId] = {
      completedAt: card.collectedAt || next.updatedAt,
      payload: { migratedFromCard: true }
    }
  }
  if (next.stations.s1 && !next.puzzles['s1-decode']) {
    next.puzzles['s1-decode'] = { completedAt: next.updatedAt, payload: { migratedFromStation: true } }
  }
  if (next.stations.s4 && !next.puzzles['s4-password']) {
    next.puzzles['s4-password'] = { completedAt: next.updatedAt, payload: { migratedFromStation: true } }
  }

  }
  next.checkpoint = progressFlow.deriveCheckpoint(next, {
    preferEvidence: legacy || !hadPuzzleState
  })
  return { snapshot: next, changed: JSON.stringify(next) !== JSON.stringify(original) }
}

function normalizeMutationResult(result) {
  if (result && result.snapshot && typeof result.applied === 'boolean') return result
  return { snapshot: result, applied: true, conflict: false }
}

function acceptSnapshot(snap) {
  const migrated = migrateSnapshot(snap)
  snapshot = migrated.snapshot
  return snapshot
}

function sendWithRetry(input, attempt) {
  return adapter.updateSession(input).then(function (raw) {
    const result = normalizeMutationResult(raw)
    if (result.snapshot) acceptSnapshot(result.snapshot)
    if (!result.conflict) {
      return { snapshot: snapshot, applied: !!result.applied, conflict: false }
    }
    if (attempt >= MAX_CONFLICT_RETRIES || !snapshot) {
      return { snapshot: snapshot, applied: false, conflict: true }
    }
    input.expectedRevision = snapshot.revision
    return sendWithRetry(input, attempt + 1)
  })
}

function removePending(mutation) {
  const idx = pendingMutations.indexOf(mutation)
  if (idx >= 0) pendingMutations.splice(idx, 1)
  persistOutbox()
}

function flushPendingInternal() {
  if (!snapshot || pendingMutations.length === 0) return Promise.resolve()
  const queue = pendingMutations.slice()
  return queue.reduce(function (chain, mutation) {
    return chain.then(function () {
      mutation.expectedRevision = snapshot.revision
      return sendWithRetry(mutation, 0).then(function (status) {
        if (status.applied) removePending(mutation)
      }).catch(function (err) {
        console.warn('[plate21] updateSession 补发失败，保留在队列中', err)
      })
    })
  }, Promise.resolve())
}

function submit(command) {
  if (!snapshot) return Promise.resolve({ snapshot: null, applied: false })
  return flushPendingInternal().then(function () {
    const input = {
      sessionId: snapshot.sessionId,
      expectedRevision: snapshot.revision,
      operationId: uuid(),
      command: command
    }
    return sendWithRetry(input, 0).catch(function (err) {
      if (err && err.code === 'INVALID_COMMAND') throw err
      console.warn('[plate21] updateSession 失败，已暂存待补发', err)
      if (!pendingMutations.some(function (item) { return item.operationId === input.operationId })) {
        pendingMutations.push(input)
        persistOutbox()
      }
      return { snapshot: snapshot, applied: false, queued: true }
    })
  })
}

function mutateStatus(command) {
  const task = mutationChain.then(function () {
    return submit(command)
  })
  mutationChain = task.catch(function () {})
  return task
}

function mutate(command) {
  return mutateStatus(command).then(function (status) {
    return status.snapshot
  })
}

function finishInit(input) {
  pendingMutations = pendingMutations.filter(function (mutation) {
    return mutation && mutation.sessionId === snapshot.sessionId
  })
  persistOutbox()
  if (!moduleEnterEmitted) {
    moduleEnterEmitted = true
    emit({
      name: 'module_enter',
      source: input && input.scene || '',
      resume: progressFlow.deriveCheckpoint(snapshot) !== 'prologue',
      schemaVersion: snapshot.schemaVersion
    })
  }
  return snapshot
}

function init(input) {
  return adapter.getIdentity().catch(function (err) {
    console.warn('[plate21] getIdentity 失败，匿名游玩', err)
    return { userId: 'anonymous' }
  }).then(function () {
    return adapter.startOrResumeSession(input || {})
  }).then(function (snap) {
    const migration = migrateSnapshot(snap)
    snapshot = migration.snapshot
    if (!migration.changed) return finishInit(input)

    const mutation = {
      sessionId: snap.sessionId,
      expectedRevision: snap.revision,
      operationId: uuid(),
      command: { type: 'migrate_snapshot', snapshot: migration.snapshot }
    }
    return sendWithRetry(mutation, 0).then(function () {
      return finishInit(input)
    }).catch(function (err) {
      console.warn('[plate21] 存档迁移落库失败，本次以内存迁移结果继续', err)
      return finishInit(input)
    })
  })
}

function getSnapshot() {
  return snapshot
}

function completeStation(station, record, options) {
  if (!snapshot) {
    return init({}).then(function () { return completeStation(station, record, options) })
  }
  const rec = Object.assign({}, record || {})
  rec.station = station
  rec.recordType = rec.recordType || contract.STATION_RECORD_TYPE[station]
  rec.completedAt = rec.completedAt || Date.now()
  const wasComplete = !!(snapshot.stations && snapshot.stations[station])
  const command = { type: 'complete_station', station: station, record: rec }
  if (options && options.checkpoint) command.checkpoint = options.checkpoint
  return mutateStatus(command).then(function (status) {
    if (!status.snapshot || !status.snapshot.stations || !status.snapshot.stations[station]) {
      throw new Error('站点进度尚未落库')
    }
    if (!wasComplete) emit({ name: 'station_completed', station: station })
    return status.snapshot
  })
}

function collectCard(cardId) {
  if (!snapshot) return Promise.resolve(null)
  const position = contract.CARD_ORDER.indexOf(cardId)
  if (position < 0) {
    console.warn('[plate21] 未知 cardId，忽略收集', cardId)
    return Promise.resolve(snapshot)
  }
  if (snapshot.cards && snapshot.cards[cardId]) return Promise.resolve(snapshot)
  return mutateStatus({
    type: 'collect_card',
    card: {
      cardId: cardId,
      position: position,
      digit: snapshot.sessionDate.charAt(position),
      collectedAt: Date.now()
    }
  }).then(function (status) {
    const snap = status.snapshot
    if (!snap || !snap.cards || !snap.cards[cardId]) throw new Error('日期卡尚未落库')
    emit({ name: 'card_collected', cardId: cardId, position: position })
    return snap
  })
}

function completePuzzle(puzzleId, payload, options) {
  if (!progressFlow.isValidPuzzle(puzzleId)) {
    return Promise.reject(new Error('未知 puzzleId: ' + puzzleId))
  }
  if (!snapshot) {
    return init({}).then(function () { return completePuzzle(puzzleId, payload, options) })
  }
  const before = snapshot || {}
  const command = {
    type: 'complete_puzzle',
    puzzleId: puzzleId,
    completedAt: Date.now(),
    payload: payload || {}
  }
  if (options && options.collectCard) {
    const position = contract.CARD_ORDER.indexOf(puzzleId)
    if (position >= 0) {
      const lockedDate = sessionDate.isValidDateKey(before.sessionDate)
        ? before.sessionDate
        : sessionDate.dateKeyFromTimestamp(Date.now())
      command.card = {
        cardId: puzzleId,
        position: position,
        digit: lockedDate.charAt(position),
        collectedAt: Date.now()
      }
    }
  }
  if (options && options.station) {
    command.station = options.station
    command.record = Object.assign({}, options.record || {}, {
      station: options.station,
      recordType: options.record && options.record.recordType || contract.STATION_RECORD_TYPE[options.station],
      completedAt: options.record && options.record.completedAt || Date.now()
    })
  }
  if (options && options.checkpoint) command.checkpoint = options.checkpoint
  const wasComplete = !!(before.puzzles && before.puzzles[puzzleId])
  const hadCard = !!(command.card && before.cards && before.cards[puzzleId])
  return mutateStatus(command).then(function (status) {
    const snap = status.snapshot || {}
    if (!snap.puzzles || !snap.puzzles[puzzleId]) throw new Error('谜题进度尚未落库')
    if (command.card && (!snap.cards || !snap.cards[puzzleId])) throw new Error('日期卡尚未落库')
    if (command.station && (!snap.stations || !snap.stations[command.station])) throw new Error('站点进度尚未落库')
    if (command.checkpoint && progressFlow.normalizeCheckpoint(snap.checkpoint) !== progressFlow.normalizeCheckpoint(command.checkpoint)) {
      throw new Error('断点进度尚未落库')
    }
    if (!wasComplete && snap.puzzles[puzzleId]) {
      emit({ name: 'puzzle_completed', puzzle: puzzleId, attempts: Number(payload && payload.attempts) || 1 })
    }
    if (command.card && !hadCard && snap.cards[puzzleId]) {
      emit({ name: 'card_collected', cardId: puzzleId, position: command.card.position })
    }
    return status.snapshot
  })
}

function setCheckpoint(checkpoint) {
  const normalized = progressFlow.normalizeCheckpoint(checkpoint)
  if (!normalized) return Promise.reject(new Error('未知 checkpoint: ' + checkpoint))
  if (!snapshot) return init({}).then(function () { return setCheckpoint(normalized) })
  return mutateStatus({ type: 'set_checkpoint', checkpoint: normalized }).then(function (status) {
    if (!status.snapshot || progressFlow.normalizeCheckpoint(status.snapshot.checkpoint) !== normalized) {
      throw new Error('断点进度尚未落库')
    }
    return status.snapshot
  })
}

function getPuzzle(puzzleId, snap) {
  const current = snap || snapshot || {}
  return current.puzzles && current.puzzles[puzzleId] || null
}

function isPuzzleComplete(puzzleId, snap) {
  return !!getPuzzle(puzzleId, snap)
}

function getCardDigits(snap) {
  const current = snap || snapshot || {}
  const cards = current.cards || {}
  return contract.CARD_ORDER.map(function (cardId) {
    return cards[cardId] ? String(cards[cardId].digit) : ''
  })
}

function getCardDigit(cardId, snap) {
  const position = contract.CARD_ORDER.indexOf(cardId)
  if (position < 0) return ''
  const current = snap || snapshot || {}
  const cards = current.cards || {}
  if (cards[cardId]) return String(cards[cardId].digit)
  const lockedDate = sessionDate.isValidDateKey(current.sessionDate)
    ? current.sessionDate
    : sessionDate.dateKeyFromTimestamp(Date.now())
  return lockedDate.charAt(position)
}

function sign(name) {
  if (!snapshot) return init({}).then(function () { return sign(name) })
  return mutateStatus({ type: 'sign', name: name }).then(function (status) {
    if (!status.snapshot || status.snapshot.name !== name) throw new Error('署名尚未落库')
    return status.snapshot
  })
}

function completeFinale() {
  if (!snapshot) return init({}).then(completeFinale)
  return mutateStatus({ type: 'complete_finale' }).then(function (status) {
    if (!status.snapshot || !status.snapshot.finale) throw new Error('终章进度尚未落库')
    return status.snapshot
  })
}

function completeExperience() {
  if (!snapshot) return init({}).then(completeExperience)
  const flags = snapshot.flags || {}
  if (flags.experienceCompletedAt) return Promise.resolve(snapshot)
  const completedAt = Date.now()
  return setFlag('experienceCompletedAt', completedAt).then(function (next) {
    emit({ name: 'module_completed', completedAt: completedAt })
    return next
  })
}

function setFlag(key, value) {
  if (!snapshot) return init({}).then(function () { return setFlag(key, value) })
  return mutateStatus({ type: 'set_flag', key: key, value: value }).then(function (status) {
    if (!status.snapshot || !status.snapshot.flags || status.snapshot.flags[key] === undefined) {
      throw new Error('标记进度尚未落库')
    }
    return status.snapshot
  })
}

function claimEdition() {
  if (!snapshot) return Promise.resolve(null)
  return adapter.claimEdition({
    sessionId: snapshot.sessionId,
    name: snapshot.name || ''
  }).then(function (res) {
    if (snapshot && res && res.editionNo) snapshot.editionNo = res.editionNo
    return res && res.editionNo || null
  }).catch(function (err) {
    console.warn('[plate21] claimEdition 失败，落款显示"第 — 版"', err)
    return null
  })
}

function recognizeScene(scene, attempt, image) {
  return adapter.recognizeScene({ scene: scene, attempt: attempt, image: image }).then(function (res) {
    const result = res || { available: false, pass: false, failReason: 'unknown' }
    emit({ name: 'photo_check', scene: scene, attempt: attempt, available: result.available !== false, pass: result.available !== false && !!result.pass })
    return result
  }).catch(function (err) {
    console.warn('[plate21] recognizeScene 不可用，继续使用玩家照片', err)
    emit({ name: 'photo_check', scene: scene, attempt: attempt, available: false, pass: false })
    return { available: false, pass: false, failReason: 'unknown' }
  })
}

function saveMedia(input) {
  return adapter.saveMedia(input).catch(function (err) {
    console.warn('[plate21] saveMedia 失败，跳过宿主侧留存', err)
    capabilityFallback('saveMedia', 'adapter_failed')
    return null
  })
}

function viewPuzzle(puzzleId) {
  emit({ name: 'puzzle_viewed', puzzle: puzzleId })
}

function attemptPuzzle(puzzleId, attempt, result, inputMode) {
  emit({
    name: 'puzzle_attempted',
    puzzle: puzzleId,
    attempt: Number(attempt) || 1,
    result: result ? 'correct' : 'incorrect',
    inputMode: inputMode || 'tap'
  })
}

function viewHint(puzzleId, hintLevel) {
  emit({ name: 'hint_viewed', puzzle: puzzleId, hintLevel: Number(hintLevel) || 1 })
}

function capabilityFallback(capability, reason) {
  emit({ name: 'capability_fallback', capability: capability, reason: reason || 'unknown' })
}

const eventListeners = []

function onEvent(fn) {
  if (typeof fn === 'function') eventListeners.push(fn)
}

function emit(event) {
  const e = Object.assign({}, event || {})
  if (!e.ts) e.ts = Date.now()
  if (snapshot) {
    if (!e.sessionId) e.sessionId = snapshot.sessionId
    if (!e.checkpoint) e.checkpoint = progressFlow.deriveCheckpoint(snapshot)
    if (e.completed === undefined) {
      e.completed = !!(snapshot.flags && snapshot.flags.experienceCompletedAt)
    }
  }
  try {
    adapter.emitEvent(e)
  } catch (err) {
    console.warn('[plate21] emitEvent 异常', err)
  }
  eventListeners.forEach(function (fn) {
    try { fn(e) } catch (err) {
      console.warn('[plate21] 事件订阅者异常', err && err.message)
    }
  })
}

function cleanupSavedPhotos(snap) {
  if (!snap || !wx.removeSavedFile) return Promise.resolve()
  const flags = snap.flags || {}
  const paths = new Set()
  ;[flags.s2PhotoDraft, flags.s2PhotoRecord].forEach(function (record) {
    ;[record && record.photos, record && record.localPhotos].forEach(function (photos) {
      for (const filePath of Object.values(photos || {})) {
        if (filePath && !/^https?:\/\//i.test(filePath)) paths.add(filePath)
      }
    })
  })
  return Promise.all([...paths].map(function (filePath) {
    return new Promise(function (resolve) {
      wx.removeSavedFile({ filePath: filePath, success: resolve, fail: resolve })
    })
  })).then(function () {})
}

function reset() {
  const previous = snapshot
  snapshot = null
  pendingMutations = []
  persistOutbox()
  mutationChain = Promise.resolve()
  return cleanupSavedPhotos(previous)
    .catch(function (err) {
      console.warn('[plate21] 清理现场照片失败，继续重置会话', err)
    })
    .then(function () { return adapter.resetSession() })
    .then(function (snap) { return acceptSnapshot(snap) })
}


function extension(command) {
  if(!snapshot) return init({}).then(()=>extension(command))
  return mutateStatus(command).then(status=>{
    if(!status.applied) throw new Error('尚未保存，请重试')
    emit({name:'experience_updated',kind:command.type})
    return status.snapshot
  })
}
function visit(nodeId,status,nextId) {return extension({type:'visit',nodeId,status:status||'visited',nextId})}
function setMode(mode) {return extension({type:'preferences',mode})}
function setReading(id,patch) {return extension(Object.assign({},patch,{type:'reading',id}))}
function saveEntry(entry,expectedUpdatedAt) {return extension({type:'journal_save',entry,expectedUpdatedAt})}
function deleteEntry(id,expectedUpdatedAt) {return extension({type:'journal_delete',id,expectedUpdatedAt})}
function setEchoProgress(id,position,completed) {return extension({type:'echo_progress',id,position,completed})}
function adoptCloud(input) {
  const task=mutationChain.then(()=>{
    if(pendingMutations.length) throw new Error('请先完成本机待保存操作')
    const migrated=migrateSnapshot(input).snapshot
    return adapter.replaceSnapshot(migrated).then(()=>acceptSnapshot(migrated))
  })
  mutationChain=task.catch(()=>{})
  return task
}

module.exports = {
  visit, setMode, setReading, saveEntry, deleteEntry, setEchoProgress, adoptCloud,
  init: init,
  getSnapshot: getSnapshot,
  completeStation: completeStation,
  completePuzzle: completePuzzle,
  setCheckpoint: setCheckpoint,
  getPuzzle: getPuzzle,
  isPuzzleComplete: isPuzzleComplete,
  completeFinale: completeFinale,
  completeExperience: completeExperience,
  collectCard: collectCard,
  getCardDigit: getCardDigit,
  getCardDigits: getCardDigits,
  setFlag: setFlag,
  sign: sign,
  claimEdition: claimEdition,
  recognizeScene: recognizeScene,
  saveMedia: saveMedia,
  viewPuzzle: viewPuzzle,
  attemptPuzzle: attemptPuzzle,
  viewHint: viewHint,
  capabilityFallback: capabilityFallback,
  emit: emit,
  onEvent: onEvent,
  reset: reset
}

// 成就系统挂在事件流上（achievements 不 require session，无循环依赖）。
try {
  require('./achievements').attach(module.exports)
} catch (err) {
  console.warn('[plate21] 成就系统挂载失败', err && err.message)
}
