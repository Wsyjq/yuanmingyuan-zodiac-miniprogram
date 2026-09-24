'use strict'

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const map = require(path.join(root, 'plate21/module/utils/voice-pkg-map'))
const keep = new Set()
Object.keys(map).forEach(function (id) {
  keep.add(map[id].replace(/^\//, '').split('/').join(path.sep))
})
keep.add(path.join('voice-a', 'dj06-xieqiqu-soundscape-30s-v2.mp3'))

let removed = 0
let kept = 0
fs.readdirSync(root).forEach(function (dir) {
  if (!/^voice-/.test(dir)) return
  const abs = path.join(root, dir)
  if (!fs.statSync(abs).isDirectory()) return
  fs.readdirSync(abs).forEach(function (name) {
    if (!name.endsWith('.mp3')) return
    const rel = path.join(dir, name)
    if (keep.has(rel)) {
      kept += 1
      return
    }
    fs.unlinkSync(path.join(abs, name))
    console.log('DEL', rel)
    removed += 1
  })
})
console.log('removed', removed, 'kept', kept)
fs.readdirSync(root).filter(function (d) { return /^voice-/.test(d) }).forEach(function (d) {
  const sum = fs.readdirSync(path.join(root, d)).reduce(function (s, n) {
    const p = path.join(root, d, n)
    return s + (fs.statSync(p).isFile() ? fs.statSync(p).size : 0)
  }, 0)
  console.log(d, (sum / 1024).toFixed(0) + 'KB')
})
