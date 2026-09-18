/**
 * 留言板 + 次日回访预览台架：node test/preview-board.js
 * 渲染 6 个视图到 test/harness/out/，生成总览页 board-preview.html，起静态服务。
 * 仅依赖 node 内置模块（runtime/wxml/wxss 均无 npm 依赖）。
 */
'use strict'

const fs = require('fs')
const path = require('path')
const http = require('http')
const { renderPage, ROOT } = require('./harness/runtime')
const wxss = require('./harness/wxss')

const OUT_HTML = path.join(__dirname, 'harness', 'out')

function dateKey(timestamp) {
  const date = new Date(Number(timestamp))
  return String(date.getFullYear()) + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0')
}

function finishedEnvelope(options) {
  const opts = options || {}
  return {
    snapshot: {
      schemaVersion: 2,
      sessionId: 'preview-session',
      revision: 0,
      sessionDate: opts.sessionDate,
      checkpoint: 'report',
      stations: { s1: true, s2: true, s3: true, s4: true },
      puzzles: { 's4-password': { completedAt: 1, payload: {} } },
      cards: {}, records: [],
      flags: Object.assign({ experienceCompletedAt: 1758000000000 }, opts.flags || {}),
      finale: true,
      name: '预览者',
      editionNo: 1,
      createdAt: 1758000000000,
      updatedAt: 1758000000000
    }
  }
}

function storageOverrides(env) {
  const store = { plate21_session: env }
  return {
    getStorageSync: (k) => (k in store ? store[k] : ''),
    setStorageSync: (k, v) => { store[k] = v },
    removeStorageSync: (k) => { delete store[k] }
  }
}

const yesterday = dateKey(Date.now() - 86400000)
const today = dateKey(Date.now())

// 视图清单：入口卡三态 + 留言板三态
const VIEWS = [
  {
    name: 'pv-1-index-same-day',
    label: '入口 · 通关当日（无回访卡）',
    route: 'pages/index/index',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: today }))
  },
  {
    name: 'pv-2-index-next-day',
    label: '入口 · 通关次日（回访卡出现）',
    route: 'pages/index/index',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: yesterday }))
  },
  {
    name: 'pv-3-index-done',
    label: '入口 · 次日已留言（文案切换）',
    route: 'pages/index/index',
    wxOverrides: storageOverrides(finishedEnvelope({
      sessionDate: yesterday,
      flags: { experienceCompletedAt: 1, boardSubmittedAt: 2, boardDraft: '下一个来的人，抬头看。' }
    }))
  },
  {
    name: 'pv-4-board-open',
    label: '留言簿 · 通关态（留一句话+留言墙）',
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(finishedEnvelope({ sessionDate: yesterday }))
  },
  {
    name: 'pv-5-board-submitted',
    label: '留言簿 · 已投递（你留下的+换一句话）',
    route: 'plate21/module/pages/board/board',
    wxOverrides: storageOverrides(finishedEnvelope({
      sessionDate: yesterday,
      flags: { experienceCompletedAt: 1, boardSubmittedAt: 2, boardDraft: '下一个来的人，抬头看。' }
    }))
  },
  {
    name: 'pv-6-board-notfinished',
    label: '留言簿 · 未通关（引导态）',
    route: 'plate21/module/pages/board/board'
  }
]

const RESET_CSS = `
@font-face{font-family:"Plate21WenKai";src:url("/plate21/module/assets/fonts/Plate21WenKai-Subset.ttf") format("truetype");font-display:swap}
html,body{margin:0;padding:0;width:100%;min-height:100%;overflow-x:visible}
button{background:none;border:none;padding:0;font:inherit;color:inherit;line-height:normal}
button::after{content:none;border:none}
img{display:inline-block}
`

function buildDoc(bodyHtml, cssList) {
  const styles = [RESET_CSS].concat(cssList.map((c) => wxss.convert(c)))
    .map((c) => `<style>\n${c}\n</style>`).join('\n')
  return `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n${styles}\n</head>\n<body>\n${bodyHtml}\n</body>\n</html>\n`
}

function readWxssWithImports(filePath, seen) {
  const visited = seen || new Set()
  const resolved = path.resolve(filePath)
  if (visited.has(resolved) || !fs.existsSync(resolved)) return ''
  visited.add(resolved)
  const source = fs.readFileSync(resolved, 'utf8')
  return source.replace(/@import\s+["']([^"']+)["'];?/g, function (_, rel) {
    return readWxssWithImports(path.resolve(path.dirname(resolved), rel), visited)
  })
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.svg': 'image/svg+xml'
}

;(async () => {
  fs.mkdirSync(OUT_HTML, { recursive: true })
  const appCss = readWxssWithImports(path.join(ROOT, 'app.wxss'))

  let fails = 0
  for (const view of VIEWS) {
    const r = await renderPage({ route: view.route, wxOverrides: view.wxOverrides, settleMs: 300 })
    if (r.errors && r.errors.length) {
      fails += 1
      console.error('FAIL', view.name, r.errors)
      continue
    }
    const pageCss = readWxssWithImports(path.join(ROOT, view.route + '.wxss'))
    fs.writeFileSync(path.join(OUT_HTML, view.name + '.html'), buildDoc(r.html, [appCss].concat(r.compCssList, [pageCss])))
    console.log('OK', view.name)
  }

  // 总览页：手机壳 iframe 横排
  const cards = VIEWS.map((v) => `
    <figure>
      <div class="phone"><iframe src="${v.name}.html" loading="lazy"></iframe></div>
      <figcaption>${v.label}</figcaption>
    </figure>`).join('\n')
  const overview = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>留言板 + 次日回访 · 预览</title>
<style>
body{margin:0;background:#2b2620;color:#d8cdb8;font-family:"PingFang SC","Microsoft YaHei",sans-serif}
header{padding:22px 32px 4px}
h1{font-size:17px;margin:0 0 4px;font-weight:600}
header p{margin:0;font-size:12px;opacity:.6}
.row{display:flex;flex-wrap:wrap;gap:28px;padding:20px 32px 48px}
figure{margin:0;text-align:center}
.phone{width:340px;height:736px;border:1px solid #4a4234;border-radius:26px;overflow:hidden;background:#F4EFE3;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.phone iframe{width:375px;height:812px;border:0;transform:scale(.905);transform-origin:top left}
figcaption{padding:8px 2px 0;font-size:12px;letter-spacing:1px}
</style></head><body>
<header><h1>留言板 · 次日回访 —— 6 个视图</h1>
<p>worktree feat/board-revisit · 通关当日入口无卡 → 次日出现回访卡 → 直达留言簿（留一句话 / 前人留言墙 / 再读那封信）</p></header>
<div class="row">${cards}</div></body></html>`
  fs.writeFileSync(path.join(OUT_HTML, 'board-preview.html'), overview)

  if (fails) { console.error('有渲染失败视图，退出'); process.exit(1) }

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
    } catch (e) { res.writeHead(500); res.end() }
  })
  const PORT = 8642
  server.listen(PORT, '127.0.0.1', () => {
    console.log('PREVIEW READY: http://127.0.0.1:' + PORT + '/test/harness/out/board-preview.html')
  })
})().catch((e) => { console.error(e); process.exit(1) })
