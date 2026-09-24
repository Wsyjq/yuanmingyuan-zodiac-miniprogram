'use strict'

const automator = require('D:/kc/ymy/test/node_modules/miniprogram-automator')
const path = require('path')

function wait(ms) {
  return new Promise(function (r) { setTimeout(r, ms) })
}

;(async function () {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  mp.on('exception', function (e) {
    console.log('EXC', JSON.stringify(e).slice(0, 400))
  })
  await mp.reLaunch('/plate21/module/pages/waypoint/waypoint?site=xieqiqu')
  await wait(2500)
  let page = await mp.currentPage()
  console.log('PATH', page.path, page.query)
  const heard = await page.$('.wp-confirm-btn')
  const texts = heard ? await page.data() : null
  console.log('DATA followup', texts && texts.followup, 'textInput', texts && texts.textInput)
  if (heard && texts && !texts.followup) {
    await heard.tap()
    await wait(1500)
    page = await mp.currentPage()
  }
  const after = await page.data()
  if (after && !after.followup && page.callMethod) {
    await page.callMethod('onHeard')
    await wait(800)
  }
  const out = path.join(__dirname, 'xieqiqu-envelope.png')
  await mp.screenshot({ path: out })
  const now = await mp.currentPage()
  const d = await now.data()
  console.log('SHOT', out)
  console.log('followup', d.followup, 'textSolved', d.textSolved)
  await mp.disconnect()
})().catch(function (err) {
  console.error('FATAL', err && (err.stack || err))
  process.exit(1)
})
