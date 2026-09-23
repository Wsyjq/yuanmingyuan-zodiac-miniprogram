/**
 * 一次性：术语史料卡效果截图（正文铜绿词 + 弹层「学到了」按钮）
 * 用法：node test/harness/shot-gloss.js
 * 产物：test/shots-v2/gloss-1-inline.png / gloss-2-card.png
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

const PAGES = [
  {
    name: 'gloss-1-inline',
    route: 'plate21/module/pages/prologue/prologue',
    settleMs: 900
  },
  {
    name: 'gloss-2-card',
    route: 'plate21/module/pages/prologue/prologue',
    settleMs: 900,
    drive: async (inst) => {
      // 等价于正文点铜绿词「《西洋楼铜版图》」→ gloss-host.onGlossary
      inst.onGlossary({ detail: { key: 'sl01' } })
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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf'
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

;(async () => {
  fs.mkdirSync(OUT_HTML, { recursive: true })
  fs.mkdirSync(OUT_SHOTS, { recursive: true })

  const appCss = readWxssWithImports(path.join(ROOT, 'app.wxss'))
  const results = []
  for (const spec of PAGES) {
    const r = await renderPage(spec)
    const pageCss = readWxssWithImports(path.join(ROOT, spec.route + '.wxss'))
    const doc = buildDoc(r.html, [appCss].concat(r.compCssList, [pageCss]))
    fs.writeFileSync(path.join(OUT_HTML, spec.name + '.html'), doc)
    results.push({ spec, errors: r.errors })
  }

  const { server, port } = await startServer()
  const playwright = loadPlaywright()
  const browser = await playwright.chromium.launch()
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })

  for (const r of results) {
    const page = await context.newPage()
    page.on('pageerror', (e) => r.errors.push('[pageerror] ' + String(e).slice(0, 200)))
    await page.goto(`http://127.0.0.1:${port}/test/harness/out/${r.spec.name}.html`, { waitUntil: 'load', timeout: 15000 })
    try { await page.evaluate(async () => { if (document.fonts && document.fonts.ready) await document.fonts.ready }) } catch (e) {}
    await page.waitForTimeout(1800)
    await page.screenshot({ path: path.join(OUT_SHOTS, r.spec.name + '.png') })
    console.log(r.spec.name + (r.errors.length ? '  ⚠ ' + r.errors.join(' | ') : '  OK'))
    await page.close()
  }

  await browser.close()
  server.close()
})().catch((e) => { console.error(e); process.exit(1) })
