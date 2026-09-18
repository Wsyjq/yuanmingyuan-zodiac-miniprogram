// 估算各包有效体积（应用 packOptions.ignore 后）。用法：node tools/pkg-size.js
const fs = require('fs')
const path = require('path')
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'project.config.json'), 'utf8'))
const ign = ((cfg.packOptions && cfg.packOptions.ignore) || []).map((r) => ({ v: r.value.replace(/\\/g, '/'), t: r.type }))

function ignored(rel) {
  rel = rel.replace(/\\/g, '/')
  for (const r of ign) {
    if (r.t === 'folder' && (rel === r.v || rel.startsWith(r.v + '/'))) return true
    if (r.t === 'file' && rel === r.v) return true
  }
  return false
}

function size(dir) {
  let s = 0
  if (!fs.existsSync(dir)) return 0
  ;(function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f)
      const rel = path.relative(path.join(__dirname, '..'), p)
      if (ignored(rel)) continue
      if (fs.statSync(p).isDirectory()) walk(p)
      else s += fs.statSync(p).size
    }
  })(dir)
  return s
}

const mb = (n) => (n / 1048576).toFixed(2) + 'MB'
const root = path.join(__dirname, '..')
const mainFiles = ['app.js', 'app.json', 'app.wxss', 'sitemap.json'].reduce((s, f) => s + (fs.existsSync(path.join(root, f)) ? fs.statSync(path.join(root, f)).size : 0), 0)
console.log('main(pages+components+fonts+app*):', mb(size('pages') + size('components') + size('fonts') + mainFiles))
console.log('plate21/module:', mb(size(path.join(root, 'plate21/module'))))
for (const d of ['voice-a', 'voice-b', 'voice-c', 'voice-d', 'voice-e']) {
  console.log(d + ':', mb(size(path.join(root, d))))
}
