'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const engine = require('../plate21/module/flow/engine')
const ROOT = '../plate21/module/'
function harness(config, storage) {
  const values = storage || {}
  const reads = []
  const writes = []
  let failWrite = false
  global.wx = {
    getStorageSync(key) { reads.push(key); return values[key] ? JSON.parse(JSON.stringify(values[key])) : '' },
    setStorageSync(key, value) { if (failWrite) throw new Error('quota'); writes.push(key); values[key] = JSON.parse(JSON.stringify(value)) },
    saveFile(opts) { opts.success({ savedFilePath: '/saved/' + opts.tempFilePath.split('/').pop() }) }
  }
  for (const path of ['store/session', 'host/bridge', 'adapters/local-adapter']) delete require.cache[require.resolve(ROOT + path)]
  const session = require(ROOT + 'store/session')
  session.configure(Object.assign({ mode: 'demo' }, config))
  return { session, values, reads, writes, quota(value) { failWrite = value } }
}
async function reachFinale(session) {
  await session.init({})
  for (let i = 0; session.getRun().pageId !== 'FN4' && i < 60; i++) await session.completePage(session.getRun().pageId)
  assert.equal(session.getRun().pageId, 'FN4')
}
function hostStorage() {
  const seen = new Map()
  let revision = 0
  const calls = []
  return {
    calls,
    async saveSession(input) {
      calls.push(input)
      if (seen.has(input.operationId)) return seen.get(input.operationId)
      if (input.expectedRevision != null && input.expectedRevision !== revision) return { conflict: true, revision }
      const ack = { acknowledged: true, revision: ++revision }; seen.set(input.operationId, ack); return ack
    }
  }
}
test('v3 isolates all legacy storage and resumes the authoritative point after reload', async () => {
  const storage = { plate21_session: { old: true }, 'plate21-mainline-run': { pageId: 'LT8' } }
  let h = harness({}, storage)
  await h.session.init({})
  await h.session.completePage('P1')
  await h.session.navigate('P1')
  assert.equal(h.session.getRun().resumePageId, 'P2')
  const run = h.session.getRun(); run.uiByPage.P1 = { answer: '东北', scrollTop: 300 }
  await h.session.saveRun(run)
  assert.ok(h.reads.every(key => key.startsWith('plate21_v3_session:')))
  assert.deepEqual(storage.plate21_session, { old: true })
  h = harness({}, storage)
  await h.session.init({})
  assert.equal(h.session.getRun().pageId, 'P2')
  assert.equal(h.session.getRun().uiByPage.P1.scrollTop, 300)
})
test('local quota error rejects without replacing in-memory progress', async () => {
  const h = harness()
  await h.session.init({})
  h.quota(true)
  await assert.rejects(h.session.completePage('P1'), /quota/)
  assert.equal(h.session.getRun().resumePageId, 'P1')
})
test('serialized private edits preserve both records and returning snapshots cannot mutate storage', async () => {
  const { session } = harness()
  await session.init({})
  await Promise.all([
    session.saveRecord({ kind: 'text', purpose: 'field', text: '甲' }),
    session.saveRecord({ kind: 'wish', purpose: 'relay', text: '乙', status: 'draft' })
  ])
  assert.equal(session.getSnapshot().records.length, 2)
  const detached = session.getSnapshot(); detached.records.length = 0
  assert.equal(session.getSnapshot().records.length, 2)
})
test('saveRun refuses forged frontier and lifecycle changes, but preserves UI fields', async () => {
  const { session } = harness()
  await session.init({})
  const forged = session.getRun()
  forged.resumePageId = 'FN4'; forged.pageId = 'FN4'; forged.unlocked.FN4 = true
  await assert.rejects(session.saveRun(forged), { code: 'INVALID_PROGRESS' })
  const next = engine.complete(session.getRun(), 'P1')
  next.uiByPage.P2 = { scrollTop: 25, waterClock: 4 }
  next.completedAt = 999; next.letterAvailable = true
  await session.saveRun(next)
  assert.equal(session.getRun().resumePageId, 'P2')
  assert.equal(session.getRun().completedAt, null)
  assert.equal(session.getRun().letterAvailable, false)
  assert.equal(session.getRun().uiByPage.P2.waterClock, 4)
})
test('demo completion day controls next-day letter; archive persists after restart and late photos', async () => {
  let clock = Date.UTC(2026, 8, 24, 15, 59)
  const { session } = harness({ now: () => clock })
  await reachFinale(session)
  await session.sign('考察者')
  const completed = session.getSnapshot()
  assert.equal(completed.run.pageId, 'FN4')
  assert.equal((await session.getLetterState()).available, false)
  await assert.rejects(session.navigate('LT3'), { code: 'LETTER_LOCKED' })
  clock += 120000
  assert.equal((await session.getLetterState()).available, true)
  await session.openLetter()
  assert.equal(session.getRun().resumePageId, 'LT1')
  await assert.rejects(session.navigate('LT3'), { code: 'PAGE_LOCKED' })
  await session.restart()
  assert.equal(session.getRun().pageId, 'P1')
  assert.notEqual(session.getSnapshot().sessionId, completed.sessionId)
  const record = await session.saveRecord({ kind: 'photo', purpose: 'field', filePath: '/saved/late.jpg' }, completed.sessionId)
  const archive = session.getArchive(completed.sessionId)
  assert.equal(archive.run.completedAt, completed.run.completedAt)
  assert.equal(archive.archives, undefined)
  assert.equal(archive.records[0].id, record.id)
  const opened = await session.openLetter(completed.sessionId)
  assert.equal(opened.run.pageId, 'LT1')
  assert.equal(session.getRun().pageId, 'P1')
})
test('formal mode requires identity, namespaces users, and never accepts device clock for first letter unlock', async () => {
  const missing = harness({ mode: 'host' }).session
  await assert.rejects(missing.init({}), { code: 'IDENTITY_REQUIRED' })
  const { session, values } = harness({ mode: 'host', userId: 'alice', now: () => Date.UTC(2026, 8, 24) })
  await reachFinale(session)
  await session.sign('甲')
  assert.equal((await session.getLetterState()).available, false)
  assert.equal(session.getRun().editionNo, null)
  assert.equal((await session.claimEdition()).status, 'unavailable')
  const bob = harness({ mode: 'host', userId: 'bob' }, values).session
  await bob.init({})
  assert.equal(bob.getRun().completedAt, null)
})
test('host trusted unlock is cached for offline reread and completion callback is idempotent', async () => {
  let clock = Date.UTC(2026, 8, 24, 10)
  let online = true
  const completions = []
  const host = { async getTrustedTime() { if (!online) throw new Error('offline'); return { trusted: true, now: clock } },
    async onComplete(value) { completions.push(value); return { acknowledged: true } } }
  const { session } = harness({ mode: 'host', userId: 'alice', host, now: () => clock })
  await reachFinale(session)
  await session.sign('甲')
  await session.sign('甲')
  assert.equal(completions.length, 1)
  assert.equal((await session.getLetterState()).available, false)
  clock += 86400000
  assert.equal((await session.getLetterState()).available, true)
  online = false
  assert.equal((await session.getLetterState()).available, true)
  await session.navigate('LT1')
  assert.equal(session.getRun().resumePageId, 'LT1')
})
test('official completion while offline keeps historical date and uses a separate trusted letter anchor', async () => {
  let clock = Date.UTC(2026, 8, 24)
  let online = false
  const { session } = harness({ mode: 'host', userId: 'alice', now: () => clock, host: {
    async getTrustedTime() { if (!online) throw new Error('offline'); return { now: clock, trusted: true } }
  } })
  await reachFinale(session); await session.sign('甲')
  const originalDate = session.getRun().completedAt
  clock += 86400000; online = true
  assert.equal((await session.getLetterState()).available, false)
  assert.equal(session.getRun().completedAt, originalDate)
  clock += 86400000
  assert.equal((await session.getLetterState()).available, true)
  assert.equal(session.getRun().completedAt, originalDate)
})
test('missing submission and upload capabilities never pretend to be pending moderation', async () => {
  const { session } = harness()
  await session.init({})
  const privateRecord = await session.saveRecord({ kind: 'text', purpose: 'field', text: '私人' })
  await assert.rejects(session.submitContribution(privateRecord.id, { consent: true }), { code: 'PRIVATE_RECORD' })
  const record = await session.saveRecord({ kind: 'text', purpose: 'relay', text: '下一位好' })
  await assert.rejects(session.submitContribution(record.id, {}), { code: 'CONSENT_REQUIRED' })
  const sent = await session.submitContribution(record.id, { consent: true })
  assert.equal(sent.status, 'unavailable')
  assert.equal(sent.receiptId, undefined)
  assert.equal(session.getSnapshot().records.find(r => r.id === record.id).status, 'private')
  assert.deepEqual((await session.listContributions()).items, [])
  assert.equal((await session.saveMedia({ filePath: '/tmp/a.jpg' })).status, 'local')
  assert.equal((await session.saveMedia({ filePath: '/tmp/a.jpg', upload: true })).status, 'unavailable')
})
test('photo upload precedes submission, public data excludes local path, and withdrawal requires real ack', async () => {
  const calls = []
  let withdrawOK = false
  const { session } = harness({ host: {
    async uploadMedia(input) { calls.push(['upload', input]); return { mediaId: 'm1', url: 'https://cdn.example/1.jpg' } },
    async submitContribution(input) { calls.push(['submit', input]); return { receiptId: 'c1', status: 'submitted' } },
    async withdrawContribution(input) { return withdrawOK ? { acknowledged: true, receiptId: input.receiptId, status: 'withdrawn' } : {} },
    async listContributions() { return { items: [{ id: 'private', kind: 'text', status: 'submitted', text: '不能展示' },
      { id: 'published', kind: 'text', status: 'published', text: '可展示', userId: 'secret', from: '真实姓名' }] } }
  } })
  await session.init({})
  const record = await session.saveRecord({ kind: 'photo', purpose: 'relay', filePath: '/saved/photo.jpg' })
  const contribution = await session.submitContribution(record.id, { consent: true })
  assert.equal(contribution.status, 'submitted')
  assert.deepEqual(calls.map(c => c[0]), ['upload', 'submit'])
  assert.equal(calls[1][1].record.mediaId, 'm1')
  assert.equal(calls[1][1].record.filePath, undefined)
  const failed = await session.withdrawContribution(contribution.id)
  assert.equal(failed.status, 'submitted')
  assert.equal(failed.withdrawalStatus, 'failed')
  withdrawOK = true
  assert.equal((await session.withdrawContribution(contribution.id)).status, 'withdrawn')
  assert.equal(session.getSnapshot().records.length, 1)
  const listed = await session.listContributions()
  assert.equal(listed.items.length, 1)
  assert.equal(listed.items[0].userId, undefined)
  assert.equal(listed.items[0].from, '一位考察者')
})
test('failed photo upload preserves private record and never calls submit', async () => {
  let submitted = false
  const { session } = harness({ host: { async uploadMedia() { throw new Error('offline') },
    async submitContribution() { submitted = true; return { receiptId: 'bad', status: 'submitted' } } } })
  await session.init({})
  const record = await session.saveRecord({ kind: 'photo', purpose: 'relay', filePath: '/saved/photo.jpg' })
  const result = await session.submitContribution(record.id, { consent: true })
  assert.equal(result.status, 'failed')
  assert.equal(submitted, false)
  assert.equal(session.getSnapshot().records[0].filePath, '/saved/photo.jpg')
})
test('uncertain submit retries same operation ID and body after reload', async () => {
  const seen = []
  let attempt = 0
  const config = { host: { async submitContribution(input) {
    seen.push(input)
    if (++attempt === 1) throw new Error('response lost')
    return { receiptId: 'c1', status: 'rejected', reason: '请修改' }
  } } }
  let h = harness(config)
  await h.session.init({})
  const record = await h.session.saveRecord({ kind: 'text', purpose: 'relay', text: '原文' })
  assert.equal((await h.session.submitContribution(record.id, { consent: true })).status, 'failed')
  h = harness(config, h.values); await h.session.init({})
  assert.equal((await h.session.submitContribution(record.id, { consent: true })).status, 'rejected')
  assert.equal(seen[0].operationId, seen[1].operationId)
  assert.deepEqual(seen[0].record, seen[1].record)
})
test('host save outbox retains failed operation across reload; acknowledgement and conflict are distinct', async () => {
  const service = hostStorage()
  let online = false
  const host = { async saveSession(input) { if (!online) throw new Error('offline'); return service.saveSession(input) } }
  let h = harness({ mode: 'host', userId: 'alice', host })
  await h.session.init({})
  await h.session.completePage('P1')
  await h.session.flush()
  assert.equal(h.session.getSnapshot().sync.status, 'failed')
  const before = Object.values(h.values)[0].pending[0].operationId
  online = true
  h = harness({ mode: 'host', userId: 'alice', host }, h.values)
  await h.session.init({})
  assert.equal(service.calls[0].operationId, before)
  assert.equal(h.session.getSnapshot().sync.status, 'synced')
  assert.equal(h.session.getRun().resumePageId, 'P2')
  host.saveSession = async () => ({ conflict: true, revision: 999 })
  await h.session.completePage('P2')
  await h.session.flush()
  assert.equal(h.session.getSnapshot().sync.status, 'conflict')
  assert.equal(h.session.getRun().resumePageId, 'P3')
  assert.ok(Object.values(h.values)[0].pending.length)
})
test('delete private record does not claim public withdrawal, and exit calls the injected host', async () => {
  const exits = []
  const { session } = harness({ host: {
    async submitContribution() { return { receiptId: 'r1', status: 'published' } },
    async exit(input) { exits.push(input); return { acknowledged: true } }
  } })
  await session.init({})
  const record = await session.saveRecord({ kind: 'wish', purpose: 'relay', text: '再看一眼' })
  const publicCopy = await session.submitContribution(record.id, { consent: true })
  const deletion = await session.deleteRecord(record.id)
  assert.equal(deletion.publicCopyUnaffected, true)
  assert.equal(session.getSnapshot().contributions[0].id, publicCopy.id)
  assert.equal((await session.exit('back')).status, 'exited')
  assert.equal(exits[0].reason, 'back')
})

test('archive letter UI drafts persist independently of a new active run', async () => {
  let clock = Date.UTC(2026, 8, 24)
  const { session } = harness({ now: () => clock })
  await reachFinale(session); await session.sign('甲')
  const completedId = session.getSnapshot().sessionId
  clock += 86400000
  await session.openLetter(completedId); await session.restart()
  const archived = session.getArchive(completedId)
  archived.run.uiByPage.LT1 = { scrollTop: 450 }
  await session.saveRun(archived.run, completedId)
  assert.equal(session.getArchive(completedId).run.uiByPage.LT1.scrollTop, 450)
  assert.equal(session.getRun().pageId, 'P1')
})
test('rejected content can be edited and resubmitted with a new operation, uncertain content cannot', async () => {
  const requests = []
  const { session } = harness({ host: { async submitContribution(input) {
    requests.push(input); return { receiptId: 'r' + requests.length, status: requests.length === 1 ? 'rejected' : 'submitted' }
  } } })
  await session.init({})
  const record = await session.saveRecord({ kind: 'text', purpose: 'relay', text: '原稿' })
  await session.submitContribution(record.id, { consent: true })
  await session.saveRecord(Object.assign({}, record, { text: '修改稿' }))
  const result = await session.submitContribution(record.id, { consent: true })
  assert.equal(result.status, 'submitted')
  assert.notEqual(requests[0].operationId, requests[1].operationId)
  assert.equal(requests[1].record.text, '修改稿')
})
test('photo submission retry reuses uploaded media and exact public payload', async () => {
  let uploads = 0
  const requests = []
  const { session } = harness({ host: {
    async uploadMedia() { uploads++; return { mediaId: 'm1' } },
    async submitContribution(input) {
      requests.push(input)
      if (requests.length === 1) throw new Error('lost ack')
      return { receiptId: 'r1', status: 'submitted' }
    }
  } })
  await session.init({})
  const record = await session.saveRecord({ kind: 'photo', purpose: 'relay', filePath: '/saved/1.jpg' })
  await session.submitContribution(record.id, { consent: true })
  assert.equal((await session.submitContribution(record.id, { consent: true })).status, 'submitted')
  assert.equal(uploads, 1)
  assert.deepEqual(requests[0], requests[1])
})
test('a lost submission receipt can be recovered by operation ID and then withdrawn', async () => {
  const { session } = harness({ host: {
    async submitContribution() { throw new Error('lost ack') },
    async getContribution(input) { assert.ok(input.operationId); return { receiptId: 'recovered', status: 'published' } },
    async withdrawContribution(input) { return { receiptId: input.receiptId, acknowledged: true, status: 'withdrawn' } }
  } })
  await session.init({})
  const record = await session.saveRecord({ kind: 'text', purpose: 'relay', text: '你好' })
  const failed = await session.submitContribution(record.id, { consent: true })
  assert.equal((await session.getContribution(failed.id)).receiptId, 'recovered')
  assert.equal((await session.withdrawContribution(failed.id)).status, 'withdrawn')
})
test('local media deletion happens after storage and preserves files referenced by another record', async () => {
  const removed = []
  const { session } = harness()
  global.wx.removeSavedFile = opts => { removed.push(opts.filePath); opts.success() }
  await session.init({})
  const first = await session.saveRecord({ kind: 'photo', purpose: 'field', filePath: '/saved/shared.jpg' })
  const second = await session.saveRecord({ kind: 'photo', purpose: 'field', filePath: '/saved/shared.jpg' })
  assert.equal((await session.deleteRecord(first.id)).fileCleanup, 'referenced')
  assert.equal(removed.length, 0)
  assert.equal((await session.deleteRecord(second.id)).fileCleanup, 'removed')
  assert.deepEqual(removed, ['/saved/shared.jpg'])
})

test('high-frequency drafts save locally while one slow host request is in flight, then sync the latest state', async () => {
  let revision = 0
  let hold = false
  let release
  let inFlight = 0
  let maxInFlight = 0
  const requests = []
  const { session, values } = harness({ mode: 'host', userId: 'alice', host: {
    async saveSession(input) {
      inFlight++; maxInFlight = Math.max(maxInFlight, inFlight); requests.push(input)
      if (hold) await new Promise(resolve => { release = resolve })
      inFlight--
      return { acknowledged: true, revision: ++revision }
    }
  } })
  await session.init({})
  hold = true
  try {
    await Promise.race([session.saveDraft('P1', { answer: '草稿' }), new Promise((_, reject) => setTimeout(() => reject(new Error('local save blocked by host')), 100))])
    for (let i = 0; i < 20; i++) await session.saveDraft('P1', { scrollTop: i })
    assert.equal(session.getRun().uiByPage.P1.answer, '草稿')
    assert.equal(session.getRun().uiByPage.P1.scrollTop, 19)
    assert.equal(Object.values(values)[0].pending.length, 2)
    assert.equal(requests.length, 2)
  } finally { hold = false; if (release) release() }
  await session.flush()
  assert.equal(maxInFlight, 1)
  assert.equal(session.getSnapshot().sync.status, 'synced')
  assert.equal(requests.at(-1).snapshot.run.uiByPage.P1.scrollTop, 19)
  assert.equal(requests.at(-1).snapshot.run.uiByPage.P1.answer, '草稿')
})
test('assisted completion is preserved through session transitions and review', async () => {
  const { session } = harness()
  await session.init({}); await session.skipPage('P1')
  await session.completePage('E1', { assisted: true })
  assert.equal(session.getRun().puzzles['quiz-direction'], 'assisted')
  await session.navigate('E1'); await session.completePage('E1')
  assert.equal(session.getRun().puzzles['quiz-direction'], 'assisted')
  assert.equal(session.getRun().resumePageId, 'E2')
})
test('caller-supplied media IDs on private records cannot bypass a real upload receipt', async () => {
  let submitted = false
  const { session } = harness({ host: { async submitContribution() { submitted = true; return { receiptId: 'r1', status: 'published' } } } })
  await session.init({})
  const record = await session.saveRecord({ kind: 'photo', purpose: 'relay', filePath: '/saved/photo.jpg', mediaId: 'unverified', url: 'https://example.test/fake.jpg' })
  assert.equal((await session.submitContribution(record.id, { consent: true })).status, 'unavailable')
  assert.equal(submitted, false)
})
test('host letter adjudication takes precedence and needs an explicit trusted boolean', async () => {
  let state = { available: true }
  const { session } = harness({ mode: 'host', userId: 'alice', host: {
    async getLetterState() { return state },
    async getTrustedTime() { return { now: Date.UTC(2026, 8, 24), trusted: true } }
  } })
  await reachFinale(session); await session.sign('甲')
  assert.equal((await session.getLetterState()).reason, 'invalid_letter_ack')
  state = { trusted: true, available: false, reason: 'server_not_due' }
  assert.equal((await session.getLetterState()).reason, 'server_not_due')
  state = { trusted: true, available: true, unlockAt: 123 }
  assert.equal((await session.getLetterState()).timeSource, 'host_state')
  state = null
  assert.equal((await session.getLetterState()).available, true)
  await session.openLetter()
  assert.equal(session.getRun().pageId, 'LT1')
})
test('optional reminder never reports accepted without the host acknowledgement and preserves archive date', async () => {
  let ack = null
  const { session } = harness({ host: { async requestReminder() { return ack } } })
  await session.init({})
  assert.equal((await session.requestReminder()).reason, 'not_completed')
  await reachFinale(session); await session.sign('甲')
  const archivedId = session.getSnapshot().sessionId
  const completedAt = session.getRun().completedAt
  await session.restart()
  assert.equal((await session.requestReminder(archivedId)).status, 'failed')
  ack = { accepted: false, reason: 'user_denied' }
  assert.equal((await session.requestReminder(archivedId)).status, 'declined')
  ack = { accepted: true, reminderId: 'reminder-1' }
  const result = await session.requestReminder(archivedId)
  assert.equal(result.accepted, true)
  assert.equal(result.status, 'accepted')
  assert.equal(session.getArchive(archivedId).run.completedAt, completedAt)
  assert.equal(session.getArchive(archivedId).run.reminder.reminderId, 'reminder-1')
  assert.equal(session.getRun().reminder, undefined)
})
test('late edition response after an account switch cannot write into the new user snapshot', async () => {
  let release, started
  const began = new Promise(resolve => { started = resolve })
  const { session, values } = harness({ mode: 'host', userId: 'alice', host: {
    claimEdition() { started(); return new Promise(resolve => { release = resolve }) }
  } })
  await reachFinale(session); await session.sign('甲')
  const pending = session.claimEdition()
  await began
  session.configure({ mode: 'host', userId: 'bob' }); await session.init({})
  const rejected = assert.rejects(pending, { code: 'CONTEXT_CHANGED' })
  release({ scope: 'global', editionNo: 42 }); await rejected
  assert.equal(session.getSnapshot().userId, 'bob')
  assert.equal(session.getRun().editionNo, null)
  assert.equal(values['plate21_v3_session:host:bob'].snapshot.userId, 'bob')
})
test('late trusted-time response after an account switch cannot sign the new user game', async () => {
  let release, started
  const began = new Promise(resolve => { started = resolve })
  const { session, values } = harness({ mode: 'host', userId: 'alice', host: {
    getTrustedTime() { started(); return new Promise(resolve => { release = resolve }) }
  } })
  await reachFinale(session)
  const pending = session.sign('Alice')
  await began
  session.configure({ mode: 'host', userId: 'bob' }); await session.init({})
  const rejected = assert.rejects(pending, { code: 'CONTEXT_CHANGED' })
  release({ trusted: true, now: Date.UTC(2026, 8, 24) }); await rejected
  assert.equal(session.getSnapshot().userId, 'bob')
  assert.equal(session.getRun().completedAt, null)
  assert.equal(values['plate21_v3_session:host:alice'].snapshot.run.completedAt, null)
})

test('explicit bonus entry works on completion day, survives reload and preserves archived dates', async () => {
  const config = { now: () => Date.UTC(2026, 8, 25, 2) }
  let h = harness(config)
  await h.session.init({})
  await assert.rejects(h.session.openBonus(), { code: 'LETTER_LOCKED' })
  await reachFinale(h.session)
  await h.session.sign('当天阅读')
  const original = h.session.getSnapshot()
  assert.equal((await h.session.getLetterState()).available, false)
  await h.session.openBonus()
  assert.equal(h.session.getRun().pageId, 'LT1')
  assert.equal(h.session.getRun().completedAt, original.run.completedAt)
  await h.session.completePage('LT1')
  await h.session.openBonus()
  assert.equal(h.session.getRun().pageId, 'LT2')
  h = harness(config, h.values)
  await h.session.init({})
  assert.equal((await h.session.getLetterState()).available, true)
  await h.session.restart()
  const newId = h.session.getSnapshot().sessionId
  await h.session.openBonus(original.sessionId)
  assert.equal(h.session.getSnapshot().sessionId, newId)
  assert.equal(h.session.getArchive(original.sessionId).run.pageId, 'LT2')
  assert.equal(h.session.getArchive(original.sessionId).run.completedAt, original.run.completedAt)
})
