'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const contract = require('../plate21/module/flow/contract')
const { byId, list } = require('../plate21/module/flow/pages')
const { createRun, enter, complete, skip } = require('../plate21/module/flow/engine')

const ORDER = [
  'P1', 'P2', 'P3', 'E1', 'E2',
  'M1', 'X1', 'X2', 'X3',
  'M2', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'M3', 'F1', 'F2',
  'M4', 'HY1', 'HY2', 'HY3',
  'M5', 'XS1', 'XS2',
  'M6', 'DS1', 'DS2',
  'M7', 'HG1',
  'FN1', 'FN2', 'FN3', 'FN4',
  'LT1', 'LT2', 'LT3', 'LT4'
]

const SKIP = {
  P1: 'E1',
  P2: 'E1',
  P3: 'E1',
  E1: 'E2',
  M1: 'M2',
  X1: 'X2',
  X2: 'M2',
  M2: 'M3',
  H1: 'H3',
  H3: 'H4',
  H4: 'H5',
  H5: 'M3',
  M3: 'M4',
  M4: 'M5',
  HY1: 'HY3',
  HY3: 'M5',
  M5: 'M6',
  XS1: 'M6',
  M6: 'M7',
  DS1: 'M7',
  M7: 'FN1'
}

const IMAGES = {
  M1: '整页导航图',
  M2: '整页导航图',
  M3: '整页导航图',
  M4: '整页导航图',
  M5: '整页导航图',
  M6: '整页导航图',
  M7: '整页导航图',
  H4: '用户刚拍的照片',
  H5: '四张浮雕照片',
  HY1: '十二时辰喷水示意',
  F2: '容妃图，渐显',
  DS2: '火烧视频',
  FN1: '第二十一图',
  LT2: '老师伏案图'
}

const FIELDS = ['id', 'kind', 'siteId', 'lines', 'narrId', 'image', 'propPrompt', 'playId', 'revealOf', 'next', 'skipTo']

function strippedDoc() {
  const raw = fs.readFileSync(path.join(__dirname, '../docs/feishu-import/第廿一图_v3-rev5614.md'), 'utf8')
  const stripped = raw
    .replace('牛皮纸【DJ-02 档案袋】已经发黄', '牛皮纸档案袋已经发黄')
    .replace(/【[^】]*】/g, '')
    .replace(/\*\*/g, '')
  return { raw: raw, stripped: stripped }
}

test('页表覆盖接入方案全部页号', function () {
  assert.deepEqual(list.map(function (item) { return item.id }), ORDER)
  for (let i = 0; i < ORDER.length; i++) {
    assert.equal(byId[ORDER[i]], list[i])
    assert.deepEqual(Object.keys(byId[ORDER[i]]), FIELDS)
    assert.ok(contract.PAGE_KINDS.indexOf(byId[ORDER[i]].kind) !== -1)
  }
  assert.equal(ORDER.length, 39)
})

test('旁白号、图和跳过目标按接入方案', function () {
  const plays = []
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    if (item.kind === 'nav' || item.id === 'FN4') assert.equal(item.narrId, '', item.id)
    else assert.equal(item.narrId, 'narr-' + item.id.toLowerCase(), item.id)
    assert.equal(item.image, IMAGES[item.id] || '', item.id)
    assert.equal(item.skipTo, SKIP[item.id] || '', item.id)
    if (item.kind === 'nav') assert.deepEqual(item.lines, [], item.id)
    else assert.ok(item.lines.length > 0, item.id)
    if (item.playId) {
      assert.equal(item.kind, 'puzzle', item.id)
      assert.ok(contract.PLAY_IDS.indexOf(item.playId) !== -1, item.playId)
      plays.push(item.playId)
    }
    if (item.siteId) assert.ok(contract.SITE_IDS.indexOf(item.siteId) !== -1, item.siteId)
    if (item.revealOf) assert.ok(contract.PLAY_IDS.indexOf(item.revealOf) !== -1, item.revealOf)
    if (i < ORDER.length - 1) assert.equal(item.next, ORDER[i + 1], item.id)
  }
  assert.equal(byId.LT4.next, '')
  assert.deepEqual(plays.slice().sort(), contract.PLAY_IDS.slice().sort())
  assert.equal(byId.X3.revealOf, 'quiz-envelope')
  assert.equal(byId.H2.revealOf, 'quiz-lantern')
  assert.equal(byId.H6.revealOf, 'quiz-pattern')
  assert.equal(byId.HY2.revealOf, 'quiz-hour')
  assert.equal(byId.XS2.revealOf, 'quiz-height')
  assert.equal(byId.DS2.revealOf, 'place-animals')
  assert.equal(byId.FN4.kind, 'sign')
  assert.equal(byId.LT1.kind, 'letter')
  assert.equal(byId.M1.siteId, 'xieqiqu')
})

test('屏上句子是飞书原句，没有道具编号', function () {
  const doc = strippedDoc()
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    for (let j = 0; j < item.lines.length; j++) {
      const line = item.lines[j]
      assert.equal(/\u3010|\u3011|DJ-|SL\d/.test(line), false, item.id + ' ' + line)
      if (line.indexOf('\u3000') !== -1) {
        assert.equal(line, '西洋楼在圆明三园中的长春园（\u3000）部。')
        assert.ok(doc.stripped.indexOf('长春园x部') !== -1)
        continue
      }
      assert.ok(doc.stripped.indexOf(line) !== -1 || doc.raw.indexOf(line) !== -1, item.id + ' ' + line)
    }
  }
  assert.ok(byId.P1.lines[1].indexOf('\u2013') !== -1)
  assert.ok(byId.P3.lines[0].indexOf('牛皮纸档案袋已经发黄') !== -1)
})

test('createRun 来自契约，从 P1 开始', function () {
  assert.equal(createRun, contract.createRun)
  const run = createRun()
  assert.equal(run.pageId, 'P1')
  assert.deepEqual(run.sites, {})
  assert.deepEqual(run.puzzles, {})
  assert.equal(run.editionNo, null)
  assert.equal(run.signedAt, null)
})

test('P1 跳过到 E1', function () {
  const run = createRun()
  const next = skip(run, 'P1')
  assert.equal(next.pageId, 'E1')
  assert.equal(run.pageId, 'P1')
  assert.deepEqual(run.sites, {})
  assert.deepEqual(run.puzzles, {})
  assert.deepEqual(next.puzzles, {})
})

test('E1 完成后到 E2', function () {
  const run = createRun()
  const next = complete(run, 'E1')
  assert.equal(next.pageId, 'E2')
  assert.equal(run.pageId, 'P1')
  assert.equal(next.sites.gate, undefined)
  assert.deepEqual(run.sites, {})
})

test('X2 跳过不到 X3 而到 M2', function () {
  const run = createRun()
  const next = skip(run, 'X2')
  assert.equal(next.pageId, 'M2')
  assert.notEqual(next.pageId, 'X3')
  assert.equal(next.puzzles['quiz-envelope'], 'skipped')
  assert.equal(run.puzzles['quiz-envelope'], undefined)
})

test('H1 跳过不到 H2', function () {
  const run = createRun()
  const next = skip(run, 'H1')
  assert.equal(next.pageId, 'H3')
  assert.notEqual(next.pageId, 'H2')
  assert.equal(next.puzzles['quiz-lantern'], 'skipped')
  assert.equal(run.pageId, 'P1')
})

test('M1 跳过把 xieqiqu 标 skipped 并到 M2', function () {
  const run = createRun()
  const next = skip(run, 'M1')
  assert.equal(next.pageId, 'M2')
  assert.equal(next.sites.xieqiqu, 'skipped')
  assert.equal(run.sites.xieqiqu, undefined)
  assert.notEqual(next.sites, run.sites)
})

test('进入揭晓页时，被跳过的题改走该题 skipTo', function () {
  const run = createRun()
  run.puzzles = { 'quiz-envelope': 'skipped' }
  const next = enter(run, 'X3')
  assert.equal(next.pageId, 'M2')
  assert.equal(next.sites.maze, 'active')
  assert.equal(run.pageId, 'P1')
  assert.equal(run.sites.maze, undefined)

  const lantern = createRun()
  lantern.puzzles = { 'quiz-lantern': 'skipped' }
  const hid = enter(lantern, 'H2')
  assert.equal(hid.pageId, 'H3')
  assert.notEqual(hid.pageId, 'H2')
  assert.equal(lantern.pageId, 'P1')
})

test('enter 把未跳过的站点标为 active，不改入参', function () {
  const run = createRun()
  const next = enter(run, 'E1')
  assert.equal(next.pageId, 'E1')
  assert.equal(next.sites.gate, 'active')
  assert.deepEqual(run.sites, {})

  const skipped = createRun()
  skipped.sites = { xieqiqu: 'skipped' }
  const stayed = enter(skipped, 'X1')
  assert.equal(stayed.pageId, 'X1')
  assert.equal(stayed.sites.xieqiqu, 'skipped')
  assert.equal(skipped.sites.xieqiqu, 'skipped')
})

test('完成一站最后一页才把该站标 done', function () {
  const run = enter(createRun(), 'E2')
  const next = complete(run, 'E2')
  assert.equal(next.pageId, 'M1')
  assert.equal(next.sites.gate, 'done')
  assert.equal(run.sites.gate, 'active')

  const walking = complete(createRun(), 'M1')
  assert.equal(walking.pageId, 'X1')
  assert.equal(walking.sites.xieqiqu, undefined)

  const left = complete(createRun(), 'X3')
  assert.equal(left.pageId, 'M2')
  assert.equal(left.sites.xieqiqu, 'done')
})
