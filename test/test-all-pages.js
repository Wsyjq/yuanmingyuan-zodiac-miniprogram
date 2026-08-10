// 全页面自动测试：遍历 17 页，抓 console error / 页面异常 / 截图
// 用法：node test/test-all-pages.js
// 前置：cli.bat auto --project D:\kc\ymy --auto-port 9420
const automator = require('miniprogram-automator')
const path = require('path')
const fs = require('fs')

const PAGES = [
  ['cover', 'plate21/module/pages/cover/cover'],
  ['prologue', 'plate21/module/pages/prologue/prologue'],
  ['s1-decode', 'plate21/module/pages/s1-decode/s1-decode'],
  ['transit', 'plate21/module/pages/transit/transit?leg=s1-s2'],
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

const OUT_DIR = path.join(__dirname, 'shots-test')
fs.mkdirSync(OUT_DIR, { recursive: true })

;(async () => {
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
    console.log('✓ connect 成功\n')
  } catch (e) {
    console.error('✗ connect 失败:', e.message)
    console.error('请先运行: cli.bat auto --project D:\\kc\\ymy --auto-port 9420')
    process.exit(1)
  }

  // 全局异常收集器（每次切页前清空）
  let pageErrors = []
  mp.on('exception', (e) => {
    pageErrors.push(String(e && e.stack || e && e.message || JSON.stringify(e)).slice(0, 600))
  })

  let totalErr = 0
  for (const [name, pagePath] of PAGES) {
    pageErrors = []
    let landed = '?'
    try {
      // reLaunch 可能因页面 JS 抛错而 reject，用 catch 接住继续
      await mp.reLaunch(pagePath).catch(e => pageErrors.push('[reLaunch] ' + String(e && e.message || e).slice(0, 300)))
      await new Promise(r => setTimeout(r, 2800))
      // 读当前页确认是否真跳过去
      try {
        const cur = await mp.currentPage()
        landed = cur.path + (Object.keys(cur.query || {}).length ? '?' + JSON.stringify(cur.query) : '')
      } catch (e) { landed = '读取失败' }
      // 截图
      const shot = path.join(OUT_DIR, name + '.png')
      try { await mp.screenshot({ path: shot }) } catch (e) {}

      const isLanded = landed.indexOf(name.replace('s1-decode','s1-decode').replace('transit','transit')) >= 0 || landed.indexOf(pagePath.split('/').pop()) >= 0
      if (pageErrors.length === 0 && isLanded) {
        console.log('✓ ' + name.padEnd(12) + ' landed: ' + landed)
      } else {
        totalErr += pageErrors.length
        console.log('✗ ' + name.padEnd(12) + ' landed: ' + landed + ' | ' + pageErrors.length + ' 错误')
        pageErrors.forEach(e => console.log('    ' + e.slice(0, 400)))
      }
    } catch (e) {
      totalErr++
      console.log('✗ ' + name.padEnd(12) + ' 外层异常: ' + String(e && e.message || e).slice(0, 300))
    }
  }

  console.log('\n=== 共 ' + totalErr + ' 条错误 ===')
  console.log('截图目录: ' + OUT_DIR)
  await mp.disconnect()
  process.exit(totalErr > 0 ? 1 : 0)
})()
