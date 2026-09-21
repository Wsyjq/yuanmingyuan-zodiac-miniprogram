'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const ROOT = path.join(__dirname, '..')

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

test('voice manifest splits narration per visible screen', () => {
  const man = JSON.parse(read('tools/voice_manifest.json'))
  const narr = man.clips.filter((c) => String(c.id).startsWith('narr-'))
  const ids = narr.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length, 'narr ids unique')
  assert.ok(!ids.includes('narr-prologue'), 'old concatenated prologue clip retired')
  assert.ok(!ids.includes('narr-finale'), 'old concatenated finale clip retired')
  assert.ok(!ids.includes('narr-s1-decode'), 'old concatenated s1 clip retired')
  assert.ok(ids.includes('narr-prologue-p01'))
  assert.ok(ids.includes('narr-prologue-handover'))
  assert.ok(ids.includes('narr-s1-decode-sealed'))
  assert.ok(ids.includes('narr-s1-decode-reading'))
  assert.ok(ids.includes('narr-waypoint-xieqiqu-followup'))
  assert.ok(ids.includes('narr-dashuifa-hunt'))
  assert.ok(ids.includes('narr-dashuifa-followup'))
  assert.ok(ids.includes('narr-finale-p01'))
  for (const clip of narr) {
    const text = Array.isArray(clip.text) ? clip.text.join('') : clip.text
    assert.ok(String(text).trim().length > 0, clip.id + ' empty')
  }
})

test('audio-clip swaps context when src changes', () => {
  const src = read('plate21/module/components/audio-clip/audio-clip.js')
  assert.match(src, /observers:\s*\{[\s\S]*src\(/)
})

test('novel-view emits pagechange so each sheet can play its own clip', () => {
  const src = read('plate21/module/components/novel-view/novel-view.js')
  assert.match(src, /triggerEvent\('pagechange'/)
  const prologue = read('plate21/module/pages/prologue/prologue.wxml')
  assert.match(prologue, /bind:pagechange="onNovelPage"/)
  const finale = read('plate21/module/pages/finale/finale.wxml')
  assert.match(finale, /bind:pagechange="onNovelPage"/)
})

test('scored waypoint and dashuifa mount per-screen page narration', () => {
  const wp = read('plate21/module/pages/waypoint/waypoint.wxml')
  assert.match(wp, /site\.scored[\s\S]*audio-clip[\s\S]*narrSrc/)
  const dsf = read('plate21/module/pages/dashuifa/dashuifa.wxml')
  assert.match(dsf, /audio-clip/)
  const dsfJson = JSON.parse(read('plate21/module/pages/dashuifa/dashuifa.json'))
  assert.ok(dsfJson.usingComponents['audio-clip'])
})
