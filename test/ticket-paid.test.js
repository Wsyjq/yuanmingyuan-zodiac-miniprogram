'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const path = require('node:path')

const paid = require('../pages/ticket/paid')

test('未付钱不算解锁', () => {
  assert.equal(paid.alreadyPaid(undefined), false)
  assert.equal(paid.alreadyPaid({}), false)
  assert.equal(paid.alreadyPaid({ snapshot: { flags: {} } }), false)
})

test('写门票时补上 sessionId，并保留原档案', () => {
  const env = paid.withPaidFlags({ snapshot: { flags: {}, revision: 0 } }, 1700000000000)
  assert.ok(env.snapshot.sessionId)
  assert.equal(env.snapshot.schemaVersion, 2)
  assert.ok(env.snapshot.flags.premiumUnlockedAt)
  assert.equal(env.snapshot.flags.premiumEntitlement.sku, 'plate21_full')
  assert.equal(paid.alreadyPaid(env), true)

  const kept = paid.withPaidFlags({
    snapshot: { sessionId: 'keep-me', flags: { foo: 1 }, revision: 3 }
  }, 1700000000001)
  assert.equal(kept.snapshot.sessionId, 'keep-me')
  assert.equal(kept.snapshot.flags.foo, 1)
  assert.equal(kept.snapshot.revision, 3)
  assert.ok(kept.snapshot.flags.premiumUnlockedAt)
})

test('解锁后去封面；贴片来的去谐奇趣', () => {
  assert.equal(paid.destination(), paid.COVER_URL)
  assert.equal(paid.destination({}), paid.COVER_URL)
  assert.equal(
    paid.destination({ from: 'nfc', prop: 'dj06' }),
    '/plate21/module/pages/waypoint/waypoint?site=xieqiqu&from=nfc&prop=dj06'
  )
})

test('门页把查询参数带到门票页', () => {
  assert.equal(paid.ticketUrl(), '/pages/ticket/ticket')
  assert.equal(
    paid.ticketUrl({ from: 'nfc', prop: 'dj06' }),
    '/pages/ticket/ticket?from=nfc&prop=dj06'
  )
})

test('贴片和解锁失败都回到主包门票页', () => {
  const nfc = require('../plate21/module/capabilities/nfc/launch')
  assert.equal(
    nfc.gateUrl(),
    '/pages/ticket/ticket?from=nfc&prop=dj06&next=xieqiqu'
  )
})

test('残缺门票写入后，会话恢复仍认已解锁', () => {
  const store = {}
  global.wx = {
    getStorageSync(key) { return store[key] },
    setStorageSync(key, value) { store[key] = value },
    removeStorageSync(key) { delete store[key] }
  }
  const adapter = require(path.join('..', 'plate21', 'module', 'adapters', 'local-adapter'))
  const env = paid.withPaidFlags({ snapshot: { flags: {}, revision: 0 } }, 1700000000000)
  store[paid.SESSION_KEY] = env
  return adapter.startOrResumeSession().then(function (snap) {
    assert.ok(snap.sessionId)
    assert.ok(snap.flags.premiumUnlockedAt)
    assert.equal(snap.flags.premiumEntitlement.sku, 'plate21_full')
    assert.ok(store[paid.SESSION_KEY].snapshot.sessionId)
  })
})
