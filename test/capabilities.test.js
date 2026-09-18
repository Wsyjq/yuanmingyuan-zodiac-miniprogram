const assert = require('node:assert/strict')
const test = require('node:test')

const SESSION_PATH = require.resolve('../plate21/module/store/session')
const ADAPTER_PATH = require.resolve('../plate21/module/adapters/local-adapter')
const CONTRACT_PATH = require.resolve('../plate21/module/contracts/adapter-api')
const PROGRESS_PATH = require.resolve('../plate21/module/store/progress-flow')
const ACHV_PATH = require.resolve('../plate21/module/store/achievements')
const REGISTRY_PATH = require.resolve('../plate21/module/capabilities/registry')
const GEO_PATH = require.resolve('../plate21/module/capabilities/map/site-geo')

function createWx(storage) {
  return {
    getStorageSync(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : ''
    },
    setStorageSync(key, value) {
      storage[key] = value
    },
    removeStorageSync(key) {
      delete storage[key]
    }
  }
}

function loadSession(storage) {
  delete require.cache[SESSION_PATH]
  delete require.cache[ADAPTER_PATH]
  delete require.cache[CONTRACT_PATH]
  delete require.cache[PROGRESS_PATH]
  delete require.cache[ACHV_PATH]
  global.wx = createWx(storage)
  return require(SESSION_PATH)
}

function flushMutations() {
  return new Promise((resolve) => setTimeout(resolve, 20))
}

test('registry maps station routes to map and audio capabilities', () => {
  delete require.cache[REGISTRY_PATH]
  const registry = require(REGISTRY_PATH)

  assert.deepEqual(registry.capabilitiesFor('pages/s2-quiz/s2-quiz'), { map: true, audio: 's2' })
  assert.deepEqual(registry.capabilitiesFor('pages/s3-water/s3-water'), { map: true, audio: 's3' })
  assert.deepEqual(registry.capabilitiesFor('pages/s4-timeline/s4-timeline'), { map: true, audio: 's4' })
  assert.deepEqual(registry.capabilitiesFor('pages/transit/transit'), { map: true, audio: null })
  assert.deepEqual(registry.capabilitiesFor('pages/cover/cover'), { map: false, audio: null })
  assert.deepEqual(registry.capabilitiesFor(''), { map: false, audio: null })
})

test('geofence check-in switch is off by default and configurable', () => {
  delete require.cache[REGISTRY_PATH]
  const registry = require(REGISTRY_PATH)

  assert.equal(registry.isGeofenceCheckinEnabled(), false)
  registry.setGeofenceCheckin(true)
  assert.equal(registry.isGeofenceCheckinEnabled(), true)
  registry.setGeofenceCheckin(false)
  assert.equal(registry.isGeofenceCheckinEnabled(), false)
})

test('site-geo computes distances and the next unfinished site', () => {
  delete require.cache[GEO_PATH]
  delete require.cache[REGISTRY_PATH]
  const siteGeo = require(GEO_PATH)

  assert.equal(siteGeo.SITES.length, 4)
  const adjacent = siteGeo.distanceMeters(siteGeo.SITES[0], siteGeo.SITES[1])
  assert.ok(adjacent > 50 && adjacent < 1000, 's1→s2 distance plausible: ' + adjacent)
  assert.equal(siteGeo.distanceMeters(siteGeo.SITES[0], siteGeo.SITES[0]), 0)
  assert.equal(siteGeo.formatDistance(320), '约 320 米')
  assert.equal(siteGeo.formatDistance(1400), '约 1.4 公里')
  assert.equal(siteGeo.formatDistance(null), '')

  assert.equal(siteGeo.nextSite({ stations: {} }).id, 's1')
  assert.equal(siteGeo.nextSite({ stations: { s1: true, s2: true } }).id, 's3')
  assert.equal(siteGeo.nextSite({ stations: { s1: true, s2: true, s3: true, s4: true } }), null)
})

test('achievements unlock on puzzle events and persist via flags', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})

  await session.completePuzzle('prologue-envelope', { attempts: 1 })
  await flushMutations()
  let snap = session.getSnapshot()
  assert.equal(typeof snap.flags['achievements.first-envelope'], 'number')
  assert.equal(snap.flags['achievements.decode-s1'], undefined)

  await session.completePuzzle('s1-decode', { attempts: 1 })
  await flushMutations()
  snap = session.getSnapshot()
  assert.equal(typeof snap.flags['achievements.decode-s1'], 'number')
})

test('achievements are idempotent and list() reports unlocked state', async () => {
  const storage = {}
  const session = loadSession(storage)
  const achievements = require(ACHV_PATH)
  await session.init({})

  const first = await session.completePuzzle('prologue-envelope', { attempts: 1 })
  await flushMutations()
  const afterFirst = session.getSnapshot()

  // 重复完成同一谜题不会重复解锁（无额外 revision）
  const again = await session.completePuzzle('prologue-envelope', { attempts: 1 })
  await flushMutations()
  assert.equal(again.revision, afterFirst.revision)

  const list = achievements.list(session.getSnapshot())
  // v2 顺路支线新增 side-walker 后共 7 枚印记
  assert.equal(list.length, 7)
  assert.equal(list.find((r) => r.id === 'first-envelope').unlocked, true)
  assert.equal(list.find((r) => r.id === 'journey-done').unlocked, false)
  assert.ok(first.revision >= 0)
})

test('four-stations and journey-done rules follow station and completion flags', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})

  for (const station of ['s1', 's2', 's3']) await session.completeStation(station)
  await flushMutations()
  assert.equal(session.getSnapshot().flags['achievements.four-stations'], undefined)

  await session.completeStation('s4')
  await flushMutations()
  assert.equal(typeof session.getSnapshot().flags['achievements.four-stations'], 'number')

  await session.completeExperience()
  await flushMutations()
  const snap = session.getSnapshot()
  assert.equal(typeof snap.flags['achievements.journey-done'], 'number')
})

test('timeline-perfect requires exactly one attempt', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})

  await session.completePuzzle('s4-timeline', { attempts: 3 })
  await flushMutations()
  assert.equal(session.getSnapshot().flags['achievements.timeline-perfect'], undefined)
})

test('timeline-perfect unlocks when the first arrangement is fully correct', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})

  await session.completePuzzle('s4-timeline', { attempts: 1 })
  await flushMutations()
  assert.equal(typeof session.getSnapshot().flags['achievements.timeline-perfect'], 'number')
})

test('reset clears achievement flags so a fresh run re-unlocks', async () => {
  const storage = {}
  const session = loadSession(storage)
  await session.init({})

  await session.completePuzzle('prologue-envelope', { attempts: 1 })
  await flushMutations()
  assert.equal(typeof session.getSnapshot().flags['achievements.first-envelope'], 'number')

  await session.reset()
  assert.equal(session.getSnapshot().flags['achievements.first-envelope'], undefined)

  await session.completePuzzle('prologue-envelope', { attempts: 1 })
  await flushMutations()
  assert.equal(typeof session.getSnapshot().flags['achievements.first-envelope'], 'number')
})

// V2.2：语音导览两层音频已回填（本地静态服务/CDN 取流，组件零改动即亮播放器）
test('audio guide backfills TTS sources for every station (V2.2)', () => {
  const { GUIDES } = require('../plate21/module/capabilities/audio-guide/scripts')
  const audioSrc = require('../plate21/module/utils/audio-src')
  const ids = Object.keys(GUIDES)
  assert.ok(ids.length >= 9, 'expected >=9 guide stations')
  for (const id of ids) {
    const guide = GUIDES[id]
    assert.equal(guide.audio, audioSrc.clip('guide-' + id + '-base'), id + ' base audio')
    assert.equal(guide.deepAudio, audioSrc.clip('guide-' + id + '-deep'), id + ' deep audio')
  }
})

// V2.2：声部清单与导览文稿数量对齐（音频 id ↔ manifest 一致性抽查）
test('voice manifest covers guide stations and dialogue clip ids', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const manifest = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'tools', 'voice_manifest.json'), 'utf8'))
  const clipIds = new Set(manifest.clips.map((c) => c.id))
  const { GUIDES } = require('../plate21/module/capabilities/audio-guide/scripts')
  for (const id of Object.keys(GUIDES)) {
    assert.ok(clipIds.has('guide-' + id + '-base'), 'manifest missing guide-' + id + '-base')
    assert.ok(clipIds.has('guide-' + id + '-deep'), 'manifest missing guide-' + id + '-deep')
  }
  // 页面引用的关键台词 clip 必须在 manifest 中（抽查每站第一条）
  for (const id of [
    'dlg-huanghuazhen-1', 'dlg-xieqiqu-1', 'dlg-yangquelong-1', 'dlg-fangwaiguan-1',
    'dlg-xushuilou-1', 'dlg-guanshuifa-1', 'dlg-xianfahua-1', 'dlg-haiyantang-1',
    'dlg-yugao-1', 'dlg-huanghuazhen-6'
  ]) {
    assert.ok(clipIds.has(id), 'manifest missing ' + id)
  }
  // 红线：匠人与砌墙师傅不同音色
  const casts = manifest.casts
  assert.notEqual(casts.jiangren.voice, casts.shifu.voice, 'mason vs bricklayer voice')
})
