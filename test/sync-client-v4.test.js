const test = require('node:test'),
  assert = require('node:assert/strict')
const { createHandler } = require('../cloudfunctions/archive/core')
const runtime = require('../plate21/module/config/runtime')
function setup() {
  const local = {},
    docs = {},
    operations = []
  let offline = false,
    loseReply = false
  const repo = {
    read: async (id) => docs[id] || null,
    transaction: async (id, fn) => {
      const r = fn(docs[id] ? JSON.parse(JSON.stringify(docs[id])) : null)
      docs[id] = r.doc
      return r.result
    }
  }
  const server = createHandler(repo, {})
  global.wx = {
    getStorageSync: (k) => local[k],
    setStorageSync: (k, v) => {
      local[k] = JSON.parse(JSON.stringify(v))
    },
    removeStorageSync: (k) => delete local[k],
    cloud: {
      init() {},
      async callFunction({ data }) {
        if (offline) throw new Error('offline')
        operations.push(data)
        const result = await server('visitor', data)
        if (loseReply && data.action === 'save') {
          loseReply = false
          throw new Error('reply lost')
        }
        return { result }
      }
    }
  }
  runtime.cloudEnv = 'test-env'
  for (const key of [
    'services/sync',
    'store/session',
    'adapters/local-adapter',
    'store/achievements'
  ])
    delete require.cache[require.resolve('../plate21/module/' + key)]
  const session = require('../plate21/module/store/session'),
    sync = require('../plate21/module/services/sync')
  return {
    local,
    server,
    session,
    sync,
    operations,
    setOffline: (v) => (offline = v),
    lose: () => (loseReply = true)
  }
}
test('offline sync retains local data and recovers a delivered request whose reply was lost', async () => {
  const x = setup()
  await x.session.init({})
  await x.session.saveEntry({ id: 'one', text: '文字', name: '', photos: [], status: 'draft' })
  x.setOffline(true)
  await assert.rejects(() => x.sync.sync())
  assert.equal(x.session.getSnapshot().journal.one.text, '文字')
  x.setOffline(false)
  x.lose()
  await assert.rejects(() => x.sync.sync())
  const saved = await x.server('visitor', { action: 'load' })
  assert.equal(saved.version, 1)
  await x.sync.sync()
  assert.equal((await x.server('visitor', { action: 'load' })).version, 1)
  const attempts = x.operations.filter((o) => o.action === 'save')
  assert.equal(attempts[0].operationId, attempts[1].operationId)
  assert.equal(x.local['plate21_cloud_pending_test-env'], undefined)
})
test('different devices prompt conflict, explicit pull backs up local state, old report remains', async () => {
  const x = setup()
  await x.session.init({})
  await x.session.saveEntry({ id: 'local', text: '本机', name: '', photos: [], status: 'draft' })
  const remote = JSON.parse(JSON.stringify(x.session.getSnapshot()))
  remote.name = '远端署名'
  remote.journal = {
    remote: {
      id: 'remote',
      text: '云端',
      name: '',
      photos: [],
      status: 'sealed',
      updatedAt: 5,
      createdAt: 3
    }
  }
  await x.server('visitor', {
    action: 'save',
    operationId: 'other-device',
    expectedVersion: 0,
    snapshot: remote
  })
  const status = await x.sync.sync()
  assert.equal(status.conflict, true)
  assert.equal(x.session.getSnapshot().journal.local.text, '本机')
  await x.sync.pull(status.remote)
  assert.equal(x.session.getSnapshot().name, '远端署名')
  assert.equal(x.local.plate21_before_cloud_replace.journal.local.text, '本机')
  assert.equal(x.session.getSnapshot().journal.remote.text, '云端')
})
test('a concurrent remote update during conflict resolution prompts again instead of force overwrite', async () => {
  const x = setup()
  await x.session.init({})
  await x.sync.sync()
  const r = await x.server('visitor', { action: 'load' })
  r.snapshot.name = 'other'
  await x.server('visitor', {
    action: 'save',
    operationId: 'other-device',
    expectedVersion: 1,
    snapshot: r.snapshot
  })
  const result = await x.sync.push(1)
  assert.equal(result.conflict, true)
  assert.equal((await x.server('visitor', { action: 'load' })).snapshot.name, 'other')
  assert.notEqual(x.session.getSnapshot().name, 'other')
})
