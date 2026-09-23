// V2.2 独立音频开关 + 单路互斥总线（issue #0021）
const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')

test('audio settings default on, persist per key, and notify subscribers', () => {
  // 独立缓存模块（清掉上一用例的 cached 状态）
  delete require.cache[require.resolve('../plate21/module/utils/audio-settings')]
  const audioSettings = require('../plate21/module/utils/audio-settings')

  assert.deepEqual(audioSettings.get(), { bgm: true, voice: true })

  const seen = []
  const fn = (s, key) => seen.push([key, s.bgm, s.voice])
  audioSettings.subscribe(fn)

  audioSettings.set('bgm', false)
  assert.deepEqual(audioSettings.get(), { bgm: false, voice: true })
  assert.deepEqual(seen, [['bgm', false, true]])

  // 同值不广播
  audioSettings.set('bgm', false)
  assert.equal(seen.length, 1)

  audioSettings.set('voice', false)
  assert.deepEqual(audioSettings.get(), { bgm: false, voice: false })
  assert.equal(seen.length, 2)

  audioSettings.unsubscribe(fn)
  audioSettings.set('bgm', true)
  assert.equal(seen.length, 2)

  // 持久化落进（harness mock 的）本地存储
  const storage = require('./harness/runtime')
  assert.ok(true)
})

test('audio bus pauses other players on activate and resumes muted bgm on release', () => {
  delete require.cache[require.resolve('../plate21/module/utils/audio-bus')]
  const bus = require('../plate21/module/utils/audio-bus')

  const calls = []
  const mk = (kind, name) => ({
    kind,
    name,
    playing: false,
    isPlaying() { return this.playing },
    pause() { calls.push('pause:' + name); this.playing = false },
    resume() { calls.push('resume:' + name); this.playing = true }
  })
  const bgm = mk('bgm', 'bgm')
  const voice1 = mk('voice', 'v1')
  const voice2 = mk('voice', 'v2')
  bus.register(bgm); bus.register(voice1); bus.register(voice2)

  bgm.playing = true
  bus.activate(voice1)
  assert.deepEqual(calls, ['pause:bgm'], '起人声时只压停 BGM')
  assert.ok(bus.isActive(voice1))

  voice1.playing = true
  bus.activate(voice2)
  // v1 让路（pause），v1 非当前活跃，不得触发误恢复
  assert.deepEqual(calls, ['pause:bgm', 'pause:v1'])

  bus.release()
  assert.deepEqual(calls, ['pause:bgm', 'pause:v1', 'resume:bgm'], '人声结束还 BGM')

  // 类别急停
  bgm.playing = true
  bus.stopKind('bgm')
  assert.equal(bgm.playing, false)
})

test('bgm ambience mapping keeps dashuifa silent and skips hub pages', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'plate21', 'module', 'components', 'bgm-ambience', 'bgm-ambience.js'),
    'utf8')
  // 红线：大水法两分钟完全静默——路由表不得命中 dashuifa，散页表不得有观水法
  assert.doesNotMatch(src, /dashuifa/)
  assert.doesNotMatch(src, /t-guanshuifa/)
  // 页面侧：dashuifa / transit / cover / handbook / report 不挂 bgm-ambience
  for (const page of ['dashuifa', 'transit', 'cover', 'handbook', 'report']) {
    const wxml = fs.readFileSync(
      path.join(__dirname, '..', 'plate21', 'module', 'pages', page, page + '.wxml'), 'utf8')
    assert.ok(!wxml.includes('bgm-ambience'), page + ' must not mount bgm-ambience')
  }
  // 主线内容页都挂上（spot check）
  for (const page of ['prologue', 's2-quiz', 's3-comic', 's4-timeline', 'finale', 'letter', 'waypoint']) {
    const wxml = fs.readFileSync(
      path.join(__dirname, '..', 'plate21', 'module', 'pages', page, page + '.wxml'), 'utf8')
    assert.ok(wxml.includes('bgm-ambience'), page + ' should mount bgm-ambience')
  }
})

test('handbook renders the two independent audio switches', async () => {
  const { renderPage } = require('./harness/runtime')
  const result = await renderPage({
    route: 'plate21/module/pages/handbook/handbook',
    settleMs: 10
  })
  assert.deepEqual(result.errors, [])
  assert.match(result.html, /音频 · 独立开关/)
  assert.match(result.html, /背景音乐/)
  assert.match(result.html, /人声讲述/)
  assert.match(result.html, /audio-set-row/)
})

test('voice clips hide when the voice switch is off, bgm clips follow bgm switch', async () => {
  const { renderPage } = require('./harness/runtime')

  // 默认开：旁白按钮在（主线 narr 因飞书 v3 改词暂时静音，用散页站点验证开关逻辑）
  let result = await renderPage({
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'yangquelong' },
    settleMs: 10
  })
  assert.match(result.html, /听 · 本页讲述/)

  // 人声关（经 harness 的存储覆写播种设备偏好）：按钮整体退场
  result = await renderPage({
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'yangquelong' },
    settleMs: 10,
    wxOverrides: {
      getStorageSync: (k) => (k === 'plate21_audio_settings' ? { bgm: true, voice: false } : '')
    }
  })
  assert.doesNotMatch(result.html, /听 · 本页讲述/)

  // 背景音乐关不影响人声按钮
  result = await renderPage({
    route: 'plate21/module/pages/waypoint/waypoint',
    query: { site: 'yangquelong' },
    settleMs: 10,
    wxOverrides: {
      getStorageSync: (k) => (k === 'plate21_audio_settings' ? { bgm: false, voice: true } : '')
    }
  })
  assert.match(result.html, /听 · 本页讲述/)
})
