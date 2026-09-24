'use strict'

const automator = require('D:/kc/ymy/test/node_modules/miniprogram-automator')
const path = require('path')
const fs = require('fs')

const out = path.join(__dirname)
fs.mkdirSync(out, { recursive: true })

async function wait(ms) {
  return new Promise(function (r) { setTimeout(r, ms) })
}

async function shot(mp, name) {
  const page = await mp.currentPage()
  const file = path.join(out, name + '.png')
  await mp.screenshot({ path: file })
  console.log('SHOT', name, page && page.path, file)
  return page
}

async function pathOf(mp) {
  const page = await mp.currentPage()
  return page && page.path
}

async function waitPath(mp, want, ms) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    const now = await pathOf(mp)
    if (now && now.indexOf(want) >= 0) return now
    await wait(300)
  }
  return pathOf(mp)
}

;(async function () {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  mp.on('exception', function (e) {
    console.log('EXC', JSON.stringify(e).slice(0, 800))
  })

  await mp.reLaunch('/pages/index/index')
  await waitPath(mp, 'pages/index/index', 4000)
  await shot(mp, 'flow-0-index')
  const home = await mp.currentPage()
  const card = await home.$('.module-card')
  console.log('CARD', !!card, await pathOf(mp))
  if (card) await card.tap()
  const onTicket = await waitPath(mp, 'pages/ticket/ticket', 5000)
  console.log('ON', onTicket)
  const ticket = await shot(mp, 'flow-1-ticket')
  const unlock = await ticket.$('.unlock')
  console.log('UNLOCK', !!unlock)
  if (unlock) await unlock.tap()
  const afterPay = await waitPath(mp, 'pages/cover/cover', 8000)
  console.log('AFTER_PAY', afterPay)
  const cover = await shot(mp, 'flow-2-cover')
  const start = await cover.$('.btn-seal')
  console.log('START', !!start)
  if (start) await start.tap()
  const afterStart = await waitPath(mp, 'pages/prologue/prologue', 8000)
  console.log('AFTER_START', afterStart)
  await shot(mp, 'flow-3-after-start')
  await mp.disconnect()
})().catch(function (err) {
  console.error('FATAL', err && (err.stack || err))
  process.exit(1)
})
