'use strict'

/**
 * 1.0.0 全流程 + 逐页布局审计。
 * 用法：node test/audit-flow-layout.js
 * 产物：test/harness/out/audit/*.html、test/shots-h5/audit-*.png、stdout 报告。
 */
const fs = require('fs')
const path = require('path')
const http = require('http')
const { renderPage, ROOT } = require('./harness/runtime')
const wxss = require('./harness/wxss')

const OUT_HTML = path.join(__dirname, 'harness', 'out', 'audit')
const OUT_SHOTS = path.join(__dirname, 'shots-h5')
const REPORT = path.join(__dirname, 'audit-flow-layout.report.json')

function audioMock() {
  return {
    src: '',
    autoplay: false,
    loop: false,
    volume: 1,
    play() {},
    pause() {},
    stop() {},
    destroy() {},
    onPlay() {},
    onStop() {},
    onEnded() {},
    onError() {},
    onCanplay() {},
    onPause() {},
    onTimeUpdate() {}
  }
}

function sharedWx(store, nav) {
  return {
    getStorageSync(k) { return k in store ? store[k] : '' },
    setStorageSync(k, v) { store[k] = v },
    removeStorageSync(k) { delete store[k] },
    navigateTo(o) { nav.push({ type: 'navigateTo', url: o && o.url }); if (o && o.success) o.success({}) },
    redirectTo(o) { nav.push({ type: 'redirectTo', url: o && o.url }); if (o && o.success) o.success({}) },
    reLaunch(o) { nav.push({ type: 'reLaunch', url: o && o.url }); if (o && o.success) o.success({}) },
    navigateBack(o) { nav.push({ type: 'navigateBack' }); if (o && o.success) o.success({}) },
    createInnerAudioContext: audioMock
  }
}

function lastNav(nav) {
  return nav.length ? nav[nav.length - 1] : null
}

function expectUrl(nav, fragment, label, issues) {
  const hit = nav.find((item) => item.url && String(item.url).indexOf(fragment) >= 0)
  if (!hit) issues.push({ kind: 'flow', label: label, detail: '未跳到 ' + fragment + '；实际=' + JSON.stringify(nav) })
  return !!hit
}

async function drive(route, query, fn, store, extra) {
  const nav = []
  const result = await renderPage({
    route: route,
    query: query || {},
    settleMs: extra && extra.settleMs != null ? extra.settleMs : 250,
    wxOverrides: sharedWx(store, nav),
    drive: fn
  })
  result.nav = nav
  return result
}

async function runFlow() {
  const store = {}
  const issues = []
  const steps = []

  function log(name, result) {
    const nav = lastNav(result.nav)
    steps.push({
      name: name,
      errors: result.errors,
      nav: result.nav,
      state: result.data && {
        state: result.data.state,
        stage: result.data.stage,
        solved: result.data.solved,
        skipped: result.data.skipped
      }
    })
    if (result.errors && result.errors.length) {
      issues.push({ kind: 'js', label: name, detail: result.errors.join(' | ') })
    }
    return nav
  }

  let r = await drive('pages/index/index', {}, async (inst) => inst.goPlate21(), store)
  log('index→gate', r)
  expectUrl(r.nav, '/plate21/module/pages/gate/gate', '首页进入门页', issues)

  r = await drive('plate21/module/pages/gate/gate', {}, async (inst, sleep) => {
    inst.onUnlock()
    await sleep(800)
  }, store, { settleMs: 400 })
  log('gate.unlock', r)
  if (r.data.state !== 'paid') issues.push({ kind: 'flow', label: 'gate.unlock', detail: 'state=' + r.data.state })
  expectUrl(r.nav, '/plate21/module/pages/cover/cover', '解锁后进封面', issues)

  r = await drive('plate21/module/pages/cover/cover', {}, async (inst) => inst.onStart(), store)
  log('cover.start', r)
  expectUrl(r.nav, '/plate21/module/pages/prologue/prologue', '封面开始考察', issues)

  r = await drive('plate21/module/pages/prologue/prologue', {}, async (inst, sleep) => {
    inst.onNovelFinish()
    inst.onTakeArchive()
    inst.onGoS1()
    await sleep(500)
  }, store)
  log('prologue→s1', r)
  expectUrl(r.nav, '/plate21/module/pages/s1-decode/s1-decode', '序章进入口站', issues)

  r = await drive('plate21/module/pages/s1-decode/s1-decode', {}, async (inst, sleep) => {
    inst.onTear()
    inst.onReadDone()
    inst.onInput({ detail: { value: '黄花阵' } })
    inst.onSubmit()
    inst.onGoNext()
    await sleep(500)
  }, store)
  log('s1-decode', r)
  if (!r.data.solved) issues.push({ kind: 'flow', label: 's1-decode', detail: '黄花阵未判对' })
  expectUrl(r.nav, 'transit/transit?leg=s1-s2', '入口站进转场 s1-s2', issues)

  r = await drive('plate21/module/pages/transit/transit', { leg: 's1-s2' }, async (inst) => inst.onNext(), store)
  log('transit.s1-s2', r)
  expectUrl(r.nav, '/plate21/module/pages/s2-quiz/s2-quiz', '转场进黄花阵', issues)

  r = await drive('plate21/module/pages/waypoint/waypoint', { site: 'xieqiqu' }, async (inst) => inst.onNext(), store)
  log('waypoint.xieqiqu', r)
  expectUrl(r.nav, '/plate21/module/pages/s2-quiz/s2-quiz', '谐奇趣可跳回主线', issues)

  r = await drive('plate21/module/pages/s2-quiz/s2-quiz', {}, async (inst, sleep) => {
    inst.onSkip()
    inst.onNext()
    await sleep(500)
  }, store)
  log('s2-quiz.skip', r)
  expectUrl(r.nav, '/plate21/module/pages/s2-reveal/s2-reveal', '黄花阵测验可跳', issues)

  r = await drive('plate21/module/pages/s2-reveal/s2-reveal', {}, async (inst, sleep) => {
    inst.onSkip()
    inst.onNext()
    await sleep(500)
  }, store)
  log('s2-reveal.skip', r)
  expectUrl(r.nav, '/plate21/module/pages/s2-blend/s2-blend', '黄花阵揭示可跳', issues)

  r = await drive('plate21/module/pages/s2-blend/s2-blend', {}, async (inst, sleep) => {
    inst.onNext()
    await sleep(500)
  }, store)
  log('s2-blend.next', r)
  expectUrl(r.nav, '/plate21/module/pages/s2-pattern/s2-pattern', '对读拍照可继续', issues)

  r = await drive('plate21/module/pages/s2-pattern/s2-pattern', {}, async (inst, sleep) => {
    inst.onSkip()
    inst.onGoS3()
    await sleep(500)
  }, store)
  log('s2-pattern.skip', r)
  expectUrl(r.nav, 'transit/transit?leg=s2-s3', '纹样站进转场 s2-s3', issues)

  r = await drive('plate21/module/pages/transit/transit', { leg: 's2-s3' }, async (inst) => inst.onNext(), store)
  log('transit.s2-s3', r)
  expectUrl(r.nav, '/plate21/module/pages/s3-comic/s3-comic', '转场进海晏堂', issues)

  r = await drive('plate21/module/pages/s3-comic/s3-comic', {}, async (inst, sleep) => {
    inst.onSkip()
    inst.onNext()
    await sleep(500)
  }, store)
  log('s3-comic.skip', r)
  expectUrl(r.nav, '/plate21/module/pages/s3-zodiac/s3-zodiac', '时辰推理可跳', issues)

  r = await drive('plate21/module/pages/s3-zodiac/s3-zodiac', {}, async (inst, sleep) => {
    inst.onSkip()
    inst.onNext()
    await sleep(500)
  }, store)
  log('s3-zodiac.skip', r)
  expectUrl(r.nav, '/plate21/module/pages/s3-water/s3-water', '兽首回归可跳', issues)

  r = await drive('plate21/module/pages/s3-water/s3-water', {}, async (inst, sleep) => {
    inst.onSkip()
    inst.onNext()
    await sleep(500)
  }, store)
  log('s3-water.skip', r)
  expectUrl(r.nav, 'transit/transit?leg=s3-s4', '水显站进转场 s3-s4', issues)

  r = await drive('plate21/module/pages/transit/transit', { leg: 's3-s4' }, async (inst) => inst.onNext(), store)
  log('transit.s3-s4', r)
  expectUrl(r.nav, '/plate21/module/pages/dashuifa/dashuifa', '转场进大水法', issues)

  r = await drive('plate21/module/pages/dashuifa/dashuifa', {}, async (inst) => {
    inst.onStart()
    inst.onEndSilenceEarly()
    inst.onSkipQuestion()
    inst.onNext()
  }, store)
  log('dashuifa.skip', r)
  expectUrl(r.nav, 'transit/transit?leg=s4-s5', '大水法可跳进转场 s4-s5', issues)

  r = await drive('plate21/module/pages/transit/transit', { leg: 's4-s5' }, async (inst) => inst.onNext(), store)
  log('transit.s4-s5', r)
  expectUrl(r.nav, '/plate21/module/pages/s4-timeline/s4-timeline', '转场进雨果', issues)

  r = await drive('plate21/module/pages/s4-timeline/s4-timeline', {}, async (inst, sleep) => {
    inst.onSkipTimeline()
    inst.goReport()
    await sleep(500)
  }, store)
  log('s4-timeline.skip', r)
  expectUrl(r.nav, '/plate21/module/pages/s4-password/s4-password', '时间轴可跳进密码', issues)

  r = await drive('plate21/module/pages/s4-password/s4-password', {}, async (inst, sleep) => {
    inst.onSkipPassword()
    await sleep(500)
  }, store)
  log('s4-password.skip', r)
  expectUrl(r.nav, '/plate21/module/pages/finale/finale', '缺卡通道进终章', issues)

  r = await drive('plate21/module/pages/finale/finale', {}, async (inst, sleep) => {
    inst.goReport()
    await sleep(500)
  }, store, { settleMs: 400 })
  log('finale→report', r)
  expectUrl(r.nav, '/plate21/module/pages/report/report', '终章进报告', issues)

  r = await drive('plate21/module/pages/report/report', {}, async (inst) => inst.onOpenBoard && inst.onOpenBoard(), store, { settleMs: 400 })
  log('report→board', r)
  expectUrl(r.nav, '/plate21/module/pages/board/board', '报告进留言簿', issues)

  r = await drive('plate21/module/pages/handbook/handbook', {}, async (inst) => {}, store)
  log('handbook', r)

  const sideSites = ['yangquelong', 'fangwaiguan', 'xushuilou', 'guanshuifa', 'xianfahua']
  for (const site of sideSites) {
    r = await drive('plate21/module/pages/waypoint/waypoint', { site: site }, async (inst) => {}, store)
    log('waypoint.' + site, r)
    if (!r.html || r.html.length < 80) issues.push({ kind: 'layout', label: 'waypoint.' + site, detail: '渲染过空' })
  }

  r = await drive('plate21/module/pages/letter/letter', {}, async (inst) => {}, store)
  log('letter.same-day', r)

  r = await drive('plate21/module/pages/board/board', {}, async (inst) => {}, store)
  log('board', r)

  return { issues: issues, steps: steps, store: store }
}

const RESET_CSS = fs.readFileSync(path.join(__dirname, 'harness', 'render.js'), 'utf8')
  .split('const RESET_CSS = `')[1]
  .split('`')[0]

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
    .map((c) => '<style>\n' + c + '\n</style>')
    .join('\n')
  return '<!DOCTYPE html>\n<html><head><meta charset="utf-8">\n' + styles + '\n</head><body>\n' + bodyHtml + '\n</body></html>\n'
}

const LAYOUT_PAGES = [
  { name: '00-index', route: 'pages/index/index' },
  { name: '01-gate', route: 'plate21/module/pages/gate/gate' },
  { name: '02-cover', route: 'plate21/module/pages/cover/cover' },
  { name: '03-prologue', route: 'plate21/module/pages/prologue/prologue' },
  {
    name: '03b-prologue-handover',
    route: 'plate21/module/pages/prologue/prologue',
    drive: async (inst) => inst.onNovelFinish()
  },
  { name: '04-s1-decode', route: 'plate21/module/pages/s1-decode/s1-decode' },
  {
    name: '04b-s1-puzzle',
    route: 'plate21/module/pages/s1-decode/s1-decode',
    drive: async (inst) => { inst.onTear(); inst.onReadDone() }
  },
  { name: '05-transit-s1s2', route: 'plate21/module/pages/transit/transit', query: { leg: 's1-s2' } },
  { name: '06-wp-xieqiqu', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'xieqiqu' } },
  { name: '07-s2-quiz', route: 'plate21/module/pages/s2-quiz/s2-quiz' },
  {
    name: '07c-guide-open',
    route: 'plate21/module/pages/s2-quiz/s2-quiz',
    drive: async (inst) => {
      const ag = inst.selectComponent && inst.selectComponent('#audioGuide')
      if (ag && typeof ag.onFab === 'function') ag.onFab()
    }
  },
  { name: '08-s2-reveal', route: 'plate21/module/pages/s2-reveal/s2-reveal' },
  { name: '09-s2-blend', route: 'plate21/module/pages/s2-blend/s2-blend' },
  { name: '10-s2-pattern', route: 'plate21/module/pages/s2-pattern/s2-pattern' },
  { name: '11-transit-s2s3', route: 'plate21/module/pages/transit/transit', query: { leg: 's2-s3' } },
  { name: '12-wp-yangquelong', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'yangquelong' } },
  { name: '13-wp-fangwaiguan', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'fangwaiguan' } },
  { name: '14-s3-comic', route: 'plate21/module/pages/s3-comic/s3-comic' },
  { name: '15-s3-zodiac', route: 'plate21/module/pages/s3-zodiac/s3-zodiac' },
  { name: '16-s3-water', route: 'plate21/module/pages/s3-water/s3-water' },
  { name: '17-transit-s3s4', route: 'plate21/module/pages/transit/transit', query: { leg: 's3-s4' } },
  { name: '18-wp-xushuilou', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'xushuilou' } },
  { name: '19-dashuifa', route: 'plate21/module/pages/dashuifa/dashuifa' },
  {
    name: '19b-dashuifa-question',
    route: 'plate21/module/pages/dashuifa/dashuifa',
    drive: async (inst) => { inst.onStart(); inst.finishSilence() }
  },
  { name: '20-transit-s4s5', route: 'plate21/module/pages/transit/transit', query: { leg: 's4-s5' } },
  { name: '21-wp-guanshuifa', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'guanshuifa' } },
  { name: '22-wp-xianfahua', route: 'plate21/module/pages/waypoint/waypoint', query: { site: 'xianfahua' } },
  { name: '23-s4-timeline', route: 'plate21/module/pages/s4-timeline/s4-timeline' },
  { name: '24-s4-password', route: 'plate21/module/pages/s4-password/s4-password' },
  { name: '25-finale', route: 'plate21/module/pages/finale/finale', settleMs: 400 },
  { name: '26-report', route: 'plate21/module/pages/report/report' },
  { name: '27-handbook', route: 'plate21/module/pages/handbook/handbook' },
  { name: '28-letter', route: 'plate21/module/pages/letter/letter' },
  { name: '29-board', route: 'plate21/module/pages/board/board' }
]

const MUST_HAVE = {
  '01-gate': ['解锁完整考察', '¥'],
  '02-cover': ['开 始 考 察'],
  '05-transit-s1s2': ['继 续 前 往'],
  '06-wp-xieqiqu': ['wp-next', '谐奇趣'],
  '07-s2-quiz': ['先不猜'],
  '19-dashuifa': ['开始两分钟'],
  '26-report': ['第二十一图'],
  '27-handbook': ['音频']
}

async function renderLayouts() {
  const issues = []
  const pages = []
  fs.mkdirSync(OUT_HTML, { recursive: true })
  const appCss = readWxssWithImports(path.join(ROOT, 'app.wxss'))
  const store = {}
  for (const spec of LAYOUT_PAGES) {
    const nav = []
    const result = await renderPage({
      route: spec.route,
      query: spec.query || {},
      settleMs: spec.settleMs != null ? spec.settleMs : 200,
      wxOverrides: sharedWx(store, nav),
      drive: spec.drive
    })
    const pageCss = readWxssWithImports(path.join(ROOT, spec.route + '.wxss'))
    const doc = buildDoc(result.html || '', [appCss].concat(result.compCssList || [], [pageCss]))
    fs.writeFileSync(path.join(OUT_HTML, spec.name + '.html'), doc)
    const entry = {
      name: spec.name,
      route: spec.route,
      errors: result.errors || [],
      htmlBytes: Buffer.byteLength(doc),
      hasShell: /page-shell/.test(result.html || ''),
      unknown: /__unknown-ph/.test(result.html || ''),
      empty: !result.html || result.html.replace(/<[^>]+>/g, '').trim().length < 8
    }
    if (entry.errors.length) issues.push({ kind: 'js', label: spec.name, detail: entry.errors.join(' | ') })
    if (!entry.hasShell) issues.push({ kind: 'layout', label: spec.name, detail: '缺少 page-shell' })
    if (entry.unknown && !/switch/.test(result.html || '')) {
      issues.push({ kind: 'layout', label: spec.name, detail: '存在未识别组件占位 __unknown-ph' })
    } else if (entry.unknown) {
      entry.harnessGap = 'native <switch> not in H5 harness'
    }
    if (entry.empty) issues.push({ kind: 'layout', label: spec.name, detail: '正文几乎为空' })
    const needles = MUST_HAVE[spec.name]
    if (needles) {
      for (const n of needles) {
        if ((result.html || '').indexOf(n) < 0) {
          issues.push({ kind: 'layout', label: spec.name, detail: '缺少关键文案/控件: ' + n })
        }
      }
    }
    pages.push(entry)
  }
  return { issues: issues, pages: pages }
}

function loadPlaywright() {
  try { return require('./node_modules/playwright') } catch (e) {}
  try { return require('playwright') } catch (e) {}
  return null
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
        const ext = path.extname(file).toLowerCase()
        const mime = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.wxss': 'text/css', '.css': 'text/css' }
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' })
        res.end(buf)
      })
    } catch (e) {
      res.writeHead(500)
      res.end()
    }
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server: server, port: server.address().port }))
  })
}

async function shotLayouts(pages) {
  const playwright = loadPlaywright()
  if (!playwright) return { skipped: true, issues: [{ kind: 'tool', label: 'playwright', detail: '未安装，跳过截图与溢出检测' }] }
  fs.mkdirSync(OUT_SHOTS, { recursive: true })
  const issues = []
  const { server, port } = await startServer()
  const browser = await playwright.chromium.launch({ channel: 'msedge' }).catch(() =>
    playwright.chromium.launch({ channel: 'chrome' })
  )
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 })
  try {
    for (const pageInfo of pages) {
      const page = await context.newPage()
      const browserErrors = []
      page.on('pageerror', (e) => browserErrors.push(String(e).slice(0, 200)))
      try {
        await page.goto('http://127.0.0.1:' + port + '/test/harness/out/audit/' + pageInfo.name + '.html', { waitUntil: 'load', timeout: 20000 })
        await page.waitForTimeout(400)
        await page.screenshot({ path: path.join(OUT_SHOTS, 'audit-' + pageInfo.name + '.png'), fullPage: true })
        for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 812 }]) {
          await page.setViewportSize(viewport)
          const layout = await page.evaluate(() => {
            const viewportWidth = window.innerWidth
            const offenders = Array.from(document.body.querySelectorAll('*')).map((element) => {
              const rect = element.getBoundingClientRect()
              return {
                node: element.tagName.toLowerCase() + (element.className ? '.' + String(element.className).trim().replace(/\s+/g, '.').slice(0, 80) : ''),
                left: Math.round(rect.left),
                right: Math.round(rect.right)
              }
            }).filter((item) => item.left < -4 || item.right > viewportWidth + 4).slice(0, 4)
            return {
              documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
              viewportWidth: viewportWidth,
              offenders: offenders
            }
          })
          if (layout.documentWidth > layout.viewportWidth + 8) {
            issues.push({
              kind: 'overflow',
              label: pageInfo.name + '@' + viewport.width,
              detail: '横向溢出 ' + (layout.documentWidth - layout.viewportWidth) + 'px ' + JSON.stringify(layout.offenders)
            })
          }
        }
      } catch (e) {
        issues.push({ kind: 'shot', label: pageInfo.name, detail: String(e && e.message || e).slice(0, 240) })
      }
      if (browserErrors.length) {
        issues.push({ kind: 'browser', label: pageInfo.name, detail: browserErrors.join(' | ') })
      }
      await page.close()
    }
  } finally {
    await browser.close()
    server.close()
  }
  return { skipped: false, issues: issues }
}

;(async () => {
  console.log('== flow ==')
  const flow = await runFlow()
  console.log('steps', flow.steps.length, 'flow-issues', flow.issues.length)
  flow.issues.forEach((item) => console.log(' FLOW', item.label, item.detail))

  console.log('== render ==')
  const layouts = await renderLayouts()
  console.log('pages', layouts.pages.length, 'render-issues', layouts.issues.length)
  layouts.issues.forEach((item) => console.log(' RENDER', item.label, item.detail))

  console.log('== screenshots ==')
  const shots = await shotLayouts(layouts.pages)
  console.log(shots.skipped ? 'playwright skipped' : ('shot-issues ' + shots.issues.length))
  shots.issues.forEach((item) => console.log(' SHOT', item.label, item.detail))

  const all = flow.issues.concat(layouts.issues, shots.issues || [])
  const report = {
    generatedAt: new Date().toISOString(),
    flowSteps: flow.steps.length,
    pages: layouts.pages.length,
    issueCount: all.length,
    issues: all
  }
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2))
  console.log('== summary ==')
  console.log('issues', all.length)
  console.log('report', REPORT)
  process.exitCode = all.some((item) => item.kind === 'flow' || item.kind === 'js') ? 1 : 0
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
