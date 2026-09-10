const test = require('node:test'),
  assert = require('node:assert/strict')
const { createHandler } = require('../cloudfunctions/archive/core')
const copy = (v) => (v ? JSON.parse(JSON.stringify(v)) : null)
function setup() {
  const docs = {},
    files = {}
  const repo = {
    read: async (id) => copy(docs[id]),
    transaction: async (id, fn) => {
      const r = fn(copy(docs[id]))
      docs[id] = copy(r.doc)
      return r.result
    }
  }
  const storage = {
    upload: async (p, b) => {
      files[p] = b
      return 'cloud://test/' + p
    },
    urls: async (ids) => ({
      files: ids.map((fileID) => ({
        fileID,
        tempFileURL: 'https://signed.example/private',
        status: 0
      }))
    })
  }
  return { run: createHandler(repo, storage), docs, files }
}
const snap = () => ({
  schemaVersion: 3,
  sessionId: 'local-a',
  revision: 1,
  createdAt: 1,
  updatedAt: 2,
  journal: {},
  flags: {},
  cards: {},
  visits: {},
  puzzles: {},
  reading: {},
  preferences: { mode: 'adult' },
  echo: {}
})
test('server-derived owners isolate reads, writes and media URL access', async () => {
  const { run } = setup()
  await run('alice', {
    action: 'save',
    operationId: 'op-a',
    expectedVersion: 0,
    snapshot: snap(),
    openid: 'bob'
  })
  assert.equal((await run('bob', { action: 'load' })).snapshot, null)
  assert.equal((await run('alice', { action: 'load' })).version, 1)
  await assert.rejects(() => run('', { action: 'load' }))
  await assert.rejects(() =>
    run('bob', { action: 'urls', fileIDs: ['cloud://test/private/alice/file'] })
  )
})
test('duplicate request is idempotent and stale snapshot conflicts without overwriting', async () => {
  const { run } = setup()
  const e = { action: 'save', operationId: 'once', expectedVersion: 0, snapshot: snap() }
  assert.equal((await run('a', e)).version, 1)
  assert.equal((await run('a', e)).version, 1)
  const conflict = await run('a', Object.assign({}, e, { operationId: 'second' }))
  assert.equal(conflict.conflict, true)
  assert.equal((await run('a', { action: 'load' })).version, 1)
  await assert.rejects(
    () => run('a', Object.assign({}, e, { snapshot: Object.assign(snap(), { revision: 2 }) })),
    /operation_reused/
  )
})
test('media saves are owner bound, size constrained and retry-safe', async () => {
  const { run, files } = setup()
  const image = Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70]).toString('base64')
  const e = { action: 'media', operationId: 'image-one', base64: image }
  const first = await run('alice', e),
    second = await run('alice', e)
  assert.equal(first.fileID, second.fileID)
  assert.equal(Object.keys(files).length, 1)
  assert.ok((await run('alice', { action: 'urls', fileIDs: [first.fileID] })).files.length)
  await assert.rejects(() => run('bob', { action: 'urls', fileIDs: [first.fileID] }))
  await assert.rejects(() =>
    run('alice', Object.assign({}, e, { operationId: 'big', base64: 'A'.repeat(1400004) }))
  )
  await assert.rejects(() =>
    run(
      'alice',
      Object.assign({}, e, { operationId: 'bad', base64: Buffer.from('hello').toString('base64') })
    )
  )
})
test('foreign media and prototype keys are rejected; global number cannot be supplied by client', async () => {
  const { run } = setup()
  const s = snap()
  s.journal.a = { id: 'a', text: '', name: '', photos: ['cloud://foreign/file'], status: 'draft' }
  await assert.rejects(
    () => run('a', { action: 'save', operationId: 'bad', expectedVersion: 0, snapshot: s }),
    /foreign_media/
  )
  const clean = snap()
  clean.editionNo = 123
  await run('a', { action: 'save', operationId: 'good', expectedVersion: 0, snapshot: clean })
  assert.equal((await run('a', { action: 'load' })).snapshot.editionNo, undefined)
  const polluted = JSON.parse('{"__proto__":{}}')
  await assert.rejects(
    () =>
      run('a', {
        action: 'save',
        operationId: 'bad2',
        expectedVersion: 1,
        snapshot: Object.assign(snap(), { reading: polluted })
      }),
    /invalid_key/
  )
})
