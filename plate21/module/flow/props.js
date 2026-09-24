'use strict'
const pages = require('./pages')
const catalog = require('../content/props')
function forPage(pageId) {
  const page = pages.byId[pageId] || {}, keys = page.props || []
  if (!keys.length) return { title: '', items: [] }
  return { title: page.propTitle || (keys.length > 1 ? '这一步用到的道具' : catalog[keys[0]].what),
    items: keys.map(key => {
      const item = catalog[key]
      return { id: item.id, what: item.what, how: item.how.map((line, index) => (index + 1) + '. ' + line).join('\n'), steps: item.how.slice(), returnWhen: item.returnWhen }
    }) }
}
module.exports = { forPage }
