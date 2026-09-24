'use strict'

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
    sessionId: source.sessionId || '', name: String(run.name || '').trim() || '无名氏',
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
  const count = Math.max(1, Math.ceil(model.photos.length / 4), notes.length)
  return Array.from({ length: count }, function (_, i) {
    return { name: model.name, completed: model.completed, dateLabel: model.dateLabel,
      stations: model.stations, photos: model.photos.slice(i * 4, i * 4 + 4),
      text: notes[i] || null, number: i + 1, total: count }
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
  const textLines = sheet.text ? wrapText(ctx, sheet.text.text, WIDTH - 124) : []
  const artY = 146 + nameLines.length * 30
  const stationsY = artY + 310
  const photosY = stationsY + 180
  const photoHeight = sheet.photos.length ? Math.ceil(sheet.photos.length / 2) * 236 + 35 : 110
  const textY = photosY + photoHeight + 22
  const textHeight = textLines.length ? textLines.length * 32 + 74 : 0
  return { nameLines: nameLines, textLines: textLines, artY: artY, stationsY: stationsY,
    photosY: photosY, textY: textY, height: Math.ceil(textY + textHeight + 112) }
}

function stroke(ctx, points, close) {
  ctx.beginPath()
  points.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]) })
  if (close) ctx.closePath()
  ctx.stroke()
}
function drawPlate(ctx, x, y, w, h) {
  ctx.save(); ctx.translate(x, y); ctx.scale(w / 600, h / 260)
  ctx.beginPath(); ctx.rect(0, 0, 600, 260); ctx.clip()
  ctx.fillStyle = '#e9ddc5'; ctx.fillRect(0, 0, 600, 260)
  ctx.strokeStyle = 'rgba(86,71,48,.14)'; ctx.lineWidth = 0.65
  for (let i = -200; i < 850; i += 13) stroke(ctx, [[i, 0], [i - 140, 260]])
  ctx.strokeStyle = '#62533b'; ctx.lineWidth = 1.5
  // An original schematic of pavilion, palace arches and ruined columns, not a visitor photograph.
  stroke(ctx, [[20,211],[49,198],[89,207],[117,204],[175,212],[238,207],[278,217],[345,208],[396,219],[458,210],[582,220]])
  stroke(ctx, [[38,116],[93,74],[149,116],[137,112],[127,119],[60,119],[49,112]], true)
  stroke(ctx, [[52,109],[92,93],[136,109]])
  for (const px of [62, 83, 108, 129]) {
    ctx.strokeRect(px, 122, 5, 68); stroke(ctx, [[px-4,193],[px+10,193]])
  }
  stroke(ctx, [[48,197],[147,197],[155,204],[40,204]], true)
  stroke(ctx, [[196,124],[196,100],[236,100],[248,79],[260,100],[306,100],[306,124],[320,124],[320,202],[183,202],[183,124]], true)
  for (const px of [210, 250, 290]) {
    ctx.beginPath(); ctx.arc(px, 160, 13, Math.PI, 0); ctx.lineTo(px+13,198); ctx.lineTo(px-13,198); ctx.closePath(); ctx.stroke()
    ctx.strokeRect(px-5,111,10,15)
  }
  stroke(ctx, [[176,208],[328,208],[337,216],[168,216]], true)
  for (let i = 0; i < 5; i++) {
    const px = 378 + i * 38, top = [96,72,113,83,124][i]
    stroke(ctx, [[px,211],[px,top+9],[px+6,top],[px+12,top+6],[px+15,top+3],[px+15,211]])
    stroke(ctx, [[px-5,top+11],[px+20,top+11],[px+20,top+18],[px-5,top+18]], true)
    for (let n = 0; n < 3; n++) stroke(ctx, [[px+3+n*4,top+21],[px+3+n*4,205]])
  }
  stroke(ctx, [[390,96],[427,65],[469,102],[481,108]])
  ctx.lineWidth = 0.7
  for (let i = 0; i < 10; i++) stroke(ctx, [[342+i*20,226+(i%3)*4],[360+i*20,225+(i%3)*4]])
  ctx.strokeStyle = '#967448'; ctx.strokeRect(1,1,598,258)
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
  ctx.font = '15px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText('遗址线稿 · 示意底图', WIDTH / 2, box.artY + 291)
  ctx.textAlign = 'left'; ctx.font = 'bold 22px serif'; ctx.fillStyle = '#493d2c'
  ctx.fillText('八站记录', 50, box.stationsY + 8)
  sheet.stations.forEach(function (site, i) {
    const col = i % 2, row = Math.floor(i / 2), xx = 50 + col * 310, yy = box.stationsY + 43 + row * 31
    ctx.font = '19px sans-serif'; ctx.fillStyle = '#493d2c'; ctx.fillText(site.label, xx, yy)
    ctx.font = '16px sans-serif'; ctx.fillStyle = site.status === 'done' ? '#47685e' : '#88775e'
    ctx.textAlign = 'right'; ctx.fillText(site.stateLabel, xx + 284, yy); ctx.textAlign = 'left'
  })
  ctx.font = 'bold 22px serif'; ctx.fillStyle = '#493d2c'; ctx.fillText('我的现场照片', 50, box.photosY)
  if (!sheet.photos.length) {
    ctx.font = '19px sans-serif'; ctx.fillStyle = '#89765b'
    ctx.fillText('这一页没有照片，文字与观察同样属于这份记录。', 50, box.photosY + 47)
  }
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
  if (sheet.text) {
    ctx.font = 'bold 22px serif'; ctx.fillStyle = '#493d2c'
    ctx.fillText('观察笔记 · ' + sheet.text.title, 50, box.textY+9)
    ctx.font = '22px sans-serif'
    box.textLines.forEach(function (line,i) { ctx.fillText(line,62,box.textY+48+i*32) })
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#8b7658'; ctx.font = '15px sans-serif'
  ctx.fillText('补充照片与文字不改变原完成日期，也不改变站点状态。', WIDTH/2,box.height-65)
  ctx.fillText('考察档案 · ' + sheet.number + ' / ' + sheet.total, WIDTH/2,box.height-42)
  return { width: WIDTH, height: box.height, missingPhotos: missing }
}

module.exports = { WIDTH, SITES, siteLabel, dateLabel, buildModel, buildSheets, splitNote, wrapText, measure, draw, drawPlate, loadImage }
