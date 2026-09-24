'use strict'
// Visitor-facing task summaries; original script and historical cards remain intact.
const tasks = require('../content/tasks')
function get(id) { const item = tasks[id]; return item ? { title: item.title, instruction: item.instruction } : null }
function feedback(id, ui) {
  if (['quiz-direction', 'quiz-lantern', 'quiz-pattern', 'quiz-height'].includes(id) && !(ui.optionId || ui.choice)) return '请先选择一个选项，再确认答案。'
  if (id === 'quiz-envelope' && !String(ui.text || '').trim()) return '请先填写拼出的站名，再确认答案。'
  return tasks[id] ? tasks[id].feedback : '请查看操作提示，完成后再继续。'
}
function hint(id) { return tasks[id] ? tasks[id].hint : '' }
module.exports = { get, feedback, hint }
