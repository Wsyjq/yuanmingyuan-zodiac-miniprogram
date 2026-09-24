'use strict'
const audioSrc = require('../utils/audio-src')

// 按页决定旁白 id，以及谐奇趣贴片声景。不解析文件，不生成 mp3。
// nav 与 FN4 不播。揭晓页不进入由流程保证；对应题已 skipped 时这里也不播。

function narrIdFor(page) {
  if (!page || page.kind === 'nav' || page.id === 'FN4') return ''
  const narrId = page.narrId
  return typeof narrId === 'string' ? narrId : ''
}

function shouldPlay(page, run) {
  if (!narrIdFor(page)) return false
  const playId = page.revealOf
  if (!playId) return true
  const puzzles = run && run.puzzles
  return !puzzles || puzzles[playId] !== 'skipped'
}

function soundscapeFor(page) {
  return page && page.playId === 'listen-nfc' ? 'xieqiqu-nfc' : ''
}

function clipsFor(page, run) {
  if (page.narrationPending) return []
  if (!shouldPlay(page, run)) return []
  const status = page.revealOf && run && run.puzzles && run.puzzles[page.revealOf]
  if (page.revealOf && status !== 'solved' && status !== 'assisted') return []
  if (page.id === 'H3') {
    const flip = run && run.puzzles && run.puzzles['prop-flip']
    if (flip !== 'solved' && flip !== 'assisted' && !(run && run.uiByPage && run.uiByPage.H3 && run.uiByPage.H3.flipped === true)) return []
  }
  return audioSrc.clips(narrIdFor(page))
}

function voicePkg(id) { return audioSrc.packagesFor(id)[0] || '' }

module.exports = {
  narrIdFor,
  shouldPlay,
  soundscapeFor,
  clipsFor,
  voicePkg
}
