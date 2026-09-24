'use strict'

const automator = require('D:/kc/ymy/test/node_modules/miniprogram-automator')
const path = require('path')

const pages = [
  ['s1', '/plate21/module/pages/s1-decode/s1-decode'],
  ['xq', '/plate21/module/pages/waypoint/waypoint?site=xieqiqu'],
  ['s2r', '/plate21/module/pages/s2-reveal/s2-reveal'],
  ['s2p', '/plate21/module/pages/s2-pattern/s2-pattern'],
  ['hy', '/plate21/module/pages/s3-comic/s3-comic'],
  ['ds', '/plate21/module/pages/dashuifa/dashuifa'],
  ['tr', '/plate21/module/pages/transit/transit?leg=s1-s2'],
  ['cover', '/plate21/module/pages/cover/cover']
]

function wait(ms) {
  return new Promise(function (r) { setTimeout(r, ms) })
}

;(async function () {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const now = Date.now()
  await mp.callWxMethod(
    'setStorageSync',
    'plate21_session',
    {
      snapshot: {
        schemaVersion: 2,
        sessionId: 'shot-tasks',
        revision: 0,
        flags: { premiumUnlockedAt: now, premiumEntitlement: { sku: 'plate21_full', unlockedAt: now } }
      },
      ops: {}
    }
  )
  await mp.reLaunch('/plate21/module/pages/s1-decode/s1-decode')
  await wait(2000)
  for (let i = 0; i < pages.length; i += 1) {
    const name = pages[i][0]
    const url = pages[i][1]
    try {
      await mp.redirectTo(url)
      await wait(2200)
      const page = await mp.currentPage()
      const file = path.join(__dirname, 'task-' + name + '.png')
      await mp.screenshot({ path: file })
      console.log('OK', name, page.path)
    } catch (err) {
      console.log('FAIL', name, err && (err.message || String(err)).slice(0, 180))
    }
  }
  await mp.disconnect()
})().catch(function (err) {
  console.error(err && (err.stack || err))
  process.exit(1)
})
