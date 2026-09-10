#!/usr/bin/env node
'use strict'
// Serve only the 14 registered files. Originals stay outside the project/package.
const http = require('http'),
  fs = require('fs'),
  path = require('path')
const manifest = require('../docs/functional-v4/media-manifest.json')
const dir = process.argv[2],
  port = Number(process.argv[3]) || 8878
if (!dir || !fs.statSync(dir).isDirectory())
  throw new Error('Usage: node tools/bgm-preview.js /absolute/path/to/bgm [8878]')
const tracks = manifest.tracks
for (const t of tracks)
  if (!fs.existsSync(path.join(dir, t.file))) throw new Error('Missing ' + t.file)
const page = `<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>第廿一图 · 配乐试听</title><style>body{margin:0;background:#f3ecd9;color:#3d3429;font:16px/1.8 serif}main{max-width:900px;margin:70px auto;padding:0 24px}h1{font-weight:400;font-size:38px}small{color:#846d4d}article{padding:24px;border-top:1px solid #b9a68a;display:grid;grid-template-columns:1fr 300px;gap:24px}h2{font-size:21px;margin:0}audio{width:100%}button{padding:10px 20px;background:#574732;color:#fff3d9;border:0}input{vertical-align:middle}@media(max-width:640px){article{grid-template-columns:1fr}} </style><main><small>PLATE XXI / SOUND LIBRARY</small><h1>把声音放回场景</h1><p>14 段当代音乐创作，仅作搭配试听。双声道曲不代表历史演奏复原；大水法静默段关闭所有音乐。</p><label>试听音量 <input id="volume" type="range" min="0" max="1" value="0.24" step="0.01"></label><p><button id="stop">暂停所有配乐</button></p>${tracks.map((t) => `<article><div><h2>${t.title}</h2><small>${t.duration.toFixed(1)} 秒 · ${(t.bytes / 1048576).toFixed(2)} MB<br>${t.file}</small></div><audio controls preload="none" loop src="/${t.file}"></audio></article>`).join('')}<p>原始文件未复制、未修改、未公开上传。</p></main><script>const audios=[...document.querySelectorAll('audio')];audios.forEach(a=>{a.volume=.24;a.onplay=()=>audios.forEach(b=>{if(a!==b)b.pause()})});document.querySelector('#stop').onclick=()=>audios.forEach(a=>a.pause());document.querySelector('#volume').oninput=e=>audios.forEach(a=>a.volume=Number(e.target.value));</script></html>`
http
  .createServer((req, res) => {
    let name
    try {
      name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname.slice(1))
    } catch (e) {
      res.writeHead(400).end()
      return
    }
    if (!name) {
      res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
      res.end(page)
      return
    }
    if (name === 'manifest.json') {
      res.writeHead(200, { 'Content-Type': 'application/json;charset=utf-8' })
      res.end(JSON.stringify(manifest))
      return
    }
    const t = tracks.find((t) => t.file === name)
    if (!t) {
      res.writeHead(404).end()
      return
    }
    const file = path.join(dir, t.file),
      size = fs.statSync(file).size,
      range = req.headers.range
    let start = 0,
      end = size - 1,
      status = 200
    if (range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(range)
      if (!m) {
        res.writeHead(416).end()
        return
      }
      start = Number(m[1])
      end = m[2] ? Math.min(Number(m[2]), size - 1) : end
      if (start > end) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + size }).end()
        return
      }
      status = 206
    }
    const headers = {
      'Content-Type': 'audio/mpeg',
      'Content-Length': end - start + 1,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*'
    }
    if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${size}`
    res.writeHead(status, headers)
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    fs.createReadStream(file, { start, end }).pipe(res)
  })
  .listen(port, '127.0.0.1', () => console.log('BGM preview: http://127.0.0.1:' + port))
