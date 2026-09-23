'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')

const novelPages = require('../plate21/module/utils/novel-pages')
const buildPages = novelPages.buildPages

function text(n) {
  return { text: '字'.repeat(n) }
}

test('empty or invalid input yields a single empty page', () => {
  assert.deepEqual(buildPages([]), [[]])
  assert.deepEqual(buildPages(null), [[]])
  assert.deepEqual(buildPages('not-an-array'), [[]])
})

test('a single oversized paragraph stays atomic on its own page', () => {
  const long = text(300)
  const pages = buildPages([long])
  assert.equal(pages.length, 1)
  assert.deepEqual(pages[0], [long])
})

test('items are packed to the budget without splitting or reordering', () => {
  const items = [text(60), text(60), text(60), text(90), text(90)]
  const pages = buildPages(items, { firstPageBudget: 180 })
  // 180 预算：三段 60 字同页；两段 90 字同页
  assert.equal(pages.length, 2)
  assert.deepEqual(pages[0], items.slice(0, 3))
  assert.deepEqual(pages[1], items.slice(3))

  const flat = pages.reduce((all, page) => all.concat(page), [])
  assert.deepEqual(flat, items, '条目不拆分、不重排')
})

test('images carry a fixed weight so photo pages rebalance', () => {
  const photo = { image: 'IMG-X', src: '/x.jpg', caption: '图注' }
  const items = [text(120), photo, text(100)]
  const pages = buildPages(items, { firstPageBudget: 180 })
  // 120 + 70 > 180：图片开新页；70 + 100 <= 180：图片与后文同页
  assert.equal(pages.length, 2)
  assert.deepEqual(pages[0], [items[0]])
  assert.deepEqual(pages[1], [items[1], items[2]])
})

test('first page uses the smaller budget to leave room for the title block', () => {
  const items = [text(100), text(50), text(50)]
  const pages = buildPages(items, { budget: 180, firstPageBudget: 140 })
  // 首页 100 + 50 > 140 → 第二段开新页；续页 50 + 50 <= 180 同页
  assert.equal(pages.length, 2)
  assert.deepEqual(pages[0], [items[0]])
  assert.deepEqual(pages[1], [items[1], items[2]])
})

test('prologue-shaped content collapses from ten sheets to a few dense pages', () => {
  const items = [
    text(57),
    { image: 'IMG-P01', caption: '图像档案整理台' },
    text(88),
    text(33),
    { text: '闻有第二十一图，未见。', quote: true },
    { image: 'IMG-P02', caption: '民国著录卡片特写' },
    text(105),
    text(30),
    text(38),
    text(45)
  ]
  const pages = buildPages(items)
  assert.ok(pages.length >= 3 && pages.length <= 5, '序章应收敛到 3~5 页，实际 ' + pages.length)
  assert.equal(pages.reduce((n, page) => n + page.length, 0), items.length)
})

test('pack field pins author page breaks and ignores the char budget', () => {
  const items = [
    { pack: 1, text: '甲'.repeat(20) },
    { pack: 1, text: '乙'.repeat(20) },
    { pack: 2, text: '丙'.repeat(20) },
    { pack: 2, image: 'IMG', caption: '图' },
    { pack: 3, text: '丁'.repeat(300) }
  ]
  const pages = buildPages(items, { firstPageBudget: 10, budget: 10 })
  assert.equal(pages.length, 3)
  assert.deepEqual(pages[0], items.slice(0, 2))
  assert.deepEqual(pages[1], items.slice(2, 4))
  assert.deepEqual(pages[2], items.slice(4))
})

test('textLength counts code points, not utf-16 units', () => {
  assert.equal(novelPages.textLength('𝕒𝕓'), 2)
  assert.equal(novelPages.textLength(null), 0)
})
