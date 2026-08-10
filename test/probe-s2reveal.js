// 测试 s2-reveal 输入答案 → 提交 → 点继续 → 是否跳转 s2-blend
const automator = require('miniprogram-automator')
const path = require('path')

;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const errs = []
  mp.on('exception', e => errs.push(String(e && e.message || e).slice(0, 400)))

  // 1. 进入 s2-reveal
  await mp.reLaunch('plate21/module/pages/s2-reveal/s2-reveal').catch(e => console.log('reLaunch: ' + e.message))
  await new Promise(r => setTimeout(r, 2000))
  let page = await mp.currentPage()
  console.log('1. 进入页面:', page.path)

  // 2. 输入"莲花灯"
  const input = await page.$('.ans-input')
  if (input) {
    await input.input('莲花灯')
    console.log('2. 已输入 莲花灯')
  } else {
    console.log('2. ✗ 找不到输入框 .ans-input')
  }

  // 3. 点提交
  const submitBtn = await page.$('.ans-btn')
  if (submitBtn) {
    await submitBtn.tap()
    console.log('3. 已点提交')
  } else {
    console.log('3. ✗ 找不到提交按钮 .ans-btn')
  }
  await new Promise(r => setTimeout(r, 1500))

  // 4. 检查史料卡是否弹出
  const card = await page.$('history-card')
  console.log('4. history-card 节点存在:', !!card)

  // 5. 截图（看当前状态）
  await mp.screenshot({ path: path.join(__dirname, 'shots', 'probe-s2reveal-after-submit.png') })
  console.log('5. 截图: test/shots/probe-s2reveal-after-submit.png')

  // 6. 尝试点 history-card 的继续按钮（通过组件内 .hc-collect）
  try {
    const hcBtn = await page.$('history-card >>> .hc-collect')
    if (hcBtn) {
      console.log('6. 找到继续按钮 .hc-collect，点击')
      await hcBtn.tap()
      await new Promise(r => setTimeout(r, 1500))
      const after = await mp.currentPage()
      console.log('7. 点击后当前页:', after.path)
      if (after.path.indexOf('s2-blend') >= 0) {
        console.log('✓✓✓ 跳转成功！')
      } else {
        console.log('✗✗✗ 没跳到 s2-blend，仍停在: ' + after.path)
      }
    } else {
      console.log('6. ✗ 找不到继续按钮 history-card>>>.hc-collect')
    }
  } catch (e) {
    console.log('6/7. 操作异常:', e.message)
  }

  if (errs.length) {
    console.log('\n=== 异常 ===')
    errs.forEach(e => console.log('  ' + e))
  }
  await mp.disconnect()
  process.exit(0)
})().catch(e => { console.error('FATAL', e.message); process.exit(1) })
