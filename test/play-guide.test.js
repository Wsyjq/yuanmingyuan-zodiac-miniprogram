// 开玩引导：封面三步镂空真按钮；后页 JIT 镂空；跳过/走完落 flag。
const assert = require('node:assert/strict')
const test = require('node:test')

const { renderPage } = require('./harness/runtime')
const guide = require('../plate21/module/capabilities/play-guide/guide')
const measure = require('../plate21/module/capabilities/play-guide/measure')

function makeEnv(flags) {
  return {
    snapshot: {
      schemaVersion: 2,
      sessionId: 'play-guide-test',
      revision: 0,
      sessionDate: '20260918',
      checkpoint: 'prologue',
      stations: { s1: false, s2: false, s3: false, s4: false },
      puzzles: {},
      cards: {},
      records: [],
      flags: Object.assign({ premiumUnlockedAt: 1 }, flags || {}),
      finale: false,
      createdAt: 1,
      updatedAt: 1
    }
  }
}

function harness(flags) {
  guide.resetTour()
  const store = { plate21_session: makeEnv(flags) }
  const nav = []
  return {
    store,
    nav,
    wxOverrides: {
      getStorageSync(k) { return k in store ? store[k] : '' },
      setStorageSync(k, v) { store[k] = v },
      removeStorageSync(k) { delete store[k] },
      navigateTo(o) {
        nav.push(o && o.url)
        if (o && o.success) o.success({})
      },
      redirectTo(o) {
        nav.push('redirect:' + (o && o.url))
        if (o && o.success) o.success({})
      }
    }
  }
}

test('play-guide copy: 封面两步短标签 + 后页分别指，无游客侧谜题 / 贴墙', () => {
  assert.equal(guide.FLAG, 'playGuideSeenAt')
  assert.equal(guide.coverSteps(false, false).length, 2)
  assert.equal(guide.coverSteps(false, false)[0].tag, '从这里开始')
  assert.equal(guide.coverSteps(false, false)[1].tag, '翻考察手册')
  assert.equal(guide.coverSteps(true, false)[0].tag, '从上次接着')
  assert.equal(guide.coverSteps(true, true)[0].tag, '去看报告')
  assert.equal(guide.GROUPS.length, 4)
  assert.equal(Object.keys(guide.SPOTS).sort().join(','), 'dashuifa,go,guide,hint,listen,map,side,skip')
  assert.equal(guide.TOUR_STOPS.length, 4)
  const blob = guide.copyBlob()
  assert.equal(/谜题/.test(blob), false)
  assert.equal(/贴墙/.test(blob), false)
  assert.equal(/摸墙/.test(blob), false)
  assert.equal(blob.indexOf('怎么走这一趟'), -1)
  assert.ok(blob.indexOf('从这里开始') >= 0)
  assert.ok(blob.indexOf('听这一页') >= 0)
  assert.ok(blob.indexOf('语音导览') >= 0)
  assert.ok(blob.indexOf('打开地图') >= 0)
  assert.ok(blob.indexOf('看提示') >= 0)
  assert.ok(blob.indexOf('翻到下一页') >= 0)
})

test('shouldShow: unseen → true; flag set → false', () => {
  assert.equal(guide.shouldShow(null), true)
  assert.equal(guide.shouldShow({ flags: {} }), true)
  assert.equal(guide.shouldShow({ flags: { playGuideSeenAt: 1 } }), false)
  assert.equal(guide.shouldShowSpot({ flags: {} }, 'coachSkipAt'), true)
  assert.equal(guide.shouldShowSpot({ flags: { coachSkipAt: 1 } }, 'coachSkipAt'), false)
})

test('cover: 首次进入自动镂空第一步「从这里开始」，不进序章', async () => {
  const h = harness()
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides: h.wxOverrides,
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showCoach, true)
  assert.equal(result.data.coachIndex, 0)
  assert.equal(result.data.coachStep.tag, '从这里开始')
  assert.ok(result.html.includes('从这里开始'))
  assert.ok(result.html.includes('开始考察'))
  assert.ok(result.html.includes('跳过'))
  assert.equal(h.nav.some((url) => String(url).indexOf('prologue') >= 0), false)
})

test('cover: 已看过引导不镂空', async () => {
  const h = harness({ playGuideSeenAt: 99 })
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides: h.wxOverrides,
    settleMs: 300
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showCoach, false)
  assert.equal(result.html.includes('cs-bubble'), false)
})

test('cover: 引导中点开始考察 → 收引导并进序章', async () => {
  const h = harness()
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides: h.wxOverrides,
    settleMs: 300,
    drive: async (inst, sleep) => {
      inst.onStart()
      await sleep(400)
    }
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showCoach, false)
  assert.ok(h.store.plate21_session.snapshot.flags.playGuideSeenAt)
  assert.ok(h.nav.some((url) => String(url).indexOf('/pages/prologue/prologue') >= 0))
})

test('cover: 跳过镂空 → 落 flag，不进序章', async () => {
  const h = harness()
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides: h.wxOverrides,
    settleMs: 300,
    drive: async (inst, sleep) => {
      inst.onCoachSkip()
      await sleep(400)
    }
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showCoach, false)
  assert.ok(h.store.plate21_session.snapshot.flags.playGuideSeenAt)
  assert.equal(h.nav.some((url) => String(url).indexOf('prologue') >= 0), false)
})

test('cover: 两步走完 → 跳到后页短标签指听，不进序章、不落 flag', async () => {
  const h = harness()
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides: h.wxOverrides,
    settleMs: 300,
    drive: async (inst, sleep) => {
      inst.onCoachNext()
      assert.equal(inst.data.coachIndex, 1)
      assert.equal(inst.data.coachStep.tag, '翻考察手册')
      inst.onCoachNext()
      await sleep(400)
    }
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showCoach, false)
  assert.equal(!!h.store.plate21_session.snapshot.flags.playGuideSeenAt, false)
  assert.ok(h.nav.some((url) => String(url).indexOf('s1-decode') >= 0 && String(url).indexOf('tour=1') >= 0))
  assert.equal(h.nav.some((url) => String(url).indexOf('prologue') >= 0), false)
})

test('cover: 看过引导后再点开始考察 → 进序章', async () => {
  const h = harness({ playGuideSeenAt: 99 })
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides: h.wxOverrides,
    settleMs: 300,
    drive: async (inst) => { inst.onStart() }
  })
  assert.deepEqual(result.errors, [])
  assert.ok(h.nav.some((url) => String(url).indexOf('/pages/prologue/prologue') >= 0))
})

test('cover: 玩法说明打开标签目录，关闭不跳页', async () => {
  const h = harness({ playGuideSeenAt: 99 })
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides: h.wxOverrides,
    settleMs: 300,
    drive: async (inst, sleep) => {
      inst.onShowHelp()
      inst.onGuideSkip()
      await sleep(400)
    }
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showGuide, false)
  assert.equal(h.nav.some((url) => String(url).indexOf('prologue') >= 0), false)
})

test('measureIn: 红框相对 selectViewport，减去 view.top/left', async () => {
  const q = {
    in() { return q },
    select() { return q },
    selectViewport() { return q },
    boundingClientRect() { return q },
    exec(cb) {
      cb([
        { top: 100, left: 50, width: 80, height: 20 },
        { top: 20, left: 10, width: 390, height: 844 }
      ])
    }
  }
  const wxBak = global.wx
  global.wx = { createSelectorQuery: () => q, nextTick: (fn) => fn() }
  delete require.cache[require.resolve('../plate21/module/capabilities/play-guide/measure')]
  const measure = require('../plate21/module/capabilities/play-guide/measure')
  const got = await measure.measureIn({}, '#coachStart')
  global.wx = wxBak
  assert.equal(got.hole.top, 80)
  assert.equal(got.hole.left, 40)
  assert.equal(got.hole.width, 80)
  assert.equal(got.win.windowWidth, 390)
  assert.equal(got.win.windowHeight, 844)
})

test('cover: 量到按钮后红框用可视区域坐标', async () => {
  const h = harness()
  const q = {
    in() { return q },
    select() { return q },
    selectViewport() { return q },
    boundingClientRect() { return q },
    exec(cb) {
      if (cb) {
        cb([
          { top: 612, left: 72, width: 220, height: 44 },
          { top: 0, left: 0, width: 375, height: 812 }
        ])
      }
    }
  }
  h.wxOverrides.createSelectorQuery = () => q
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides: h.wxOverrides,
    settleMs: 400
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showCoach, true)
  assert.equal(result.data.coachHole.top, 612)
  assert.equal(result.data.coachHole.width, 220)
  assert.equal(result.data.coachWin.windowHeight, 812)
  assert.ok(result.html.includes('cs-ring'))
})

test('cover: 第二步 HTML 是手册「翻考察手册」', async () => {
  const h = harness()
  const result = await renderPage({
    route: 'plate21/module/pages/cover/cover',
    wxOverrides: h.wxOverrides,
    settleMs: 300,
    drive: async (inst) => { inst.onCoachNext() }
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.coachIndex, 1)
  assert.ok(result.html.includes('翻考察手册'))
  assert.ok(result.html.includes('考察手册'))
})

test('layoutBubble: 钮在下方时气泡钉在钮上沿，不估高', () => {
  const vp = { w: 375, h: 812 }
  const hole = { top: 630, left: 72, width: 157, height: 44 }
  const box = measure.layoutBubble(vp, hole, false)
  assert.equal(box.above, true)
  assert.equal(box.bottom, vp.h - hole.top + 10)
  assert.ok(vp.h - box.bottom <= hole.top)
  assert.equal(box.left, hole.left)
  assert.match(box.style, /bottom:\d/)
  assert.match(box.style, /top:auto/)
})

test('layoutBubble: 钮在上方时气泡钉在钮下沿', () => {
  const vp = { w: 375, h: 812 }
  const hole = { top: 80, left: 280, width: 80, height: 28 }
  const box = measure.layoutBubble(vp, hole, false)
  assert.equal(box.above, false)
  assert.ok(box.top >= hole.top + hole.height)
  assert.ok(box.left + box.width <= vp.w - 12)
  assert.match(box.style, /top:\d/)
})

test('layoutBubble: 量不到钮时靠下沿钉住', () => {
  const vp = { w: 375, h: 812 }
  const box = measure.layoutBubble(vp, null, true)
  assert.equal(box.above, true)
  assert.equal(box.bottom, 88)
})

test('tour: 四站顺序是听、导览+地图、提示、翻页', () => {
  guide.resetTour()
  const first = guide.startTour()
  assert.match(first.url, /s1-decode/)
  assert.deepEqual(first.spots, ['listen'])
  const two = guide.advanceTour()
  assert.match(two.url, /s2-quiz/)
  assert.equal(two.host, 'overlay')
  assert.deepEqual(two.spots, ['guide', 'map'])
  const three = guide.advanceTour()
  assert.deepEqual(three.spots, ['hint'])
  const four = guide.advanceTour()
  assert.match(four.url, /transit/)
  assert.deepEqual(four.spots, ['go'])
  const done = guide.advanceTour()
  assert.equal(done.done, true)
  assert.match(done.url, /cover/)
  assert.equal(guide.isTouring(), false)
})

test('s1-decode: 跳页引导镂空「听这一页」', async () => {
  const h = harness()
  guide.startTour()
  const q = {
    in() { return q },
    select() { return q },
    selectViewport() { return q },
    boundingClientRect() { return q },
    exec(cb) {
      if (cb) {
        cb([
          { top: 220, left: 24, width: 280, height: 36 },
          { top: 0, left: 0, width: 375, height: 812 }
        ])
      }
    }
  }
  h.wxOverrides.createSelectorQuery = () => q
  const result = await renderPage({
    route: 'plate21/module/pages/s1-decode/s1-decode',
    query: { tour: '1' },
    wxOverrides: h.wxOverrides,
    settleMs: 700
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.touring, true)
  assert.equal(result.data.showCoach, true)
  assert.equal(result.data.coachStep.tag, '听这一页')
  assert.ok(result.html.includes('听 · 本页讲述'))
})

test('s2-quiz: 第一次见到「先不猜」镂空指一次', async () => {
  const h = harness({ playGuideSeenAt: 99 })
  const q = {
    in() { return q },
    select() { return q },
    selectViewport() { return q },
    boundingClientRect() { return q },
    exec(cb) {
      if (cb) {
        cb([
          { top: 640, left: 40, width: 200, height: 28 },
          { top: 0, left: 0, width: 375, height: 812 }
        ])
      }
    }
  }
  h.wxOverrides.createSelectorQuery = () => q
  const result = await renderPage({
    route: 'plate21/module/pages/s2-quiz/s2-quiz',
    wxOverrides: h.wxOverrides,
    settleMs: 700
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showCoach, true)
  assert.equal(result.data.coachStep.tag, '可以不猜')
  assert.equal(result.data.coachHole.top, 640)
  assert.ok(result.html.includes('先不猜，往下走'))
})

test('transit: 第一次见到顺路散页镂空指一次', async () => {
  const h = harness({ playGuideSeenAt: 99 })
  const q = {
    in() { return q },
    select() { return q },
    selectViewport() { return q },
    boundingClientRect() { return q },
    exec(cb) {
      if (cb) {
        cb([
          { top: 420, left: 24, width: 327, height: 88 },
          { top: 0, left: 0, width: 375, height: 812 }
        ])
      }
    }
  }
  h.wxOverrides.createSelectorQuery = () => q
  const result = await renderPage({
    route: 'plate21/module/pages/transit/transit',
    query: { leg: 's1-s2' },
    wxOverrides: h.wxOverrides,
    settleMs: 700
  })
  assert.deepEqual(result.errors, [])
  assert.equal(result.data.showCoach, true)
  assert.equal(result.data.coachStep.tag, '顺路一页')
  assert.ok(result.html.includes('档案里还夹着一页'))
})
