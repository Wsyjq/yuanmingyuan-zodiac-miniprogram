'use strict'
// Group editorially related lines, keeping the original script untouched.
function build(page, lines) {
  const groups = page.dialogueGroups || page.lines.map(() => 1)
  const lookup = new Map()
  let offset = 0
  groups.forEach((size, group) => {
    page.lines.slice(offset, offset + size).forEach(line => lookup.set(line, group))
    offset += size
  })
  const result = []
  let previous
  ;(lines || []).forEach(line => {
    if (!String(line).trim()) return
    const group = lookup.get(line)
    if (group !== undefined && group === previous) result[result.length - 1] += line
    else result.push(String(line))
    previous = group
  })
  return result
}
function cursor(lines, paragraphs, saved, version) {
  const index = Math.max(0, Math.floor(Number(saved) || 0))
  if (version === 2) return Math.min(index, Math.max(0, paragraphs.length - 1))
  // Old saves used sentence / 85-character positions. Resume in the containing paragraph.
  const chunks = []
  ;(lines || []).forEach(line => {
    const sentences = String(line).match(/[^。！？；]+[。！？；]?/g) || [String(line)]
    sentences.forEach(sentence => {
      const chars = Array.from(sentence)
      while (chars.length) chunks.push(chars.splice(0, 85).join(''))
    })
  })
  let at = chunks.slice(0, index).reduce((sum, text) => sum + Array.from(text).length, 0)
  for (let i = 0; i < paragraphs.length; i++) {
    const size = Array.from(paragraphs[i]).length
    if (at < size) return i
    at -= size
  }
  return Math.max(0, paragraphs.length - 1)
}
module.exports = { build, cursor }
