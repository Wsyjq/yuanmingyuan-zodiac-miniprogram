'use strict'

const engine = require('../flow/engine')
const pages = require('../flow/pages')
const bridge = require('../host/bridge')
const local = require('../adapters/local-adapter')
const contract = require('../contracts/adapter-api')

let envelope = null
let storageKey = ''
let initPromise = null
let chain = Promise.resolve()
let flushPromise = null
let generation = 0
const listeners = []
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)) }
function now() {
  const clock = bridge.getConfig().now
  return typeof clock === 'function' ? Number(clock()) : Date.now()
}
function id(prefix) { return prefix + '-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 11) }
function fault(code, message) { const err = new Error(message); err.code = code; return err }
function assertGeneration(token) { if (token !== generation) throw fault('CONTEXT_CHANGED', '宿主身份已变化，请重新进入') }
function unavailable(reason) { return { available: false, status: 'unavailable', reason: reason } }
function failure(err) {
  if (err && err.code === 'CONTEXT_CHANGED') throw err
  return { available: false, status: err && err.code === 'CAPABILITY_UNAVAILABLE' ? 'unavailable' : 'failed',
    reason: err && (err.code || err.message) || 'request_failed' }
}
function configure(input) {
  bridge.configure(input)
  generation++
  envelope = null; storageKey = ''; initPromise = null; chain = Promise.resolve(); flushPromise = null
}
function fresh(userId, archives) {
  const at = now()
  return { schemaVersion: 3, sessionId: id('run'), revision: 0, userId: userId,
    createdAt: at, updatedAt: at, run: engine.createRun(), records: [], contributions: [],
    archives: archives || [], sync: { status: 'local' } }
}
function validateSnapshot(value, userId) {
  if (!value || value.schemaVersion !== 3 || value.userId !== userId || !value.sessionId ||
      !value.run || !pages.byId[value.run.resumePageId] || !pages.byId[value.run.pageId] ||
      !Array.isArray(value.records) || !Array.isArray(value.contributions) || !Array.isArray(value.archives)) {
    throw fault('INVALID_SNAPSHOT', '存档格式或用户不匹配，原存档未被覆盖')
  }
  value.archives.forEach(function (archive) {
    if (!archive || archive.archives || archive.userId !== userId || !archive.run || !archive.run.completedAt) {
      throw fault('INVALID_ARCHIVE', '完成档案格式不正确')
    }
  })
  return value
}
function archiveOf(snap) {
  const archive = clone(snap)
  delete archive.archives; delete archive.sync
  return archive
}
function syncArchive(snap) {
  if (!snap.run.completedAt) return
  const item = archiveOf(snap)
  const index = snap.archives.findIndex(function (a) { return a.sessionId === snap.sessionId })
  if (index < 0) snap.archives.push(item)
  else snap.archives[index] = item
}
function targetOf(snap, sessionId) {
  if (!sessionId || sessionId === snap.sessionId) return snap
  const item = snap.archives.find(function (a) { return a.sessionId === sessionId })
  if (!item) throw fault('ARCHIVE_NOT_FOUND', '找不到这份完成档案')
  return item
}
function getSnapshot() { return envelope ? clone(envelope.snapshot) : null }
function getRun() { const snap = getSnapshot(); return snap && snap.run }
function getArchives() { return envelope ? clone(envelope.snapshot.archives) : [] }
function getArchive(sessionId) {
  if (!envelope) return null
  const snap = envelope.snapshot
  if (sessionId === snap.sessionId && snap.run.completedAt) return archiveOf(snap)
  return clone(snap.archives.find(function (a) { return a.sessionId === sessionId }) || null)
}
function write(next) { local.save(storageKey, next); envelope = next }
function persist(snap) {
  snap.revision = (envelope.snapshot.revision || 0) + 1
  snap.updatedAt = now()
  syncArchive(snap)
  const next = clone(envelope)
  next.snapshot = snap
  if (bridge.getConfig().mode === 'host') {
    snap.sync = { status: bridge.available('saveSession') ? 'pending' : 'unavailable' }
    const op = { operationId: id('save'), snapshot: clone(snap) }
    // 保留可能已经发出的首条操作；尚未发送的尾部全量快照可被最新版本替换。
    next.pending = next.pending.length ? [next.pending[0], op] : [op]
  } else snap.sync = { status: 'local' }
  write(next)
  return getSnapshot()
}
async function flushLoop(token) {
  if (!envelope || bridge.getConfig().mode !== 'host') return getSnapshot()
  if (!bridge.available('saveSession')) return getSnapshot()
  while (envelope.pending.length) {
    const op = envelope.pending[0]
    if (op.expectedRevision === undefined) {
      const prepared = clone(envelope)
      prepared.pending[0].expectedRevision = prepared.remoteRevision == null ? null : prepared.remoteRevision
      write(prepared)
    }
    const current = envelope.pending[0]
    try {
      const res = await bridge.call('saveSession', {
        userId: envelope.snapshot.userId, snapshot: clone(current.snapshot),
        expectedRevision: current.expectedRevision, operationId: current.operationId
      })
      // 宿主换账号/重新配置时，旧请求不能写入新用户存档。
      if (token !== generation) return null
      if (res && res.conflict) {
        const conflict = clone(envelope); conflict.snapshot.sync = { status: 'conflict', reason: 'revision_conflict' }
        write(conflict); return getSnapshot()
      }
      if (!res || res.acknowledged !== true || !Number.isInteger(res.revision) || res.revision < 0) throw fault('INVALID_SAVE_ACK', '宿主没有返回存档回执')
      const next = clone(envelope)
      next.remoteRevision = res.revision
      next.pending.shift()
      next.snapshot.sync = { status: next.pending.length ? 'pending' : 'synced', remoteRevision: res.revision }
      write(next)
    } catch (err) {
      if (token !== generation) return null
      const next = clone(envelope)
      next.snapshot.sync = { status: 'failed', reason: err.code || 'save_failed' }
      write(next)
      return getSnapshot()
    }
  }
  return getSnapshot()
}
function flushInternal() {
  if (flushPromise) return flushPromise
  const token = generation
  const task = flushLoop(token)
  flushPromise = task
  function clear() { if (flushPromise === task) flushPromise = null }
  task.then(clear, clear)
  return task
}
function scheduleFlush() { flushInternal().catch(function () {}) }
async function initialize(entry) {
  const token = generation
  const config = bridge.getConfig()
  let context = { userId: config.userId || (config.mode === 'demo' ? 'demo' : '') }
  if (bridge.available('getContext')) context = Object.assign(context, await bridge.call('getContext', entry || {}))
  assertGeneration(token)
  if (!context.userId) throw fault('IDENTITY_REQUIRED', '正式接入需要宿主提供稳定用户标识')
  const userId = String(context.userId)
  storageKey = local.keyFor(config.mode, userId)
  let cached = local.load(storageKey)
  if (cached) validateSnapshot(cached.snapshot, userId)
  if (config.mode === 'host' && bridge.available('loadSession')) {
    try {
      const remote = await bridge.call('loadSession', { userId: userId })
      if (remote && remote.snapshot && (!cached || !cached.pending.length)) {
        if (!Number.isInteger(remote.revision) || remote.revision < 0) throw fault('INVALID_SNAPSHOT', '宿主存档缺少有效版本')
        const value = validateSnapshot(clone(remote.snapshot), userId)
        if (!cached || Number(remote.revision) >= Number(cached.remoteRevision || 0)) {
          cached = { snapshot: value, pending: [], remoteRevision: remote.revision }
          cached.snapshot.sync = { status: 'synced', remoteRevision: remote.revision }
        }
      }
    } catch (err) {
      if (err.code === 'INVALID_SNAPSHOT' || err.code === 'INVALID_ARCHIVE' || err.code === 'CONTEXT_CHANGED') throw err
      if (cached) cached.snapshot.sync = { status: 'failed', reason: err.code || 'load_failed' }
    }
  }
  if (!cached) cached = { snapshot: fresh(userId), pending: [], remoteRevision: null }
  // 冷启动回到权威断点；不把上次的回看页当成新进度。
  cached.snapshot.run = engine.resume(cached.snapshot.run)
  write(cached)
  if (config.mode === 'host' && !cached.pending.length && cached.snapshot.sync.status !== 'synced') persist(clone(cached.snapshot))
  await flushInternal()
  assertGeneration(token)
  emit({ name: 'module_enter', source: entry && entry.source || '' })
  return getSnapshot()
}
function init(entry) {
  if (initPromise) return initPromise
  if (envelope) return Promise.resolve(getSnapshot())
  const token = generation
  initPromise = initialize(entry).then(function (result) { if (token === generation) initPromise = null; return result }, function (err) { if (token === generation) initPromise = null; throw err })
  return initPromise
}
function serial(work) {
  const token = generation
  const check = function () { assertGeneration(token) }
  const task = chain.then(function () { check(); return init({}) }).then(function () { check(); return work(check) })
  chain = task.catch(function () {})
  return task
}
function mutate(change) {
  return serial(async function (check) {
    const next = clone(envelope.snapshot)
    const result = await change(next)
    check()
    persist(next)
    // 本地持久化就是 UI 写入的等待边界；慢宿主同步在独立单队列中补发。
    scheduleFlush()
    return result === undefined ? getSnapshot() : clone(result)
  })
}
function flush() { return serial(flushInternal) }
const FLOW_FIELDS = ['pageId', 'resumePageId', 'visited', 'unlocked', 'completedPages', 'sites', 'puzzles', 'letterRead']
const LIFE_FIELDS = ['name', 'signedAt', 'completedAt', 'completedTimeSource', 'completedUtcOffsetMinutes',
  'editionNo', 'letterAvailable', 'letterOpenedAt', 'letterVerifiedAt', 'letterAnchorAt', 'letterAnchorSource', 'completionNotice', 'reminder']
function checkedRun(before, incoming) {
  if (!incoming || !pages.byId[incoming.pageId]) throw fault('UNKNOWN_PAGE', '未知页面')
  let navigation = engine.cloneRun(before)
  if (incoming.resumePageId !== before.resumePageId) {
    if (engine.isReview(before)) throw fault('INVALID_PROGRESS', '回看不能修改恢复点')
    const page = pages.byId[before.pageId]
    const choseSkip = page.skipTo && incoming.resumePageId === page.skipTo &&
      (page.kind === 'nav' ? incoming.sites && incoming.sites[page.siteId] === 'skipped'
        : page.playId ? incoming.puzzles && incoming.puzzles[page.playId] === 'skipped' : true)
    navigation = choseSkip ? engine.skip(before, before.pageId) : engine.complete(before, before.pageId,
      { assisted: !!(page.playId && incoming.puzzles && incoming.puzzles[page.playId] === 'assisted') })
    if (navigation.resumePageId !== incoming.resumePageId || navigation.pageId !== incoming.pageId) {
      throw fault('INVALID_PROGRESS', '存档只能推进到当前页的有效下一步')
    }
  } else if (incoming.pageId !== before.pageId) navigation = engine.enter(before, incoming.pageId)
  else if (incoming.letterRead && before.pageId === 'LT8') navigation = engine.complete(before, 'LT8')
  const result = Object.assign(engine.cloneRun(before), clone(incoming))
  FLOW_FIELDS.forEach(function (key) { result[key] = clone(navigation[key]) })
  LIFE_FIELDS.forEach(function (key) {
    if (before[key] === undefined) delete result[key]
    else result[key] = clone(before[key])
  })
  return result
}
function saveRun(run, sessionId) {
  return mutate(function (snap) {
    const target = targetOf(snap, sessionId)
    target.run = checkedRun(target.run, run)
    if (target !== snap) return target
  })
}
function saveDraft(pageId, patch, sessionId) {
  return mutate(function (snap) {
    const target = targetOf(snap, sessionId)
    if (!engine.canEnter(target.run, pageId)) throw fault('PAGE_LOCKED', '不能为未解锁页面写草稿')
    target.run.uiByPage[pageId] = Object.assign({}, target.run.uiByPage[pageId] || {}, clone(patch || {}))
    if (target !== snap) return target
  })
}
async function navigate(pageId, options) {
  if (String(pageId).indexOf('LT') === 0) {
    const state = await getLetterState(options && options.sessionId)
    if (!state.available) throw fault('LETTER_LOCKED', '来信尚未开放：' + state.reason)
  }
  return mutate(function (snap) {
    const target = targetOf(snap, options && options.sessionId)
    if (pageId === 'LT1' && target.run.resumePageId === 'FN4') target.run = engine.openLetter(target.run)
    else target.run = engine.enter(target.run, pageId)
    if (pageId.indexOf('LT') === 0 && !target.run.letterOpenedAt) target.run.letterOpenedAt = now()
    if (target !== snap) return target
  })
}
function resume(sessionId) {
  return mutate(function (snap) {
    const target = targetOf(snap, sessionId)
    target.run = engine.resume(target.run)
    if (target !== snap) return target
  })
}
function completePage(pageId, options) {
  return mutate(function (snap) {
    const target = targetOf(snap, options && options.sessionId)
    target.run = engine.complete(target.run, pageId, options)
    if (target !== snap) return target
  })
}
function skipPage(pageId, options) {
  return mutate(function (snap) {
    const target = targetOf(snap, options && options.sessionId)
    target.run = engine.skip(target.run, pageId)
    if (target !== snap) return target
  })
}
async function trustedTime(sessionId) {
  if (bridge.getConfig().mode === 'demo') return { now: now(), source: 'demo_device', offset: 480 }
  try {
    const res = await bridge.call('getTrustedTime', { sessionId: sessionId })
    if (!res || res.trusted !== true || !Number.isFinite(res.now) || res.now <= 0) return unavailable('invalid_time_ack')
    return { now: res.now, source: 'host', offset: Number.isFinite(res.utcOffsetMinutes) ? res.utcOffsetMinutes : 480 }
  } catch (err) { return failure(err) }
}
function nextDay(at, offset) { return (Math.floor((at + offset * 60000) / 86400000) + 1) * 86400000 - offset * 60000 }
async function notifyCompleteInternal(check) {
  const snap = envelope.snapshot
  if (!snap.run.completedAt) return
  if (snap.run.completionNotice && snap.run.completionNotice.status === 'acknowledged') return
  let result
  if (!bridge.available('onComplete')) result = unavailable('onComplete')
  else {
    try {
      const ack = await bridge.call('onComplete', { sessionId: snap.sessionId, completedAt: snap.run.completedAt,
        operationId: 'complete:' + snap.sessionId })
      result = ack && ack.acknowledged === true ? { status: 'acknowledged' } : { status: 'failed', reason: 'invalid_completion_ack' }
    } catch (err) { result = failure(err) }
  }
  check()
  const next = clone(envelope.snapshot); next.run.completionNotice = result; persist(next)
}
function sign(name) {
  return serial(async function (check) {
    let snap = clone(envelope.snapshot)
    if (snap.run.pageId !== 'FN4' || snap.run.resumePageId !== 'FN4') throw fault('NOT_AT_FINALE', '请在署名页完成考察')
    if (!snap.run.completedAt) {
      const time = await trustedTime(snap.sessionId)
      check()
      snap.run.name = String(name || '').trim().slice(0, 40) || '无名氏'
      snap.run.signedAt = now()
      snap.run.completedAt = time.now || snap.run.signedAt
      snap.run.completedTimeSource = time.source || 'device_unverified'
      snap.run.completedUtcOffsetMinutes = time.offset == null ? 480 : time.offset
      snap.run.completedPages.FN4 = true
      persist(snap)
      emit({ name: 'module_completed', completedAt: snap.run.completedAt })
    }
    await notifyCompleteInternal(check)
    await flushInternal()
    check()
    return getSnapshot()
  })
}
function restart() {
  return mutate(function (snap) {
    syncArchive(snap)
    const next = fresh(snap.userId, clone(snap.archives))
    Object.keys(snap).forEach(function (key) { delete snap[key] })
    Object.assign(snap, next)
  })
}
function getLetterState(sessionId) {
  return serial(async function (check) {
    const target = targetOf(envelope.snapshot, sessionId)
    if (!target.run.completedAt) return { available: false, reason: 'not_completed', timeSource: null, unlockAt: null }
    if (target.run.letterAvailable) return { available: true, reason: 'verified_cached',
      timeSource: target.run.letterTimeSource || target.run.completedTimeSource,
      unlockAt: target.run.letterTimeSource === 'host_state' ? target.run.letterUnlockAt || null :
        target.run.letterUnlockAt || nextDay(target.run.completedAt, target.run.completedUtcOffsetMinutes || 0) }
    // 有正式的来信裁定接口时以它为准，不在拒绝/失败后改用设备时间兜底。
    if (bridge.getConfig().mode === 'host' && bridge.available('getLetterState')) {
      let state
      try {
        state = await bridge.call('getLetterState', { sessionId: target.sessionId, completedAt: target.run.completedAt,
          completedTimeSource: target.run.completedTimeSource })
      } catch (err) { return Object.assign(failure(err), { available: false, timeSource: null, unlockAt: null }) }
      if (!state || state.trusted !== true || typeof state.available !== 'boolean') {
        return { available: false, status: 'failed', reason: 'invalid_letter_ack', timeSource: null, unlockAt: null }
      }
      const unlockAt = Number.isFinite(state.unlockAt) ? state.unlockAt : null
      if (state.available) {
        const next = clone(envelope.snapshot)
        const selected = targetOf(next, sessionId)
        selected.run.letterAvailable = true; selected.run.letterTimeSource = 'host_state'
        selected.run.letterUnlockAt = unlockAt; selected.run.letterVerifiedAt = state.now || now()
        selected.run.unlocked.LT1 = true
        persist(next); scheduleFlush()
      }
      return { available: state.available, reason: state.available ? 'available' : state.reason || 'not_due',
        timeSource: 'host_state', unlockAt: unlockAt }
    }
    const time = await trustedTime(target.sessionId)
    check()
    if (!time.now) return Object.assign({}, time, { available: false, timeSource: null, unlockAt: null })
    // 离线完成没有可信完成日期：第一次取得宿主时间时确定起算日，不能用改设备时间提前放行。
    let completedAt = target.run.letterAnchorAt || target.run.completedAt
    const needsAnchor = bridge.getConfig().mode === 'host' && target.run.completedTimeSource !== 'host' && !target.run.letterAnchorAt
    if (needsAnchor) completedAt = time.now
    const unlockAt = nextDay(completedAt, time.offset)
    const available = time.now >= unlockAt
    if (available || needsAnchor) {
      const next = clone(envelope.snapshot)
      const selected = targetOf(next, sessionId)
      if (needsAnchor) {
        // 保留原始完成日期；可信来信起算日另存，补图或校时不篡改完成档案。
        selected.run.letterAnchorAt = completedAt
        selected.run.letterAnchorSource = 'host'
      }
      selected.run.letterUnlockAt = unlockAt
      selected.run.letterTimeSource = time.source
      if (available) {
        selected.run.letterAvailable = true
        selected.run.letterVerifiedAt = time.now
        selected.run.unlocked.LT1 = true
      }
      persist(next); await flushInternal()
    }
    return { available: available, reason: available ? 'available' : 'not_due', timeSource: time.source, unlockAt: unlockAt }
  })
}
function openBonus(sessionId) {
  return mutate(function (snap) {
    const target = targetOf(snap, sessionId)
    if (!target.run.completedAt) throw fault('LETTER_LOCKED', '请先完成考察并保存署名')
    // Explicit player choice, not a fabricated date or a trusted-time acknowledgement.
    target.run.letterAvailable = true
    target.run.letterTimeSource = target.run.letterTimeSource || 'player_choice'
    if (!target.run.letterOpenedAt) target.run.letterOpenedAt = now()
    if (target.run.resumePageId === 'FN4') target.run = engine.openLetter(target.run)
    else target.run = engine.resume(target.run)
    if (target !== snap) return target
  })
}
async function openLetter(sessionId) { return navigate('LT1', { sessionId: sessionId }) }
function setFlag(key, value) { return mutate(function (snap) { snap.run.flags[key] = clone(value) }) }

function recordTarget(snap, input, sessionId) { return targetOf(snap, sessionId || input && input.sessionId) }
function saveRecord(input, sessionId) {
  return mutate(function (snap) {
    const target = recordTarget(snap, input, sessionId)
    const value = clone(input || {})
    if (['photo', 'text', 'wish'].indexOf(value.kind) < 0 || ['field', 'relay'].indexOf(value.purpose) < 0) {
      throw fault('INVALID_RECORD', '记录类型或用途无效')
    }
    const index = value.id ? target.records.findIndex(function (r) { return r.id === value.id }) : -1
    if (value.id && index < 0) throw fault('RECORD_NOT_FOUND', '找不到原记录')
    const previous = index >= 0 ? target.records[index] : {}
    const record = Object.assign({}, previous, value, { id: previous.id || id('record'), sessionId: target.sessionId,
      createdAt: previous.createdAt || value.createdAt || now(), updatedAt: now(),
      status: value.status || previous.status || 'private' })
    if (contract.RECORD_STATUSES.indexOf(record.status) < 0) throw fault('INVALID_RECORD_STATUS', '私人记录只能是草稿或已保存')
    record.text = String(record.text || '').slice(0, contract.BOARD_MESSAGE_MAX_LEN)
    if (index < 0) target.records.push(record)
    else target.records[index] = record
    return record
  })
}
function updateContributionDraft(input, sessionId) {
  return saveRecord(Object.assign({}, input, { purpose: 'relay', status: 'draft' }), sessionId)
}
function deleteRecord(recordId, sessionId) {
  return serial(async function (check) {
    const snap = clone(envelope.snapshot)
    const target = targetOf(snap, sessionId)
    const index = target.records.findIndex(function (record) { return record.id === recordId })
    if (index < 0) throw fault('RECORD_NOT_FOUND', '找不到原记录')
    const filePath = target.records[index].filePath
    target.records.splice(index, 1)
    target.contributions.forEach(function (c) { if (c.recordId === recordId && c.record) delete c.record.filePath })
    // 公开副本必须另行取得撤回回执；删私人稿不会谎称公开内容已经撤回。
    const result = { id: recordId, deleted: true, publicCopyUnaffected: target.contributions.some(function (c) {
      return c.recordId === recordId && (c.status === 'submitted' || c.status === 'published')
    }) }
    persist(snap)
    await flushInternal()
    check()
    const all = [envelope.snapshot].concat(envelope.snapshot.archives)
    const referenced = filePath && all.some(function (item) { return item.records.some(function (r) { return r.filePath === filePath }) })
    if (filePath && !referenced && !/^https?:/.test(filePath)) {
      if (typeof wx !== 'undefined' && typeof wx.removeSavedFile === 'function') {
        result.fileCleanup = await new Promise(function (resolve) {
          wx.removeSavedFile({ filePath: filePath, success: function () { resolve('removed') }, fail: function () { resolve('failed') } })
        })
      } else result.fileCleanup = 'unavailable'
    } else result.fileCleanup = referenced ? 'referenced' : 'not_needed'
    return result
  })
}
async function saveMedia(input) {
  const value = input || {}
  const filePath = value.filePath || value.tempFilePath
  if (!filePath) return { available: false, status: 'failed', reason: 'file_required' }
  if (!value.upload) return local.saveLocalMedia(filePath)
  if (!bridge.available('uploadMedia')) return unavailable('uploadMedia')
  await init({})
  try {
    const res = await bridge.call('uploadMedia', { sessionId: value.sessionId || envelope && envelope.snapshot.sessionId,
      filePath: filePath, kind: value.kind || 'photo', operationId: value.operationId || id('media') })
    if (!res || !res.mediaId) return { available: false, status: 'failed', reason: 'invalid_upload_ack' }
    return { available: true, status: 'uploaded', mediaId: String(res.mediaId), url: res.url || '' }
  } catch (err) { return failure(err) }
}
function findContribution(snap, contributionId, sessionId) {
  const target = targetOf(snap, sessionId)
  const item = target.contributions.find(function (c) { return c.id === contributionId })
  if (!item) throw fault('CONTRIBUTION_NOT_FOUND', '找不到投稿记录')
  return { target: target, item: item }
}
function submitContribution(recordId, options) {
  const opts = options || {}
  return serial(async function () {
    if (opts.consent !== true) throw fault('CONSENT_REQUIRED', '公开投稿需要单独同意')
    let snap = clone(envelope.snapshot)
    let target = targetOf(snap, opts.sessionId)
    const record = target.records.find(function (r) { return r.id === recordId })
    if (!record) throw fault('RECORD_NOT_FOUND', '找不到原记录')
    if (record.purpose !== 'relay') throw fault('PRIVATE_RECORD', '现场私人记录不能直接公开投稿')
    if (record.kind !== 'photo' && !String(record.text || '').trim()) throw fault('EMPTY_RECORD', '请先写下内容')
    let item = target.contributions.slice().reverse().find(function (c) { return c.recordId === recordId && c.status !== 'withdrawn' })
    const changed = item && ['kind', 'filePath', 'text'].some(function (key) { return item.record[key] !== record[key] })
    if (item && (['submitted', 'published'].indexOf(item.status) >= 0 || (item.status === 'rejected' && !changed))) return clone(item)
    // 明确被拒后可以修改重投；尚未请求公开提交的失败草稿也可另建新操作。
    if (item && changed && (item.status === 'rejected' || !item.attemptedAt)) item = null
    if (!item) {
      item = { id: id('contribution'), recordId: recordId, sessionId: target.sessionId, createdAt: now(),
        operationId: id('submit'), status: 'failed', reason: 'not_sent', consentAt: now(), record: clone(record) }
      // 私人稿的任意媒体字段不能充当公开投稿的上传回执。
      delete item.record.mediaId; delete item.record.url
      target.contributions.push(item)
    } else {
      // 失败请求保留相同的幂等键与提交内容，避免超时后的重复发布。
      if (changed && item.attemptedAt) {
        throw fault('UNCERTAIN_SUBMISSION', '先确认上次投稿结果，再修改后重投')
      }
      if (!item.attemptedAt) {
        item.record = clone(record)
        delete item.record.mediaId; delete item.record.url
      }
    }
    persist(snap)
    const contributionId = item.id
    let result
    if (!bridge.available('submitContribution')) result = unavailable('submitContribution')
    else {
      if (record.kind === 'photo' && !item.record.mediaId) {
        const uploaded = await saveMedia({ filePath: record.filePath, kind: 'photo', upload: true,
          sessionId: target.sessionId, operationId: 'media:' + item.id })
        if (uploaded.status !== 'uploaded') result = uploaded
        else {
          item.record.mediaId = uploaded.mediaId; item.record.url = uploaded.url
          snap = clone(envelope.snapshot)
          Object.assign(findContribution(snap, contributionId, opts.sessionId).item.record, { mediaId: uploaded.mediaId, url: uploaded.url })
          persist(snap)
        }
      }
      if (!result) {
        snap = clone(envelope.snapshot)
        const sending = findContribution(snap, contributionId, opts.sessionId).item
        sending.attemptedAt = sending.attemptedAt || now()
        persist(snap)
        try {
          const publicRecord = { kind: item.record.kind, text: item.record.text || '', mediaId: item.record.mediaId || '', url: item.record.url || '' }
          const res = await bridge.call('submitContribution', { sessionId: target.sessionId, record: publicRecord,
            operationId: item.operationId, consent: true })
          if (!res || !res.receiptId || ['submitted', 'published', 'rejected'].indexOf(res.status) < 0) {
            result = { status: 'failed', reason: 'invalid_submission_ack' }
          } else result = { status: res.status, receiptId: String(res.receiptId), reason: res.reason || '', acknowledgedAt: now() }
        } catch (err) { result = failure(err) }
      }
    }
    snap = clone(envelope.snapshot)
    const saved = findContribution(snap, contributionId, opts.sessionId).item
    Object.assign(saved, result, { updatedAt: now() })
    persist(snap); await flushInternal()
    return clone(saved)
  })
}
function getContribution(contributionId, sessionId) {
  return serial(async function () {
    const found = findContribution(envelope.snapshot, contributionId, sessionId).item
    if (found.status === 'withdrawn') return clone(found)
    if (!bridge.available('getContribution')) return clone(found)
    let res
    try { res = await bridge.call('getContribution', { sessionId: found.sessionId, receiptId: found.receiptId || '', operationId: found.operationId }) }
    catch (err) { return Object.assign(clone(found), { refreshStatus: failure(err).status }) }
    if (!res || !res.receiptId || (found.receiptId && res.receiptId !== found.receiptId) || ['submitted', 'published', 'rejected', 'withdrawn'].indexOf(res.status) < 0) {
      return Object.assign(clone(found), { refreshStatus: 'failed' })
    }
    const next = clone(envelope.snapshot)
    const item = findContribution(next, contributionId, sessionId).item
    Object.assign(item, { receiptId: String(res.receiptId), status: res.status, reason: res.reason || '', updatedAt: now() })
    persist(next); await flushInternal()
    return clone(item)
  })
}
function withdrawContribution(contributionId, sessionId) {
  return serial(async function () {
    const current = findContribution(envelope.snapshot, contributionId, sessionId).item
    if (current.status === 'withdrawn') return clone(current)
    if (!current.receiptId) return Object.assign(clone(current), { withdrawalStatus: 'unavailable' })
    let res
    try {
      res = await bridge.call('withdrawContribution', { sessionId: current.sessionId, receiptId: current.receiptId,
        operationId: 'withdraw:' + current.id })
    } catch (err) { return Object.assign(clone(current), { withdrawalStatus: failure(err).status }) }
    if (!res || res.acknowledged !== true || res.status !== 'withdrawn' || res.receiptId !== current.receiptId) {
      return Object.assign(clone(current), { withdrawalStatus: 'failed' })
    }
    const next = clone(envelope.snapshot)
    const item = findContribution(next, contributionId, sessionId).item
    item.status = 'withdrawn'; item.withdrawnAt = now()
    persist(next); await flushInternal()
    return clone(item)
  })
}
async function listContributions(options) {
  const opts = options || {}
  if (!bridge.available('listContributions')) return Object.assign(unavailable('listContributions'), { items: [] })
  try {
    const res = await bridge.call('listContributions', { sessionId: opts.sessionId || envelope && envelope.snapshot.sessionId,
      limit: Math.max(1, Math.min(20, Number(opts.limit) || 6)) })
    if (!res || !Array.isArray(res.items)) return { status: 'failed', reason: 'invalid_list_ack', items: [] }
    return { available: true, status: 'available', items: res.items.filter(function (item) {
      return item && item.status === 'published' && ['photo', 'text', 'wish'].indexOf(item.kind) >= 0
    }).map(function (item) { return { id: item.id, kind: item.kind, text: item.text || '', url: item.url || '',
      from: '一位考察者', status: 'published' } }) }
  } catch (err) { return Object.assign(failure(err), { items: [] }) }
}
function claimEdition() {
  return serial(async function () {
    if (!envelope.snapshot.run.completedAt) return unavailable('not_completed')
    if (envelope.snapshot.run.editionNo != null) return { status: 'available', editionNo: envelope.snapshot.run.editionNo }
    if (!bridge.available('claimEdition')) return unavailable('claimEdition')
    let res
    try { res = await bridge.call('claimEdition', { sessionId: envelope.snapshot.sessionId, operationId: 'edition:' + envelope.snapshot.sessionId }) }
    catch (err) { return failure(err) }
    if (!res || res.scope !== 'global' || res.editionNo == null) return { status: 'failed', reason: 'invalid_edition_ack' }
    const next = clone(envelope.snapshot); next.run.editionNo = res.editionNo; persist(next); await flushInternal()
    return { status: 'available', editionNo: res.editionNo }
  })
}
function requestReminder(sessionId) {
  return serial(async function () {
    const target = targetOf(envelope.snapshot, sessionId)
    if (!target.run.completedAt) return Object.assign(unavailable('not_completed'), { accepted: false })
    if (target.run.reminder && target.run.reminder.accepted === true) return clone(target.run.reminder)
    let result
    if (!bridge.available('requestReminder')) result = Object.assign(unavailable('requestReminder'), { accepted: false })
    else {
      try {
        const res = await bridge.call('requestReminder', { sessionId: target.sessionId, completedAt: target.run.completedAt })
        if (res && res.accepted === true) result = { available: true, accepted: true, status: 'accepted', acceptedAt: now(), reminderId: res.reminderId || '' }
        else if (res && res.accepted === false) result = { available: true, accepted: false, status: 'declined', reason: res.reason || 'declined' }
        else result = { available: false, accepted: false, status: 'failed', reason: 'invalid_reminder_ack' }
      } catch (err) { result = Object.assign(failure(err), { accepted: false }) }
    }
    const next = clone(envelope.snapshot)
    targetOf(next, sessionId).run.reminder = result
    persist(next); scheduleFlush()
    return clone(result)
  })
}
async function exit(reason) {
  const token = generation
  await init({})
  await flush()
  assertGeneration(token)
  const snap = getSnapshot()
  emit({ name: 'module_exit', reason: reason || 'back' })
  if (!bridge.available('exit')) return unavailable('exit')
  try {
    const ack = await bridge.call('exit', { sessionId: snap.sessionId, completed: !!snap.run.completedAt, reason: reason || 'back' })
    return ack && ack.acknowledged === true ? { status: 'exited' } : { status: 'failed', reason: 'invalid_exit_ack' }
  } catch (err) { return failure(err) }
}
function emit(event) {
  const input = event || {}
  const e = { name: input.name, ts: now(), sessionId: envelope && envelope.snapshot.sessionId }
  ;['source', 'reason', 'puzzle', 'attempt', 'result', 'inputMode', 'hintLevel', 'capability', 'completedAt'].forEach(function (key) {
    if (input[key] !== undefined) e[key] = input[key]
  })
  if (bridge.available('emitEvent')) bridge.call('emitEvent', e).catch(function () {})
  listeners.slice().forEach(function (listener) { try { listener(clone(e)) } catch (err) {} })
}
function onEvent(listener) {
  if (typeof listener !== 'function') return function () {}
  listeners.push(listener)
  return function () { const index = listeners.indexOf(listener); if (index >= 0) listeners.splice(index, 1) }
}
module.exports = {
  configure, init, getSnapshot, getRun, getArchives, getArchive, saveRun, saveDraft, navigate, resume, completePage, skipPage,
  sign, restart, reset: restart, getLetterState, openLetter, openBonus, saveRecord, updateContributionDraft, deleteRecord,
  saveMedia, submitContribution, getContribution, withdrawContribution, listContributions, claimEdition, requestReminder, flush, exit,
  setFlag, emit, onEvent,
  viewPuzzle: function (puzzle) { emit({ name: 'puzzle_viewed', puzzle: puzzle }) },
  attemptPuzzle: function (puzzle, attempt, result, inputMode) { emit({ name: 'puzzle_attempted', puzzle, attempt, result: result ? 'correct' : 'incorrect', inputMode }) },
  viewHint: function (puzzle, hintLevel) { emit({ name: 'hint_viewed', puzzle, hintLevel }) },
  capabilityFallback: function (capability, reason) { emit({ name: 'capability_fallback', capability, reason }) }
}
