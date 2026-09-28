'use strict'
// Read-only. Prints one Figma frame's layer order from the local nodes cache.
// Usage: node tools/dump-frame.js 18:124
const fs = require('fs')
const path = require('path')
const os = require('os')
const fileId = '4x0FQff5l1vAbWt5kRpBym'
const cache = path.join(os.tmpdir(), 'opencode', 'figma-cache', fileId, '1_40208', 'nodes.json')
const frameId = process.argv[2]
const outPath = process.argv[3]
const lines = []
const emit = text => { if (outPath) lines.push(text); else console.log(text) }
if (!frameId) {
  console.error('usage: node tools/dump-frame.js <frameId> [outFile]')
  process.exit(1)
}
const data = JSON.parse(fs.readFileSync(cache, 'utf8'))
function find(node, id) {
  if (node.id === id) return node
  for (const child of node.children || []) {
    const hit = find(child, id)
    if (hit) return hit
  }
}
function channel(v) { return Math.round((v || 0) * 255) }
function hex(paint) {
  if (!paint || paint.visible === false) return ''
  if (paint.type === 'SOLID' && paint.color) {
    const c = paint.color
    const n = v => channel(v).toString(16).padStart(2, '0')
    const a = paint.opacity == null ? (c.a == null ? 1 : c.a) : paint.opacity
    return '#' + n(c.r) + n(c.g) + n(c.b) + (a < 0.999 ? Math.round(a * 255).toString(16).padStart(2, '0') : '')
  }
  if (paint.type && paint.type.indexOf('GRADIENT') === 0 && paint.gradientStops) {
    return paint.type + '(' + paint.gradientStops.map(s => hex({ type: 'SOLID', color: s.color, opacity: s.color && s.color.a })).join('>') + ')'
  }
  if (paint.type === 'IMAGE') return 'IMAGE'
  return paint.type || ''
}
function paints(list) {
  return (list || []).filter(p => p.visible !== false).map(hex).filter(Boolean).join('+')
}
const root = find(data.nodes['1:40208'].document, frameId)
if (!root) {
  console.error('frame not found: ' + frameId)
  process.exit(1)
}
const origin = root.absoluteBoundingBox
function box(node) {
  const b = node.absoluteBoundingBox
  if (!b) return ''
  const x = Math.round(b.x - origin.x)
  const y = Math.round(b.y - origin.y)
  return x + ',' + y + ' ' + Math.round(b.width) + 'x' + Math.round(b.height)
}
function rpx(px) { return Math.round(px * 750 / 393) }
function walk(node, depth) {
  const style = node.style || {}
  const fill = paints(node.fills)
  const stroke = paints(node.strokes)
  const bits = [box(node)]
  if (fill) bits.push('fill=' + fill)
  if (stroke) bits.push('stroke=' + stroke + '/' + node.strokeWeight + (node.strokeAlign ? ' ' + node.strokeAlign : ''))
  if (node.cornerRadius) bits.push('r=' + node.cornerRadius)
  if (node.type === 'TEXT') {
    bits.push([style.fontWeight, style.fontSize, style.lineHeightPx, style.letterSpacing].join('/'))
    bits.push(JSON.stringify(String(node.characters || '').replace(/\s+/g, ' ').slice(0, 36)))
  }
  const vectorOnly = node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'REGULAR_POLYGON'
  if (!vectorOnly || stroke || fill) emit('  '.repeat(depth) + node.type + ' ' + node.id + ' ' + JSON.stringify(node.name) + ' ' + bits.join(' '))
  if (vectorOnly && node.type === 'VECTOR' && !stroke && !fill) return
  for (const child of node.children || []) walk(child, depth + 1)
}
emit(root.id + ' ' + root.name + ' ' + Math.round(origin.width) + 'x' + Math.round(origin.height) + ' rpx=' + rpx(origin.width) + 'x' + rpx(origin.height))
walk(root, 0)
if (outPath) fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
