// 留言簿（board）+ 次日回访入口（index 回访卡）守门测试。
// 口径：完成态 = finale || flags.experienceCompletedAt；次日 = todayKey > sessionDate（与 letter 一致）。
const assert = require('node:assert/strict')
const test = require('node:test')

const { renderPage } = require('./harness/runtime')
const boardSeeds = require('../plate21/module/capabilities/board/seeds')

function dateKey(timestamp) {
  const date = new Date(Number(timestamp))
  return String(date.getFullYear()) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
}

// 与 local-adapter envelope 同构的通关快照（schemaVersion 2，规范形状，
// 避免触发 migrate_snapshot 落库分支）。
function finishedEnvelope(overrides) {
  const options = overrides || {}
  return {
    snapshot: Object.assign({
      schemaVersion: 2,
      sessionId: 'test-session',
      revision: 0,
      sessionDate: options.sessionDate,
      checkpoint: 'report',
      stations: { s1: true, s2: true, s3: true, s4: true },
      puzzles: { 's4-password': { completedAt: 1, payload: {} } },
      cards: {},
      records: [],
      flags: Object.assign({ experienceCompletedAt: 1758000000000 }, options.flags || {}),
      finale: options.finale === undefined ? true : options.finale,
      name: '测试者',
      editionNo: 1,
      createdAt: 1758000000000,
      updatedAt: 1758000000000
    }, options.snapshot || {})
  }
}

// 联动读写 storage：覆盖 getStorageSync/setStorageSync，使 local-adapter 读写都落在预置 store。
function storageOverrides(env) {
  const store = { plate21_session: env }
  return {
    getStorageSync: (k) => (k in store ? store[k] : ''),
    setStorageSync: (k, v) => { store[k] = v },
    removeStorageSync: (k) => { delete store[k] }
  }
}

// ---------------- 种子池：确定性取张 ----------------

test('board seeds: 同一 seedKey 永远取到同一面留言墙', () => {
  const a = boardSeeds.pickBoardMessages('test-session', 6)
  const b = boardSeeds.pickBoardMessages('test-session', 6)
  assert.deepEqual(a, b)
})

test('board seeds: 取 count 张且不重复；超量封顶', () => {
  const picked = boardSeeds.pickBoardMessages('k', 6)
  assert.equal(picked.length, 6)
  const texts = new Set(picked.map((m) => m.text))
  assert.equal(texts.size, 6)
  assert.equal(boardSeeds.pickBoardMessages('k', 99).length, boardSeeds.SEED_MESSAGES.length)
})

// ---------------- index 次日回访卡：判断矩阵 ----------------

test('index: 无存档不显示回访卡', async () => {
  const result = await renderPage({
    route: 'pages/index/index',
    wxOverrides: storageOverrides(''),
    settleMs: 60
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.revisitReady, false)
  assert.ok(!result.html.includes('revisit-card'))
})

test('index: 未通关不显示回访卡', async () => {
  const result = await renderPage({
    route: 'pages/index/index',
    wxOverrides: storageOverrides({
      snapshot: {
        schemaVersion: 2, sessionId: 's', revision: 0,
        sessionDate: dateKey(Date.now() - 86400000),
        checkpoint: 's1-decode', stations: { s1: false, s2: false, s3: false, s4: false },
        puzzles: {}, cards: {}, records: [], flags: {}, finale: false
      }
    }),
    settleMs: 60
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.revisitReady, false)
})

test('index: 通关当日不显示回访卡（明日才有）', async () => {
  const result = await renderPage({
    route: 'pages/index/index',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: dateKey(Date.now()) })),
    settleMs: 60
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.revisitReady, false)
})

test('index: 通关次日起显示回访卡，直达留言簿', async () => {
  const result = await renderPage({
    route: 'pages/index/index',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: dateKey(Date.now() - 86400000) })),
    settleMs: 60
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.revisitReady, true)
  assert.ok(result.html.includes('档案 · 新增一页'))
  assert.ok(result.html.includes('去读走完这条路的人'))
})

test('index: 已留言后回访卡文案切换为“已经在档案里”', async () => {
  const result = await renderPage({
    route: 'pages/index/index',
    wxOverrides: storageOverrides(finishedEnvelope({
      sessionDate: dateKey(Date.now() - 86400000),
      flags: { experienceCompletedAt: 1, boardSubmittedAt: 2, boardDraft: '留过的话' }
    })),
    settleMs: 60
  })
  assert.equal(result.data.revisitReady, true)
  assert.equal(result.data.revisitDone, true)
  assert.ok(result.html.includes('已经在档案里'))
})

// ---------------- board 留言簿页：状态机与投递 ----------------

test('board: 未完成考察显示引导态', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    settleMs: 120
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.state, 'notFinished')
})

test('board: 通关即开放（不设日期门），通关次日信可读入口出现', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: dateKey(Date.now() - 86400000) })),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.state, 'open')
  assert.equal(result.data.letterReady, true)
  assert.equal(result.data.wall.length, 6)
  assert.equal(result.data.editing, true)
  assert.ok(result.html.includes('留言簿'))
  assert.ok(result.html.includes('先来的人'))
  // UGC 合规提示常显在编辑区
  assert.ok(result.html.includes('留言经审核后'))
})

// —— 写入口前移：通关当天 report 末尾出现留言簿入口（2026-09-18 用户拍板）——

test('report: 通关当天回响区出现留言簿入口，未留言文案为「留一句话」', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/report/report',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: dateKey(Date.now()) })),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.finale, true)
  assert.equal(result.data.boardSubmitted, false)
  assert.ok(result.html.includes('留言簿 · 给后来的人'))
  assert.ok(result.html.includes('走完了，给下一个来的人留一句话'))
})

test('report: 已留言后入口文案切换为「去看看大家的话」', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/report/report',
    wxOverrides: storageOverrides(finishedEnvelope({
      sessionDate: dateKey(Date.now()),
      flags: { experienceCompletedAt: 1, boardSubmittedAt: 2, boardDraft: '留过的话' }
    })),
    settleMs: 300
  })
  assert.equal(result.data.boardSubmitted, true)
  assert.ok(result.html.includes('去看看大家的话'))
})

// —— 读入口：次日之信信末脚注（信正文零改动，脚注在信纸外）——

test('letter: 信开封后信末出现「大家的话」脚注入口', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/letter/letter',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: dateKey(Date.now() - 86400000) })),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.state, 'open')
  assert.ok(result.html.includes('档案的最后一页，是大家的话'))
})

test('letter: 未通关引导态不出现脚注入口', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/letter/letter',
    settleMs: 200
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.state, 'notFinished')
  assert.ok(!result.html.includes('档案的最后一页'))
})

test('board: 通关当日 letterReady 为假（信未启封）', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: dateKey(Date.now()) })),
    settleMs: 200
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.state, 'open')
  assert.equal(result.data.letterReady, false)
})

test('board: 留一句 → 落 flags 并切换为已投递态', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: dateKey(Date.now() - 86400000) })),
    settleMs: 200,
    drive: async (inst, sleep) => {
      inst.onInput({ detail: { value: '下一个来的人，抬头看。' } })
      inst.onSubmit()
      await sleep(300)
    }
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.mine.text, '下一个来的人，抬头看。')
  assert.equal(result.data.editing, false)
  assert.ok(result.html.includes('你 · 今天'))
})

test('board: 已留言的会话直接进已投递态，可换一句话', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(finishedEnvelope({
      sessionDate: dateKey(Date.now() - 86400000),
      flags: { experienceCompletedAt: 1, boardSubmittedAt: 2, boardDraft: '旧的一句' }
    })),
    settleMs: 200
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.mine.text, '旧的一句')
  assert.equal(result.data.editing, false)
  assert.ok(result.html.includes('换一句话'))
})

test('board: 空文案提交被拦截，不落 flags', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: dateKey(Date.now() - 86400000) })),
    settleMs: 200,
    drive: async (inst, sleep) => {
      inst.onSubmit()
      await sleep(200)
    }
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.mine, null)
  assert.equal(result.data.editing, true)
})
