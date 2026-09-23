'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const nfc = require('../plate21/module/capabilities/nfc/launch')
const { renderPage } = require('./harness/runtime')

function envelope(flags) {
  return {
    snapshot: {
      schemaVersion: 2,
      sessionId: 'nfc-xieqiqu',
      revision: 0,
      sessionDate: '20260918',
      checkpoint: 'prologue',
      stations: { s1: false, s2: false, s3: false, s4: false },
      puzzles: {},
      cards: {},
      records: [],
      flags: flags || {},
      finale: false,
      createdAt: 1,
      updatedAt: 1
    }
  }
}

function storage(flags) {
  const store = { plate21_session: envelope(flags) }
  return {
    getStorageSync: (k) => (k in store ? store[k] : ''),
    setStorageSync: (k, v) => { store[k] = v },
    removeStorageSync: (k) => { delete store[k] }
  }
}

test('sticker query names the word soundscape and the packaged file', () => {
  const launch = nfc.parse({ from: 'nfc', prop: 'dj06' })
  assert.equal(launch.site, 'xieqiqu')
  assert.equal(nfc.LINE, '喷泉声、少数民族音乐和西洋音乐')
  assert.equal(nfc.parse({ from: 'qr', prop: 'dj06' }), null)
  const file = path.join(__dirname, '../voice-a/dj06-xieqiqu-soundscape-30s-v2.mp3')
  assert.equal(fs.existsSync(file), true)
})

test('unlocked gate with the sticker opens xieqiqu and leaves the cover alone', async () => {
  const seen = []
  const result = await renderPage({
    route: 'plate21/module/pages/gate/gate',
    query: { from: 'nfc', prop: 'dj06', next: 'xieqiqu' },
    wxOverrides: Object.assign(storage({ premiumUnlockedAt: 1 }), {
      redirectTo: (o) => { seen.push(o.url); if (o.success) o.success({}) }
    }),
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.ok(seen.some((url) => url.indexOf('waypoint/waypoint?site=xieqiqu&from=nfc') >= 0))
  assert.equal(seen.some((url) => url.indexOf('/pages/cover/cover') >= 0), false)
})

test('sticker opens the word soundscape and does not tick it', async () => {
  const result = await renderPage({
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'xieqiqu', from: 'nfc', prop: 'dj06' },
    wxOverrides: storage({ premiumUnlockedAt: 1 }),
    settleMs: 400
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.solved, false)
  assert.equal(result.data.selected.length, 0)
  assert.match(result.data.nfcNote, /喷泉声、少数民族音乐和西洋音乐/)
  assert.match(result.data.nfcNote, /不算过关/)
  assert.equal(result.data.listenSrc, '/voice-a/dj06-xieqiqu-soundscape-30s-v2.mp3')
  assert.doesNotMatch(result.html, /小拉琴/)
})
