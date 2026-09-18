// 昨日之路（board 回访页次日区块）守门测试。
// 口径：门槛 = 通关次日（todayKey > sessionDate，与 letterReady 同口径）；
// 红线 = 只渲染走过的点位（未走支线零渲染）、零计数零完成率、不提未走的站。
// 时间线 = 锚点固定序 + 支线按时间戳插入正典槽位（站点时间戳取值链 records → 日期卡兜底）。
const assert = require('node:assert/strict')
const test = require('node:test')

const { renderPage } = require('./harness/runtime')

function dateKey(timestamp) {
  const date = new Date(Number(timestamp))
  return String(date.getFullYear()) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0')
}

// 与 local-adapter envelope 同构的通关快照（schemaVersion 2 规范形状，避免触发迁移落库分支）。
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

function storageOverrides(env) {
  const store = { plate21_session: env }
  return {
    getStorageSync: (k) => (k in store ? store[k] : ''),
    setStorageSync: (k, v) => { store[k] = v },
    removeStorageSync: (k) => { delete store[k] }
  }
}

// 构造带完整走访痕迹的会话：四站 records + 八张日期卡 + 支线时间戳。
// offsets: { s1, s2, s3, s4 } 站点 record 时间；sides: { xieqiqu, ... } 支线时间（相对 base，毫秒）。
function walkedEnvelope(options) {
  const o = options || {}
  const base = 1758000000000
  const day = o.sessionDate || dateKey(Date.now() - 86400000)
  const off = Object.assign({ s1: 1000, s2: 3000, s3: 5000, s4: 8000 }, o.offsets || {})
  const records = [
    { station: 's1', recordType: 'photo', completedAt: base + off.s1 },
    { station: 's2', recordType: 'photo', completedAt: base + off.s2 },
    { station: 's3', recordType: 'photo', completedAt: base + off.s3 },
    { station: 's4', recordType: 'photo', completedAt: base + off.s4 }
  ]
  const cardIds = ['s2-purpose', 's2-name', 's2-blend', 's2-pattern', 's3-hour', 's3-zodiac', 's3-water', 's4-timeline']
  const cards = {}
  cardIds.forEach(function (cardId, i) {
    cards[cardId] = {
      cardId: cardId,
      position: i,
      digit: day.charAt(i),
      collectedAt: base + 3100 + i * 100 // 均晚于各自站点 record，早于下一站
    }
  })
  const flags = Object.assign({ experienceCompletedAt: base + 9000 }, o.flags || {})
  const sides = o.sides || {}
  Object.keys(sides).forEach(function (key) {
    flags['sideVisited_' + key] = base + sides[key]
  })
  return finishedEnvelope({
    sessionDate: day,
    snapshot: Object.assign({
      records: records,
      cards: cards,
      createdAt: base
    }, o.snapshot || {}),
    flags: flags
  })
}

const FULL_KEYS = ['prologue', 's1', 'xieqiqu', 's2', 'yangquelong', 'fangwaiguan', 's3', 'xushuilou', 'dashuifa', 'guanshuifa', 'xianfahua', 's4', 'finale']
const MAINLINE_KEYS = ['prologue', 's1', 's2', 's3', 'dashuifa', 's4', 'finale']
const SIDE_TITLES = ['谐奇趣', '养雀笼', '方外观', '蓄水楼', '观水法', '线法画']

// ---------------- 门槛矩阵 ----------------

test('board: 通关当日不渲染昨日之路（不催、不留预告）', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({ sessionDate: dateKey(Date.now()) })),
    settleMs: 200
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.journeyReady, false)
  assert.equal(result.data.journey.length, 0)
  assert.ok(!result.html.includes('昨日之路'))
  assert.ok(!result.html.includes('jr-strip'))
})

test('board: 通关次日起渲染昨日之路', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({})),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.journeyReady, true)
  assert.ok(result.html.includes('昨日之路'))
  assert.ok(result.html.includes('信里说，它在昨天你走过的那条路上'))
})

// ---------------- 时间线重建 ----------------

test('journey: 全走 13 节点按时间序排列', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({
      sides: { xieqiqu: 2000, yangquelong: 4000, fangwaiguan: 4100, xushuilou: 6000, guanshuifa: 7000, xianfahua: 7100 }
    })),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.deepEqual(Array.from(result.data.journey.map((p) => p.key)), FULL_KEYS)
  FULL_KEYS.forEach((key) => {
    assert.ok(result.data.journey.some((p) => p.key === key), '缺少节点 ' + key)
  })
  // 每个点位文案齐备（意象句非空）
  result.data.journey.forEach((p) => assert.ok(p.motif, p.key + ' 意象句缺失'))
})

test('journey: 同槽位支线按时间戳排序（方外观早于养雀笼则排前）', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({
      sides: { yangquelong: 4100, fangwaiguan: 4000 }
    })),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  const keys = Array.from(result.data.journey.map((p) => p.key))
  assert.ok(keys.indexOf('fangwaiguan') < keys.indexOf('yangquelong'), '槽位内应按时间戳排序')
  assert.deepEqual(keys, ['prologue', 's1', 's2', 'fangwaiguan', 'yangquelong', 's3', 'dashuifa', 's4', 'finale'])
})

test('journey: 只走主线 7 节点，支线站名零渲染', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({ sides: {} })),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.deepEqual(Array.from(result.data.journey.map((p) => p.key)), MAINLINE_KEYS)
  // 线法画不进 html 断言：前人留言墙种子句「线法画那站……」含该词（合法内容）；
  // 其零渲染由上面的 journey 节点序保证。
  SIDE_TITLES.filter((t) => t !== '线法画').forEach((title) => {
    assert.ok(!result.html.includes(title), '未走的支线不应出现：' + title)
  })
})

test('journey: legacy 存档无 records，站点时间用日期卡兜底', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({
      sides: { xieqiqu: 2000 },
      snapshot: { records: [] }
    })),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  const keys = Array.from(result.data.journey.map((p) => p.key))
  assert.deepEqual(keys, ['prologue', 's1', 'xieqiqu', 's2', 's3', 'dashuifa', 's4', 'finale'])
})

test('journey: 支线时间戳越界（晚于后一站）仍落在正典槽位内', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({
      sides: { xieqiqu: 9500 } // 晚于 s4 与 finale
    })),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  const keys = Array.from(result.data.journey.map((p) => p.key))
  assert.deepEqual(keys, ['prologue', 's1', 'xieqiqu', 's2', 's3', 'dashuifa', 's4', 'finale'])
})

// ---------------- chips：卡片 / 残片 / 大水法选择 / 明信片 / 留言 ----------------

test('journey: 日期卡与正页残片挂到对应站点', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({})),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  const byKey = {}
  result.data.journey.forEach((p) => { byKey[p.key] = p })
  assert.equal(byKey.s2.chips.filter((c) => c.indexOf('日期卡') === 0).length, 4)
  assert.equal(byKey.s3.chips.filter((c) => c.indexOf('日期卡') === 0).length, 3)
  assert.equal(byKey.s4.chips.filter((c) => c.indexOf('日期卡') === 0).length, 1)
  assert.ok(byKey.s2.chips.includes('残片 · 亭与墙'))
  assert.ok(byKey.s3.chips.includes('残片 · 水力钟'))
  assert.ok(byKey.s4.chips.includes('残片 · 信'))
})

test('journey: 大水法选择 / 明信片 / 留言按各自标记挂 chip', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({
      flags: { dashuifaChoice: '风声', messageSubmittedAt: 17580007000000, boardSubmittedAt: 17580007100000 }
    })),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.ok(result.html.includes('你听见的 · 风声'))
  assert.ok(result.html.includes('明信片 · 已投进信箱'))
  assert.ok(result.html.includes('留言 · 你的那一句'))
})

test('journey: 大水法 skipped 不挂 chip，未投明信片不挂 chip', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({
      flags: { dashuifaChoice: 'skipped' }
    })),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.ok(!result.html.includes('你听见的'))
  assert.ok(!result.html.includes('明信片'))
})

// ---------------- 详情卡交互 ----------------

test('journey: 点选点位切换详情卡', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({})),
    settleMs: 200,
    drive: async (inst, sleep) => {
      inst.onPickPoint({ currentTarget: { dataset: { index: 3 } } })
      await sleep(120)
    }
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.journeyActiveIndex, 3)
  assert.ok(result.html.includes(result.data.journey[3].motif))
})

// ---------------- 反结算红线 ----------------

test('journey: 长卷零计数、零完成率、不提未走的站', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(walkedEnvelope({})),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  result.data.journey.forEach((p) => {
    const texts = [p.kicker, p.title, p.motif, p.otherHalf].concat(p.chips)
    texts.forEach((t) => {
      assert.ok(!/[0-9]+\s*\/\s*[0-9]+/.test(String(t)), '长卷文案不得出现 X/N 计数：' + t)
      assert.ok(!/完成率|进度|还剩|还有.*站/.test(String(t)), '长卷文案不得出现结算词：' + t)
    })
  })
  assert.ok(!result.html.includes('完成率'))
  assert.ok(!result.html.includes('还剩'))
  // 走过的全量渲染在一条卷上，无「共 N 点」类总账
  assert.ok(!result.html.includes('共 '))
})
