'use strict'
const contract = require('./contract')
function copy(value) { return JSON.parse(JSON.stringify(value)) }
// Independent compiler: permits editorial changes without wx, storage or UI side effects.
function compile(pack, catalogs) {
  const errors = [], nodes = pack && pack.nodes
  if (!pack || pack.schemaVersion !== 1) errors.push('schemaVersion 必须为 1')
  if (!pack || typeof pack.revision !== 'string' || !pack.revision.trim()) errors.push('缺少内容 revision')
  if (!Array.isArray(nodes) || !nodes.length) throw new Error('剧本配置无效：nodes 必须为非空数组')
  const byId = {}, list = []
  function lines(value, field) { if (value != null && (!Array.isArray(value) || value.some(x => typeof x !== 'string'))) errors.push(field + ' 必须为文字数组') }
  nodes.forEach(node => {
    if (!node || typeof node.id !== 'string' || !/^[A-Za-z][\w-]*$/.test(node.id)) { errors.push('节点缺少有效 id'); return }
    const id = node.id
    if (byId[id]) errors.push(id + ' 重复 id')
    if (!contract.PAGE_KINDS.includes(node.kind)) errors.push(id + ' 未知 kind')
    if (node.siteId && !contract.SITE_IDS.includes(node.siteId)) errors.push(id + ' 未知站点 ' + node.siteId)
    if (node.playId && !contract.PLAY_IDS.includes(node.playId)) errors.push(id + ' 未注册玩法 ' + node.playId)
    if (node.kind === 'puzzle' && !node.playId) errors.push(id + ' 缺少 playId')
    if (node.revealOf && !contract.PLAY_IDS.includes(node.revealOf)) errors.push(id + ' 未知揭晓玩法')
    ;['lines', 'signedLines', 'beforeLines', 'answerLines', 'relayLines'].forEach(key => lines(node[key], id + '.' + key))
    if (node.dialogueGroups && (!Array.isArray(node.dialogueGroups) || !node.dialogueGroups.every(n => Number.isInteger(n) && n > 0) || node.dialogueGroups.reduce((a, b) => a + b, 0) !== (node.lines || []).length)) errors.push(id + ' 对话段落分组需覆盖全部 lines')
    if (node.interaction) {
      lines(node.interaction.lines, id + '.interaction.lines')
      lines(node.interaction.revealLines, id + '.interaction.revealLines')
      if (node.interaction.requires && !contract.PLAY_IDS.includes(node.interaction.requires)) errors.push(id + ' 未知互动前置条件')
      if (node.interaction.position && !['before', 'after'].includes(node.interaction.position)) errors.push(id + ' 未知互动位置')
    }
    if (node.terms != null && !Array.isArray(node.terms)) errors.push(id + '.terms 必须为数组')
    else (node.terms || []).forEach(term => {
      if (!term.key || !term.label || catalogs && !catalogs.history[term.key]) errors.push(id + ' 无效史料 ' + term.key)
      if (term.aliases != null) lines(term.aliases, id + '.terms.aliases')
    })
    if (node.props != null && !Array.isArray(node.props)) errors.push(id + '.props 必须为数组')
    else (node.props || []).forEach(key => { if (catalogs && !catalogs.props[key]) errors.push(id + ' 未知道具 ' + key) })
    const compiled = Object.assign({ siteId: '', lines: [], beforeLines: [], answerLines: [], signedLines: [], relayLines: [],
      interaction: null, sectionTitle: '', title: '', narrId: '', image: '', propPrompt: '', playId: '', revealOf: '', next: '', skipTo: '', presentation: null, terms: [], props: [] }, copy(node))
    byId[id] = compiled; list.push(compiled)
  })
  if (!byId[pack.entryId]) errors.push('入口不存在：' + pack.entryId)
  list.forEach(node => ['next', 'skipTo'].forEach(key => { if (node[key] && !byId[node[key]]) errors.push(node.id + '.' + key + ' 指向不存在节点 ' + node[key]) }))
  // Main journey must not loop; replay is handled by the engine, never by next.
  const visited = new Set(), active = new Set()
  function visit(id) {
    if (!byId[id]) return
    if (active.has(id)) { errors.push('流程循环：' + id); return }
    if (visited.has(id)) return
    visited.add(id); active.add(id)
    visit(byId[id].next); visit(byId[id].skipTo); active.delete(id)
  }
  visit(pack.entryId)
  list.forEach(node => { if (!visited.has(node.id)) errors.push('不可达节点：' + node.id) })
  const playIds = list.map(node => node.playId).filter(Boolean)
  if (new Set(playIds).size !== playIds.length) errors.push('玩法实例 playId 不可重复；避免两个任务共用完成状态')
  if (errors.length) throw new Error('剧本配置无效：\n' + errors.join('\n'))
  return { list, byId }
}
module.exports = { compile }
