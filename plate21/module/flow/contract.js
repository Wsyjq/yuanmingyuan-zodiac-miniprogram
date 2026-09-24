'use strict'

// V3 主线契约。pageId 是显示位置；resumePageId 是唯一当前恢复点。

const SITE_IDS = [
  'gate',
  'xieqiqu',
  'maze',
  'fangwaiguan',
  'haiyantang',
  'xushuilou',
  'dashuifa',
  'hugo'
]

const PLAY_IDS = [
  'quiz-direction',
  'listen-nfc',
  'quiz-envelope',
  'quiz-lantern',
  'prop-flip',
  'photo-pavilion',
  'quiz-pattern',
  'quiz-hour',
  'prop-dial',
  'quiz-height',
  'place-animals'
]

const PAGE_KINDS = ['read', 'puzzle', 'nav', 'sign', 'letter']

// Page 记录字段。flow/pages.js 必须覆盖接入方案里的每一个页号。
// id, kind, siteId, lines[], narrId, image, propPrompt, playId, revealOf, next, skipTo

function createRun() {
  return {
    pageId: 'P1',
    resumePageId: 'P1',
    visited: { P1: true },
    unlocked: { P1: true },
    completedPages: {},
    sites: {},
    puzzles: {},
    uiByPage: {},
    flags: {},
    name: '',
    editionNo: null,
    signedAt: null,
    completedAt: null,
    completedTimeSource: null,
    letterAvailable: false,
    letterOpenedAt: null,
    letterRead: false
  }
}

module.exports = {
  SITE_IDS,
  PLAY_IDS,
  PAGE_KINDS,
  PUZZLE_STATES: ['unvisited', 'solved', 'assisted', 'skipped'],
  createRun
}
