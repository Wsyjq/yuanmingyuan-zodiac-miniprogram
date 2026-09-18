/** V2.2 页面查看器：连 automator → 跳指定页 → 截图存 PNG（不用控制 GUI） */
const automator = require('miniprogram-automator')

const targets = process.argv.slice(2)
if (!targets.length) {
  console.error('usage: node drive-sim.js <name>=<route-with-query>')
  process.exit(1)
}

async function main() {
  const mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  for (const t of targets) {
    const eq = t.indexOf('=')
    const name = t.slice(0, eq)
    const url = t.slice(eq + 1)
    console.log('[nav]', name, '->', url)
    try {
      const page = await mini.reLaunch(url)
      await new Promise((r) => setTimeout(r, 2600))
      const shot = 'D:/kc/ymy-wt-v22/test/shots-v22/' + name + '.png'
      await mini.screenshot({ path: shot })
      const data = await page.data()
      const cur = await mini.currentPage()
      console.log('[ok]', name, 'path=', cur.path, 'keys=', Object.keys(data).slice(0, 14).join(','))
    } catch (e) {
      console.error('[fail]', name, String(e && e.message || e).slice(0, 200))
    }
  }
  await mini.disconnect()
}

main().catch((e) => { console.error('FAIL', e && e.message); process.exit(1) })
