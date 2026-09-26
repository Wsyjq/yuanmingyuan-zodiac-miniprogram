'use strict'
// 穷举：任意节点、任意常见存档下，回看前进与跳过链都不会跳出主链或落到打不开的页
const test = require('node:test')
const assert = require('node:assert/strict')
const engine = require('../plate21/module/flow/engine')
const pages = require('../plate21/module/flow/pages')
const { createRun } = require('../plate21/module/flow/contract')

function scenario(kind) {
  const run = createRun()
  pages.list.forEach(function (p) {
    run.unlocked[p.id] = true
    run.visited[p.id] = true
    if (p.playId) run.puzzles[p.playId] = kind === 'solved' ? 'solved' : 'skipped'
  })
  run.completedAt = Date.now()
  run.letterAvailable = true
  if (kind === 'locked-station') {
    // 模拟“这次不去”跳过整个黄花阵站：站内页未解锁、未到访
    ;['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].forEach(function (id) {
      delete run.unlocked[id]
      delete run.visited[id]
    })
  }
  return run
}

function onMainChain(fromId, target) {
  let t = pages.byId[fromId].next
  const seen = new Set()
  while (t && !seen.has(t)) {
    if (t === target) return true
    seen.add(t)
    t = pages.byId[t] && pages.byId[t].next
  }
  return false
}

test('review advance lands on an enterable main-chain node or stops, for every node and scenario', () => {
  for (const kind of ['solved', 'skipped', 'locked-station']) {
    const run = scenario(kind)
    for (const page of pages.list) {
      const target = engine.reviewNext(run, page.id)
      if (!target) continue // 链尾停住 → 按钮退化为“返回当前进度”，是设计兜底
      assert.ok(pages.byId[target], kind + ' ' + page.id + ' -> 指向不存在节点 ' + target)
      assert.ok(engine.canEnter(run, target), kind + ' ' + page.id + ' -> ' + target + ' 不可进入')
      assert.ok(onMainChain(page.id, target), kind + ' ' + page.id + ' -> ' + target + ' 不在 next 主链上')
      assert.notEqual(target, page.id, kind + ' ' + page.id + ' 不能原地打转')
    }
  }
})

test('skip targets stay on the route and never point backwards or outside', () => {
  const ids = pages.list.map(p => p.id)
  for (const page of pages.list) {
    if (!page.skipTo) continue
    assert.ok(ids.includes(page.skipTo), page.id + ' skipTo 不存在: ' + page.skipTo)
    assert.ok(onMainChain(page.id, page.skipTo), page.id + ' skipTo ' + page.skipTo + ' 不在 next 主链上')
  }
})

test('completion chain reaches LT8 from every puzzle without detours', () => {
  const run = scenario('solved')
  for (const page of pages.list) {
    let t = page.id
    const seen = new Set()
    while (pages.byId[t] && pages.byId[t].next && !seen.has(t)) {
      seen.add(t)
      t = pages.byId[t].next
    }
    assert.equal(t, 'LT8', page.id + ' 沿 next 走不到 LT8，链在 ' + t)
  }
})
