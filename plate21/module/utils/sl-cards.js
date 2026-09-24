'use strict'
const content = require('../content/history')
const SL_CARDS = {}
Object.keys(content).forEach(key => {
  const card = content[key]
  SL_CARDS[key] = Object.assign({}, card, { lines: card.layers,
    years: Array.from(new Set(card.layers.join(' ').match(/\b(?:17|18|19|20)\d{2}\b/g) || [])) })
})
function get(key) { return SL_CARDS[key] || null }
module.exports = { SL_CARDS, get }
