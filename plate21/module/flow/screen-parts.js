'use strict'
// Keep story IDs stable; presentation steps live in the existing page draft.
function sequence(page, run) {
  if (page.interaction && page.interaction.requires && run && !['solved', 'assisted'].includes((run.puzzles || {})[page.interaction.requires])) return ['story']
  if (!page.interaction) return ['story']
  if (page.id === 'H3') return ['activity', 'reveal', 'story']
  if (!page.lines.length) return ['activity']
  return page.interaction.position === 'before' || page.id === 'H4'
    ? ['activity', 'story'] : ['story', 'activity']
}
function current(page, ui, run) {
  const parts = sequence(page, run)
  const saved = ui.screenPart
  if (parts.includes(saved) && !(page.id === 'H3' && saved !== 'activity' && !ui.flipped)) return saved
  if (page.id === 'H3' && ui.flipped) return 'reveal'
  return parts[0]
}
function adjacent(page, ui, direction, run) {
  const parts = sequence(page, run)
  return parts[parts.indexOf(current(page, ui, run)) + direction] || ''
}
function project(page, model, ui, run) {
  const part = current(page, ui, run), divided = !!page.interaction
  model.screenPart = part
  model.separateStory = divided && part === 'story'
  if (!divided) return model
  if (part === 'story') {
    model.interaction = null; model.play = null; model.prop = null
    model.task = null; model.showSkip = false
    if (page.playId) model.primary = '继续'
    if (page.id === 'H4') model.lines = page.lines.slice()
  } else {
    model.lines = []; model.portrait = ''; model.teacher = ''
    if (part === 'reveal') {
      model.play = null; model.prop = null; model.task = null; model.showSkip = false
      model.interaction = { title: page.interaction.title, lines: (page.interaction.revealLines || []).slice() }
    } else if (page.id === 'H3' && model.interaction) {
      model.interaction.lines = page.interaction.lines.slice()
    }
  }
  if (adjacent(page, ui, 1, run) && (part !== 'activity' || !page.playId)) model.primary = part === 'story' ? '开始探索' : '继续'
  return model
}
module.exports = { sequence, current, adjacent, project }
