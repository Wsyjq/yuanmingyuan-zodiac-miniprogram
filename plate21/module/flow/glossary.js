'use strict'

// 正文里点得开的史料。页号跟着《第廿一图v3.docx》里的【SL】标记。
const HOOKS = require('./pages').list.flatMap(page => page.terms.map(term => Object.assign({ pageId: page.id }, term)))

function termsFor(pageId) {
  return HOOKS.filter(function (hook) { return hook.pageId === pageId }).map(function (hook) {
    return { key: hook.key, label: hook.label }
  })
}

function segments(text, terms) {
  const result = []; let rest = String(text)
  while (rest) {
    let match = null
    terms.forEach(term => {
      const at = term.label ? rest.indexOf(term.label) : -1
      if (at >= 0 && (!match || at < match.at || (at === match.at && term.label.length > match.label.length))) match = Object.assign({ at }, term)
    })
    if (!match) { result.push({ text: rest, key: '' }); break }
    if (match.at) result.push({ text: rest.slice(0, match.at), key: '' })
    result.push({ text: match.label, key: match.key })
    rest = rest.slice(match.at + match.label.length)
  }
  return result
}
// Current page wins when two cards share a term (e.g. 水法/喷泉原理).
// Previously encountered cards remain clickable in subsequent narrative pages.
function inlineTermsFor(pageId, encountered) {
  const allowed = new Set((encountered || []).map(term => term.key))
  const ordered = HOOKS.filter(hook => hook.pageId === pageId && allowed.has(hook.key))
    .concat(HOOKS.filter(hook => allowed.has(hook.key)))
  const seen = new Set(), terms = []
  ordered.forEach(hook => {
    ;[hook.label].concat(hook.aliases || []).forEach(label => {
      if (!seen.has(label)) { seen.add(label); terms.push({ key: hook.key, label }) }
    })
  })
  return terms
}
module.exports = { termsFor, segments, inlineTermsFor }
