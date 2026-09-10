const test = require('node:test'),
  assert = require('node:assert/strict'),
  path = require('node:path')
const domain = require('../plate21/module/domain/experience'),
  flow = require('../plate21/module/store/progress-flow'),
  config = require('../plate21/module/config/experience')
const { renderPage } = require('./harness/runtime')
function local(storage = {}) {
  global.wx = {
    getStorageSync: (k) => storage[k],
    setStorageSync: (k, v) => {
      storage[k] = JSON.parse(JSON.stringify(v))
    },
    removeStorageSync: (k) => delete storage[k]
  }
  for (const n of ['store/session', 'adapters/local-adapter', 'store/achievements'])
    delete require.cache[require.resolve('../plate21/module/' + n)]
  return { session: require('../plate21/module/store/session'), storage }
}
const blank = () => ({
  schemaVersion: 3,
  sessionId: 'test',
  revision: 0,
  createdAt: 1,
  updatedAt: 1,
  preferences: { mode: 'adult' },
  visits: {},
  journal: {},
  reading: {},
  echo: {},
  puzzles: {},
  cards: {},
  stations: { s1: false, s2: false, s3: false, s4: false },
  flags: {}
})
test('all route skips reach finale without awarding any answers, cards or answer achievements', async () => {
  const { session, storage } = local()
  await session.init({})
  for (const n of config.NODES.filter((n) => !['finale', 'report'].includes(n.id)))
    await session.visit(n.id, 'skipped', config.next(n.id).id)
  const s = session.getSnapshot()
  assert.equal(flow.deriveCheckpoint(s), 'finale')
  assert.deepEqual(s.puzzles, {})
  assert.deepEqual(s.cards, {})
  assert.ok(Object.values(s.stations).every((v) => !v))
  assert.ok(!s.flags['achievements.four-stations'])
  const restored = local(storage).session
  await restored.init({})
  assert.equal(flow.deriveCheckpoint(restored.getSnapshot()), 'finale')
  assert.deepEqual(restored.getSnapshot().cards, {})
  await restored.visit('s2-purpose', 'visited')
  assert.equal(restored.getSnapshot().visits['s2-purpose'].status, 'skipped')
  await restored.completePuzzle('s2-purpose', { answer: 'C' }, { collectCard: true })
  assert.equal(domain.visitStatus(restored.getSnapshot(), 's2-purpose'), 'completed')
})
test('later status survives return; explicit legacy next updates actual checkpoint', async () => {
  const { session } = local()
  await session.init({})
  await session.visit('s3-hour', 'later', 's3-zodiac')
  await session.visit('s3-hour', 'visited')
  assert.equal(session.getSnapshot().visits['s3-hour'].status, 'later')
  await session.setCheckpoint('s3-zodiac')
  assert.equal(flow.deriveCheckpoint(session.getSnapshot()), 's3-zodiac')
})
test('v2 migration backs up exact old report and strips untrusted global edition', async () => {
  const old = Object.assign(blank(), {
    schemaVersion: 2,
    sessionDate: '20260819',
    checkpoint: 's3-water',
    name: '旧署名',
    editionNo: 27,
    records: [{ station: 's2', payload: { photo: 'wxfile://old' } }],
    puzzles: { 's3-hour': { completedAt: 12 } }
  })
  const storage = { plate21_session: { snapshot: old, ops: {} } }
  const { session } = local(storage)
  await session.init({})
  const s = session.getSnapshot()
  assert.equal(s.schemaVersion, 3)
  assert.equal(s.name, '旧署名')
  assert.equal(s.legacyEditionNo, 27)
  assert.equal(s.editionNo, undefined)
  assert.deepEqual(storage['plate21_backup_test'], old)
  assert.deepEqual(s.records, old.records)
  assert.equal(flow.deriveCheckpoint(s), 's3-water')
  assert.equal(await session.claimEdition(), null)
})
test('private no-photo draft persists, edits reject stale versions without queued overwrite, delete works', async () => {
  const { session, storage } = local()
  await session.init({})
  const e = { id: 'entry-a', text: '我留下的一句话', name: '', photos: [], status: 'draft' }
  await session.saveEntry(e)
  const first = session.getSnapshot().journal[e.id]
  await session.saveEntry(
    Object.assign({}, e, { text: '第二次', status: 'sealed' }),
    first.updatedAt
  )
  await assert.rejects(() =>
    session.saveEntry(Object.assign({}, e, { text: '过时的编辑' }), first.updatedAt)
  )
  assert.equal(session.getSnapshot().journal[e.id].text, '第二次')
  assert.equal(storage.plate21_pending_mutations, undefined)
  await session.deleteEntry(e.id, session.getSnapshot().journal[e.id].updatedAt)
  assert.deepEqual(session.getSnapshot().journal, {})
})
test('failed local persistence retains command and editor can retry', async () => {
  const { session, storage } = local()
  await session.init({})
  const original = wx.setStorageSync
  let fail = true
  wx.setStorageSync = (k, v) => {
    if (k === 'plate21_session' && fail) throw new Error('disk')
    original(k, v)
  }
  await assert.rejects(() => session.setMode('family'))
  assert.ok(storage.plate21_pending_mutations.length)
  fail = false
  await session.setMode('family')
  assert.equal(session.getSnapshot().preferences.mode, 'family')
  assert.equal(storage.plate21_pending_mutations, undefined)
})
test('reading flags and mode do not fabricate differentiated content', async () => {
  const { session } = local()
  await session.init({})
  await session.setMode('teen')
  await session.setReading('reading-guide', { favorite: true, later: true, position: 2 })
  await session.setReading('reading-guide', { completed: true, later: false })
  assert.equal(session.getSnapshot().reading['reading-guide'].favorite, true)
  assert.equal(session.getSnapshot().reading['reading-guide'].position, 2)
  assert.equal(config.node('s3-hour', 'teen').common, true)
  await assert.rejects(() => session.setMode('invented'))
})
test('Beijing next day 09:00 boundaries: midnight, month, leap day and year', () => {
  for (const [completed, expected] of [
    ['2026-09-30T15:59:59Z', '2026-10-01T01:00:00Z'],
    ['2026-09-30T16:00:00Z', '2026-10-02T01:00:00Z'],
    ['2026-12-31T15:59:59Z', '2027-01-01T01:00:00Z'],
    ['2028-02-28T23:00:00Z', '2028-03-01T01:00:00Z']
  ])
    assert.equal(
      new Date(domain.unlockAt(Date.parse(completed), 9)).toISOString(),
      new Date(expected).toISOString()
    )
  assert.equal(domain.unlockAt(null), null)
  assert.equal(new Date(domain.unlockAt(Date.parse('2026-01-01T00:00Z'), 23)).getUTCHours(), 15)
})
test('same-day or unpublished echo deep links expose no story', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/reader/reader',
    query: { kind: 'echo', id: 'unpublished' },
    settleMs: 15
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.item, null)
  assert.match(result.data.error, /暂未开放/)
})
test('all new production pages mount and default local-only journal works', async () => {
  for (const n of ['journey', 'library', 'reader', 'journal', 'echo', 'audio-lab']) {
    const result = await renderPage({
      route: 'plate21/module/pages/' + n + '/' + n,
      query: { id: 'reading-guide' },
      settleMs: 15
    })
    assert.deepEqual(result.errors, [], n)
    if (n === 'journal') {
      assert.equal(result.data.cloud, false)
      assert.match(result.data.message, /本机/)
    }
    if (n === 'audio-lab') assert.deepEqual(Array.from(result.data.tracks), [])
  }
})
test('journal UI creates, persists and reopens an entry without photos', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/journal/journal',
    settleMs: 15,
    drive: async (p) => {
      p.create()
      p.input({ currentTarget: { dataset: { field: 'text' } }, detail: { value: '今天的圆明园' } })
      await p.save({ currentTarget: { dataset: { status: 'sealed' } } })
      assert.equal(p.data.entries.length, 1)
      assert.equal(p.data.entry.status, 'sealed')
      await p.close()
      await p.edit({ currentTarget: { dataset: { id: p.data.entries[0].id } } })
      assert.equal(p.data.entry.text, '今天的圆明园')
    }
  })
  assert.deepEqual(result.errors, [])
})
test('chapter toggles preserve original slot bindings and default collapsed state', async () => {
  const r = await renderPage({ route: 'plate21/module/pages/s2-quiz/s2-quiz', settleMs: 10 })
  assert.match(r.html, /打开剧情与可选挑战/)
  assert.match(r.html, /display:none/)
  assert.match(r.html, /军事防御工事/)
  const expanded = await renderPage({
    route: 'plate21/module/pages/s2-quiz/s2-quiz',
    settleMs: 10,
    componentDrive: (i, p) => {
      if (p.nodeId && i.toggle && i.data.expanded !== undefined) i.toggle()
    }
  })
  assert.match(expanded.html, /收起挑战/)
  assert.doesNotMatch(expanded.html, /打开剧情与可选挑战/)
})
test('journal text wrapping preserves every character including newlines', () => {
  const { wrap } = require('../plate21/module/services/journal-export')
  const text = '春天的风。'.repeat(200)
  const lines = wrap({ measureText: (s) => ({ width: s.length * 20 }) }, text, 100)
  assert.equal(lines.join(''), text)
  assert.ok(lines.every((l) => l.length <= 5))
})
