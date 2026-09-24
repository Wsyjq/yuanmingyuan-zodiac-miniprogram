'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const pages = require('../plate21/module/flow/pages')
const { createRun } = require('../plate21/module/flow/contract')
const { buildScreen, beijingDate } = require('../plate21/module/flow/screen')
const props = require('../plate21/module/flow/props')
const play = require('../plate21/module/play/index')
function runAt(id, extra) {
  return Object.assign(createRun(), { pageId: id, resumePageId: id, unlocked: { [id]: true }, visited: { [id]: true } }, extra || {})
}
function letterAt(id, extra) {
  return runAt(id, Object.assign({ completedAt: Date.parse('2026-09-24T17:00:00Z'), letterAvailable: true }, extra || {}))
}
function frozen(value) {
  Object.freeze(value)
  Object.keys(value).forEach(key => { if (value[key] && typeof value[key] === 'object') frozen(value[key]) })
  return value
}

test('all 46 page IDs build pure display models and caller state remains immutable', () => {
  assert.equal(pages.list.length, 46)
  for (const page of pages.list) {
    const run = frozen(runAt(page.id)), ui = frozen({ optionId: 'ne', text: '草稿', placed: { deer: 'ring' } })
    const view = buildScreen(run, ui)
    assert.equal(view.pageId, page.id)
    assert.ok(view.title)
    assert.ok(Array.isArray(view.lines))
    assert.equal(view.pageCount, 46)
    assert.equal(run.uiByPage[page.id], undefined)
  }
})

test('non-bracketed scene descriptions remain screen copy alongside presentation metadata', () => {
  const text = pages.list.flatMap(page => page.lines.concat(page.signedLines, page.interaction ? page.interaction.lines : [])).join('\n')
  for (const phrase of ['让用户选出', '程序设计参考', '答案确认后，画面', '屏幕暗了一下', '屏幕中缓缓出来了一封信', '几秒后，一份新的档案生成']) assert.equal(text.includes(phrase), false, phrase)
  assert.equal(pages.byId.FN1.presentation.kind, 'engraving-reveal')
  assert.equal(pages.byId.FN3.presentation.kind, 'archive-reveal')
  assert.equal(pages.byId.HY2.presentation.kind, 'water-clock-finale')
  assert.match(pages.byId.HG1.lines.join(''), /雨果写下/)
})

test('stable choice IDs are used once, selected from saved UI, with no answer marked by default', () => {
  for (const id of ['E1', 'H1', 'H5', 'XS1']) {
    const view = buildScreen(runAt(id), {})
    assert.deepEqual(view.play.choices.map(x => x.id), play.CHOICES[pages.byId[id].playId].map(x => x.id))
    view.choices.forEach(choice => {
      assert.equal(choice.selected, false)
      assert.equal(view.lines.includes(choice.label), false)
    })
  }
  const run = runAt('E1', { uiByPage: { E1: { optionId: 'ne' } } })
  assert.equal(buildScreen(run).choices.find(x => x.id === 'ne').selected, true)
  assert.equal(buildScreen(run, { optionId: 'nw' }).choices.find(x => x.id === 'nw').selected, true)
  assert.equal(buildScreen(runAt('H5')).figures[0].id, 'wanzi')
})

test('physical flip needs explicit saved/UI confirmation; skipped status never reveals an answer', () => {
  const skipped = runAt('H3', { puzzles: { 'prop-flip': 'skipped' } })
  const before = buildScreen(skipped)
  assert.deepEqual(before.lines, [])
  assert.deepEqual(before.interaction.lines, ['翻面揭晓答案'])
  assert.doesNotMatch(before.lines.join(''), /黄色彩绸/)
  assert.equal(before.holdReveal, true)
  assert.equal(before.primaryAction, 'flip')
  const after = buildScreen(skipped, { flipped: true })
  assert.match(after.interaction.lines.join(''), /黄色彩绸/)
  assert.equal(after.primaryAction, 'submit')
  assert.equal(skipped.puzzles['prop-flip'], 'skipped')
})

test('answer pages are quiet when skipped or not solved; assisted answers may be reviewed', () => {
  for (const id of ['X3', 'H2', 'H6', 'HY2', 'XS2', 'DS2']) {
    const page = pages.byId[id]
    assert.deepEqual(buildScreen(runAt(id, { puzzles: { [page.revealOf]: 'skipped' } })).lines, [], id)
    assert.deepEqual(buildScreen(runAt(id)).lines, [], id)
    assert.ok(buildScreen(runAt(id, { puzzles: { [page.revealOf]: 'assisted' } })).lines.length, id)
  }
})

test('review only offers unlocked next page or resume, with no repeat submission or skip', () => {
  const run = runAt('H1', { resumePageId: 'F1', puzzles: { 'quiz-lantern': 'skipped' }, unlocked: { H1: true, H2: true, F1: true } })
  const view = buildScreen(run)
  assert.equal(view.review, true)
  assert.equal(view.play.readOnly, true)
  assert.equal(view.primaryAction, 'resume')
  assert.equal(view.showSkip, false)
  assert.match(view.completionHint, /跳过/)
  const solved = buildScreen(Object.assign({}, run, { puzzles: { 'quiz-lantern': 'assisted' } }))
  assert.equal(solved.primaryAction, 'review-next')
})

test('prop instructions cover physical items without answering the envelope or pre-flipping maze', () => {
  for (const id of ['E1', 'X1', 'X2', 'H3', 'HY3', 'XS1', 'DS1']) {
    const prop = props.forPage(id)
    assert.ok(prop.title)
    prop.items.forEach(item => { assert.ok(item.what); assert.ok(item.how.length); assert.ok(item.returnWhen) })
  }
  const envelope = props.forPage('X2')
  assert.match(JSON.stringify(envelope), /信封封口和信的背面/)
  assert.doesNotMatch(JSON.stringify(envelope), /黄花阵/)
  assert.deepEqual(props.forPage('H1').items, [])
  assert.doesNotMatch(JSON.stringify(props.forPage('P3')), /各有一半字/)
  envelope.items[0].how = 'changed'
  assert.notEqual(props.forPage('X2').items[0].how, 'changed')
})

test('photo references are not personal photos and DS1 default board does not prefill solutions', () => {
  const empty = buildScreen(runAt('H4'), { spot: 'dome' })
  assert.equal(empty.spots.length, 4)
  assert.equal(empty.photo, '')
  assert.deepEqual(empty.photos, [])
  const photo = buildScreen(runAt('H4'), { spot: 'dome', records: [{ id: 'r1', purpose: 'field', kind: 'photo', siteId: 'maze', spot: 'dome', filePath: '/saved/user.jpg' }] })
  assert.equal(photo.photo, '/saved/user.jpg')
  assert.ok(photo.spotDetail)
  const board = buildScreen(runAt('DS1')).board
  assert.equal(board.pieces.length, 3)
  board.pieces.forEach(piece => { assert.equal(piece.placed, ''); assert.equal(piece.slot, undefined) })
  board.slots.forEach(slot => assert.equal(slot.piece, ''))
  assert.equal(buildScreen(runAt('DS1')).lines.some(line => line.includes('→')), false)
})

test('water clock has no duplicate text inputs and fountain fade follows bounded UI state', () => {
  const clock = buildScreen(runAt('HY1'))
  assert.equal(clock.play.type, 'water-clock')
  assert.deepEqual(clock.inputs, [])
  const fountain = buildScreen(runAt('DS2', { puzzles: { 'place-animals': 'solved' } }), { fountainProgress: 50 })
  assert.equal(fountain.presentation.opacity, 0.5)
  assert.equal(buildScreen(runAt('DS2'), { fountainProgress: 120 }).fountainProgress, 100)
})

test('completion date is Beijing calendar day and signing never invents a global edition', () => {
  assert.equal(beijingDate('2026-09-24T16:30:00Z'), '2026年9月25日')
  assert.equal(beijingDate(Date.parse('2026-09-24T15:59:00Z')), '2026年9月24日')
  assert.equal(beijingDate('invalid'), '')
  const view = buildScreen(runAt('FN4'))
  assert.doesNotMatch(view.lines.join(''), /第 N 版|版本编号|推送|绘制日期/)
  assert.equal(view.primaryAction, 'sign')
  const letter = buildScreen(letterAt('LT1'))
  assert.match(letter.lines.join(''), /昨天/) // Preserve the dated letter's original voice.
  assert.equal(letter.completedDate, '2026年9月25日')
  assert.equal(buildScreen(runAt('LT2')).teacher, '')
})

test('empty, unavailable, failed or nonpublished relay never pretends someone left a record', () => {
  for (const status of ['empty', 'unavailable', 'failed', 'loading']) {
    const view = buildScreen(letterAt('LT6'), { relay: { status, records: [] } })
    assert.equal(view.relay.hasRecord, false)
    assert.doesNotMatch(view.lines.join(''), /也留下了一份记录|也给你留下了一件东西/)
    assert.ok(view.relay.message)
  }
  for (const item of [{ status: 'submitted', text: 'pending' }, { status: 'private', text: 'private' }, { status: 'published', text: 'sample', seeded: true }]) {
    assert.equal(buildScreen(letterAt('LT6'), { relay: { status: 'ready', records: [item] } }).relay.hasRecord, false)
  }
})

test('published relay only gets read-through wording after actual display acknowledgement', () => {
  const relay = { status: 'ready', records: [{ id: 'c1', status: 'published', kind: 'text', text: '我看到了屋檐。' }], viewed: false }
  const page6 = buildScreen(letterAt('LT6'), { relay })
  assert.match(page6.lines.join(''), /上一位探寻/)
  assert.doesNotMatch(buildScreen(letterAt('LT7'), { relay }).lines.join(''), /看完了吗/)
  relay.viewed = true
  assert.match(buildScreen(letterAt('LT7'), { relay }).lines.join(''), /看完了吗/)
  const saved = letterAt('LT7', { uiByPage: { LT6: { relay, relayViewed: true } } })
  assert.match(buildScreen(saved).lines.join(''), /看完了吗/)
})

test('final letter acknowledgement follows real submission status or private saved state', () => {
  const base = buildScreen(letterAt('LT8'))
  assert.doesNotMatch(base.lines.join(''), /已提交|已通过审核|已保存在/)
  const privateRun = letterAt('LT8', { uiByPage: { LT7: { relaySaved: true } } })
  assert.match(buildScreen(privateRun).lines.join(''), /私人档案/)
  const expected = { submitted: /等待审核/, published: /已通过审核/, rejected: /未通过审核/, withdrawn: /已撤回/, failed: /暂未提交成功/ }
  for (const [status, pattern] of Object.entries(expected)) assert.match(buildScreen(letterAt('LT8'), { relay: { submitStatus: status } }).lines.join(''), pattern)
})

test('all thirteen puzzles project separate gameplay modules without mixing their prompts into the story', () => {
  let count = 0
  for (const page of pages.list.filter(p => p.playId)) {
    const view = buildScreen(runAt(page.id), { arrived: true, flipped: true })
    assert.ok(view.interaction, page.id)
    assert.ok(view.interaction.title.trim())
    assert.doesNotMatch(view.interaction.title, /程序设计|互动玩法｜/)
    assert.doesNotMatch(view.lines.join(''), /互动玩法｜/)
    for (const line of view.interaction.lines) assert.ok(!view.lines.includes(line), page.id + ': duplicate gameplay text')
    count++
  }
  assert.equal(count, 13)
  const closed = buildScreen(runAt('H3'), { flipped: false })
  assert.doesNotMatch(closed.interaction.lines.join(''), /黄色彩绸/)
  assert.equal(buildScreen(runAt('E2')).interaction, null)
  assert.match(buildScreen(runAt('E2', { puzzles: { 'quiz-direction': 'solved' } })).interaction.lines.join(''), /答案/)
})
