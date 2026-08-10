// 微信开发者工具 automator 截图探测
// 用法：node test/probe-launch.js
// 前置：先用 CLI 打开项目并开启自动化端口
//   cli.bat open --project D:\kc\ymy
//   cli.bat auto --project D:\kc\ymy --auto-port 9420
const automator = require('miniprogram-automator')
const path = require('path')

const PAGES = [
  ['cover', 'plate21/module/pages/cover/cover'],
  ['s2-pattern', 'plate21/module/pages/s2-pattern/s2-pattern'],
  ['s2-blend', 'plate21/module/pages/s2-blend/s2-blend'],
  ['s4-password', 'plate21/module/pages/s4-password/s4-password']
]

;(async () => {
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
    console.log('✓ connect 9420 成功')
  } catch (e) {
    console.error('✗ connect 失败：', e.message)
    console.error('请先运行：cli.bat auto --project D:\\kc\\ymy --auto-port 9420')
    process.exit(1)
  }

  for (const [name, pagePath] of PAGES) {
    try {
      await mp.reLaunch(pagePath)
      await new Promise(r => setTimeout(r, 2500))
      const file = path.join(__dirname, 'shots', 'probe-' + name + '.png')
      await mp.screenshot({ path: file })
      const page = await mp.currentPage()
      console.log('✓', name, '->', page.path)
    } catch (e) {
      console.log('✗', name, 'FAIL:', (e && e.message || JSON.stringify(e)).slice(0, 200))
    }
  }
  // 注意：不 close，保持自动化端口（close 会关端口）
  await mp.disconnect()
  process.exit(0)
})()
