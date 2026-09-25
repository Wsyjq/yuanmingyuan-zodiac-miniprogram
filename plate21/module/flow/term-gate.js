'use strict'
// 术语剧透门控：信封谜题（quiz-envelope）的答案就是“黄花阵”（下一站的名字）。
// 揭晓之前，所有显示文本中的该词替换为占位“？？？”，避免站点名、史料词条、道具提示提前剧透。
// 解出（solved/assisted）或到达黄花阵导航站（M2，诚实跳过的玩家走到这里自然知晓）后恢复原文。
const TERM = '黄花阵'
const PLACEHOLDER = '？？？'

function revealed(run) {
  if (!run) return true
  const status = ((run.puzzles || {})['quiz-envelope']) || ''
  if (status === 'solved' || status === 'assisted') return true
  return !!((run.visited || {}).M2)
}

function maskText(text, run) {
  if (text == null || revealed(run)) return text
  return String(text).split(TERM).join(PLACEHOLDER)
}

function maskDeep(value, run) {
  if (revealed(run)) return value
  if (typeof value === 'string') return maskText(value, run)
  if (Array.isArray(value)) return value.map(function (item) { return maskDeep(item, run) })
  if (value && typeof value === 'object') {
    const out = {}
    Object.keys(value).forEach(function (key) { out[key] = maskDeep(value[key], run) })
    return out
  }
  return value
}

module.exports = { TERM, PLACEHOLDER, revealed, maskText, maskDeep }
