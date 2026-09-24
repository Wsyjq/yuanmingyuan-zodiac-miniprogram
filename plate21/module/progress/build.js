'use strict'

// 进度视图只读：恢复点决定进度，显示页仅用于回看标记。
const { SITE_IDS } = require('../flow/contract')
const engine = require('../flow/engine')
const pageTable = require('../flow/pages')
const TITLE = { prologue: '序章', gate: '西洋楼入口', xieqiqu: '谐奇趣', maze: '黄花阵',
  fangwaiguan: '方外观', haiyantang: '海晏堂', xushuilou: '蓄水楼', dashuifa: '大水法',
  hugo: '雨果雕像', finale: '结局', letter: '次日信' }
const HOME = { prologue: 'P1', gate: 'E1', xieqiqu: 'M1', maze: 'M2', fangwaiguan: 'M3',
  haiyantang: 'M4', xushuilou: 'M5', dashuifa: 'M6', hugo: 'M7', finale: 'FN1', letter: 'LT1' }
function buildProgress(run, pagesById) {
  const source = run || {}
  const pages = pagesById || pageTable.byId
  const sites = source.sites || {}
  const puzzles = source.puzzles || {}
  const resumeId = source.resumePageId || ''
  const current = pages[resumeId] || {}
  function openable(id) { return engine.canEnter(source, id) }
  function rowState(id) {
    if (id === 'prologue') {
      if ((source.completedPages || {}).P3) return '已看完'
      if ((source.unlocked || {}).E1) return '已跳过'
      return resumeId.indexOf('P') === 0 ? '进行中' : '还没到'
    }
    if (id === 'finale') return source.completedAt ? '已看完' : resumeId.indexOf('FN') === 0 ? '进行中' : '还没到'
    if (id === 'letter') return source.letterRead ? '已看完' : source.letterOpenedAt ? '进行中' : source.letterAvailable ? '可阅读' : '还没到'
    if (sites[id] === 'done') return '已看完'
    if (sites[id] === 'skipped') return '这次没去'
    if (sites[id] === 'active' || current.siteId === id) return '进行中'
    return '还没到'
  }
  const rows = ['prologue'].concat(SITE_IDS, ['finale', 'letter']).map(function (id) {
    const plays = Object.keys(pages).map(function (key) { return pages[key] }).filter(function (page) {
      return page && page.siteId === id && page.playId
    })
    return { id: id, title: TITLE[id], state: rowState(id), canOpen: openable(HOME[id]),
      current: current.siteId === id || (id === 'prologue' && resumeId.indexOf('P') === 0) ||
        (id === 'finale' && resumeId.indexOf('FN') === 0) || (id === 'letter' && resumeId.indexOf('LT') === 0),
      puzzles: plays.map(function (page) {
        return { playId: page.playId,
          state: puzzles[page.playId] === 'solved' ? '完成' : puzzles[page.playId] === 'assisted' ? '协助完成' : puzzles[page.playId] === 'skipped' ? '跳过' : '未做',
          reopenPageId: openable(page.id) ? page.id : '', canOpen: openable(page.id) }
      }) }
  })
  function openPageId(rowId, playId) {
    if (playId) {
      const page = Object.keys(pages).map(function (key) { return pages[key] }).find(function (p) {
        return p && p.playId === playId && (!rowId || p.siteId === rowId)
      })
      return page && openable(page.id) ? page.id : ''
    }
    return HOME[rowId] && openable(HOME[rowId]) ? HOME[rowId] : ''
  }
  return { rows: rows, openPageId: openPageId, resumePageId: resumeId,
    viewingPageId: source.pageId || '', isReview: !!resumeId && source.pageId !== resumeId }
}
module.exports = { buildProgress: buildProgress }
