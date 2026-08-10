// 抓取小红书笔记参考图：打开短链 → 等渲染 → 截图 + 收集图片 URL
const path = require('path')
const { execSync } = require('child_process')
let chromium
try { chromium = require('playwright').chromium } catch (e) {
  const globalRoot = execSync('npm root -g').toString().trim()
  chromium = require(path.join(globalRoot, 'playwright')).chromium
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
  })
  const page = await ctx.newPage()
  try {
    await page.goto('http://xhslink.cn/o/5rddQHAKNJy', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(6000)
    console.log('FINAL_URL:', page.url())
    console.log('TITLE:', await page.title())
    await page.screenshot({ path: 'shots-h5/xhs-ref-page.png', fullPage: false })
    // 收集笔记图片
    const imgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .map((i) => i.src)
        .filter((s) => s && s.includes('xhscdn'))
    )
    console.log('IMGS:', JSON.stringify(imgs.slice(0, 20), null, 1))
    // 尝试关闭登录弹窗再截一张
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'shots-h5/xhs-ref-page2.png', fullPage: false })
  } catch (e) {
    console.log('ERROR:', e.message)
    try { await page.screenshot({ path: 'shots-h5/xhs-ref-error.png' }) } catch (_) {}
  }
  await browser.close()
})()
