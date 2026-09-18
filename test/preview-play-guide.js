'use strict'

const fs = require('fs')
const path = require('path')
const http = require('http')
const { renderPage, ROOT } = require('./harness/runtime')
const wxss = require('./harness/wxss')

const OUT_HTML = path.join(__dirname, 'harness', 'out')
const OUT_SHOTS = path.join(__dirname, 'shots-play-guide')
const PLAYWRIGHT = path.join('D:', 'kc', 'ymy', 'test', 'node_modules', 'playwright')

const PAGES = [
  { name: '01-cover', route: 'plate21/module/pages/cover/cover' },
  {
    name: '01c-cover-guide',
    route: 'plate21/module/pages/cover/cover',
    drive: async (inst) => {
      inst.onCoachNext()
    }
  },
  {
    name: '01d-cover-help',
    route: 'plate21/module/pages/cover/cover',
    drive: async (inst, sleep) => {
      inst.onCoachSkip()
      await sleep(400)
      inst.onShowHelp()
    }
  }
]

const RESET_CSS = [
  '@font-face{font-family:"Plate21WenKai";src:url("/plate21/module/assets/fonts/Plate21WenKai-Subset.ttf") format("truetype");font-display:swap}',
  'html,body{margin:0;padding:0;width:100%;min-height:100%;background:#F4EDDC}',
  'button{background:none;border:none;padding:0;font:inherit;color:inherit}',
  'button::after{content:none;border:none}'
].join('')

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

function buildDoc(bodyHtml, cssList) {
  const styles = [RESET_CSS]
    .concat(cssList.map((c) => wxss.convert(c)))
    .map((c) => '<style>' + c + '</style>')
    .join('')
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' + styles + '</head><body>' + bodyHtml + '</body></html>'
}

function box(r) {
  if (!r) return null
  return {
    top: Math.round(r.top * 10) / 10,
    left: Math.round(r.left * 10) / 10,
    width: Math.round(r.width * 10) / 10,
    height: Math.round(r.height * 10) / 10
  }
}

;(async () => {
  fs.mkdirSync(OUT_HTML, { recursive: true })
  fs.mkdirSync(OUT_SHOTS, { recursive: true })
  const appCss = readWxssWithImports(path.join(ROOT, 'app.wxss'))

  async function writeCover(name, drive) {
    const r = await renderPage({
      route: 'plate21/module/pages/cover/cover',
      settleMs: 400,
      drive: drive
    })
    if (r.errors.length) {
      console.error(name, r.errors)
      process.exitCode = 1
    }
    const pageCss = readWxssWithImports(path.join(ROOT, 'plate21/module/pages/cover/cover.wxss'))
    const doc = buildDoc(r.html, [appCss].concat(r.compCssList, [pageCss]))
    fs.writeFileSync(path.join(OUT_HTML, name + '.html'), doc)
    return r
  }

  await writeCover('01-cover')

  const { chromium } = require(PLAYWRIGHT)
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0])
    const file = path.normalize(path.join(ROOT, p))
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return }
      res.writeHead(200)
      res.end(buf)
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const browser = await chromium.launch({
    executablePath: 'D:\\playwright-browsers\\chromium-1234\\chrome-win64\\chrome.exe'
  })

  async function layoutAt(width, height) {
    const context = await browser.newContext({ viewport: { width: width, height: height }, deviceScaleFactor: 2 })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:' + port + '/test/harness/out/01-cover.html', { waitUntil: 'load' })
    await page.waitForTimeout(300)
    const layout = await page.evaluate(() => {
      function boxOf(sel) {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      }
      return {
        win: {
          top: 0,
          left: 0,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight
        },
        start: boxOf('#coachStart'),
        handbook: boxOf('#coachHandbook'),
        help: boxOf('#coachHelp')
      }
    })
    await context.close()
    return layout
  }

  const layout375 = await layoutAt(375, 812)
  console.log('actual 375x812', JSON.stringify(layout375, null, 2))
  const layout320 = await layoutAt(320, 568)
  console.log('actual 320x568', JSON.stringify(layout320, null, 2))

  async function shotWithHole(name, hole, win, stepIndex, viewport) {
    const r = await writeCover(name, async (inst) => {
      const steps = inst.data.coachSteps || []
      inst.setData({
        showCoach: true,
        coachIndex: stepIndex,
        coachStep: steps[stepIndex] || steps[0],
        coachHole: hole,
        coachWin: win,
        loading: false
      })
    })
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2
    })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:' + port + '/test/harness/out/' + name + '.html', { waitUntil: 'load' })
    await page.waitForTimeout(300)
    const cmp = await page.evaluate(() => {
      function boxOf(sel) {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      }
      return {
        start: boxOf('#coachStart'),
        handbook: boxOf('#coachHandbook'),
        help: boxOf('#coachHelp'),
        ring: boxOf('.cs-ring'),
        bubble: boxOf('.cs-bubble')
      }
    })
    const overlap = cmp.ring && cmp.bubble && !(
      cmp.bubble.top + cmp.bubble.height <= cmp.ring.top + 1 ||
      cmp.bubble.top >= cmp.ring.top + cmp.ring.height - 1
    )
    console.log('compare', name, {
      hole: box(hole),
      start: box(cmp.start),
      handbook: box(cmp.handbook),
      help: box(cmp.help),
      ring: box(cmp.ring),
      bubble: box(cmp.bubble),
      overlap: !!overlap
    })
    if (overlap) {
      console.error('OVERLAP', name)
      process.exitCode = 1
    }
    await page.screenshot({ path: path.join(OUT_SHOTS, name + '.png') })
    await context.close()
    return r
  }

  await shotWithHole('01-cover', layout375.start, layout375.win, 0, { width: 375, height: 812 })
  await shotWithHole('01c-cover-guide', layout375.handbook, layout375.win, 1, { width: 375, height: 812 })
  await shotWithHole('01e-cover-help', layout375.help, layout375.win, 2, { width: 375, height: 812 })
  await shotWithHole('01-cover-320', layout320.start, layout320.win, 0, { width: 320, height: 568 })

  const help = await writeCover('01d-cover-help', async (inst, sleep) => {
    inst.onCoachSkip()
    await sleep(400)
    inst.onShowHelp()
  })
  const helpCtx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })
  const helpPage = await helpCtx.newPage()
  await helpPage.goto('http://127.0.0.1:' + port + '/test/harness/out/01d-cover-help.html', { waitUntil: 'load' })
  await helpPage.waitForTimeout(300)
  await helpPage.screenshot({ path: path.join(OUT_SHOTS, '01d-cover-help.png') })
  await helpCtx.close()
  console.log('help catalog', !!(help.data && help.data.showGuide))

  await browser.close()
  server.close()
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
