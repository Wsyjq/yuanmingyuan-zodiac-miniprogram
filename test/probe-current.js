// 连接当前已打开的开发者工具，读当前页面状态 + 抓所有 console 输出
const automator = require('miniprogram-automator')
const path = require('path')

;(async () => {
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
    console.log('✓ connect 成功')
  } catch (e) {
    console.error('✗ connect 失败:', e.message)
    process.exit(1)
  }

  // 收集所有 console 消息
  const allMsgs = []
  mp.on('exception', (e) => allMsgs.push('[page-ex] ' + (e && e.stack || e && e.message || JSON.stringify(e)).slice(0, 500)))

  try {
    const page = await mp.currentPage()
    console.log('当前页面 path:', page.path)
    console.log('当前页面 query:', JSON.stringify(page.query))

    // 监听 console（page 级）
    const handler = (msg) => {
      allMsgs.push('[' + (msg.type || msg.level || '?') + '] ' + (msg.text || JSON.stringify(msg.args || msg)).slice(0, 400))
    }
    try { await page.bindingConsoleHandler(handler) } catch(e) {}

    // 等 3 秒收集消息
    await new Promise(r => setTimeout(r, 3000))

    // 截图
    const shotPath = path.join(__dirname, 'shots', 'probe-current.png')
    await mp.screenshot({ path: shotPath })
    console.log('截图:', shotPath)

    console.log('\n=== 收集到 ' + allMsgs.length + ' 条 console/异常 ===')
    allMsgs.forEach(m => console.log(m))
  } catch (e) {
    console.error('读取失败:', e && e.message || e)
  }

  await mp.disconnect()
  process.exit(0)
})()
