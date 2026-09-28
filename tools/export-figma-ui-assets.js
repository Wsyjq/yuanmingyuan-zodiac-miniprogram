'use strict'
// 压缩新版画板用到的图片填充。排除 5:6「低保真原型重新排版」。
// 小图标嵌在组合图层里，Images API 目前限流，本脚本不导出图标。
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const CACHE = path.join(os.tmpdir(), 'opencode', 'figma-cache', '4x0FQff5l1vAbWt5kRpBym', '1_40208')
const OUT = path.join(ROOT, 'assets', 'figma')

function main () {
  const nodesPath = path.join(CACHE, 'nodes.json')
  if (!fs.existsSync(nodesPath)) throw new Error('missing Figma cache; run tools/figma-export.js --node 1:40208 first')
  const nodes = JSON.parse(fs.readFileSync(nodesPath, 'utf8'))
  const lowfi = nodes.nodes['1:40208'].document.children.find(child => child.id === '5:6')
  if (!lowfi || lowfi.name !== '低保真原型重新排版') throw new Error('low-fi frame 5:6 not found')
  fs.mkdirSync(OUT, { recursive: true })
  const run = spawnSync('python', [path.join(__dirname, 'compress-figma-ui-assets.py'), CACHE, OUT], { stdio: 'inherit' })
  if (run.status !== 0) throw new Error('image compression failed')
  const manifest = {
    file: '4x0FQff5l1vAbWt5kRpBym',
    excludedFrame: { id: '5:6', name: lowfi.name },
    icons: '未导出。返回、菜单、拱门、听一听、引导不是独立组件，嵌在画板组合里；Figma Images API 返回 429。',
    images: [
      { file: 'paper.jpg', imageRef: '1103282a45df4e1064aa4c423a93180171e4f52f', node: '18:125 Rectangle 1' },
      { file: 'paper-entry.jpg', imageRef: 'ace2d7a51471079cbfc33eca7ba9f41613a3690c', node: '入场页古纸背景' },
      { file: 'hills.png', imageRef: '5d2c63d3dcbfed6d2c5bc2fa3986403c53b1cb9e', node: '22:2 底部山水装饰' },
      { file: 'wash.png', imageRef: 'e3a41d6d76b7ac0c7c188b099c7a127e3ab60720', node: '新版画板装饰插图' }
    ]
  }
  fs.writeFileSync(path.join(ROOT, 'docs', 'v3-figma-ui-assets.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log('wrote image fills only')
}

try { main() } catch (error) {
  console.error(error.message || String(error))
  process.exitCode = 1
}
