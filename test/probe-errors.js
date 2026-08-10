// 抓微信开发者工具控制台错误 + 页面异常
// 用法：node test/probe-errors.js
const automator = require('miniprogram-automator')

const PAGES = [
  ['cover', 'plate21/module/pages/cover/cover'],
  ['prologue', 'plate21/module/pages/prologue/prologue'],
  ['s1-decode', 'plate21/module/pages/s1-decode/s1-decode'],
  ['s2-quiz', 'plate21/module/pages/s2-quiz/s2-quiz'],
  ['s2-reveal', 'plate21/module/pages/s2-reveal/s2-reveal'],
  ['s2-blend', 'plate21/module/pages/s2-blend/s2-blend'],
  ['s2-pattern', 'plate21/module/pages/s2-pattern/s2-pattern'],
  ['s3-comic', 'plate21/module/pages/s3-comic/s3-comic'],
  ['s3-zodiac', 'plate21/module/pages/s3-zodiac/s3-zodiac'],
  ['s3-water', 'plate21/module/pages/s3-water/s3-water'],
  ['s4-timeline', 'plate21/module/pages/s4-timeline/s4-timeline'],
  ['s4-password', 'plate21/module/pages/s4-password/s4-password'],
  ['finale', 'plate21/module/pages/finale/finale'],
  ['report', 'plate21/module/pages/report/report'],
  ['ending', 'plate21/module/pages/ending/ending'],
  ['handbook', 'plate21/module/pages/handbook/handbook']
]

;(async () => {
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
    console.log('✓ connect 成功\n')
  } catch (e) {
    console.error('✗ connect 失败:', e.message)
    process.exit(1)
  }

  let totalErrors = 0
  for (const [name, pagePath] of PAGES) {
    const errs = []
    const handler = (msg) => {
      const t = msg.type || msg.level || ''
      const text = msg.text || msg.args || msg.message || JSON.stringify(msg)
      if (t === 'error' || /error|Error|FAIL|fail/i.test(String(text))) {
        errs.push('  [console] ' + String(text).slice(0, 300))
      }
    }
    mp.on('exception', (e) => errs.push('  [page-ex] ' + String(e && e.message || e).slice(0, 300)))

    try {
      const page = await mp.reLaunch(pagePath)
      // 监听该页 console
      await page.bindingConsoleHandler(handler)
      await new Promise(r => setTimeout(r, 2000))
      if (errs.length) {
        totalErrors += errs.length
        console.log('[' + name + '] ✗ ' + errs.length + ' 条错误')
        errs.forEach(e => console.log(e))
      } else {
        console.log('[' + name + '] ✓ 无错误')
      }
    } catch (e) {
      totalErrors++
      console.log('[' + name + '] ✗ reLaunch 失败: ' + (e && e.message || e).slice(0, 200))
    }
  }

  console.log('\n=== 共 ' + totalErrors + ' 条错误 ===')
  await mp.disconnect()
  process.exit(totalErrors > 0 ? 1 : 0)
})()
