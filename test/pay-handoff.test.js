const assert = require('node:assert/strict')
const test = require('node:test')

const { nextAfterUnlock } = require('../plate21/module/pay/handoff')

test('未解锁不给页号', () => {
  const samples = [
    undefined,
    null,
    {},
    { unlocked: false },
    { unlocked: 1 },
    { unlocked: 'true' },
    { unlocked: false, pageId: 'cover' }
  ]
  for (const entitlement of samples) {
    const result = nextAfterUnlock(entitlement)
    assert.deepEqual(result, { ok: false, reason: 'locked' })
  }
})

test('已解锁只进入页号 P1', () => {
  const calls = []
  const previous = global.wx
  global.wx = {
    redirectTo(opts) { calls.push(opts && opts.url) },
    navigateTo(opts) { calls.push(opts && opts.url) },
    reLaunch(opts) { calls.push(opts && opts.url) }
  }
  try {
    const result = nextAfterUnlock({
      unlocked: true,
      entitlementId: 'local-ent-1',
      unlockedAt: 1,
      pageId: 'cover'
    })
    assert.deepEqual(result, { ok: true, pageId: 'P1' })
    assert.deepEqual(calls, [])
  } finally {
    if (previous === undefined) delete global.wx
    else global.wx = previous
  }
})
