// 门票门页（gate）守门测试：契约 v1.4.0、未解锁拦截、模拟支付放行、已解锁直通、cover 深链守卫。
const assert = require('node:assert/strict')
const test = require('node:test')

const { renderPage } = require('./harness/runtime')
const contract = require('../plate21/module/contracts/adapter-api')

function storageOverrides(env) {
  const store = { plate21_session: env }
  return {
    getStorageSync: (k) => (k in store ? store[k] : ''),
    setStorageSync: (k, v) => { store[k] = v },
    removeStorageSync: (k) => { delete store[k] },
    // redirectTo spy：记录放行/拦截去向
    redirectTo: (o) => { store.__redirects = store.__redirects || []; store.__redirects.push(o.url); if (o.success) o.success({}) }
  }
}

function redirects(wxApi) {
  // 通过闭包 store 取不到，改为在 overrides 里共享一个数组
  return null
}

function makeEnv(flags, sessionDate) {
  return {
    snapshot: {
      schemaVersion: 2,
      sessionId: 'gate-test',
      revision: 0,
      sessionDate: sessionDate || '20260918',
      checkpoint: 'prologue',
      stations: { s1: false, s2: false, s3: false, s4: false },
      puzzles: {}, cards: {}, records: [],
      flags: flags || {},
      finale: false,
      createdAt: 1, updatedAt: 1
    }
  }
}

// ---------------- 契约 ----------------

test('contract v1.4.0: 支付两方法常量与埋点枚举就位', () => {
  assert.equal(contract.CONTRACT_VERSION, '1.4.0')
  assert.ok(contract.EVENT_NAMES.includes('purchase_initiated'))
  assert.ok(contract.EVENT_NAMES.includes('purchase_completed'))
})

// ---------------- gate 门页 ----------------

test('gate: 未解锁显示门票卡（价格占位 + 解锁按钮）', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/gate/gate',
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.state, 'locked')
  assert.ok(result.html.includes('解锁完整考察'))
  assert.ok(result.html.includes('¥ 19.9'))
})

test('gate: 点解锁 → 模拟支付 paid → 放行态 + 权益双落（宿主 entitlement + 本地缓存 flag）', async () => {
  let store = { plate21_session: '' }
  const wxOverrides = {
    getStorageSync: (k) => (k in store ? store[k] : ''),
    setStorageSync: (k, v) => { store[k] = v },
    removeStorageSync: (k) => { delete store[k] }
  }
  const result = await renderPage({
    route: 'plate21/module/pages/gate/gate',
    wxOverrides,
    settleMs: 300,
    drive: async (inst, sleep) => {
      inst.onUnlock()
      await sleep(400)
    }
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.state, 'paid')
  assert.ok(result.html.includes('已检票'))
  // 宿主侧权益（模拟）：local-adapter 写 envelope flags.premiumEntitlement
  const env = store.plate21_session
  assert.ok(env && env.snapshot && env.snapshot.flags.premiumEntitlement, '宿主权益应落 envelope')
  // 本地缓存：session.setFlag 落 premiumUnlockedAt
  assert.ok(env.snapshot.flags.premiumUnlockedAt, '本地缓存 flag 应落库')
})

test('gate: 已解锁（本地缓存命中）直接检票放行 cover', async () => {
  const seen = []
  const wxOverrides = Object.assign(storageOverrides(makeEnv({ premiumUnlockedAt: 1 })), {
    redirectTo: (o) => { seen.push(o.url); if (o.success) o.success({}) }
  })
  const result = await renderPage({
    route: 'plate21/module/pages/gate/gate',
    wxOverrides,
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.state, 'paid')
  assert.ok(seen.some((url) => url.indexOf('/pages/cover/cover') >= 0), '应放行到 cover')
})

test('gate: 权益仅存宿主侧（无本地缓存）也能查到并放行', async () => {
  const seen = []
  const wxOverrides = Object.assign(storageOverrides(makeEnv({
    premiumEntitlement: { sku: 'plate21_full', entitlementId: 'ent-x', unlockedAt: 2 }
  })), {
    redirectTo: (o) => { seen.push(o.url); if (o.success) o.success({}) }
  })
  const result = await renderPage({
    route: 'plate21/module/pages/gate/gate',
    wxOverrides,
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.state, 'paid')
  assert.ok(seen.some((url) => url.indexOf('/pages/cover/cover') >= 0))
})

// ---------------- cover 深链守卫 ----------------

test('cover: 未解锁深链直达 → redirect 回 gate', async () => {
  const seen = []
  const wxOverrides = Object.assign(storageOverrides(makeEnv()), {
    redirectTo: (o) => { seen.push(o.url); if (o.success) o.success({}) }
  })
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides,
    settleMs: 400
  })
  assert.deepEqual(result.errors, [])
  assert.ok(seen.some((url) => url.indexOf('/pages/gate/gate') >= 0), '未解锁应被拦回 gate')
})

test('cover: 已解锁深链直达 → 正常停留不拦截', async () => {
  const seen = []
  const wxOverrides = Object.assign(storageOverrides(makeEnv({ premiumUnlockedAt: 1 })), {
    redirectTo: (o) => { seen.push(o.url); if (o.success) o.success({}) }
  })
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides,
    settleMs: 400
  })
  assert.deepEqual(result.errors, [])
  assert.equal(seen.length, 0)
})
