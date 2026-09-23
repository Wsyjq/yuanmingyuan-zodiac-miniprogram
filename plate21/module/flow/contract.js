'use strict'

// 主线六模块的共同契约。各工作树只改自己的目录，都读这一份。
// 内容原文以 docs/飞书分页接入方案.md 为准，结构以 docs/主线模块技术设计.md 为准。

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
    sites: {},
    puzzles: {},
    editionNo: null,
    signedAt: null
  }
}

module.exports = {
  SITE_IDS,
  PLAY_IDS,
  PAGE_KINDS,
  createRun
}
