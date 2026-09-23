'use strict'

// 进程页的只读视图。不改 Run，不读剧情句，不导航。

const { SITE_IDS } = require('../flow/contract')

const PAGE_ORDER = [
  'P1', 'P2', 'P3',
  'E1', 'E2',
  'M1', 'X1', 'X2', 'X3',
  'M2', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'M3', 'F1', 'F2',
  'M4', 'HY1', 'HY2', 'HY3',
  'M5', 'XS1', 'XS2',
  'M6', 'DS1', 'DS2',
  'M7', 'HG1',
  'FN1', 'FN2', 'FN3', 'FN4',
  'LT1', 'LT2', 'LT3', 'LT4', 'LT5', 'LT6', 'LT7', 'LT8'
]

const GATE_INDEX = PAGE_ORDER.indexOf('E1')

const TITLE = {
  prologue: '序章',
  gate: '西洋楼入口',
  xieqiqu: '谐奇趣',
  maze: '黄花阵',
  fangwaiguan: '方外观',
  haiyantang: '海晏堂',
  xushuilou: '蓄水楼',
  dashuifa: '大水法',
  hugo: '雨果雕像',
  finale: '结局',
  letter: '次日信'
}

const HOME = {
  prologue: 'P1',
  gate: 'E1',
  xieqiqu: 'M1',
  maze: 'M2',
  fangwaiguan: 'M3',
  haiyantang: 'M4',
  xushuilou: 'M5',
  dashuifa: 'M6',
  hugo: 'M7',
  finale: 'FN1',
  letter: 'LT1'
}

const ROW_DEFS = ['prologue', ...SITE_IDS, 'finale', 'letter'].map((id) => ({
  id,
  title: TITLE[id],
  home: HOME[id]
}))

const ROW_BY_ID = {}
for (const row of ROW_DEFS) ROW_BY_ID[row.id] = row

// 页表没有该页时才用。走路页归目的站。
const SITE_PAGES = {
  gate: ['E1', 'E2'],
  xieqiqu: ['M1', 'X1', 'X2', 'X3'],
  maze: ['M2', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'],
  fangwaiguan: ['M3', 'F1', 'F2'],
  haiyantang: ['M4', 'HY1', 'HY2', 'HY3'],
  xushuilou: ['M5', 'XS1', 'XS2'],
  dashuifa: ['M6', 'DS1', 'DS2'],
  hugo: ['M7', 'HG1']
}

const SITE_BY_PAGE = {}
for (const siteId of SITE_IDS) {
  for (const pageId of SITE_PAGES[siteId]) SITE_BY_PAGE[pageId] = siteId
}

const SITE_PLAYS = {
  gate: ['quiz-direction'],
  xieqiqu: ['listen-nfc', 'quiz-envelope'],
  maze: ['quiz-lantern', 'prop-flip', 'photo-pavilion', 'quiz-pattern'],
  fangwaiguan: [],
  haiyantang: ['quiz-hour', 'prop-dial'],
  xushuilou: ['quiz-height'],
  dashuifa: ['place-animals'],
  hugo: []
}

const PLAY_PAGE = {
  'quiz-direction': 'E1',
  'listen-nfc': 'X1',
  'quiz-envelope': 'X2',
  'quiz-lantern': 'H1',
  'prop-flip': 'H3',
  'photo-pavilion': 'H4',
  'quiz-pattern': 'H5',
  'quiz-hour': 'HY1',
  'prop-dial': 'HY3',
  'quiz-height': 'XS1',
  'place-animals': 'DS1'
}

function siteOf(pageId, pagesById) {
  if (typeof pageId !== 'string' || pageId === '') return ''
  if (pagesById && Object.prototype.hasOwnProperty.call(pagesById, pageId)) {
    const page = pagesById[pageId] || {}
    if (typeof page.siteId === 'string') return page.siteId
  }
  return SITE_BY_PAGE[pageId] || ''
}

function pageForPlay(playId, pagesById) {
  const fallback = PLAY_PAGE[playId] || ''
  if (!pagesById) return fallback
  let first = ''
  for (const id of Object.keys(pagesById)) {
    const page = pagesById[id]
    if (!page || page.playId !== playId) continue
    const found = page.id || id
    if (found === fallback) return fallback
    if (!first) first = found
  }
  return first || fallback
}

function puzzleLabel(value) {
  if (value === 'solved') return '完成'
  if (value === 'skipped') return '跳过'
  return '未做'
}

function reachedGate(pageId) {
  const at = PAGE_ORDER.indexOf(pageId)
  return at >= GATE_INDEX
}

// 序章没有站点标记。P* 进行中；页号到了 E1 或更后才是已看完。
function prologueState(pageId, pagesById) {
  if (typeof pageId === 'string' && pageId.startsWith('P')) return '进行中'
  if (reachedGate(pageId) || siteOf(pageId, pagesById)) return '已看完'
  return '还没到'
}

// 结局不看 signedAt。进入 LT 才算结局已看完。
function finaleState(pageId) {
  if (typeof pageId !== 'string') return '还没到'
  if (pageId.startsWith('LT')) return '已看完'
  if (pageId.startsWith('FN')) return '进行中'
  return '还没到'
}

// 次日信只有进入 LT 才是进行中。停在 FN4 仍是还没到。
function letterState(pageId) {
  if (typeof pageId === 'string' && pageId.startsWith('LT')) return '进行中'
  return '还没到'
}

// 当前页属于这一站时是进行中，盖过 done / skipped。
function siteState(siteId, pageId, sites, pagesById) {
  if (siteOf(pageId, pagesById) === siteId) return '进行中'
  const mark = Object.prototype.hasOwnProperty.call(sites, siteId) ? sites[siteId] : 'idle'
  if (mark === 'skipped') return '这次没去'
  if (mark === 'done') return '已看完'
  if (mark === 'active') return '进行中'
  return '还没到'
}

function rowState(rowId, pageId, sites, pagesById) {
  if (rowId === 'prologue') return prologueState(pageId, pagesById)
  if (rowId === 'finale') return finaleState(pageId)
  if (rowId === 'letter') return letterState(pageId)
  return siteState(rowId, pageId, sites, pagesById)
}

function puzzlesFor(siteId, puzzles, pagesById) {
  const playIds = SITE_PLAYS[siteId] || []
  return playIds.map((playId) => ({
    playId,
    state: puzzleLabel(Object.prototype.hasOwnProperty.call(puzzles, playId) ? puzzles[playId] : 'pending'),
    reopenPageId: pageForPlay(playId, pagesById)
  }))
}

function buildProgress(run, pagesById) {
  const source = run || {}
  const pageId = typeof source.pageId === 'string' ? source.pageId : ''
  const sites = source.sites || {}
  const puzzles = source.puzzles || {}
  const pages = pagesById || null

  const rows = ROW_DEFS.map((row) => ({
    id: row.id,
    title: row.title,
    state: rowState(row.id, pageId, sites, pages),
    puzzles: puzzlesFor(row.id, puzzles, pages)
  }))

  function openPageId(rowId, playId) {
    if (playId) return pageForPlay(playId, pages)
    const row = ROW_BY_ID[rowId]
    return row ? row.home : ''
  }

  return { rows, openPageId }
}

module.exports = {
  buildProgress
}
