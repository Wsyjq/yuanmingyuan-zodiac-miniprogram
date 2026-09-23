'use strict'

const fs = require('fs')
const path = require('path')
const test = require('node:test')
const assert = require('node:assert/strict')
const { get } = require('../plate21/module/utils/sl-cards')

function wordCards() {
  const file = path.join(__dirname, '../docs/feishu-import/第廿一图v3-docx.txt')
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  const start = lines.findIndex(function (line) { return line.trim() === 'SL-00' })
  const end = lines.findIndex(function (line) { return line.startsWith('西洋楼铜版画') })
  const body = lines.slice(start, end)
  const cards = []
  let i = 0
  while (i < body.length) {
    const id = body[i].trim()
    if (!/^SL-?\d+$/.test(id)) {
      i += 1
      continue
    }
    const theme = body[i + 1].trim()
    i += 2
    const groups = []
    let current = []
    while (i < body.length && !/^SL-?\d+$/.test(body[i].trim())) {
      const line = body[i].trim()
      if (!line) {
        if (current.length) {
          groups.push(current)
          current = []
        }
      } else {
        current.push(line)
      }
      i += 1
    }
    if (current.length) groups.push(current)
    let layers = groups.reduce(function (all, group) { return all.concat(group) }, [])
    let caption = ''
    const tail = groups[groups.length - 1]
    if (groups.length >= 2 && tail.length === 1 && tail[0].indexOf('〔来源〕') < 0) {
      caption = tail[0]
      layers = groups.slice(0, -1).reduce(function (all, group) { return all.concat(group) }, [])
    }
    const num = id.match(/(\d+)/)[1].padStart(2, '0')
    cards.push({ key: 'sl' + num, label: 'SL-' + num, theme: theme, layers: layers, caption: caption })
  }
  return cards
}
const { screen } = require('../plate21/module/flow/screen')
const nfc = require('../plate21/module/capabilities/nfc/listen')
const { byId } = require('../plate21/module/flow/pages')

function textRecord(text) {
  const lang = [0x65, 0x6e]
  const body = Array.from(Buffer.from(text, 'utf8'))
  return { records: [{ payload: [lang.length].concat(lang, body) }] }
}

test('史料卡用文档里的分层，不是旧的一句摘要', function () {
  const cards = wordCards()
  assert.equal(cards.length, 17)
  cards.forEach(function (card) {
    const got = get(card.key)
    assert.equal(got.title, card.label + ' · ' + card.theme)
    assert.deepEqual(got.layers, card.layers)
    assert.deepEqual(got.lines, card.layers)
    assert.equal(got.caption || '', card.caption)
  })
  assert.equal(get('sl01').layers.join('').indexOf('没有第二十一幅'), -1)
  assert.equal(get('sl10').layers.join('').indexOf('不能和史料混为一谈'), -1)
  assert.equal(get('sl11').layers.join('').indexOf('这是传说，不是直接史料'), -1)
  assert.equal(get('sl13').layers.join('').indexOf('不是同一座'), -1)
  const images = {
    sl00: 'sl00-ganzhi.jpg',
    sl01: 'sl01-dpm-catalog.png',
    sl02: 'sl02-jin-yufeng-1980.jpg',
    sl03: 'sl03-ohlmer-1873.jpg',
    sl07: 'sl07-huanghuazhen.jpg',
    sl10: 'rongfei.jpg',
    sl11: 'sl11-zhuting-north.jpg',
    sl13: 'sl13-xihai-earth.jpg',
    sl17: 'sl17-hugo.jpg'
  }
  Object.keys(images).forEach(function (key) {
    assert.equal(get(key).image.indexOf(images[key]) >= 0, true)
    assert.equal(fs.existsSync(path.join(__dirname, '../plate21/module/assets/img', images[key])), true)
  })
  ;['sl04', 'sl05', 'sl06', 'sl08', 'sl09', 'sl12', 'sl14', 'sl15'].forEach(function (key) {
    assert.equal(get(key).image, undefined)
  })
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
  assert.equal(waiting.nfcLine, '喷泉声、少数民族音乐和西洋音乐')
  assert.equal(waiting.primary, '')
  const aside = screen({ pageId: 'P1', sites: {}, puzzles: {} }, { nfcAside: '留在这一页' })
  assert.equal(aside.pageId, 'P1')
  assert.equal(aside.nfcAside, '留在这一页')
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
