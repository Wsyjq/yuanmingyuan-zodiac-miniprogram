'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const Jimp = require('jimp')

const ROOT = path.resolve(__dirname, '..')
const MANIFEST = path.join(ROOT, 'docs', 'compliance', 'ai-runtime-manifest.json')

const SPECS = [
  ['plate21/module/assets/img/IMG-F06.jpg', 'assets/host/IMG-RUNTIME-HOST.jpg', 240, 58],
  ['plate21/module/assets/img/img-c01.jpg', 'plate21/module/assets/img/IMG-RUNTIME-COVER.jpg', 420, 62],
  ['plate21/module/assets/img/IMG-P01.jpg', 'plate21/module/assets/img/IMG-RUNTIME-PROLOGUE-STUDY.jpg', 480, 58],
  ['plate21/module/assets/img/IMG-P02.jpg', 'plate21/module/assets/img/IMG-RUNTIME-PROLOGUE-CARD.jpg', 360, 60],
  ['plate21/module/assets/img/IMG-M01.jpg', 'plate21/module/assets/img/IMG-RUNTIME-MAP.jpg', 480, 62],
  ['plate21/module/assets/img/IMG-S2A.jpg', 'plate21/module/assets/img/IMG-RUNTIME-MAZE.jpg', 480, 62],
  ['plate21/module/assets/img/IMG-S2B.jpg', 'plate21/module/assets/img/IMG-RUNTIME-LANTERN.jpg', 400, 60],
  ['plate21/module/assets/img/IMG-S2C1.jpg', 'plate21/module/assets/img/IMG-RUNTIME-DETAIL-DOME.jpg', 320, 60],
  ['plate21/module/assets/img/IMG-S2C2.jpg', 'plate21/module/assets/img/IMG-RUNTIME-DETAIL-BEAST.jpg', 320, 60],
  ['plate21/module/assets/img/IMG-S2C3.jpg', 'plate21/module/assets/img/IMG-RUNTIME-DETAIL-LOTUS.jpg', 320, 60],
  ['plate21/module/assets/img/IMG-S2C4.jpg', 'plate21/module/assets/img/IMG-RUNTIME-DETAIL-SWAN.jpg', 320, 60],
  ['plate21/module/assets/img/IMG-P-WANZI.jpg', 'plate21/module/assets/img/IMG-RUNTIME-PATTERN-WANZI.jpg', 320, 60],
  ['plate21/module/assets/img/IMG-S4B1.jpg', 'plate21/module/assets/img/IMG-RUNTIME-PATTERN-SHELL.jpg', 320, 60],
  ['plate21/module/assets/img/IMG-S4B2.jpg', 'plate21/module/assets/img/IMG-RUNTIME-PATTERN-SCROLL.jpg', 320, 60],
  ['plate21/module/assets/img/IMG-S4B3.jpg', 'plate21/module/assets/img/IMG-RUNTIME-PATTERN-BASKET.jpg', 320, 60],
  ['plate21/module/assets/img/IMG-S3A.jpg', 'plate21/module/assets/img/IMG-RUNTIME-COMIC.jpg', 480, 58],
  ['plate21/module/assets/img/IMG-S5A.jpg', 'plate21/module/assets/img/IMG-RUNTIME-HUGO.jpg', 480, 58],
  ['plate21/module/assets/img/IMG-F06.jpg', 'plate21/module/assets/img/IMG-RUNTIME-PLATE.jpg', 480, 60]
]

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

async function main() {
  const derivatives = []
  for (const [sourceRelative, targetRelative, maxWidth, quality] of SPECS) {
    const source = path.join(ROOT, sourceRelative)
    const target = path.join(ROOT, targetRelative)
    const image = await Jimp.read(source)
    if (image.bitmap.width > maxWidth) image.resize(maxWidth, Jimp.AUTO)
    image.quality(quality)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    await image.writeAsync(target)
    derivatives.push({
      source: sourceRelative,
      sourceSha256: sha256(source),
      target: targetRelative,
      sha256: sha256(target),
      bytes: fs.statSync(target).size,
      dimensions: image.bitmap.width + 'x' + image.bitmap.height,
      processing: 'Jimp proportional resize to max width ' + maxWidth + 'px; JPEG quality ' + quality
    })
  }

  fs.writeFileSync(MANIFEST, JSON.stringify({
    schemaVersion: 1,
    generatedBy: relative(__filename),
    derivatives: derivatives
  }, null, 2) + '\n')

  const bytes = derivatives.reduce((sum, item) => sum + item.bytes, 0)
  console.log('runtime images: ' + derivatives.length + ' files, ' + bytes + ' bytes')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
