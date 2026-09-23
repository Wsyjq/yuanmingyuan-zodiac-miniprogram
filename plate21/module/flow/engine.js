'use strict'

// 唯一改 pageId 的地方。每次返回新对象，不改入参。
const { createRun } = require('./contract')
const pages = require('./pages')

function cloneRun(run) {
  return {
    pageId: run.pageId,
    sites: Object.assign({}, run.sites),
    puzzles: Object.assign({}, run.puzzles),
    editionNo: run.editionNo,
    signedAt: run.signedAt
  }
}

function pageOf(pageId) {
  const page = pages.byId[pageId]
  if (!page) throw new Error('unknown page: ' + pageId)
  return page
}

function puzzleSkipTo(playId) {
  const list = pages.list
  for (let i = 0; i < list.length; i++) {
    if (list[i].playId === playId) return list[i].skipTo
  }
  return ''
}

// 下一页换了 siteId，或没有下一页，才是该站最后一页。
// 走路页和下一段正文共用目标站的 siteId，完成走路页不标 done。
function isLastOfSite(page) {
  if (!page.siteId) return false
  const nxt = page.next ? pages.byId[page.next] : null
  return !nxt || nxt.siteId !== page.siteId
}

function enter(run, pageId) {
  const page = pageOf(pageId)
  if (page.revealOf && run.puzzles[page.revealOf] === 'skipped') {
    const dest = puzzleSkipTo(page.revealOf)
    if (dest && dest !== pageId) return enter(run, dest)
  }
  const next = cloneRun(run)
  next.pageId = page.id
  if (page.siteId && next.sites[page.siteId] !== 'skipped') {
    next.sites[page.siteId] = 'active'
  }
  return next
}

function complete(run, pageId) {
  const page = pageOf(pageId)
  const next = cloneRun(run)
  if (isLastOfSite(page)) next.sites[page.siteId] = 'done'
  next.pageId = page.next
  return next
}

function skip(run, pageId) {
  const page = pageOf(pageId)
  const next = cloneRun(run)
  if (page.kind === 'nav') {
    if (page.siteId) next.sites[page.siteId] = 'skipped'
    next.pageId = page.skipTo
    return next
  }
  if (page.playId) next.puzzles[page.playId] = 'skipped'
  next.pageId = page.skipTo
  return next
}

module.exports = {
  createRun: createRun,
  enter: enter,
  complete: complete,
  skip: skip
}
