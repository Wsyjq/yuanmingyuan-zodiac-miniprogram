// 贴纸素材生产脚本：SVG->透明PNG(resvg)，JPG扫描件->缩放PNG(jimp)，纸纹理->JPG
// 运行：node test/stickers-src/build.js
const fs = require('fs')
const path = require('path')
const { Resvg } = require('../node_modules/@resvg/resvg-js')
const Jimp = require('../node_modules/jimp')

const SRC = __dirname
const OUT = path.join(__dirname, '../../plate21/module/assets/img/stickers')
fs.mkdirSync(OUT, { recursive: true })

// [源svg, 输出名, 目标宽度]
const SVG_JOBS = [
  ['postmark-classic.svg',  'st-postmark-01.png',   560],
  ['pm-vintage-airmail.svg','st-postmark-02.png',   480],
  ['train-ticket-uk.svg',   'st-ticket-01.png',     560],
  ['ticket-stamp.svg',      'st-ticket-02.png',     520],
  ['clothing-tag.svg',      'st-hang-tag-01.png',   400],
  ['roped-label.svg',       'st-hang-tag-02.png',   360],
  ['fern-leaf.svg',         'st-botanical-01.png',  420],
  ['wheat.svg',             'st-botanical-02.png',  420],
  ['pc174141.svg',          'st-paperclip-01.png',  280],
  ['paperclip-a.svg',       'st-paperclip-02.png',  440],
  ['binderclip.svg',        'st-binder-clip-01.png',420],
]

// [源jpg, 输出名, 目标宽度]（邮票扫描件）
const STAMP_JOBS = [
  ['stamp-pennyred-pl148.jpg', 'st-stamp-01.png', 380],
  ['stamp-jackson.jpg',        'st-stamp-02.png', 380],
]

async function main() {
  for (const [src, name, w] of SVG_JOBS) {
    const svg = fs.readFileSync(path.join(SRC, src), 'utf8')
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: w }, background: 'rgba(0,0,0,0)' })
    const png = resvg.render().asPng()
    fs.writeFileSync(path.join(OUT, name), png)
    console.log('SVG->PNG', name, (png.length / 1024).toFixed(1) + 'KB', png.length > 150 * 1024 ? '!! OVER 150KB' : '')
  }
  for (const [src, name, w] of STAMP_JOBS) {
    const img = await Jimp.read(path.join(SRC, src))
    img.resize(w, Jimp.AUTO)
    let buf = await img.getBufferAsync(Jimp.MIME_PNG)
    // 超 150KB 则逐步降尺寸
    while (buf.length > 150 * 1024 && w > 240) {
      img.resize(Math.round(img.getWidth() * 0.85), Jimp.AUTO)
      buf = await img.getBufferAsync(Jimp.MIME_PNG)
    }
    fs.writeFileSync(path.join(OUT, name), buf)
    console.log('JPG->PNG', name, img.getWidth() + 'x' + img.getHeight(), (buf.length / 1024).toFixed(1) + 'KB', buf.length > 150 * 1024 ? '!! OVER 150KB' : '')
  }
  // 纸纹理：宽 1125，jpg q85
  const paper = await Jimp.read(path.join(SRC, 'paper-old.jpg'))
  paper.resize(1125, Jimp.AUTO).quality(85)
  const pbuf = await paper.getBufferAsync(Jimp.MIME_JPEG)
  fs.writeFileSync(path.join(OUT, 'st-paper-texture-01.jpg'), pbuf)
  console.log('JPG->JPG st-paper-texture-01.jpg', paper.getWidth() + 'x' + paper.getHeight(), (pbuf.length / 1024).toFixed(1) + 'KB')
}
main().catch(e => { console.error(e); process.exit(1) })
