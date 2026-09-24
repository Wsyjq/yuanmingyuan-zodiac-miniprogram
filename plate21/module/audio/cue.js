'use strict'

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

function voicePkg(narrId) {
  const id = String(narrId || '')
  if (!id) return ''
  if (/^narr-fn/.test(id)) return 'voice-c'
  if (/^narr-hy/.test(id)) return 'voice-d'
  if (/^narr-hg/.test(id)) return 'voice-e'
  if (/^narr-f/.test(id)) return 'voice-h'
  if (/^narr-p|^narr-e/.test(id)) return 'voice-a'
  if (/^narr-h/.test(id)) return 'voice-b'
  if (/^narr-x/.test(id)) return 'voice-f'
  if (/^narr-ds/.test(id)) return 'voice-g'
  if (/^narr-xs/.test(id)) return 'voice-i'
  if (/^narr-lt[1-4]$/.test(id)) return 'voice-k'
  if (/^narr-lt/.test(id)) return 'voice-l'
  return ''
}

module.exports = {
  narrIdFor,
  shouldPlay,
  soundscapeFor,
  voicePkg
}
