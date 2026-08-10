// 测试 s2-reveal：navigateTo 过去 → 输入 → 提交 → 点继续 → 检查跳转
// 不用 reLaunch（避免 automator 卡），用 navigateTo
const automator = require('miniprogram-automator')

;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const errs = []
  mp.on('exception', e => errs.push(String(e && e.message || e).slice(0, 400)))

  // 1. 先到首页，再 navigateTo 到 s2-reveal（避免 reLaunch 卡）
  let page = await mp.currentPage()
  console.log('当前页:', page.path)
  if (page.path.indexOf('s2-reveal') < 0) {
    console.log('navigateTo 到 s2-reveal...')
    await mp.navigateTo({ url: '/plate21/module/pages/s2-reveal/s2-reveal' })
    await new Promise(r => setTimeout(r, 1500))
    page = await mp.currentPage()
    console.log('1. 已到:', page.path)
  }

  // 2. 输入"莲花灯"
  try {
    const input = await page.$('.ans-input')
    if (input) { await input.input('莲花灯'); console.log('2. 输入 莲花灯 OK') }
    else { console.log('2. ✗ 没找到 .ans-input') }
  } catch(e) { console.log('2. 异常:', e.message) }

  // 3. 点提交
  try {
    const btn = await page.$('.ans-btn')
    if (btn) { await btn.tap(); console.log('3. 点提交 OK') }
    else { console.log('3. ✗ 没找到 .ans-btn') }
  } catch(e) { console.log('3. 异常:', e.message) }
  await new Promise(r => setTimeout(r, 1200))

  // 4. 检查 showHistory 状态（通过 data）
  try {
    const data = await page.data()
    console.log('4. showHistory =', data.showHistory, '| cardNumber =', data.cardNumber)
  } catch(e) { console.log('4. 读 data 异常:', e.message) }

  // 5. 点 history-card 的继续按钮
  try {
    const hcBtn = await page.$('history-card >>> .hc-collect')
    if (hcBtn) {
      console.log('5. 找到继续按钮，点击')
      await hcBtn.tap()
    } else {
      console.log('5. ✗ 没找到 history-card>>>.hc-collect，可能弹层没弹出')
    }
  } catch(e) { console.log('5. 异常:', e.message) }
  await new Promise(r => setTimeout(r, 1500))

  // 6. 检查跳转结果
  try {
    const after = await mp.currentPage()
    console.log('6. 点击后页:', after.path)
    console.log(after.path.indexOf('s2-blend') >= 0 ? '✓✓✓ 跳转成功' : '✗✗✗ 没跳到 s2-blend')
  } catch(e) { console.log('6. 异常:', e.message) }

  if (errs.length) { console.log('\n=== 异常 ==='); errs.forEach(e => console.log(' ', e)) }
  await mp.disconnect()
  process.exit(0)
})().catch(e => { console.error('FATAL', e.message); process.exit(1) })
