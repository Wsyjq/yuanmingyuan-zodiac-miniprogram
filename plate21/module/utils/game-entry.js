'use strict'
const session = require('../store/session')
let configured = false
let lastConfig = null
let identityVersion = null
function init(entry) {
  let app = null
  try { app = getApp() } catch (err) {}
  const config = app && app.plate21Host
  const version = config && config.identityVersion
  if (!configured || lastConfig !== config || identityVersion !== version) {
    session.configure(config || { mode: 'demo' })
    lastConfig = config; identityVersion = version; configured = true
  }
  return session.init(entry || {})
}
module.exports = { init }
