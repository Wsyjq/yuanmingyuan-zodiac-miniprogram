'use strict'
// Compatibility entry point: runtime consumers keep the same page contract.
const pack = require('../content/story')
const { compile } = require('./compile-story')
module.exports = compile(pack, { history: require('../content/history'), props: require('../content/props') })
