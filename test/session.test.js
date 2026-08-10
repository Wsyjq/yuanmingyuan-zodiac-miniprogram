const assert = require('node:assert/strict')
const test = require('node:test')

const SESSION_PATH = require.resolve('../plate21/module/store/session')
const ADAPTER_PATH = require.resolve('../plate21/module/adapters/local-adapter')
const CONTRACT_PATH = require.resolve('../plate21/module/contracts/adapter-api')
const PROGRESS_PATH = require.resolve('../plate21/module/store/progress-flow')

const CARD_IDS = [
  's2-purpose',
  's2-name',
  's2-blend',
  's2-pattern',
  's3-hour',
  's3-zodiac',
  's3-water',
  's4-timeline'
]

function createWx(storage) {
  return {
    getStorageSync(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : ''
    },
    setStorageSync(key, value) {
      storage[key] = value
    },
    removeStorageSync(key) {
      delete storage[key]
    }
  }
}

function loadSession(storage) {
  delete require.cache[SESSION_PATH]
  delete require.cache[ADAPTER_PATH]
  delete require.cache[CONTRACT_PATH]
  global.wx = createWx(storage)
  return require(SESSION_PATH)
}

test('concurrent card and station writes do not lose either result', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})

  await Promise.all([
    session.collectCard('s3-water'),
    session.completeStation('s3', { payload: { answer: '马首' } })
  ])

  const snapshot = session.getSnapshot()
  assert.equal(snapshot.cards['s3-water'].digit, snapshot.sessionDate.charAt(6))
  assert.equal(snapshot.stations.s3, true)
  assert.equal(snapshot.records.some((record) => record.station === 's3'), true)
})

test('a stale in-memory revision is refreshed and retried after adapter conflict', async () => {
  const storage = {}
  const session = loadSession(storage)
  const initial = await session.init({})
  const adapter = require(ADAPTER_PATH)

  const external = await adapter.updateSession({
    sessionId: initial.sessionId,
    expectedRevision: initial.revision,
    operationId: 'external-write',
    command: { type: 'set_flag', key: 'external', value: true }
  })
  assert.equal(external.applied, true)

  await session.completeStation('s1', { payload: { answer: '黄花阵' } })
  const snapshot = session.getSnapshot()
  assert.equal(snapshot.flags.external, true)
  assert.equal(snapshot.stations.s1, true)
  assert.equal(snapshot.revision, 2)
})

test('card ledger preserves repeated date digits and is idempotent by card id', async () => {
  const storage = {}
  const session = loadSession(storage)
  const initial = await session.init({})

  assert.match(initial.sessionDate, /^\d{8}$/)
  for (const cardId of CARD_IDS) await session.collectCard(cardId)
  await session.collectCard('s2-purpose')

  const snapshot = session.getSnapshot()
  assert.equal(Object.keys(snapshot.cards).length, 8)
  assert.deepEqual(session.getCardDigits(snapshot), initial.sessionDate.split(''))
})

test('puzzle completion and checkpoint updates are persisted independently', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})

  await session.setCheckpoint('s3-zodiac')
  await session.completePuzzle('s3-zodiac', { answer: ['鼠', '牛'], attempts: 1 })
  await session.completePuzzle('s3-zodiac', { answer: ['重复写入'], attempts: 9 })

  const snapshot = session.getSnapshot()
  assert.equal(snapshot.checkpoint, 's3-zodiac')
  assert.deepEqual(snapshot.puzzles['s3-zodiac'].payload.answer, ['鼠', '牛'])
  assert.equal(snapshot.puzzles['s3-zodiac'].payload.attempts, 1)
})

test('invalid puzzle and checkpoint values are rejected', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})

  await assert.rejects(session.completePuzzle('unknown-puzzle'), /未知 puzzleId/)
  await assert.rejects(session.setCheckpoint('unknown-checkpoint'), /未知 checkpoint/)
})

test('v2 card progress derives a puzzle-level checkpoint', async () => {
  const updatedAt = new Date(2026, 7, 8, 12, 0, 0).getTime()
  const storage = {
    plate21_session: {
      snapshot: {
        schemaVersion: 2,
        sessionId: 'v2-card-session',
        revision: 2,
        sessionDate: '20260808',
        checkpoint: 's2-quiz',
        stations: { s1: true, s2: false, s3: false, s4: false },
        puzzles: {},
        cards: {
          's2-purpose': { cardId: 's2-purpose', position: 0, digit: '2', collectedAt: updatedAt },
          's2-name': { cardId: 's2-name', position: 1, digit: '0', collectedAt: updatedAt }
        },
        records: [],
        flags: {},
        finale: false,
        createdAt: updatedAt,
        updatedAt
      },
      ops: {}
    }
  }
  const session = loadSession(storage)
  const snapshot = await session.init({})

  assert.equal(snapshot.checkpoint, 's2-name')
  assert.equal(session.isPuzzleComplete('s2-purpose'), true)
  assert.equal(session.isPuzzleComplete('s2-name'), true)
})

test('legacy snapshots migrate to schema v2 and repair station dependencies', async () => {
  const updatedAt = new Date(2026, 7, 8, 12, 0, 0).getTime()
  const storage = {
    plate21_session: {
      snapshot: {
        sessionId: 'legacy-session',
        revision: 4,
        stations: { s1: true, s2: true, s3: false, s4: true },
        records: [],
        flags: { cardNumbers: [2, 0, 6, 8] },
        finale: false,
        updatedAt
      },
      ops: {}
    }
  }
  const session = loadSession(storage)
  const snapshot = await session.init({})

  assert.equal(snapshot.schemaVersion, 2)
  assert.equal(snapshot.sessionDate, '20260808')
  assert.equal(snapshot.stations.s3, true)
  assert.equal(Object.keys(snapshot.cards).length, 8)
  assert.equal(snapshot.checkpoint, 'finale')
  assert.equal(storage.plate21_session.snapshot.schemaVersion, 2)
})

test('reset delegates to the adapter and creates a fresh v2 session', async () => {
  const storage = {}
  const session = loadSession(storage)
  const first = await session.init({})
  const second = await session.reset()

  assert.notEqual(second.sessionId, first.sessionId)
  assert.equal(second.schemaVersion, 2)
  assert.deepEqual(second.cards, {})
})

test('reset removes locally saved field photos but leaves remote media alone', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})
  await session.setFlag('s2PhotoDraft', {
    photos: { dome: '/saved/dome.jpg', beast: 'https://cdn.example/beast.jpg' }
  })
  await session.setFlag('s2PhotoRecord', {
    photos: { dome: '/saved/dome.jpg', lotus: '/saved/lotus.jpg' }
  })
  const removed = []
  global.wx.removeSavedFile = function (options) {
    removed.push(options.filePath)
    options.success()
  }

  await session.reset()

  assert.deepEqual(removed.sort(), ['/saved/dome.jpg', '/saved/lotus.jpg'])
  assert.equal(session.getSnapshot().checkpoint, 'prologue')
})

test('every checkpoint has a deterministic resume route', () => {
  delete require.cache[PROGRESS_PATH]
  const progress = require(PROGRESS_PATH)
  for (const checkpoint of progress.CHECKPOINT_ORDER) {
    assert.match(progress.routeForCheckpoint(checkpoint), /^\/plate21\/module\/pages\//)
  }
  assert.equal(progress.routeForCheckpoint('s2-quiz'), progress.CHECKPOINT_ROUTES['s2-purpose'])
})

test('a complete session can reach report with every puzzle and card preserved', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})
  delete require.cache[PROGRESS_PATH]
  const progress = require(PROGRESS_PATH)

  for (const puzzleId of progress.PUZZLE_IDS) {
    if (progress.isValidCheckpoint(puzzleId)) await session.setCheckpoint(puzzleId)
    await session.completePuzzle(puzzleId, { attempts: 1 })
    if (CARD_IDS.includes(puzzleId)) await session.collectCard(puzzleId)
  }
  for (const station of ['s1', 's2', 's3', 's4']) await session.completeStation(station)
  await session.completeFinale()
  await session.setCheckpoint('report')

  const snapshot = session.getSnapshot()
  assert.equal(Object.keys(snapshot.puzzles).length, progress.PUZZLE_IDS.length)
  assert.equal(Object.keys(snapshot.cards).length, CARD_IDS.length)
  assert.deepEqual(session.getCardDigits(snapshot), snapshot.sessionDate.split(''))
  assert.deepEqual(snapshot.stations, { s1: true, s2: true, s3: true, s4: true })
  assert.equal(snapshot.finale, true)
  assert.equal(snapshot.checkpoint, 'report')
})

test('experience completion is persisted once and remains idempotent', async () => {
  const storage = {}
  const session = loadSession(storage)
  const before = await session.init({})

  const completed = await session.completeExperience()
  const completedAt = completed.flags.experienceCompletedAt
  assert.equal(typeof completedAt, 'number')
  assert.equal(completed.revision, before.revision + 1)

  const repeated = await session.completeExperience()
  assert.equal(repeated.flags.experienceCompletedAt, completedAt)
  assert.equal(repeated.revision, completed.revision)
  assert.equal(storage.plate21_session.snapshot.flags.experienceCompletedAt, completedAt)
})

test('puzzle, card, station and checkpoint complete in one atomic revision', async () => {
  const storage = {}
  const session = loadSession(storage)
  const before = await session.init({})

  const after = await session.completePuzzle('s3-water', { answer: '马首', attempts: 1 }, {
    collectCard: true,
    station: 's3',
    checkpoint: 's4-timeline'
  })

  assert.equal(after.revision, before.revision + 1)
  assert.equal(after.puzzles['s3-water'].payload.answer, '马首')
  assert.equal(after.cards['s3-water'].position, 6)
  assert.equal(after.stations.s3, true)
  assert.equal(after.records.some((record) => record.station === 's3'), true)
  assert.equal(after.checkpoint, 's4-timeline')
})

test('failed mutations persist to the outbox and replay on the next retry', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})
  const adapter = require(ADAPTER_PATH)
  const updateSession = adapter.updateSession
  adapter.updateSession = function () { return Promise.reject(new Error('offline')) }

  await assert.rejects(
    session.completePuzzle('s2-purpose', { answer: 'C', attempts: 1 }, { collectCard: true }),
    /尚未落库/
  )
  assert.equal(storage.plate21_pending_mutations.length, 1)

  adapter.updateSession = updateSession
  const snapshot = await session.completePuzzle('s2-purpose', { answer: 'C', attempts: 1 }, { collectCard: true })

  assert.equal(snapshot.puzzles['s2-purpose'].payload.answer, 'C')
  assert.equal(snapshot.cards['s2-purpose'].position, 0)
  assert.equal(storage.plate21_pending_mutations, undefined)
})
