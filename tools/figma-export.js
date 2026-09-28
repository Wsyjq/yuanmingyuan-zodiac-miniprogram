'use strict'
// 从 Figma REST API 拉取节点树、切图与设计 token，供“Figma UI -> 微信小程序 WXML/WXSS”还原评估使用。
// 零运行时依赖（Node 18+ 内置 fetch）。凭据读环境变量 FIGMA_TOKEN，或根目录 .env 的 FIGMA_TOKEN。
// 产物只落在 .figma-cache/（已 gitignore），不进 plate21/module 发布包，也不改任何页面源码。
//
//   node tools/figma-export.js --help
//   node tools/figma-export.js --file 4x0FQff5l1vAbWt5kRpBym --node 1:40208
//
// 说明：本工具只做“取数据 + 落盘”，不生成 WXML/WXSS。小程序侧有硬约束（WXSS 仅 class 选择器、
// url() 不能引本地图、字体需 base64 注入），自动导出的 HTML/Tailwind 不可直接使用，见 plate21/DEV_NOTES.md。
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const OUT_ROOT = path.join(ROOT, '.figma-cache')
const API = 'https://api.figma.com'
const DEFAULT_FILE = '4x0FQff5l1vAbWt5kRpBym'
const DEFAULT_NODE = '1:40208'

function parseArgs (argv) {
  const out = {
    file: DEFAULT_FILE, node: DEFAULT_NODE, out: '', scale: 2,
    render: true, images: true, depth: 2, help: false
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => {
      if (i + 1 >= argv.length) throw new Error('Missing value for ' + a)
      return argv[++i]
    }
    if (a === '--file') out.file = next()
    else if (a === '--node') out.node = next()
    else if (a === '--out') out.out = next()
    else if (a === '--scale') out.scale = Number(next())
    else if (a === '--depth') out.depth = Number(next())
    else if (a === '--no-render') out.render = false
    else if (a === '--no-images') out.images = false
    else if (a === '--help' || a === '-h') out.help = true
    else throw new Error('Unknown argument: ' + a)
  }
  // 链接里的 node-id=1-40208 对应 API 的 1:40208
  if (/^\d+-\d+$/.test(out.node)) out.node = out.node.replace('-', ':')
  if (!Number.isFinite(out.scale) || out.scale <= 0 || out.scale > 4) throw new Error('--scale must be within (0, 4]')
  return out
}

function loadToken () {
  const fromEnv = process.env.FIGMA_TOKEN || process.env.FIGMA_API_TOKEN
  if (fromEnv && fromEnv.trim()) return fromEnv.trim()
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return ''
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:FIGMA_TOKEN|FIGMA_API_TOKEN)\s*=\s*(.*)$/)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  }
  return ''
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function apiGet (pathname, token, asBuffer) {
  let lastErr = null
  for (let attempt = 1; attempt <= 4; attempt++) {
    let res
    try {
      res = await fetch(API + pathname, { headers: { 'X-Figma-Token': token } })
    } catch (e) {
      lastErr = e
      await sleep(800 * attempt)
      continue
    }
    if (res.status === 429) { await sleep(1500 * attempt); continue }
    if (!res.ok) {
      const body = await res.text()
      throw new Error('GET ' + pathname + ' -> ' + res.status + ' ' + body.slice(0, 300))
    }
    return asBuffer ? Buffer.from(await res.arrayBuffer()) : res.json()
  }
  throw new Error('GET ' + pathname + ' failed after retries: ' + (lastErr && lastErr.message))
}

async function download (url, dest) {
  let res
  try {
    res = await fetch(url)
  } catch (e) {
    return { dest, ok: false, error: e.message }
  }
  if (!res.ok) return { dest, ok: false, error: 'HTTP ' + res.status }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
  return { dest, ok: true, bytes: fs.statSync(dest).size }
}

function walk (node, visit) {
  visit(node)
  for (const child of node.children || []) walk(child, visit)
}

function channelHex (v) {
  return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
}

function colorHex (color, opacity) {
  if (!color) return ''
  const base = '#' + channelHex(color.r) + channelHex(color.g) + channelHex(color.b)
  const a = opacity == null ? (color.a == null ? 1 : color.a) : opacity
  return a >= 0.999 ? base : base + channelHex(a)
}

function bump (map, key, sample) {
  if (!key) return
  const hit = map.get(key) || { value: key, count: 0, samples: [] }
  hit.count++
  if (sample && hit.samples.length < 3 && !hit.samples.includes(sample)) hit.samples.push(sample)
  map.set(key, hit)
}

function sorted (map) {
  return [...map.values()].sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)))
}

// 把 Figma 节点树压成小程序侧能用的设计 token：颜色、字排、圆角、阴影、间距、尺寸。
function collectTokens (document) {
  const colors = new Map()
  const textStyles = new Map()
  const radii = new Map()
  const effects = new Map()
  const spacing = new Map()
  const sizes = new Map()
  const names = []

  walk(document, node => {
    const name = node.name || ''
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'GROUP') {
      if (names.length < 400) names.push({ id: node.id, type: node.type, name })
    }
    for (const fill of node.fills || []) {
      if (fill.visible === false) continue
      if (fill.type === 'SOLID') bump(colors, colorHex(fill.color, fill.opacity), name)
      else if (fill.type && fill.type.indexOf('GRADIENT_') === 0) {
        for (const stop of fill.gradientStops || []) bump(colors, colorHex(stop.color), name + ' (gradient)')
      }
    }
    for (const stroke of node.strokes || []) {
      if (stroke.visible === false) continue
      if (stroke.type === 'SOLID') bump(colors, colorHex(stroke.color, stroke.opacity), name + ' (stroke)')
    }
    const style = node.style
    if (style && style.fontFamily) {
      const lh = style.lineHeightPx == null ? 'auto' : Math.round(style.lineHeightPx * 100) / 100
      const ls = style.letterSpacing == null ? 0 : Math.round(style.letterSpacing * 100) / 100
      const key = [style.fontFamily, style.fontWeight, style.fontSize, lh, ls, style.textAlignHorizontal].join(' | ')
      bump(textStyles, key, name)
    }
    if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) bump(radii, String(node.cornerRadius), name)
    for (const r of node.rectangleCornerRadii || []) if (r > 0) bump(radii, String(r), name)
    for (const effect of node.effects || []) {
      if (effect.visible === false || (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW')) continue
      const key = [effect.type, colorHex(effect.color), (effect.offset && effect.offset.x) + 'x' + (effect.offset && effect.offset.y), 'blur ' + effect.radius, 'spread ' + (effect.spread || 0)].join(' | ')
      bump(effects, key, name)
    }
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      bump(spacing, 'gap ' + node.itemSpacing, name)
      for (const [side, value] of [['top', node.paddingTop], ['right', node.paddingRight], ['bottom', node.paddingBottom], ['left', node.paddingLeft]]) {
        if (value) bump(spacing, 'pad-' + side + ' ' + value, name)
      }
    }
    const box = node.absoluteBoundingBox
    if (box && (node.type === 'FRAME' || node.type === 'RECTANGLE' || node.type === 'COMPONENT')) {
      bump(sizes, Math.round(box.width) + 'x' + Math.round(box.height), name)
    }
  })

  return {
    colors: sorted(colors),
    textStyles: sorted(textStyles),
    cornerRadii: sorted(radii),
    shadows: sorted(effects),
    spacing: sorted(spacing),
    frameSizes: sorted(sizes).slice(0, 60),
    nodeNames: names
  }
}

function collectImageRefs (document) {
  const refs = new Map()
  walk(document, node => {
    for (const fill of node.fills || []) {
      if (fill.visible === false) continue
      if (fill.type === 'IMAGE' && fill.imageRef) {
        const hit = refs.get(fill.imageRef) || { imageRef: fill.imageRef, usedBy: [] }
        if (hit.usedBy.length < 5) hit.usedBy.push({ id: node.id, name: node.name })
        refs.set(fill.imageRef, hit)
      }
    }
  })
  return [...refs.values()]
}

function chunk (items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function relToRoot (p) {
  return path.relative(ROOT, p).replace(/\\/g, '/')
}

async function renderNodes (fileKey, nodeIds, scale, token, destDir) {
  const results = []
  for (const group of chunk(nodeIds, 20)) {
    const query = '/v1/images/' + fileKey + '?ids=' + encodeURIComponent(group.join(',')) +
      '&format=png&scale=' + scale + '&use_absolute_bounds=true'
    const body = await apiGet(query, token, false)
    for (const id of group) {
      const url = body.images && body.images[id]
      if (!url) { results.push({ id, ok: false, error: 'no render url' }); continue }
      const dest = path.join(destDir, id.replace(/[:/\\]/g, '_') + '@' + scale + 'x.png')
      const saved = await download(url, dest)
      results.push(Object.assign({ id, url }, saved))
      await sleep(120)
    }
  }
  return results
}

function writeMarkdown (dest, fileKey, node, tokens, tree, rendered, imageRefs, imageFiles) {
  const L = []
  L.push('# Figma 取数记录：' + fileKey + ' / ' + node)
  L.push('')
  L.push('> 由 `tools/figma-export.js` 生成。本文件只是取数快照，不是实现结论。')
  L.push('> 生成时间：' + new Date().toISOString())
  L.push('')
  L.push('## 目标节点')
  L.push('')
  L.push('- 名称：' + (tree.name || '(未命名)'))
  L.push('- 类型：' + (tree.type || '?'))
  const box = tree.absoluteBoundingBox
  if (box) L.push('- 画板尺寸：' + Math.round(box.width) + ' x ' + Math.round(box.height))
  L.push('- 子节点数：' + ((tree.children || []).length))
  L.push('')
  L.push('## 直接子节点')
  L.push('')
  L.push('| id | 类型 | 名称 | 尺寸 |')
  L.push('| --- | --- | --- | --- |')
  for (const child of tree.children || []) {
    const b = child.absoluteBoundingBox
    L.push('| ' + child.id + ' | ' + child.type + ' | ' + String(child.name || '').replace(/\|/g, '\\|') + ' | ' + (b ? Math.round(b.width) + 'x' + Math.round(b.height) : '-') + ' |')
  }
  L.push('')
  const section = (title, rows, key) => {
    L.push('## ' + title + '（' + rows.length + '）')
    L.push('')
    if (!rows.length) { L.push('（无）'); L.push(''); return }
    L.push('| ' + key + ' | 次数 | 出现处 |')
    L.push('| --- | --- | --- |')
    for (const row of rows.slice(0, 40)) {
      L.push('| ' + String(row.value).replace(/\|/g, '\\|') + ' | ' + row.count + ' | ' + row.samples.map(s => String(s).replace(/\|/g, '\\|')).join('、') + ' |')
    }
    L.push('')
  }
  section('颜色', tokens.colors, '色值')
  section('字排（family | weight | size | lineHeight | letterSpacing | align）', tokens.textStyles, '组合')
  section('圆角', tokens.cornerRadii, 'px')
  section('阴影', tokens.shadows, '参数')
  section('间距（auto-layout）', tokens.spacing, '值')
  section('画板尺寸', tokens.frameSizes, '宽x高')
  L.push('## 图片填充（' + imageRefs.length + '）')
  L.push('')
  for (const ref of imageRefs.slice(0, 60)) {
    L.push('- `' + ref.imageRef + '` ← ' + ref.usedBy.map(u => u.name + ' (' + u.id + ')').join('、'))
  }
  L.push('')
  L.push('## 已落盘文件')
  L.push('')
  for (const p of rendered.filter(r => r.ok)) L.push('- `nodes/' + path.basename(p.dest) + '`')
  for (const p of imageFiles.filter(r => r.ok)) L.push('- `image-fills/' + path.basename(p.dest) + '`')
  L.push('')
  fs.writeFileSync(dest, L.join('\n'))
}

async function main () {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    console.log([
      'Usage: node tools/figma-export.js [options]',
      '',
      '  --file <key>    Figma file key（默认 ' + DEFAULT_FILE + '）',
      '  --node <id>     节点 id，1:40208 或链接里的 1-40208（默认 ' + DEFAULT_NODE + '）',
      '  --out <dir>     输出目录（默认 .figma-cache/<file>/<node>）',
      '  --scale <n>     切图倍率（默认 2）',
      '  --depth <n>     AUDIT.md 里子节点表格深度（默认 2）',
      '  --no-render     不渲染切图',
      '  --no-images     不下载图片填充',
      '',
      '凭据：环境变量 FIGMA_TOKEN，或根目录 .env 写 FIGMA_TOKEN=...'
    ].join('\n'))
    return
  }

  const token = loadToken()
  if (!token) {
    console.error('未找到 Figma 凭据。请设置环境变量 FIGMA_TOKEN，或在根目录 .env 写入 FIGMA_TOKEN=<personal access token>。')
    console.error('生成位置：Figma 网页 -> 头像 -> Settings -> Security -> Personal access tokens（权限只给 File content: Read 即可）。')
    process.exitCode = 1
    return
  }

  const nodeKey = opts.node.replace(/[:/\\]/g, '_')
  const outDir = opts.out ? path.resolve(opts.out) : path.join(OUT_ROOT, opts.file, nodeKey)
  fs.mkdirSync(outDir, { recursive: true })
  console.log('输出目录：' + relToRoot(outDir))

  const nodesUrl = '/v1/files/' + opts.file + '/nodes?ids=' + encodeURIComponent(opts.node)
  const payload = await apiGet(nodesUrl, token, false)
  const entry = payload.nodes && payload.nodes[opts.node]
  if (!entry || !entry.document) {
    console.error('取不到节点 ' + opts.node + '。请确认 file key、节点 id，以及 token 对该文件有读权限。')
    process.exitCode = 1
    return
  }
  const tree = entry.document
  fs.writeFileSync(path.join(outDir, 'nodes.json'), JSON.stringify(payload, null, 2) + '\n')
  console.log('节点树：' + (tree.name || '(未命名)') + ' / ' + tree.type + '，子节点 ' + ((tree.children || []).length) + ' 个')

  const tokens = collectTokens(tree)
  const imageRefs = collectImageRefs(tree)
  fs.writeFileSync(path.join(outDir, 'tokens.json'), JSON.stringify({ file: opts.file, node: opts.node, tokens, imageRefs }, null, 2) + '\n')
  console.log('设计 token：颜色 ' + tokens.colors.length + '，字排 ' + tokens.textStyles.length + '，圆角 ' + tokens.cornerRadii.length + '，阴影 ' + tokens.shadows.length + '，间距 ' + tokens.spacing.length)

  let rendered = []
  if (opts.render) {
    const targets = [(tree.id)].concat((tree.children || []).map(child => child.id))
    console.log('渲染 ' + targets.length + ' 张 PNG @' + opts.scale + 'x ...')
    rendered = await renderNodes(opts.file, targets, opts.scale, token, path.join(outDir, 'nodes'))
    const ok = rendered.filter(r => r.ok).length
    console.log('切图完成 ' + ok + '/' + rendered.length)
  }

  let imageFiles = []
  if (opts.images && imageRefs.length) {
    let index
    try {
      index = await apiGet('/v1/files/' + opts.file + '/images', token, false)
    } catch (e) {
      console.error('拉取图片填充索引失败：' + e.message)
      index = null
    }
    const map = (index && index.meta && index.meta.images) || {}
    for (const ref of imageRefs) {
      const url = map[ref.imageRef]
      if (!url) { imageFiles.push({ dest: ref.imageRef, ok: false, error: 'no url' }); continue }
      const saved = await download(url, path.join(outDir, 'image-fills', ref.imageRef + '.png'))
      imageFiles.push(saved)
      await sleep(120)
    }
    fs.writeFileSync(path.join(outDir, 'image-fills.json'), JSON.stringify({ file: opts.file, refs: imageRefs, index: map }, null, 2) + '\n')
    console.log('图片填充：' + imageFiles.filter(r => r.ok).length + '/' + imageRefs.length)
  }

  writeMarkdown(path.join(outDir, 'AUDIT.md'), opts.file, opts.node, tokens, tree, rendered, imageRefs, imageFiles)
  console.log('已写入 ' + relToRoot(path.join(outDir, 'AUDIT.md')))
  console.log('下一步：读 AUDIT.md 与 nodes/*.png，对照 plate21/module/pages/{walk,report} 出差距清单。')
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : String(err))
  process.exitCode = 1
})
