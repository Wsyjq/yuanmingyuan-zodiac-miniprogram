'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { renderPage } = require('./harness/runtime')
const { createRun } = require('../plate21/module/flow/contract')
const pages = require('../plate21/module/flow/pages')
const ROOT = path.join(__dirname, '..')
const ROUTE = 'plate21/module/pages/walk/walk'
function fixture(id, ui) {
  const at = Date.now() - 86400000
  const run = createRun()
  run.pageId = id; run.resumePageId = id
  const index = pages.list.findIndex(page => page.id === id)
  pages.list.slice(0, index + 1).forEach(page => {
    run.unlocked[page.id] = true; run.visited[page.id] = true
    if (page.id !== id) { run.completedPages[page.id] = true; if (page.playId) run.puzzles[page.playId] = 'solved' }
  })
  run.uiByPage[id] = ui || {}
  if (id.startsWith('LT')) { run.completedAt = at; run.signedAt = at; run.name = '考察者'; run.letterAvailable = true }
  return { snapshot: { schemaVersion: 3, sessionId: 'fixture-' + id, userId: 'demo', revision: 0,
    createdAt: at, updatedAt: at, run, records: [], contributions: [], archives: [], sync: { status: 'local' } },
  pending: [], remoteRevision: null }
}
async function render(id, ui) {
  const store = { 'plate21_v3_session:demo:demo': fixture(id, ui) }
  return renderPage({ route: ROUTE, settleMs: 40, wxOverrides: {
    getStorageSync: key => store[key] ? JSON.parse(JSON.stringify(store[key])) : '',
    setStorageSync: (key, value) => { store[key] = JSON.parse(JSON.stringify(value)) },
    nextTick: fn => fn()
  } })
}
function text(html) { return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') }

test('native WXML dynamic if/elif/for directives are expressions, never literal property paths', () => {
  for (const route of [ROUTE, 'pages/index/index', 'plate21/module/components/audio-clip/audio-clip', 'plate21/module/components/water-clock/water-clock']) {
    const source = fs.readFileSync(path.join(ROOT, route + '.wxml'), 'utf8')
    for (const match of source.matchAll(/\bwx:(if|elif|for)\s*=\s*(["'])(.*?)\2/g)) assert.match(match[3], /^\{\{[\s\S]*\}\}$/, route + ': ' + match[0])
  }
})

test('walk and host index event handlers resolve to methods on their actual Page configuration', () => {
  for (const route of [ROUTE, 'pages/index/index']) {
    let config
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, route + '.js'), 'utf8'), {
      require: () => ({}), Page: value => { config = value }, console, setTimeout, clearTimeout
    })
    const wxml = fs.readFileSync(path.join(ROOT, route + '.wxml'), 'utf8')
    for (const match of wxml.matchAll(/\b(?:bind|catch)(?::[\w-]+|[\w-]+)\s*=\s*(["'])([\w$]+)\1/g)) assert.equal(typeof config[match[2]], 'function', route + ' missing ' + match[2])
  }
})

test('sampled mainline and relay screens render through the runtime with their intended key interaction', async () => {
  const expected = {
    P1: /第二十一图的传闻/, X1: /音乐贴片|直接听/, H3: /我已翻到背面/, H4: /我已到达中心亭/,
    HY1: /海晏堂|水力钟/, DS1: /梅花鹿/, DS2: /旧画与眼前/, FN4: /保存考察记录|署名/,
    LT6: /接力记录/, LT7: /公开投稿/
  }
  for (const [id, pattern] of Object.entries(expected)) {
    const result = await render(id, id.startsWith('LT') ? { letterSceneDone: true } : undefined)
    assert.deepEqual(result.errors, [], id)
    assert.equal(result.data.pageId, id)
    assert.match(text(result.html), pattern, id)
    assert.doesNotMatch(text(result.html), /undefined|NaN/, id)
    assert.match(result.html, /class="primary"[^>]*>[^<\s]/, id + ' primary button label must render')
  }
})

test('rendered H3 keeps answers hidden until physical flip is explicitly acknowledged', async () => {
  assert.doesNotMatch(text((await render('H3')).html), /由于宫女们手持黄色彩绸/)
  const result = await render('H3', { flipped: true })
  const body = text(result.html)
  assert.equal((body.match(/由于宫女们手持黄色彩绸/g) || []).length, 1)
})

test('empty local relay has no fictional previous user or default moderation acknowledgement', async () => {
  const empty = text((await render('LT6', { letterSceneDone: true })).html)
  assert.doesNotMatch(empty, /也给你留下了一件东西|一位先前探寻.*也留下了一份记录/)
  const editor = text((await render('LT7', { letterSceneDone: true })).html)
  assert.match(editor, /仅私人保存/)
  assert.match(editor, /同意.*公开/)
  const final = text((await render('LT8')).html)
  assert.doesNotMatch(final, /这份记录已提交|这份记录已通过审核/)
})

test('host index renders as a separate entry surface without runtime errors', async () => {
  const result = await renderPage({ route: 'pages/index/index', settleMs: 40 })
  assert.deepEqual(result.errors, [])
  assert.match(text(result.html), /第廿一图|第二十一图|考察/)
})


test('H4 arrival acknowledgement reveals observation and photo controls', async () => {
  const before = text((await render('H4')).html)
  assert.doesNotMatch(before, /穹顶与飞檐/)
  const after = await render('H4', { arrived: true })
  assert.deepEqual(after.errors, [])
  assert.match(text(after.html), /穹顶与飞檐/)
  assert.match(text(after.html), /拍照|照片/)
})

test('only next-day letters use the character scene; relay editing follows the dialogue', async () => {
  const letter = await render('LT2')
  assert.deepEqual(letter.errors, [])
  assert.equal(letter.data.letterScene, true)
  assert.match(text(letter.html), /老师的来信|剧情回顾/)
  const pending = await render('LT7')
  assert.equal(pending.data.letterScene, true)
  assert.doesNotMatch(text(pending.html), /仅私人保存/)
  const editor = await render('LT7', { letterSceneDone: true })
  assert.equal(editor.data.letterScene, false)
  assert.match(text(editor.html), /仅私人保存/)
  for (const id of ['P3', 'HY1', 'FN4']) {
    const main = await render(id)
    assert.equal(main.data.letterScene, false, id)
    assert.doesNotMatch(text(main.html), /剧情回顾/, id)
  }
})
