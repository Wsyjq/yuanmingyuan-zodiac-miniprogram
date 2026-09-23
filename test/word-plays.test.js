'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { get } = require('../plate21/module/utils/sl-cards')
const { screen } = require('../plate21/module/flow/screen')
const nfc = require('../plate21/module/capabilities/nfc/listen')
const { byId } = require('../plate21/module/flow/pages')

function textRecord(text) {
  const lang = [0x65, 0x6e]
  const body = Array.from(Buffer.from(text, 'utf8'))
  return { records: [{ payload: [lang.length].concat(lang, body) }] }
}

test('史料卡用文档里的分层，不是旧的一句摘要', function () {
  assert.equal(get('sl10').layers[0].indexOf('叶尔羌') >= 0, true)
  assert.equal(get('sl10').layers[1].indexOf('香妃') >= 0, true)
  assert.equal(get('sl07').layers.length, 3)
  assert.equal(get('sl07').layers[0].indexOf('迷宫') >= 0, true)
  assert.equal(get('sl12').layers[1].indexOf('正午') >= 0, true)
  assert.equal(get('sl01').layers[1].indexOf('1860') >= 0, true)
  assert.equal(get('sl08').layers[0].indexOf('1989') >= 0, true)
})

test('中心亭先给四处，不把四段说明摊在正文里', function () {
  const view = screen({ pageId: 'H4', sites: {}, puzzles: {} }, {})
  assert.equal(view.lines.length, 2)
  assert.equal(view.spots.length, 4)
  const shot = screen({ pageId: 'H4', sites: {}, puzzles: {} }, { spot: 'swan', photo: 'tmp' })
  assert.equal(shot.spotDetail.indexOf('蝙蝠') >= 0, true)
})

test('花纹题是四张图，答案仍是万字纹', function () {
  const view = screen({ pageId: 'H5', sites: {}, puzzles: {} }, {})
  assert.equal(view.choices.length, 0)
  assert.deepEqual(view.figures.map(function (item) { return item.label }), ['万字纹', '贝壳纹', '卷草纹', '花篮纹'])
  assert.equal(view.figures[0].src.indexOf('WANZI') >= 0, true)
})

test('容妃画像走渐显，五竹亭和容妃都能点开', function () {
  const view = screen({ pageId: 'F2', sites: {}, puzzles: {} }, {})
  assert.equal(view.portrait.indexOf('rongfei.jpg') >= 0, true)
  assert.equal(view.terms.some(function (term) { return term.key === 'sl10' }), true)
  assert.equal(view.terms.some(function (term) { return term.key === 'sl11' }), true)
})

test('14 时是未时羊首，正午可以看十二像一起喷', function () {
  const view = screen({ pageId: 'HY1', sites: {}, puzzles: {} }, {})
  const sheep = view.beasts.filter(function (beast) { return beast.at14 })[0]
  assert.equal(sheep.name, '羊')
  assert.equal(sheep.range, '13–15')
  const noon = screen({ pageId: 'HY1', sites: {}, puzzles: {} }, { noonWatch: true })
  assert.equal(noon.beasts.every(function (beast) { return beast.on }), true)
  const finale = screen({ pageId: 'HY2', sites: {}, puzzles: {} }, {})
  assert.equal(finale.beastFinale, true)
})

test('贴片没读到之前主钮不出现，读到 xieqiqu 才算听过', function () {
  const waiting = screen({ pageId: 'X1', sites: {}, puzzles: {} }, {})
  assert.equal(waiting.nfc, true)
  assert.equal(waiting.primary, '')
  const heard = screen({ pageId: 'X1', sites: {}, puzzles: {} }, { heard: true })
  assert.equal(heard.primary, '贴片已播完')
  assert.equal(nfc.matches({ messages: [textRecord('xieqiqu')] }), true)
  assert.equal(nfc.matches({ messages: [textRecord('其他')] }), false)
  assert.equal(nfc.explainFail({ errCode: 13000 }), '这台手机的微信读不了贴片')
})

test('彩蛋接到第八页，查看和留下是页面上的动作', function () {
  assert.equal(byId.LT8.kind, 'letter')
  assert.equal(byId.LT8.next, '')
  assert.equal(screen({ pageId: 'LT6', sites: {}, puzzles: {} }, {}).letterRead, true)
  assert.equal(screen({ pageId: 'LT7', sites: {}, puzzles: {} }, {}).letterLeave, true)
  assert.equal(screen({ pageId: 'LT2', sites: {}, puzzles: {} }, {}).teacher.indexOf('letter-teacher') >= 0, true)
  assert.equal(screen({ pageId: 'DS2', sites: {}, puzzles: {} }, {}).fountain, true)
})
