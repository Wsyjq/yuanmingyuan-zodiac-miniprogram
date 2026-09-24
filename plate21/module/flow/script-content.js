'use strict'
// Compatibility projection for Word coverage checks. Edit content/story.js only.
const nodes = require('../content/story').nodes
const byPage = {}
nodes.forEach(node => { byPage[node.id] = node })
module.exports = { byPage }
