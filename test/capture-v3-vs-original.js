'use strict'

/**
 * 截当前 v3 新增/改写页，并生成与 V2.3 原版并排对照。
 * 用法：node test/capture-v3-vs-original.js
 * 产物：test/shots-v3new/*.png + test/shots-v3new/index.html
 */
const fs = require('fs')
const path = require('path')
const http = require('http')
const { execSync } = require('child_process')
const { renderPage, ROOT } = require('./harness/runtime')
const wxss = require('./harness/wxss')

const OUT_HTML = path.join(__dirname, 'harness', 'out', 'v3new')
const OUT_SHOTS = path.join(__dirname, 'shots-v3new')

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
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
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

const PAGES = [
  {
    name: 'v3-prologue-handover',
    route: 'plate21/module/pages/prologue/prologue',
    drive: async (inst) => inst.setData({ showHandover: true, showCoach: false })
  },
  { name: 'v3-s2-quiz', route: 'plate21/module/pages/s2-quiz/s2-quiz' },
  { name: 'v3-s2-reveal', route: 'plate21/module/pages/s2-reveal/s2-reveal' },
  {
    name: 'v3-s2-reveal-card',
    route: 'plate21/module/pages/s2-reveal/s2-reveal',
    drive: async (inst) => inst.setData({
      solved: true,
      showHistory: true,
      showCardNumber: true,
      cardNumber: 0,
      attempts: 3
    })
  },
  { name: 'v3-s3-comic', route: 'plate21/module/pages/s3-comic/s3-comic' },
  {
    name: 'v3-xieqiqu',
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'xieqiqu' }
  },
  {
    name: 'v3-fangwaiguan',
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'fangwaiguan' }
  },
  {
    name: 'v3-xushuilou',
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'xushuilou' }
  },
  { name: 'v3-dashuifa-hunt', route: 'plate21/module/pages/dashuifa/dashuifa' },
  {
    name: 'v3-dashuifa-after',
    route: 'plate21/module/pages/dashuifa/dashuifa',
    drive: async (inst) => inst.setData({
      stage: 'after',
      placed: { deer: 'pool', dogs: 'ring', beasts: 'ends' }
    })
  },
  {
    name: 'v3-dashuifa-yuan',
    route: 'plate21/module/pages/dashuifa/dashuifa',
    drive: async (inst) => inst.setData({ stage: 'yuan' })
  },
  {
    name: 'v3-dashuifa-yuan-done',
    route: 'plate21/module/pages/dashuifa/dashuifa',
    drive: async (inst) => inst.setData({
      stage: 'yuan',
      yuanSolved: true,
      yuanSelected: 'B',
      yuanRevealed: true,
      followup: true,
      placed: { deer: 'pool', dogs: 'ring', beasts: 'ends' }
    })
  }
]

function galleryHtml(okNames) {
  const has = (n) => okNames.indexOf(n) >= 0
  const img = (src, alt) => src
    ? `<img class="phone" src="${src}" alt="${alt}">`
    : `<div class="empty">原版没有这一屏</div>`
  const pair = (title, badge, note, oldSrc, newName) => `
    <section class="pair">
      <header>
        <h2>${title}</h2>
        <span class="badge">${badge}</span>
      </header>
      <p class="note">${note}</p>
      <div class="cols">
        <figure>
          <figcaption>原版 V2.3</figcaption>
          ${img(oldSrc, title + ' 原版')}
        </figure>
        <figure>
          <figcaption>现在 v3</figcaption>
          ${has(newName) ? img(newName + '.png', title + ' v3') : '<div class="empty">截图失败</div>'}
        </figure>
      </div>
    </section>`

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>v3 相对原版 · 新增对照</title>
<style>
  :root {
    --paper: #f3ead8;
    --ink: #2b2926;
    --patina: #5c6b58;
    --cinnabar: #8c2f2a;
    --rule: #d4c7aa;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Source Han Serif SC", "Noto Serif SC", "Songti SC", serif;
    background: #e7dcc4;
    color: var(--ink);
    line-height: 1.55;
  }
  .wrap { max-width: 980px; margin: 0 auto; padding: 32px 20px 80px; }
  h1 { font-size: 28px; font-weight: 600; margin: 0 0 8px; }
  .lead { color: #5a5348; margin: 0 0 28px; }
  .flow {
    background: var(--paper);
    border: 1px solid var(--rule);
    padding: 16px 18px;
    margin-bottom: 28px;
  }
  .flow strong { color: var(--cinnabar); }
  .pair {
    background: var(--paper);
    border: 1px solid var(--rule);
    padding: 18px 18px 22px;
    margin-bottom: 22px;
  }
  .pair header { display: flex; align-items: baseline; gap: 12px; }
  .pair h2 { margin: 0; font-size: 20px; font-weight: 600; }
  .badge {
    font-size: 12px;
    letter-spacing: .08em;
    color: #fff;
    background: var(--cinnabar);
    padding: 2px 8px;
  }
  .badge.keep { background: var(--patina); }
  .note { margin: 8px 0 16px; color: #5a5348; font-size: 14px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  figure { margin: 0; }
  figcaption {
    font-size: 12px;
    letter-spacing: .16em;
    color: var(--patina);
    margin-bottom: 8px;
  }
  .phone {
    width: 100%;
    max-width: 375px;
    display: block;
    border: 1px solid #cbbfa6;
    background: #fff;
  }
  .empty {
    min-height: 220px;
    border: 1px dashed #b7aa90;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8a7f6c;
    background: repeating-linear-gradient(-45deg, #efe6d4, #efe6d4 8px, #eadfcb 8px, #eadfcb 16px);
  }
  .out {
    background: #efe6d4;
    border-left: 3px solid var(--patina);
    padding: 12px 16px;
    margin-bottom: 22px;
    font-size: 14px;
  }
  @media (max-width: 760px) {
    .cols { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>v3 相对原版 · 新增对照</h1>
  <p class="lead">左边是 1.0.0 / V2.3 审计截图，右边是当前工作树渲染。只列相对原版<strong>新出现或整页改写</strong>的地方，未改的封面、门票、手册不重复。</p>
  <div class="flow">
    <div>原版主线：入口 → 黄花阵四事 → 海晏堂漫画/兽首/蓄水 → 大水法两分钟静默 → 雨果。谐奇趣 / 方外观 / 蓄水楼是顺路散页，只翻不答题。</div>
    <div style="margin-top:8px">现在主线：入口 → <strong>谐奇趣声景</strong> → 黄花阵四事 → <strong>方外观三选</strong> → 海晏堂正午 → <strong>蓄水楼高低</strong> → <strong>大水法猎狗 + 北望远瀛观</strong> → 雨果。</div>
  </div>
  <div class="out">
    从主线拿掉、改成手册可进：养雀笼、观水法、线法画仍是散页；<strong>s3-zodiac 兽首、s3-water 喷泉原理</strong>不再走主线，日期卡分别改由方外观、蓄水楼写入。
  </div>
  ${pair(
    '序章 · 档案交接',
    '新增路线图',
    '清点页补上现场路线图，并手写标出新踏线：入口 · 谐奇趣 · 黄花阵 · 方外观 · 海晏堂 · 蓄水楼 · 大水法 · 雨果雕像。',
    '../shots-h5/audit-03b-prologue-handover.png',
    'v3-prologue-handover'
  )}
  ${pair(
    '谐奇趣',
    '散页改计分主线',
    '原来是「顺路」翻页听人声。现在一屏：铜版《谐奇趣南面》+ 听约三十秒声景 + 六选（小拉琴 / 西洋箫 / 琵琶 / 笙 / 班竹板 / 水声）。三次后揭晓仍发卡。',
    '../shots-h5/audit-06-wp-xieqiqu.png',
    'v3-xieqiqu'
  )}
  ${pair(
    '黄花阵 · 修建目的',
    '开放作答改四选',
    '原来是写下「他们在干什么」。现在对照迷宫图，四选修建目的，标准答案是中秋灯会。',
    '../shots-h5/audit-07-s2-quiz.png',
    'v3-s2-quiz'
  )}
  ${pair(
    '黄花阵 · 名字由来',
    '三次揭晓',
    '仍是文字作答，但加上字数和剩余次数。答错给递进提示，第三次直接揭晓史料卡。语音输入已去掉。',
    '../shots-h5/audit-08-s2-reveal.png',
    'v3-s2-reveal'
  )}
  ${pair(
    '方外观',
    '散页改计分主线',
    '原来是「顺路」叙事。现在对照《方外观正面》铜版，选出真正属于这座楼的三项（西式楼体 / 中式屋顶 / 阿拉伯文碑刻）。日期卡改由本页写入。',
    '../shots-h5/audit-13-wp-fangwaiguan.png',
    'v3-fangwaiguan'
  )}
  ${pair(
    '海晏堂 · 正午水力钟',
    '整页改写',
    '原来是蒋友仁台词 +「午时哪尊兽首将喷水」圆钮。现在用日记原句「十二兽各守一时，至午而全见」，四选正午会怎样，标准答案是十二生肖同时喷水。',
    '../shots-h5/audit-14-s3-comic.png',
    'v3-s3-comic'
  )}
  ${pair(
    '蓄水楼',
    '散页改计分主线',
    '原来是「顺路」拼卡引导。现在点明这是海晏堂北面那座（不是谐奇趣西北那座），高低二选。日期卡改由本页写入。',
    '../shots-h5/audit-18-wp-xushuilou.png',
    'v3-xushuilou'
  )}
  ${pair(
    '大水法 · 猎狗归位',
    '整页改写',
    '原来是两分钟现场静默，不给道具、不对读。现在对照《大水法南面》铜版，把鹿、猎狗、兽放回喷水池位置。',
    '../shots-h5/audit-19-dashuifa.png',
    'v3-dashuifa-hunt'
  )}
  ${pair(
    '大水法 · 北望远瀛观',
    '全新一屏',
    '原版没有这一问。猎狗归位后往北看，四选高台上的建筑（海晏堂 / 远瀛观 / 观水法 / 谐奇趣）。看完说明南北轴不是下一站，继续往东去雨果。',
    '',
    'v3-dashuifa-yuan'
  )}
  ${pair(
    '大水法 · 原版听完一问',
    '已删除',
    '原版静默结束后用吊牌问「刚才那两分钟听见的是什么」。v3 不再问现场声音，这一屏整页拿掉。',
    '../shots-h5/audit-19b-dashuifa-question.png',
    ''
  ).replace('<figcaption>现在 v3</figcaption>\n          <div class="empty">截图失败</div>', '<figcaption>现在 v3</figcaption>\n          <div class="empty">已删除，改为猎狗归位 + 北望</div>')}
  <section class="pair">
    <header><h2>黄花阵 · 第三次揭晓史料卡</h2><span class="badge">新增状态</span></header>
    <p class="note">三次没说中，弹出史料卡全文并发卡。原版是跳过或提交后直接走，没有这张卡层。</p>
    <div class="cols">
      <figure>
        <figcaption>原版 V2.3</figcaption>
        <div class="empty">无此弹层</div>
      </figure>
      <figure>
        <figcaption>现在 v3</figcaption>
        ${has('v3-s2-reveal-card') ? img('v3-s2-reveal-card.png', '黄花阵史料卡') : '<div class="empty">截图失败</div>'}
      </figure>
    </div>
  </section>
  <section class="pair">
    <header><h2>大水法 · 以水成戏之后</h2><span class="badge">新增状态</span></header>
    <p class="note">三件归位后的收束，引出「以水成戏」，再请游客往北看。原版没有这一拍。</p>
    <div class="cols">
      <figure>
        <figcaption>原版 V2.3</figcaption>
        <div class="empty">无此屏</div>
      </figure>
      <figure>
        <figcaption>现在 v3</figcaption>
        ${has('v3-dashuifa-after') ? img('v3-dashuifa-after.png', '大水法归位后') : '<div class="empty">截图失败</div>'}
      </figure>
    </div>
  </section>
  ${pair(
    '大水法 · 看完远瀛观往东',
    '新增收束',
    '选对或三次揭晓后，说明南北轴不是下一站，引出雨果《致巴特勒上尉的信》。原版静默后直接去雨果转场。',
    '',
    'v3-dashuifa-yuan-done'
  )}
</div>
</body>
</html>
`
}

;(async () => {
  fs.mkdirSync(OUT_HTML, { recursive: true })
  fs.mkdirSync(OUT_SHOTS, { recursive: true })

  const appCss = readWxssWithImports(path.join(ROOT, 'app.wxss'))
  const renderResults = []
  for (const spec of PAGES) {
    try {
      const r = await renderPage(spec)
      const pageCss = readWxssWithImports(path.join(ROOT, spec.route + '.wxss'))
      const doc = buildDoc(r.html, [appCss].concat(r.compCssList, [pageCss]))
      fs.writeFileSync(path.join(OUT_HTML, spec.name + '.html'), doc)
      renderResults.push({ spec, errors: r.errors || [], renderOk: true })
      if (r.errors && r.errors.length) {
        console.log('[render warn]', spec.name, r.errors.join(' | ').slice(0, 240))
      }
    } catch (e) {
      renderResults.push({ spec, errors: [String(e && e.stack || e)], renderOk: false })
      console.log('[render fail]', spec.name, e && e.message)
    }
  }

  const { server, port } = await startServer()
  const playwright = loadPlaywright()
  const browser = await playwright.chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2
  })

  const okNames = []
  for (const r of renderResults) {
    const { spec } = r
    if (!r.renderOk) { console.log(spec.name.padEnd(24) + 'FAIL(render)'); continue }
    const page = await context.newPage()
    try {
      await page.goto(`http://127.0.0.1:${port}/test/harness/out/v3new/${spec.name}.html`, {
        waitUntil: 'load',
        timeout: 20000
      })
      try {
        await page.evaluate(async () => {
          if (document.fonts && document.fonts.ready) await document.fonts.ready
        })
      } catch (e) { /* 字体等待失败不阻塞 */ }
      await page.waitForTimeout(800)
      await page.evaluate(() => {
        document.querySelectorAll('.coach-host, .coach-spot').forEach((el) => {
          el.style.display = 'none'
        })
        document.querySelectorAll('.pack').forEach((el) => {
          el.style.animation = 'none'
          el.style.transform = 'none'
          el.style.position = 'relative'
          el.style.maxHeight = 'none'
          el.style.zIndex = '1'
        })
        const nodes = document.querySelectorAll('.__scroll, .page-doc, .page, .page-shell, html, body')
        nodes.forEach((el) => {
          el.style.height = 'auto'
          el.style.maxHeight = 'none'
          el.style.minHeight = '0'
          el.style.overflow = 'visible'
        })
      })
      await page.waitForTimeout(400)
      const h = await page.evaluate(() => Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        812
      ))
      await page.setViewportSize({ width: 375, height: Math.min(Math.max(h, 812), 2800) })
      await page.screenshot({ path: path.join(OUT_SHOTS, spec.name + '.png'), fullPage: true })
      okNames.push(spec.name)
      console.log(spec.name.padEnd(24) + 'OK  h=' + h)
    } catch (e) {
      console.log(spec.name.padEnd(24) + 'FAIL(shot) ' + String(e).slice(0, 160))
    }
    await page.close()
  }

  fs.writeFileSync(path.join(OUT_SHOTS, 'index.html'), galleryHtml(okNames), 'utf8')

  await browser.close()
  server.close()
  console.log('\nshots:', OUT_SHOTS)
  console.log('gallery:', path.join(OUT_SHOTS, 'index.html'))
  console.log('ok', okNames.length + '/' + PAGES.length)
  if (okNames.length !== PAGES.length) process.exitCode = 1
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
