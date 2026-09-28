'use strict'

const { createRun } = require('./contract')
function createEngine(pages) {
function copy(value) { return JSON.parse(JSON.stringify(value)) }
function error(code, message) { const err = new Error(message); err.code = code; return err }
function pageOf(id) {
  if (!pages.byId[id]) throw error('UNKNOWN_PAGE', '未知页面：' + id)
  return pages.byId[id]
}
function cloneRun(run) {
  // UI 草稿、媒体引用和宿主扩展字段穿过每次纯函数转换。
  const next = Object.assign(createRun(), copy(run || {}))
  ;['sites', 'puzzles', 'visited', 'unlocked', 'completedPages', 'uiByPage', 'flags'].forEach(function (key) {
    next[key] = Object.assign({}, next[key])
  })
  return next
}
function canEnter(run, id) {
  const page = pages.byId[id]
  if (!page || !run) return false
  if (id.indexOf('LT') === 0 && (!run.completedAt || !run.letterAvailable)) return false
  if (page.revealOf && ['solved', 'assisted'].indexOf((run.puzzles || {})[page.revealOf]) < 0) return false
  return !!((run.unlocked || {})[id] || (run.visited || {})[id])
}
function isReview(run) { return run.pageId !== run.resumePageId }
function enter(run, id) {
  pageOf(id)
  if (!canEnter(run, id)) throw error('PAGE_LOCKED', '此页尚未解锁')
  const next = cloneRun(run)
  const page = pages.byId[id]
  next.pageId = id
  next.visited[id] = true
  if (id === next.resumePageId && page.siteId && !next.sites[page.siteId]) next.sites[page.siteId] = 'active'
  return next
}
function reviewNext(run, id) {
  let target = pageOf(id).next
  const seen = new Set()
  while (target && !seen.has(target)) {
    if (canEnter(run, target)) return target
    // 回看前进跳过打不开的节点（被跳过的谜题揭晓、尚未解锁的站内页），继续找下一个可回看页
    seen.add(target); target = pageOf(target).next
  }
  return ''
}
function resume(run) { return enter(run, run.resumePageId) }
function isLastOfSite(page, target) {
  return !!page.siteId && (!pages.byId[target] || pages.byId[target].siteId !== page.siteId)
}
function moveFrontier(next, target) {
  if (!target) return next
  pageOf(target)
  next.resumePageId = target
  next.unlocked[target] = true
  return enter(next, target)
}
function reviewMove(run, target) {
  // 回看不解锁答案、不覆盖跳过、不改变已完成站点或恢复点。
  return target && canEnter(run, target) ? enter(run, target) : cloneRun(run)
}
function assertCurrent(run, id) {
  if (run.pageId !== id) throw error('NOT_CURRENT_PAGE', '只能操作正在显示的页面')
}
function complete(run, id, options) {
  const page = pageOf(id)
  assertCurrent(run, id)
  if (isReview(run)) return reviewMove(run, page.next)
  const next = cloneRun(run)
  // FN4 完成由 session.sign 落库；来信由可信时间校验后另行开放。
  if (page.kind === 'sign') return next
  next.completedPages[id] = true
  if (page.playId) next.puzzles[page.playId] = options && options.assisted ? 'assisted' : 'solved'
  if (isLastOfSite(page, page.next) && next.sites[page.siteId] !== 'skipped') next.sites[page.siteId] = 'done'
  if (!page.next) {
    if (id.indexOf('LT') === 0) next.letterRead = true
    return next
  }
  return moveFrontier(next, page.next)
}
function skip(run, id) {
  const page = pageOf(id)
  assertCurrent(run, id)
  if (!page.skipTo) throw error('NOT_SKIPPABLE', '此页没有跳过入口')
  if (isReview(run)) return reviewMove(run, page.skipTo)
  const next = cloneRun(run)
  if (page.kind === 'nav' && page.siteId) next.sites[page.siteId] = 'skipped'
  else {
    if (page.playId && ['solved', 'assisted'].indexOf(next.puzzles[page.playId]) < 0) next.puzzles[page.playId] = 'skipped'
    if (isLastOfSite(page, page.skipTo) && next.sites[page.siteId] !== 'skipped') next.sites[page.siteId] = 'done'
  }
  return moveFrontier(next, page.skipTo)
}
function openLetter(run) {
  if (!run.completedAt || !run.letterAvailable) throw error('LETTER_LOCKED', '来信尚未开放')
  const next = cloneRun(run)
  next.unlocked.LT1 = true
  if (next.resumePageId === 'FN4') return moveFrontier(next, 'LT1')
  return enter(next, 'LT1')
}
return { reviewNext, createRun, cloneRun, canEnter, isReview, enter, resume, complete, skip, openLetter }

}
module.exports = Object.assign(createEngine(require('./pages')), { createEngine })
