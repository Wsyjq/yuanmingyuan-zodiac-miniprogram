'use strict'

const automator = require('D:/kc/ymy/test/node_modules/miniprogram-automator')
const path = require('path')

;(async function () {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  await mp.reLaunch('/plate21/module/pages/prologue/prologue')
  await new Promise(function (r) { setTimeout(r, 2800) })
  const page = await mp.currentPage()
  console.log('PATH', page.path)
  const d = await page.data()
  console.log('narrSrc', d.narrSrc)
  await mp.screenshot({ path: path.join(__dirname, 'prologue-audio.png') })
  await mp.disconnect()
})().catch(function (err) {
  console.error(err && (err.stack || err))
  process.exit(1)
})
