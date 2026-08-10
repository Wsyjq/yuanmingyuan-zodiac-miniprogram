'use strict'

const fs = require('fs')
const path = require('path')
const Jimp = require('jimp')

const ROOT = path.resolve(__dirname, '..')
const ASSET_ROOT = path.join(ROOT, 'plate21', 'module', 'assets')
const IMG_ROOT = path.join(ASSET_ROOT, 'img')
const BACKUP_ROOT = path.join(__dirname, '_archived', 'assets-original')
const HOST_ROOT = path.join(ROOT, 'assets', 'host')

const CONVERT_TO_JPEG = [
  ['IMG-P-WANZI.png', 'IMG-P-WANZI.jpg', 500],
  ['IMG-S2C1.png', 'IMG-S2C1.jpg', 500],
  ['IMG-S2C2.png', 'IMG-S2C2.jpg', 500],
  ['IMG-S2C3.png', 'IMG-S2C3.jpg', 500],
  ['IMG-S2C4.png', 'IMG-S2C4.jpg', 500]
]

const RECOMPRESS_JPEG = [
  'IMG-M01.jpg',
  'IMG-R01.jpg',
  'IMG-S2B.jpg',
  'IMG-P02.jpg',
  'IMG-R02.jpg',
  'IMG-S2A.jpg',
  'img-c01.jpg',
  'IMG-S4B1.jpg',
  'IMG-S4B3.jpg',
  'IMG-S4B4.jpg'
]

const RESIZE_STICKERS = [
  'st-stamp-01.png',
  'st-stamp-02.png',
  'st-ticket-01.png',
  'st-ticket-02.png',
  'st-paperclip-01.png',
  'st-paperclip-02.png',
  'st-postmark-01.png',
  'st-postmark-02.png',
  'st-botanical-01.png',
  'st-botanical-02.png',
  'st-hang-tag-01.png',
  'st-hang-tag-02.png',
  'st-binder-clip-01.png'
]

const HOST_COPIES = [
  ['img/stickers/st-postmark-02.png', 'st-postmark-02.png'],
  ['img/stickers/st-paperclip-02.png', 'st-paperclip-02.png'],
  ['img/IMG-F06.jpg', 'IMG-F06.jpg'],
  ['img/icons/ic-notebook-pen-ink.png', 'ic-notebook-pen-ink.png']
]

function backupPath(file) {
  return path.join(BACKUP_ROOT, path.relative(ASSET_ROOT, file))
}

function original(file) {
  const backup = backupPath(file)
  if (!fs.existsSync(backup)) {
    fs.mkdirSync(path.dirname(backup), { recursive: true })
    fs.copyFileSync(file, backup)
  }
  return backup
}

async function writeJpeg(source, target, maxWidth) {
  const image = await Jimp.read(source)
  if (image.bitmap.width > maxWidth) image.resize(maxWidth, Jimp.AUTO)
  image.quality(50)
  await image.writeAsync(target)
}

async function run() {
  let before = 0
  let after = 0

  for (const [sourceName, targetName, maxWidth] of CONVERT_TO_JPEG) {
    const source = path.join(IMG_ROOT, sourceName)
    const target = path.join(IMG_ROOT, targetName)
    before += fs.statSync(source).size
    await writeJpeg(source, target, maxWidth)
    after += fs.statSync(target).size
  }

  for (const name of RECOMPRESS_JPEG) {
    const target = path.join(IMG_ROOT, name)
    before += fs.statSync(original(target)).size
    const image = await Jimp.read(original(target))
    if (image.bitmap.width > 500 || image.bitmap.height > 700) image.scaleToFit(500, 700)
    image.quality(50)
    await image.writeAsync(target)
    after += fs.statSync(target).size
  }

  for (const name of RESIZE_STICKERS) {
    const target = path.join(IMG_ROOT, 'stickers', name)
    before += fs.statSync(original(target)).size
    const image = await Jimp.read(original(target))
    image.scale(0.5)
    await image.writeAsync(target)
    after += fs.statSync(target).size
  }

  fs.mkdirSync(HOST_ROOT, { recursive: true })
  for (const [source, target] of HOST_COPIES) {
    fs.copyFileSync(path.join(ASSET_ROOT, source), path.join(HOST_ROOT, target))
  }

  console.log('assets optimized: ' + before + ' -> ' + after + ' bytes')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
