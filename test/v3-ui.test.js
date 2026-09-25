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
  // UI 渲染检查以信封谜题已解为前提；术语遮蔽的门控行为由 v3-term-gate 测试覆盖。
  run.puzzles['quiz-envelope'] = 'solved'
  run.uiByPage[id] = ui || {}
  if (id.startsWith('LT')) { run.completedAt = at; run.signedAt = at; run.name = '考察者'; run.letterAvailable = true }
  return { snapshot: { schemaVersion: 3, sessionId: 'fixture-' + id, userId: 'demo', revision: 0,
    createdAt: at, updatedAt: at, run, records: [], contributions: [], archives: [], sync: { status: 'local' } },
  pending: [], remoteRevision: null }
}
async function render(id, ui, drive) {
  const store = { 'plate21_v3_session:demo:demo': fixture(id, ui) }
  return renderPage({ route: ROUTE, settleMs: 40, drive, wxOverrides: {
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
    P1: /第二十一图的传闻/, FQ1: /人物线索/, FQ2: /礼拜场所/, FR1: /容妃.*礼拜/, X1: /音乐贴片|直接听/, H3: /我已翻到背面/, H4: /我已到达中心亭/,
    HY1: /海晏堂|水力钟/, DS1: /梅花鹿/, DS2: /旧画与眼前/, FN4: /保存考察记录|署名/,
    LT6: /接力记录/, LT7: /公开投稿/
  }
  for (const [id, pattern] of Object.entries(expected)) {
    const result = await render(id, id.startsWith('LT') ? { letterSceneDone: true } : { screenPart: 'activity' })
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

test('restored original prose actually reaches WXML instead of only remaining in configuration', async () => {
  const cases = [
    ['H2', {}, ['黄花阵的作用：', '最先到达中心的人会得到皇帝的赏赐']],
    ['H4', { arrived: true }, ['西式穹顶', '莲花基座', '双天鹅', '蝙蝠寓意福气']],
    ['HY2', {}, ['到了正午，十二道水流同时喷出']],
    ['DS2', {}, ['大水法中央原有一只铜制梅花鹿', '鹿角喷水', '大型卷尾铜兽']],
    ['FN1', {}, ['密集交错的线条构成明暗']],
    ['FN2', {}, ['如果你看到这里', '等待被后来者完成']],
    ['X2', {}, ['日记和信封会指引你第一站的方向', '信封的封口处和信的背面都有一半的字']]
  ]
  for (const [id, state, phrases] of cases) {
    const result = await render(id, Object.assign({ screenPart: 'activity' }, state))
    assert.deepEqual(result.errors, [], id)
    const actual = text(result.html).replace(/\s/g, '')
    for (const phrase of phrases) assert.ok(actual.includes(phrase), id + ': ' + phrase)
    assert.doesNotMatch(actual, /【DJ|【SL|【小程序/)
  }
})

test('clicking each of 17 inline historical terms renders every Word layer and its figure', async () => {
  const glossary = require('../plate21/module/flow/glossary')
  const cards = require('../plate21/module/utils/sl-cards')
  const original = require('./fixtures/v3-script-coverage.json')
  const visited = new Set()
  for (const page of pages.list) for (const term of glossary.termsFor(page.id)) {
    if (visited.has(term.key)) continue
    visited.add(term.key)
    const result = await render(page.id, { flipped: true, arrived: true, screenPart: 'story' }, inst => {
      // Drive the real click handler with the key actually carried by a narrative span.
      const span = inst.data.narrative.flat().find(part => part.key === term.key)
      assert.ok(span, page.id + ' has no clickable term for ' + term.key)
      const before = JSON.stringify(inst.run)
      inst.onDrawerScroll({ detail: { scrollTop: 1200 } })
      inst.onOpenCard({ currentTarget: { dataset: { key: span.key } } })
      assert.equal(inst.data.card.key, term.key)
      assert.equal(inst.data.drawerScrollTop, 0)
      assert.equal(JSON.stringify(inst.run), before)
    })
    assert.deepEqual(result.errors, [], term.key)
    const actual = text(result.html).replace(/\s/g, '')
    for (const paragraph of original.history.filter(p => p.key === term.key)) {
      assert.ok(actual.includes(paragraph.text.replace(/\s/g, '')), term.key + ' missing Word paragraph ' + paragraph.paragraph)
    }
    const source = cards.get(term.key)
    if (source.image) assert.ok(result.html.includes(source.image), term.key + ' image missing')
    assert.match(actual, /返回/)
    assert.doesNotMatch(actual, /完成对应互动后展示|undefined/)
  }
  assert.equal(visited.size, 17)
})

test('gameplay instructions, controls and submit button render inside one distinct module', async () => {
  const { parse } = require('./harness/wxml')
  const tpl = fs.readFileSync(path.join(ROOT, ROUTE.replace(/walk$/, 'walk-content') + '.wxml'), 'utf8')
  assert.ok(tpl.includes('walk-interaction.wxml'))
  for (const id of ['E1', 'X1', 'X2', 'H1', 'H3', 'H4', 'H5', 'HY1', 'HY3', 'XS1', 'DS1']) {
    const result = await render(id, { arrived: true, flipped: true, screenPart: 'activity' })
    assert.deepEqual(result.errors, [], id)
    const ast = parse(result.html)
    const find = (nodes, cls) => {
      for (const n of nodes) {
        if (n.type !== 'element') continue
        if ((n.attrs.get('class') || '').split(/\s+/).includes(cls)) return n
        const child = find(n.children || [], cls)
        if (child) return child
      }
    }
    const flatten = node => node.type === 'text' ? node.value || node.text || '' : (node.children || []).map(flatten).join('')
    const module = find(ast, 'interaction-module')
    assert.ok(module, id)
    assert.ok(find(module.children, 'interaction-heading'), id)
    assert.ok(find(module.children, 'primary'), id + ' submit is outside module')
    const narrative = find(ast, 'narrative')
    assert.doesNotMatch(flatten(narrative), /互动玩法｜/)
    assert.ok(!find(ast, 'footer'), id + ' duplicated submit footer')
  }
})

test('story and gameplay occupy mutually exclusive full screens for every mixed node', async () => {
  for (const page of pages.list.filter(p => p.interaction && p.lines.length)) {
    const activity = await render(page.id, { screenPart: 'activity', arrived: true, flipped: true })
    assert.deepEqual(activity.errors, [], page.id)
    assert.equal(activity.data.narrative.length, 0, page.id + ' gameplay must not include story prose')
    assert.ok(activity.html.includes('interaction-module'), page.id)
    const story = await render(page.id, { screenPart: 'story', arrived: true, flipped: true })
    assert.deepEqual(story.errors, [], page.id)
    assert.equal(story.data.screen.interaction, null, page.id)
    assert.equal(story.data.screen.play, null, page.id)
    assert.ok(story.data.narrative.length, page.id)
    assert.ok(!story.html.includes('interaction-module'), page.id)
    assert.ok(!story.html.includes('class="choices"'), page.id)
  }
})

test('listen choice and narration controls are above the toolbar, with no duplicate body player', async () => {
  const result = await render('P1')
  assert.deepEqual(result.errors, [])
  assert.match(text(result.html), /以听为主.*以阅读为主/)
  assert.ok(result.html.indexOf('narration-bar') < result.html.indexOf('class="toolbar"'))
  assert.ok(!result.html.includes('class="audio-row"'))
  assert.ok(!result.html.includes('class="letter-audio"'))
})
