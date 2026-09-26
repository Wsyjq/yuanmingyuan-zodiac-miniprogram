'use strict'
// Visitor-facing task summaries; original script and historical cards remain intact.
const tasks = require('../content/tasks')
const guard = require('../utils/input-guard')
function get(id) { const item = tasks[id]; return item ? { title: item.title, instruction: item.instruction } : null }
function feedback(id, ui) {
  if (['quiz-direction', 'quiz-lantern', 'quiz-pattern', 'quiz-height', 'quiz-fang-person', 'quiz-fang-use'].includes(id) && !(ui.optionId || ui.choice)) return '请先选择一个选项，再确认答案。'
  if (id === 'quiz-envelope') {
    const text = String(ui.text || '')
    if (!text.trim()) return '请先填写拼出的站名，再确认答案。'
    if (guard.count(text) > guard.LIMITS.answer) return '答案最多 ' + guard.LIMITS.answer + ' 字，请删减后再确认。'
  }
  return tasks[id] ? tasks[id].feedback : '请查看操作提示，完成后再继续。'
}
function hint(id) { return tasks[id] ? tasks[id].hint : '' }
module.exports = { get, feedback, hint }
