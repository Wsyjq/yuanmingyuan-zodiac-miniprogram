const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const PAGES = [
  ['00-host-index', 'pages/index/index'],
  ['01-cover', 'plate21/module/pages/cover/cover'],
  ['02-prologue', 'plate21/module/pages/prologue/prologue'],
  ['03-s1-decode', 'plate21/module/pages/s1-decode/s1-decode'],
  ['04-transit', 'plate21/module/pages/transit/transit?leg=s1-s2'],
  ['05-s2-quiz', 'plate21/module/pages/s2-quiz/s2-quiz'],
  ['06-s2-reveal', 'plate21/module/pages/s2-reveal/s2-reveal'],
  ['07-s2-blend', 'plate21/module/pages/s2-blend/s2-blend'],
  ['08-s2-pattern', 'plate21/module/pages/s2-pattern/s2-pattern'],
  ['09-s3-comic', 'plate21/module/pages/s3-comic/s3-comic'],
  ['10-s3-zodiac', 'plate21/module/pages/s3-zodiac/s3-zodiac'],
  ['11-s3-water', 'plate21/module/pages/s3-water/s3-water'],
  ['12-s4-timeline', 'plate21/module/pages/s4-timeline/s4-timeline'],
  ['13-s4-password', 'plate21/module/pages/s4-password/s4-password'],
  ['14-finale', 'plate21/module/pages/finale/finale'],
  ['15-report', 'plate21/module/pages/report/report'],
  ['16-ending', 'plate21/module/pages/ending/ending'],
  ['17-handbook', 'plate21/module/pages/handbook/handbook'],
]

const OUT = path.join(__dirname, 'shots')
fs.mkdirSync(OUT, { recursive: true })

;(async () => {
  // 优先 connect（CLI auto 已开端口），失败则 launch（自启 IDE + 自动化，持久连接）
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
    console.log('connect 9420 成功')
  } catch (e) {
    console.log('connect 失败，改用 launch 启动...')
    mp = await automator.launch({
      cliPath: 'D:\\xiazai\\微信web开发者工具\\cli.bat',
      projectPath: 'D:\\kc\\ymy'
    })
    console.log('launch 成功')
  }
  const errors = []
  mp.on('exception', e => errors.push(String(e).slice(0, 500)))

  for (const [name, pagePath] of PAGES) {
    try {
      await mp.reLaunch(pagePath)
      await new Promise(r => setTimeout(r, 2500))
      const file = path.join(OUT, name + '.png')
      await mp.screenshot({ path: file })
      const page = await mp.currentPage()
      console.log('OK', name, '->', page.path)
    } catch (e) {
      console.log('FAIL', name, String(e).slice(0, 300))
    }
  }

  if (errors.length) {
    console.log('\n=== PAGE EXCEPTIONS ===')
    errors.forEach(e => console.log(e))
  } else {
    console.log('\nNO PAGE EXCEPTIONS')
  }
  await mp.close()
  process.exit(0)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
