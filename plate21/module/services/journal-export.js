'use strict'
function wrap(ctx, text, width) {
  const lines = []
  String(text || '')
    .split('\n')
    .forEach((p) => {
      let line = ''
      for (const c of p) {
        if (ctx.measureText(line + c).width > width && line) {
          lines.push(line)
          line = c
        } else line += c
      }
      lines.push(line)
    })
  return lines
}
async function exportEntry(page, entry) {
  const ctx = wx.createCanvasContext('journalCanvas', page),
    W = 750,
    H = 1200,
    images = []
  ctx.setFontSize(30)
  const lines = wrap(ctx, entry.text || '（未填写文字）', 610),
    chunk = 17
  const pages = Math.max(1, Math.ceil(lines.length / chunk))
  for (let i = 0; i < pages; i++) {
    ctx.setFillStyle('#f3ecd9')
    ctx.fillRect(0, 0, W, H)
    ctx.setStrokeStyle('#aa9170')
    ctx.setLineWidth(2)
    ctx.strokeRect(32, 32, 686, 1136)
    ctx.setFillStyle('#806842')
    ctx.setFontSize(20)
    ctx.fillText('PLATE XXI  /  私人纪念', 70, 90)
    ctx.setFillStyle('#3a3126')
    ctx.setFontSize(48)
    ctx.fillText('我记录的圆明园', 70, 166)
    // Page has room for either 17 text lines or a photo plus 7 lines; place photos on separate pages below.
    ctx.setFontSize(30)
    lines
      .slice(i * chunk, (i + 1) * chunk)
      .forEach((line, j) => ctx.fillText(line, 70, 252 + j * 44))
    ctx.setFontSize(23)
    ctx.fillText('落款 · ' + (entry.name || '未署名'), 70, 1060)
    ctx.fillText(
      new Date(entry.createdAt || Date.now()).toLocaleDateString() +
        '  ·  ' +
        (i + 1) +
        ' / ' +
        pages,
      70,
      1110
    )
    await new Promise((resolve) => ctx.draw(false, resolve))
    images.push(
      await new Promise((resolve, reject) =>
        wx.canvasToTempFilePath(
          {
            canvasId: 'journalCanvas',
            width: W,
            height: H,
            destWidth: W,
            destHeight: H,
            fileType: 'png',
            success: (r) => resolve(r.tempFilePath),
            fail: reject
          },
          page
        )
      )
    )
  }
  // Images remain separate full-page keepsakes; text is never reduced to illegible fine print.
  for (let i = 0; i < entry.photos.length; i++) {
    const info = await new Promise((resolve, reject) =>
      wx.getImageInfo({ src: entry.photos[i], success: resolve, fail: reject })
    )
    ctx.setFillStyle('#f3ecd9')
    ctx.fillRect(0, 0, W, H)
    ctx.setFontSize(40)
    ctx.setFillStyle('#3a3126')
    ctx.fillText('我记录的圆明园', 60, 110)
    const scale = Math.min(630 / info.width, 860 / info.height),
      w = info.width * scale,
      h = info.height * scale
    ctx.drawImage(info.path, (W - w) / 2, 180 + (860 - h) / 2, w, h)
    ctx.setFontSize(24)
    ctx.fillText('摄影记录 · ' + (entry.name || '未署名') + '  /  ' + (i + 1), 60, 1110)
    await new Promise((resolve) => ctx.draw(false, resolve))
    images.push(
      await new Promise((resolve, reject) =>
        wx.canvasToTempFilePath(
          {
            canvasId: 'journalCanvas',
            width: W,
            height: H,
            destWidth: W,
            destHeight: H,
            fileType: 'png',
            success: (r) => resolve(r.tempFilePath),
            fail: reject
          },
          page
        )
      )
    )
  }
  return images
}
module.exports = { wrap, exportEntry }
