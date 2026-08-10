// 批量把当前目录 SVG 渲染成预览 PNG（宽 400），文件名 pv-<原名>.png
const fs = require('fs')
const path = require('path')
const { Resvg } = require('../node_modules/@resvg/resvg-js')

const dir = __dirname
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.svg')) continue
  const svg = fs.readFileSync(path.join(dir, f), 'utf8')
  try {
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 400 }, background: 'rgba(255,255,255,1)' })
    const png = resvg.render().asPng()
    const out = path.join(dir, 'pv-' + f.replace(/\.svg$/, '.png'))
    fs.writeFileSync(out, png)
    console.log('OK', out, (png.length / 1024).toFixed(1) + 'KB')
  } catch (e) {
    console.log('FAIL', f, e.message)
  }
}
