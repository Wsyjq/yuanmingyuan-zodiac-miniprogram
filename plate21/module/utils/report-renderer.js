'use strict'

const gate = require('../flow/term-gate')
const WIDTH = 700
const SITES = [
  { id: 'gate', label: '西洋楼入口' }, { id: 'xieqiqu', label: '谐奇趣' },
  { id: 'maze', label: '黄花阵' }, { id: 'fangwaiguan', label: '方外观' },
  { id: 'haiyantang', label: '海晏堂' }, { id: 'xushuilou', label: '蓄水楼' },
  { id: 'dashuifa', label: '大水法' }, { id: 'hugo', label: '雨果雕像' }
]
const STATUS_LABEL = { done: '已完成', skipped: '本次跳过', active: '进行中' }

function siteLabel(id) {
  const site = SITES.find(function (item) { return item.id === id })
  return site ? site.label : '现场记录'
}
function dateLabel(timestamp) {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return '尚未完成考察'
  const d = new Date(value + 480 * 60000)
  return d.getUTCFullYear() + ' 年 ' + (d.getUTCMonth() + 1) + ' 月 ' + d.getUTCDate() + ' 日'
}
function isReferencePath(path) {
  return /^(?:\/?assets\/|\/?plate21\/|data:)/i.test(String(path || ''))
}
function buildModel(snapshot) {
  return gate.maskDeep(buildModelRaw(snapshot), snapshot && snapshot.run)
}
function buildModelRaw(snapshot) {
  const source = snapshot || {}, run = source.run || {}
  const records = (source.records || []).filter(function (record) {
    return record && record.purpose === 'field' && (record.kind === 'photo' || record.kind === 'text')
  })
  const photos = records.filter(function (record) {
    return record.kind === 'photo' && !isReferencePath(record.filePath || record.url)
  }).map(function (record) {
    return { id: record.id, kind: 'photo', filePath: record.filePath || record.url || '',
      siteId: record.siteId || '', title: siteLabel(record.siteId), text: record.text || '',
      createdAt: record.createdAt, updatedAt: record.updatedAt }
  })
  const texts = records.filter(function (record) { return record.kind === 'text' && String(record.text || '').trim() })
    .map(function (record) {
      return { id: record.id, kind: 'text', siteId: record.siteId || '', title: siteLabel(record.siteId),
        text: String(record.text).trim(), createdAt: record.createdAt, updatedAt: record.updatedAt }
    })
  return {
    sessionId: source.sessionId || '', name: String(run.name || '').trim() || '无名氏', letterRead: !!run.letterRead,
    completed: !!run.completedAt, completedAt: run.completedAt || null,
    dateLabel: dateLabel(run.completedAt),
    photos: photos, texts: texts,
    stations: SITES.map(function (site) {
      const status = (run.sites || {})[site.id] || 'unrecorded'
      return { id: site.id, label: site.label, status: status, stateLabel: STATUS_LABEL[status] || '未记录' }
    })
  }
}

// Every field record is exported. Multiple sheets keep Canvas height bounded.
function splitNote(text) {
  const chunks = []
  let current = '', lines = 1, column = 0
  Array.from(String(text || '')).forEach(function (char) {
    let nextLines = lines, nextColumn = column
    if (char === '\n') { nextLines++; nextColumn = 0 }
    else { nextColumn++; if (nextColumn > 24) { nextLines++; nextColumn = 1 } }
    if (current && nextLines > 18) {
      chunks.push(current); current = ''; nextLines = 1; nextColumn = char === '\n' ? 0 : 1
    }
    current += char; lines = nextLines; column = nextColumn
  })
  if (current) chunks.push(current)
  return chunks
}
function buildSheets(model) {
  const notes = []
  model.texts.forEach(function (note) {
    splitNote(note.text).forEach(function (text, i) {
      notes.push(Object.assign({}, note, { text: text, title: note.title + (i ? '（续 ' + (i + 1) + '）' : '') }))
    })
  })
  // 记录按高度预算装箱：照片每页至多 4 张、笔记多条同页，避免每条记录各占一个画框
  const noteHeight = function (note) {
    const lines = String(note.text).split('\n').reduce(function (sum, para) { return sum + Math.max(1, Math.ceil(para.length / 26)) }, 0)
    return lines * 32 + 52
  }
  const pages = []
  const photoBatches = []
  for (let i = 0; i < model.photos.length; i += 4) photoBatches.push(model.photos.slice(i, i + 4))
  let idx = 0
  photoBatches.forEach(function (batch) {
    const page = { photos: batch, notes: [] }
    let used = batch.length > 2 ? 520 : 280
    while (idx < notes.length && used + noteHeight(notes[idx]) <= 860) {
      used += noteHeight(notes[idx]); page.notes.push(notes[idx++])
    }
    pages.push(page)
  })
  while (idx < notes.length) {
    const page = { photos: [], notes: [] }
    let used = 0
    while (idx < notes.length && used + noteHeight(notes[idx]) <= 1320) {
      used += noteHeight(notes[idx]); page.notes.push(notes[idx++])
    }
    pages.push(page)
  }
  const count = Math.max(1, pages.length)
  return Array.from({ length: count }, function (_, i) {
    const page = pages[i] || { photos: [], notes: [] }
    return { name: model.name, completed: model.completed, dateLabel: model.dateLabel,
      stations: model.stations, photos: page.photos, texts: page.notes,
      text: page.notes[0] || null, number: i + 1, total: count }
  })
}

function wrapText(ctx, text, width) {
  const lines = []
  String(text || '').split('\n').forEach(function (paragraph) {
    let line = ''
    Array.from(paragraph).forEach(function (char) {
      if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = char }
      else line += char
    })
    lines.push(line)
  })
  return lines
}
function measure(ctx, sheet) {
  ctx.font = '24px sans-serif'
  const nameLines = wrapText(ctx, '署名：' + sheet.name, WIDTH - 100)
  ctx.font = '22px sans-serif'
  const notes = (sheet.texts || (sheet.text ? [sheet.text] : [])).map(function (note) {
    return { title: note.title, lines: wrapText(ctx, note.text, WIDTH - 124) }
  })
  const textLines = notes.length ? notes[0].lines : []
  const artY = 146 + nameLines.length * 30
  const stationsY = artY + 310
  const photosY = stationsY + 180
  const photoHeight = sheet.photos.length ? Math.ceil(sheet.photos.length / 2) * 236 + 35 : 0
  const textY = photosY + photoHeight + (sheet.photos.length ? 22 : 8)
  const textHeight = notes.reduce(function (sum, n) { return sum + 34 + n.lines.length * 32 + 18 }, 0)
  return { nameLines: nameLines, notes: notes, textLines: textLines, artY: artY, stationsY: stationsY,
    photosY: photosY, textY: textY, height: Math.ceil(textY + textHeight + 112) }
}

function stroke(ctx, points, close) {
  ctx.beginPath()
  points.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]) })
  if (close) ctx.closePath()
  ctx.stroke()
}
function drawPlate(ctx, x, y, w, h) {
  // 作品留白区：不再绘制遗址示意线稿（避免生成图式的“AI 配图”观感），由文字、照片与署名构成作品
  ctx.save(); ctx.translate(x, y); ctx.scale(w / 600, h / 260)
  ctx.fillStyle = '#e9ddc5'; ctx.fillRect(0, 0, 600, 260)
  ctx.strokeStyle = '#b79c6d'; ctx.lineWidth = 1.5
  ctx.strokeRect(1, 1, 598, 258)
  ctx.lineWidth = 0.7
  ctx.strokeRect(12, 12, 576, 236)
  ctx.restore()
}

function loadImage(canvas, src, timeoutMs) {
  return new Promise(function (resolve) {
    if (!src || !canvas || typeof canvas.createImage !== 'function') return resolve(null)
    let done = false, timer
    const finish = function (value) {
      if (done) return
      done = true; clearTimeout(timer); resolve(value)
    }
    try {
      const image = canvas.createImage()
      image.onload = function () { finish(image) }
      image.onerror = function () { finish(null) }
      timer = setTimeout(function () { finish(null) }, timeoutMs == null ? 5000 : timeoutMs)
      image.src = src
    } catch (err) { finish(null) }
  })
}
function coverPhoto(ctx, image, x, y, w, h) {
  const ratio = Math.max(w / image.width, h / image.height)
  const sw = w / ratio, sh = h / ratio
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h)
}

async function draw(ctx, canvas, sheet, layout) {
  const box = layout || measure(ctx, sheet)
  const loaded = await Promise.all(sheet.photos.map(function (p) { return loadImage(canvas, p.filePath) }))
  const missing = []
  ctx.fillStyle = '#f4eddd'; ctx.fillRect(0, 0, WIDTH, box.height)
  ctx.strokeStyle = '#6f583a'; ctx.lineWidth = 2; ctx.strokeRect(20,20,WIDTH-40,box.height-40)
  ctx.lineWidth = 0.7; ctx.strokeRect(29,29,WIDTH-58,box.height-58)
  ctx.textAlign = 'center'; ctx.fillStyle = '#3f3427'; ctx.font = 'bold 32px serif'
  ctx.fillText('西洋楼铜版图 · 第二十一图', WIDTH / 2, 80)
  ctx.font = '16px sans-serif'; ctx.fillStyle = '#796345'
  ctx.fillText(sheet.completed ? '我的考察作品 · 非馆藏原件' : '我的考察记录 · 尚未完成', WIDTH / 2, 110)
  ctx.textAlign = 'left'; ctx.fillStyle = '#493d2c'; ctx.font = '24px sans-serif'
  box.nameLines.forEach(function (line, i) { ctx.fillText(line, 50, 148 + i * 30) })
  ctx.font = '18px sans-serif'; ctx.fillStyle = '#76634a'
  ctx.fillText('完成日期：' + sheet.dateLabel, 50, box.artY - 8)
  drawPlate(ctx, 50, box.artY + 8, 600, 260)
  ctx.textAlign = 'left'; ctx.font = 'bold 22px serif'; ctx.fillStyle = '#493d2c'
  ctx.fillText('八站记录', 50, box.stationsY + 8)
  sheet.stations.forEach(function (site, i) {
    const col = i % 2, row = Math.floor(i / 2), xx = 50 + col * 310, yy = box.stationsY + 43 + row * 31
    ctx.font = '19px sans-serif'; ctx.fillStyle = '#493d2c'; ctx.fillText(site.label, xx, yy)
    ctx.font = '16px sans-serif'; ctx.fillStyle = site.status === 'done' ? '#47685e' : '#88775e'
    ctx.textAlign = 'right'; ctx.fillText(site.stateLabel, xx + 284, yy); ctx.textAlign = 'left'
  })
  ctx.textAlign = 'left'
  if (sheet.photos.length) {
    ctx.font = 'bold 22px serif'; ctx.fillStyle = '#493d2c'; ctx.fillText('我的现场照片', 50, box.photosY)
    sheet.photos.forEach(function (photo, i) {
      const x = 50 + i % 2 * 310, y = box.photosY + 23 + Math.floor(i / 2) * 236
      ctx.fillStyle = '#e5dac3'; ctx.fillRect(x, y, 290, 188)
      if (loaded[i]) coverPhoto(ctx, loaded[i], x, y, 290, 188)
      else {
        missing.push(photo.id)
        ctx.textAlign = 'center'; ctx.fillStyle = '#89765b'; ctx.font = '18px sans-serif'
        ctx.fillText('这张照片暂不可用', x+145, y+92); ctx.textAlign = 'left'
      }
      ctx.strokeStyle = '#a18b68'; ctx.lineWidth = 1; ctx.strokeRect(x,y,290,188)
      ctx.font = '17px sans-serif'; ctx.fillStyle = '#6c573c'; ctx.fillText(photo.title, x, y+214)
    })
  }
  if (box.notes && box.notes.length) {
    let noteY = box.textY
    box.notes.forEach(function (note) {
      ctx.font = 'bold 22px serif'; ctx.fillStyle = '#493d2c'
      ctx.fillText('观察笔记 · ' + note.title, 50, noteY + 9)
      ctx.textAlign = 'left'; ctx.font = '22px sans-serif'
      note.lines.forEach(function (line,i) { ctx.fillText(line,62,noteY+48+i*32) })
      noteY += 34 + note.lines.length * 32 + 18
    })
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#8b7658'; ctx.font = '15px sans-serif'
  ctx.fillText('补充照片与文字不改变原完成日期，也不改变站点状态。', WIDTH/2,box.height-65)
  ctx.fillText('考察档案 · ' + sheet.number + ' / ' + sheet.total, WIDTH/2,box.height-42)
  return { width: WIDTH, height: box.height, missingPhotos: missing }
}

module.exports = { WIDTH, SITES, siteLabel, dateLabel, buildModel, buildSheets, splitNote, wrapText, measure, draw, drawPlate, loadImage }
