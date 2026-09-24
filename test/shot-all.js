'use strict'

const automator = require('D:/kc/ymy/test/node_modules/miniprogram-automator')
const path = require('path')

const pages = [
  ['01-index', '/pages/index/index', null],
  ['02-ticket', '/pages/ticket/ticket', null],
  ['03-gate', '/plate21/module/pages/gate/gate', null],
  ['04-cover', '/plate21/module/pages/cover/cover', null],
  ['05-prologue', '/plate21/module/pages/prologue/prologue', null],
  ['06-s1-decode', '/plate21/module/pages/s1-decode/s1-decode', null],
  ['07-transit', '/plate21/module/pages/transit/transit?leg=s1-s2', null],
  ['08-waypoint-xq', '/plate21/module/pages/waypoint/waypoint?site=xieqiqu', null],
  ['09-dashuifa', '/plate21/module/pages/dashuifa/dashuifa', null],
  ['10-s2-quiz', '/plate21/module/pages/s2-quiz/s2-quiz', null],
  ['11-s2-reveal', '/plate21/module/pages/s2-reveal/s2-reveal', null],
  ['12-s2-blend', '/plate21/module/pages/s2-blend/s2-blend', null],
  ['13-s2-pattern', '/plate21/module/pages/s2-pattern/s2-pattern', null],
  ['14-s3-comic', '/plate21/module/pages/s3-comic/s3-comic', null],
  ['15-s3-zodiac', '/plate21/module/pages/s3-zodiac/s3-zodiac', null],
  ['16-s3-water', '/plate21/module/pages/s3-water/s3-water', null],
  ['17-s4-timeline', '/plate21/module/pages/s4-timeline/s4-timeline', null],
  ['18-s4-password', '/plate21/module/pages/s4-password/s4-password', null],
  ['19-finale', '/plate21/module/pages/finale/finale', null],
  ['20-report', '/plate21/module/pages/report/report', null],
  ['21-handbook', '/plate21/module/pages/handbook/handbook', null],
  ['22-archive', '/plate21/module/pages/archive/archive', null],
  ['23-atlas', '/plate21/module/pages/atlas/atlas', null],
  ['24-letter', '/plate21/module/pages/letter/letter', null],
  ['25-board', '/plate21/module/pages/board/board', null]
]

function wait(ms) {
  return new Promise(function (r) { setTimeout(r, ms) })
}

;(async function () {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  mp.on('exception', function (e) {
    console.log('EXC', JSON.stringify(e).slice(0, 400))
  })

  const now = Date.now()
  await mp.callWxMethod(
    'setStorageSync',
    'plate21_session',
    {
      snapshot: {
        schemaVersion: 2,
        sessionId: 'shot-all',
        revision: 0,
        flags: { premiumUnlockedAt: now, premiumEntitlement: { sku: 'plate21_full', unlockedAt: now } }
      },
      ops: {}
    }
  )

  const outDir = path.join(__dirname, 'all')
  require('fs').mkdirSync(outDir, { recursive: true })

  for (let i = 0; i < pages.length; i += 1) {
    const name = pages[i][0]
    const url = pages[i][1]
    try {
      await mp.reLaunch(url)
      await new Promise(function (r) { setTimeout(r, 2500) })
      const page = await mp.currentPage()
      const file = path.join(outDir, name + '.png')
      await mp.screenshot({ path: file })
      const data = await page.data().catch(function () { return null })
      const keys = data ? Object.keys(data).join(',') : ''
      console.log('OK', name, page.path, '| data keys:', keys.slice(0, 200))
    } catch (err) {
      console.log('FAIL', name, err && (err.message || String(err)).slice(0, 180))
    }
  }

  await mp.disconnect()
})().catch(function (err) {
  console.error(err && (err.stack || err))
  process.exit(1)
})
