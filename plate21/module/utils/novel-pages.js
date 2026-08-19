/**
 * novel-pages —— 手账阅读器分页器：把叙事条目按字数权重打包成整页。
 * 一个条目 = 一个原子块，跨页不拆段；图片按固定权重参与打包。
 * novel-view 用它把早期「一段一页」的分页收敛为「约一屏字数一页」，
 * 序章/终章的翻页次数随之减少，文本内容不变。
 */
'use strict'

const DEFAULT_OPTIONS = {
  budget: 180,          // 续页目标字数
  firstPageBudget: 140, // 首页预算较小：标题块与档案章占位
  imageWeight: 70       // 图片 + 图注的折算权重
}

function textLength(text) {
  return Array.from(String(text == null ? '' : text)).length
}

function itemWeight(item, imageWeight) {
  if (item && item.image) return imageWeight
  return textLength(item && item.text)
}

// 返回页数组：每页是按原顺序打包的条目数组；超预算的长段独立成页（纸面可滚动）。
function buildPages(items, options) {
  const opts = Object.assign({}, DEFAULT_OPTIONS, options || {})
  const source = Array.isArray(items) ? items : []
  const pages = []
  let page = []
  let weight = 0
  let cap = opts.firstPageBudget

  for (const item of source) {
    const w = itemWeight(item, opts.imageWeight)
    if (page.length && weight + w > cap) {
      pages.push(page)
      page = []
      weight = 0
      cap = opts.budget
    }
    page.push(item)
    weight += w
  }
  pages.push(page)
  return pages
}

module.exports = {
  DEFAULT_OPTIONS: DEFAULT_OPTIONS,
  buildPages: buildPages,
  itemWeight: itemWeight,
  textLength: textLength
}
