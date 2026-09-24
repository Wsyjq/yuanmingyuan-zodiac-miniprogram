'use strict'

// 正文里点得开的史料。页号跟着《第廿一图v3.docx》里的【SL】标记。
const HOOKS = [
  { pageId: 'P1', key: 'sl01', label: '西洋楼铜版图', aliases: ['西洋楼铜板图', '西洋楼铜版画'] },
  { pageId: 'P3', key: 'sl00', label: '丙午' },
  { pageId: 'E2', key: 'sl02', label: '西洋楼' },
  { pageId: 'E2', key: 'sl05', label: '长春园' },
  { pageId: 'X1', key: 'sl03', label: '谐奇趣' },
  { pageId: 'X1', key: 'sl06', label: '水法' },
  { pageId: 'H1', key: 'sl07', label: '黄花阵' },
  { pageId: 'H6', key: 'sl08', label: '黄花阵复建', aliases: ['黄花阵今墙', '墙体和亭子', '原墙'] },
  { pageId: 'F1', key: 'sl09', label: '方外观' },
  { pageId: 'F2', key: 'sl10', label: '容妃' },
  { pageId: 'F2', key: 'sl11', label: '五竹亭' },
  { pageId: 'HY1', key: 'sl12', label: '海晏堂' },
  { pageId: 'XS1', key: 'sl13', label: '蓄水楼' },
  { pageId: 'XS2', key: 'sl04', label: '水法' },
  { pageId: 'DS1', key: 'sl14', label: '大水法' },
  { pageId: 'DS2', key: 'sl15', label: '观水法' },
  { pageId: 'HG1', key: 'sl17', label: '雨果' }
]

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
