/**
 * H5 渲染台架入口：node test/harness/render.js
 *
 * 流程：逐页用 runtime.js 求值页面 JS → 渲染 HTML 写入 test/harness/out/
 *       → 起本地静态服务（根 = 工程根）→ Playwright chromium 375×812@2x 截图
 *       → test/shots-h5/<序号-名>.png，打印每页 OK/FAIL + JS 错误汇总。
 */
'use strict'

const fs = require('fs')
const path = require('path')
const http = require('http')
const { execSync } = require('child_process')
const { renderPage, ROOT } = require('./runtime')
const wxss = require('./wxss')

const OUT_HTML = path.join(__dirname, 'out')
const OUT_SHOTS = path.join(ROOT, 'test', 'shots-v2')

const PLAYER_PHOTO_FIXTURES = [1, 2, 3, 4].map((no) => `/test/fixtures/player-photo-0${no}.svg`)

function fieldPhotoFixture(points) {
  return (points || [
    { key: 'dome', no: '01', title: '穹顶与飞檐' },
    { key: 'beast', no: '02', title: '檐角立兽' },
    { key: 'lotus', no: '03', title: '莲座宝瓶' },
    { key: 'swan', no: '04', title: '双天鹅蝙蝠纹' }
  ]).map((point, index) => Object.assign({}, point, { photoPath: PLAYER_PHOTO_FIXTURES[index] }))
}

// v2 改动页面专项截图：新页面 + 改动状态（drive 驱动），共 19 张。
const PAGES = [
  {
    name: 'v2-01-prologue-letter',
    fullPage: true,
    route: 'plate21/module/pages/prologue/prologue',
    drive: async (inst) => {
      inst.onNovelFinish()
      inst.setData({ showEnvelope: false, showPack: true })
    }
  },
  { name: 'v2-02-transit-side', route: 'plate21/module/pages/transit/transit', query: { leg: 's3-s4' } },
  { name: 'v2-03-wp-xieqiqu', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'xieqiqu' } },
  { name: 'v2-04-wp-yangquelong', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'yangquelong' } },
  { name: 'v2-05-wp-fangwaiguan', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'fangwaiguan' } },
  { name: 'v2-06-wp-xushuilou', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'xushuilou' } },
  {
    name: 'v2-07-wp-xushuilou-reveal',
    fullPage: true,
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'xushuilou' },
    drive: async (inst) => inst.onConfirm()
  },
  { name: 'v2-08-dsf-intro', route: 'plate21/module/pages/dashuifa/dashuifa' },
  {
    name: 'v2-09-dsf-silence',
    route: 'plate21/module/pages/dashuifa/dashuifa',
    drive: async (inst) => inst.onStart()
  },
  {
    name: 'v2-10-dsf-question',
    route: 'plate21/module/pages/dashuifa/dashuifa',
    drive: async (inst) => {
      inst.onStart()
      inst.finishSilence()
    }
  },
  {
    name: 'v2-11-dsf-done',
    route: 'plate21/module/pages/dashuifa/dashuifa',
    drive: async (inst) => inst.setData({ stage: 'done', choice: '风声' })
  },
  { name: 'v2-12-wp-xianfahua', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'xianfahua' } },
  {
    name: 'v2-13-guide-s4-deep',
    route: 'plate21/module/pages/s4-timeline/s4-timeline',
    drive: async (inst) => {
      const ag = inst.selectComponent('#audioGuide')
      ag.onFab()
      ag.onToggleDeep()
    }
  },
  {
    name: 'v2-14-report-echo',
    fullPage: true,
    route: 'plate21/module/pages/report/report',
    drive: async (inst) => inst.setData({
      finale: true, completed: true, letterReady: false,
      name: '考察者甲', editionNo: 12, editionLabel: '第 12 版'
    })
  },
  {
    name: 'v2-15-report-echo-sent',
    fullPage: true,
    route: 'plate21/module/pages/report/report',
    drive: async (inst) => inst.setData({
      finale: true, completed: true, letterReady: true, messageSubmitted: true,
      submittedText: '在被看着的时候。没人看，放得再好也没用。',
      name: '考察者甲', editionNo: 12, editionLabel: '第 12 版'
    })
  },
  {
    name: 'v2-16-letter-sealed',
    route: 'plate21/module/pages/letter/letter',
    drive: async (inst) => inst.setData({ state: 'sealed' })
  },
  {
    name: 'v2-17-letter-open',
    route: 'plate21/module/pages/letter/letter',
    drive: async (inst) => inst.setData({ state: 'open', paragraphs: inst.buildParagraphs({ messageSubmittedAt: 1 }) })
  },
  {
    name: 'v2-18-handbook-side',
    fullPage: true,
    route: 'plate21/module/pages/handbook/handbook',
    drive: async (inst) => inst.setData({
      finaleDone: true, letterReady: true, sideVisitedCount: 6,
      sideSites: inst.data.sideSites.map((s) => Object.assign({}, s, { visited: true }))
    })
  },
  {
    name: 'v2-19-finale-novel-new',
    route: 'plate21/module/pages/finale/finale',
    drive: async (inst) => {
      inst.startAct(4)
      const nv = inst.selectComponent('#novelView')
      nv._activatePage(2)
      nv._finishTyping()
    }
  }
]
const RESET_CSS = `
@font-face{font-family:"Plate21WenKai";src:url("/plate21/module/assets/fonts/Plate21WenKai-Subset.ttf") format("truetype");font-display:swap}
html,body{margin:0;padding:0;width:100%;min-height:100%;overflow-x:visible}
button{background:none;border:none;padding:0;font:inherit;color:inherit;line-height:normal}
button::after{content:none;border:none}
img{display:inline-block}
.__scroll{width:100%}
.__canvas-ph{border:1px dashed #9a9484;background:rgba(43,41,38,.05);color:#9a9484;display:flex;align-items:center;justify-content:center;font-size:12px;min-height:80px}
.__camera-ph{background:#23282E;color:#7d838b;display:flex;align-items:center;justify-content:center;font-size:12px}
.__unknown-ph{border:1px dashed #c0392b;color:#c0392b;font-size:10px;padding:2px}
`

function buildDoc(bodyHtml, cssList) {
  const styles = [RESET_CSS]
    .concat(cssList.map((c) => wxss.convert(c)))
    .map((c) => `<style>\n${c}\n</style>`)
    .join('\n')
  return `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n${styles}\n</head>\n<body>\n${bodyHtml}\n</body>\n</html>\n`
}

function readWxssWithImports(filePath, seen) {
  const visited = seen || new Set()
  const resolved = path.resolve(filePath)
  if (visited.has(resolved) || !fs.existsSync(resolved)) return ''
  visited.add(resolved)
  const source = fs.readFileSync(resolved, 'utf8')
  return source.replace(/@import\s+["']([^"']+)["'];?/g, function (_, relativePath) {
    return readWxssWithImports(path.resolve(path.dirname(resolved), relativePath), visited)
  })
}

// ---------------- 静态服务 ----------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
}

function startServer() {
  const server = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0])
      if (p.endsWith('/')) p += 'index.html'
      const file = path.normalize(path.join(ROOT, p))
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); res.end('not found'); return }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' })
        res.end(buf)
      })
    } catch (e) {
      res.writeHead(500); res.end()
    }
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
}

function loadPlaywright() {
  try { return require('playwright') } catch (e) { /* 全局安装 */ }
  const globalRoot = execSync('npm root -g').toString().trim()
  return require(path.join(globalRoot, 'playwright'))
}

// ---------------- 主流程 ----------------

;(async () => {
  fs.mkdirSync(OUT_HTML, { recursive: true })
  fs.mkdirSync(OUT_SHOTS, { recursive: true })

  const globalRejections = []
  const onRejection = (reason) => globalRejections.push(String(reason && reason.stack || reason).slice(0, 300))
  process.on('unhandledRejection', onRejection)

  // 1. 逐页渲染 HTML
  const appCss = readWxssWithImports(path.join(ROOT, 'app.wxss'))
  const renderResults = []
  for (const spec of PAGES) {
    try {
      const r = await renderPage(spec)
      const pageCss = readWxssWithImports(path.join(ROOT, spec.route + '.wxss'))
      const doc = buildDoc(r.html, [appCss].concat(r.compCssList, [pageCss]))
      fs.writeFileSync(path.join(OUT_HTML, spec.name + '.html'), doc)
      renderResults.push({ spec, errors: r.errors, warns: r.warns, renderOk: true })
    } catch (e) {
      renderResults.push({ spec, errors: ['渲染器自身异常: ' + (e && e.stack || e)], warns: [], renderOk: false })
    }
  }

  // 2. 静态服务 + Playwright 截图
  const { server, port } = await startServer()
  const playwright = loadPlaywright()
  const browser = await playwright.chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2
  })

  console.log('page'.padEnd(18) + 'shot')
  for (const r of renderResults) {
    const { spec } = r
    if (!r.renderOk) { console.log(spec.name.padEnd(18) + 'FAIL(render)'); continue }
    const page = await context.newPage()
    r.browserErrors = []
    page.on('pageerror', (e) => r.browserErrors.push('[pageerror] ' + String(e).slice(0, 200)))
    page.on('console', (msg) => {
      if (msg.type() === 'error') r.browserErrors.push('[console.error] ' + msg.text().slice(0, 200))
    })
    try {
      await page.goto(`http://127.0.0.1:${port}/test/harness/out/${spec.name}.html`, { waitUntil: 'load', timeout: 15000 })
      // 等待项目手写字体加载完成，确保批注正确渲染
      try {
        await page.evaluate(async () => {
          if (document.fonts && document.fonts.ready) await document.fonts.ready
        })
      } catch (e) { /* 字体等待失败不阻塞 */ }
      await page.waitForTimeout(1500)
      await page.screenshot({ path: path.join(OUT_SHOTS, spec.name + '.png'), fullPage: !!spec.fullPage })
      for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 812 }, { width: 430, height: 932 }]) {
        await page.setViewportSize(viewport)
        const layout = await page.evaluate(() => {
          const viewportWidth = window.innerWidth
          const offenders = Array.from(document.body.querySelectorAll('*')).map((element) => {
            const rect = element.getBoundingClientRect()
            return {
              node: element.tagName.toLowerCase() + (element.className ? '.' + String(element.className).trim().replace(/\s+/g, '.') : ''),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width)
            }
          }).filter((item) => item.left < -2 || item.right > viewportWidth + 2).slice(0, 6)
          return {
            viewportWidth,
            documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
            offenders
          }
        })
        if (layout.documentWidth > layout.viewportWidth + 2) {
          r.browserErrors.push('[layout ' + viewport.width + 'x' + viewport.height + '] horizontal overflow ' + (layout.documentWidth - layout.viewportWidth) + 'px ' + JSON.stringify(layout.offenders))
        }
      }
      console.log(spec.name.padEnd(18) + 'OK')
    } catch (e) {
      r.browserErrors.push('[shot] ' + String(e).slice(0, 200))
      console.log(spec.name.padEnd(18) + 'FAIL(shot)')
    }
    await page.close()
  }

  await browser.close()
  server.close()
  process.removeListener('unhandledRejection', onRejection)

  // 3. 错误汇总
  console.log('\n=== JS 错误汇总（vm 求值 / 生命周期 / console.error）===')
  let anyErr = false
  for (const r of renderResults) {
    const errs = r.errors.concat(r.browserErrors || [])
    if (!errs.length) continue
    anyErr = true
    console.log(`\n[${r.spec.name}]`)
    errs.forEach((e) => console.log('  ' + e))
  }
  if (!anyErr) console.log('（无）')

  const allWarns = renderResults.flatMap((r) => r.warns.map((w) => `[${r.spec.name}] ${w}`))
  if (allWarns.length) {
    console.log('\n=== console.warn（多为埋点/兜底提示，供参考）===')
    allWarns.slice(0, 20).forEach((w) => console.log('  ' + w))
    if (allWarns.length > 20) console.log(`  …共 ${allWarns.length} 条`)
  }
  if (globalRejections.length) {
    console.log('\n=== 未捕获 Promise rejection ===')
    globalRejections.slice(0, 10).forEach((e) => console.log('  ' + e))
  }
  console.log(`\nHTML: ${OUT_HTML}\n截图: ${OUT_SHOTS}`)
  if (anyErr || globalRejections.length) process.exitCode = 1
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
