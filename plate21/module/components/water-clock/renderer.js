'use strict'

const model = require('../../play/water-clock')
const W = 1440, H = 965
const MOUTHS = [[938,561],[497,564],[983,560],[453,562],[1043,564],[399,563],[1105,561],[334,563],[1178,563],[259,561],[1265,563],[171,560]]
const fract = function (x) { return x - Math.floor(x) }
const ease = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x) }

function image(ctx, asset, alpha, shot) {
  if (!asset || alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  if (shot === 'close') ctx.drawImage(asset, 0, 0, W, H)
  else {
    const h = W * asset.height / asset.width
    const y = shot === 'paint' ? (H - h) / 2 : -(h - H) * 0.42
    ctx.drawImage(asset, 0, y, W, h)
  }
  ctx.restore()
}

function curve(a, b, c, u) {
  const v = 1 - u
  return { x: v * v * a.x + 2 * v * u * b.x + u * u * c.x, y: v * v * a.y + 2 * v * u * b.y + u * u * c.y }
}

function stream(ctx, i, time, start) {
  const mouth = MOUTHS[i], row = Math.floor(i / 2), left = mouth[0] < 718
  const a = { x: mouth[0], y: mouth[1] }
  const c = { x: 718 + (left ? -1 : 1) * (14 + row * 5), y: 668 + row % 3 * 2 }
  const b = { x: (a.x + c.x) / 2, y: 385 + row * 10 }
  const amount = ease((time - start) / 0.72)
  ctx.lineWidth = 2.2
  ctx.strokeStyle = 'rgba(244,252,245,.5)'
  ctx.beginPath()
  for (let n = 0; n <= 18; n++) {
    const p = curve(a, b, c, n / 18 * amount)
    if (n) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y)
  }
  ctx.stroke()
  // 36 droplets per mouth, not the prototype's 620. At noon < 650 particles/frame.
  for (let n = 0; n < 36; n++) {
    const u = fract(time * 0.83 + n * 0.618 + i * 0.13)
    if (u > amount) continue
    const p = curve(a, b, c, u)
    const spread = Math.sin(n * 77 + i) * u * 10
    ctx.fillStyle = n % 3 ? 'rgba(249,252,248,.8)' : 'rgba(169,214,214,.65)'
    ctx.fillRect(p.x + spread, p.y + Math.cos(n * 13) * u * 6, 1.3 + u * 1.7, 2.5)
  }
  ctx.strokeStyle = 'rgba(240,249,243,.6)'
  ctx.beginPath()
  ctx.ellipse(c.x, c.y + 2, 8 + fract(time * 0.8 + i) * 16, 3, 0, 0, Math.PI * 2)
  ctx.stroke()
}

function fountain(ctx, t) {
  ctx.fillStyle = 'rgba(249,252,247,.7)'
  for (let k = 0; k < 80; k++) {
    const u = fract(t * 0.7 + k * 0.618), v = 2 * u
    ctx.fillRect(718 + Math.sin(k * 9) * (2 + u * 26), 563 - 150 * v + 92 * v * v, 1.5, 3)
  }
  ctx.strokeStyle = 'rgba(241,249,243,.5)'
  ctx.lineWidth = 1.5
  for (let k = 0; k < 88; k++) {
    const upper = k < 36, u = fract(t * 1.1 + k * 0.618), side = Math.cos(k * 2.4)
    const x = 718 + side * ((upper ? 54 : 91) + u * u * 13)
    const y = (upper ? 603 : 670) + (upper ? 67 : 139) * u * u
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side, y + 3 + u * 5); ctx.stroke()
  }
  for (let k = 0; k < 3; k++) {
    const u = fract(t * 0.32 + k / 3)
    ctx.strokeStyle = 'rgba(236,246,238,' + ((1 - u) * 0.4) + ')'
    ctx.beginPath(); ctx.ellipse(716, 819, 92 + u * 92, 14 + u * 19, 0, 0, Math.PI * 2); ctx.stroke()
  }
}

function draw(ctx, assets, time) {
  const s = model.scene(time)
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#d5bc91'; ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.beginPath(); ctx.rect(12, 12, W - 24, H - 24); ctx.clip()
  if (time >= 8) {
    // Move the eye toward the mouths and pool without cropping any of the twelve.
    ctx.translate(W / 2, H * 0.49); ctx.scale(1.13, 1.13); ctx.translate(-W / 2, -H * 0.58)
  }
  image(ctx, assets.close, 1, 'close')
  if (time < 8) {
    image(ctx, assets.wide, 1 - ease((time - 6) / 2), 'wide')
    image(ctx, assets.paint, 1 - ease((time - 3.2) / 2), 'paint')
  }
  ctx.fillStyle = 'rgba(183,133,65,.17)'; ctx.fillRect(0, 0, W, H)
  s.lit.forEach(function (i) {
    const p = MOUTHS[i]
    ctx.fillStyle = 'rgba(238,203,131,.24)'
    ctx.beginPath(); ctx.arc(p[0], p[1], 24, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#f5d299'; ctx.lineWidth = 2.2; ctx.stroke()
  })
  s.active.forEach(function (i) { stream(ctx, i, time, s.start) })
  if (s.central) fountain(ctx, time)
  ctx.restore()
  ctx.strokeStyle = '#765b3d'; ctx.lineWidth = 2; ctx.strokeRect(7, 7, W - 14, H - 14)
  ctx.lineWidth = 1; ctx.strokeRect(14, 14, W - 28, H - 28)
}

module.exports = { WIDTH: W, HEIGHT: H, draw: draw }
