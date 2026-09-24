'use strict'
// Normalized scene coordinates; independent of viewport size and page scroll.
const TARGETS = {
  deer: { slot: 'center', x: 0.51, y: 0.64, rx: 0.14, ry: 0.20 },
  dogs: { slot: 'ring', x: 0.50, y: 0.76, rx: 0.30, ry: 0.16 }
}
function normalize(value) {
  const placed = { beasts: 'ends' } // The two flanking sculptures are already part of the supplied scene.
  for (const id of ['deer', 'dogs']) if (value && value[id] === TARGETS[id].slot) placed[id] = TARGETS[id].slot
  return placed
}
function complete(placed) { return !!placed && placed.deer === 'center' && placed.dogs === 'ring' }
function hit(id, point, rect) {
  const t = TARGETS[id]
  if (!t || !point || !rect || !(rect.width > 0 && rect.height > 0)) return false
  const x = (point.clientX - rect.left) / rect.width, y = (point.clientY - rect.top) / rect.height
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 && Math.pow((x - t.x) / t.rx, 2) + Math.pow((y - t.y) / t.ry, 2) <= 1
}
function drop(value, id, point, rect) {
  const placed = normalize(value), accepted = hit(id, point, rect)
  if (accepted) placed[id] = TARGETS[id].slot
  return { placed, accepted, complete: complete(placed) }
}
module.exports = { TARGETS, normalize, hit, drop, complete }
