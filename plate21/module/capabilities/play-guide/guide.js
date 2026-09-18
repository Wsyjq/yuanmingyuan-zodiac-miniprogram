/**
 * 开玩引导：封面短标签两步，再短暂跳到后页用同样镂空分别指听/导览/地图/提示/翻页。
 * 游客侧不出现「谜题」。跳页不落考察进度。
 */

const FLAG = 'playGuideSeenAt'
const COVER_URL = '/plate21/module/pages/cover/cover'

const SPOTS = {
  go: {
    flag: 'coachGoAt',
    selector: '#coachGo',
    tag: '翻到下一页',
    tap: '继续前往',
    body: '这一页看完了，点它往前。',
    skipIfMissing: true
  },
  listen: {
    flag: 'coachListenAt',
    selector: '#coachListen',
    tag: '听这一页',
    tap: '听 · 本页讲述',
    body: '听人把这一页讲完。不想听就关，读字也能走完。',
    skipIfMissing: true
  },
  guide: {
    flag: 'coachGuideAt',
    selector: '#coachGuide',
    tag: '语音导览',
    tap: '右下角播放',
    body: '本站讲解。开了听，关了读字，都能走完。',
    skipIfMissing: true
  },
  map: {
    flag: 'coachMapAt',
    selector: '#coachMap',
    tag: '打开地图',
    tap: '右下角针尖',
    body: '看你现在在哪、下一站往哪走。',
    skipIfMissing: true
  },
  hint: {
    flag: 'coachHintAt',
    selector: '#coachHint',
    tag: '看提示',
    tap: '想不出来了',
    body: '卡住时点它，会多给一句。不是必须点。',
    skipIfMissing: true
  },
  skip: {
    flag: 'coachSkipAt',
    selector: '#coachSkip',
    tag: '可以不猜',
    tap: '先不猜，往下走',
    body: '浅色那一行。这处不做，也能走完。',
    skipIfMissing: true
  },
  dashuifa: {
    flag: 'coachDashuifaAt',
    selector: '#coachDashuifa',
    tag: '听两分钟现场',
    tap: '开始两分钟',
    body: '只开这一站的现场声音，不是把游戏重来。',
    skipIfMissing: true
  },
  side: {
    flag: 'coachSideAt',
    selector: '#coachSide',
    tag: '顺路一页',
    tap: '档案里还夹着一页',
    body: '路过能翻就翻。不点也行，直接继续前往。',
    skipIfMissing: true
  }
}

const TOUR_STOPS = [
  {
    host: 'page',
    route: 'pages/s1-decode/s1-decode',
    url: '/plate21/module/pages/s1-decode/s1-decode?tour=1',
    spots: ['listen']
  },
  {
    host: 'overlay',
    route: 'pages/s2-quiz/s2-quiz',
    url: '/plate21/module/pages/s2-quiz/s2-quiz?tour=1',
    spots: ['guide', 'map']
  },
  {
    host: 'page',
    route: 'pages/s2-quiz/s2-quiz',
    url: '/plate21/module/pages/s2-quiz/s2-quiz?tour=1',
    spots: ['hint']
  },
  {
    host: 'page',
    route: 'pages/transit/transit',
    url: '/plate21/module/pages/transit/transit?tour=1&leg=s1-s2',
    spots: ['go']
  }
]

let tourIndex = -1

function resolveSpots(keys) {
  return (keys || []).map(function (k) { return SPOTS[k] }).filter(Boolean)
}

function isTourQuery(options) {
  return !!(options && (options.tour === '1' || options.tour === 1))
}

function isTouring() {
  return tourIndex >= 0
}

function currentStop() {
  return tourIndex >= 0 ? TOUR_STOPS[tourIndex] : null
}

function resetTour() {
  tourIndex = -1
}

function startTour() {
  tourIndex = 0
  return TOUR_STOPS[0]
}

function enterTourPage(routeKey, options) {
  if (!isTourQuery(options)) return false
  if (tourIndex < 0) {
    const i = TOUR_STOPS.findIndex(function (s) {
      return s.route === routeKey || (s.url && s.url.indexOf(routeKey) >= 0)
    })
    tourIndex = i >= 0 ? i : 0
  }
  return true
}

function advanceTour() {
  if (tourIndex < 0) return { done: true, url: COVER_URL }
  tourIndex += 1
  if (tourIndex >= TOUR_STOPS.length) {
    tourIndex = -1
    return { done: true, url: COVER_URL }
  }
  return TOUR_STOPS[tourIndex]
}

function continueTour() {
  if (typeof wx === 'undefined' || !wx.redirectTo) return
  const next = advanceTour()
  const go = function () { wx.redirectTo({ url: next.url }) }
  if (next.done) {
    const session = require('../../store/session')
    session.setFlag(FLAG, Date.now()).then(go).catch(go)
    return
  }
  go()
}

function abortTour() {
  tourIndex = -1
}

function runPageStop(page) {
  if (tourIndex < 0) return false
  const stop = TOUR_STOPS[tourIndex]
  if (!stop || stop.host !== 'page' || !page || !page.scheduleCoach) return false
  page.scheduleCoach(resolveSpots(stop.spots), 400)
  return true
}

function runOverlayStop(comp) {
  if (tourIndex < 0) return false
  const stop = TOUR_STOPS[tourIndex]
  if (!stop || stop.host !== 'overlay' || !comp || !comp.scheduleCoach) return false
  comp.scheduleCoach(resolveSpots(stop.spots), 500)
  return true
}

function coverSteps(hasRecord, completed) {
  const start = hasRecord
    ? (completed
      ? {
        selector: '#coachStart',
        tag: '去看报告',
        tap: '查看考察报告',
        body: '已经走完。点它看那张报告。'
      }
      : {
        selector: '#coachStart',
        tag: '从上次接着',
        tap: '继续考察',
        body: '从上次停下的那一页继续。'
      })
    : {
      selector: '#coachStart',
      tag: '从这里开始',
      tap: '开始考察',
      body: '点这个朱红钮，进序章。'
    }
  return [
    start,
    {
      selector: '#coachHandbook',
      tag: '翻考察手册',
      tap: '考察手册',
      body: '日期卡、照片、散页入口都在里面，路上随时翻。'
    }
  ]
}

const GROUPS = [
  {
    title: '开始',
    tags: [
      { tap: '开始考察', tag: '从这里开始' },
      { tap: '继续考察', tag: '从上次接着' },
      { tap: '开始两分钟', tag: '听两分钟现场' },
      { tap: '重新考察', tag: '从头再来' }
    ]
  },
  {
    title: '朱红框',
    tags: [
      { tap: '继续 / 继续前往', tag: '翻到下一页' },
      { tap: '前往××', tag: '去那一站' },
      { tap: '记下了 · 就是这样', tag: '记下这一处' }
    ]
  },
  {
    title: '浅色字',
    tags: [
      { tap: '先不猜，往下走', tag: '可以不猜' },
      { tap: '跳过，不回答', tag: '可以不选' },
      { tap: '想不出来了', tag: '看提示' }
    ]
  },
  {
    title: '路上',
    tags: [
      { tap: '档案里还夹着一页', tag: '顺路一页' },
      { tap: '右下角针尖', tag: '打开地图' },
      { tap: '听 · 本页讲述', tag: '听这一页' },
      { tap: '右下角播放', tag: '语音导览' },
      { tap: '考察手册', tag: '翻考察手册' }
    ]
  }
]

function shouldShow(snapshot) {
  const flags = (snapshot && snapshot.flags) || {}
  return !flags[FLAG]
}

function shouldShowSpot(snapshot, flag) {
  const flags = (snapshot && snapshot.flags) || {}
  return !flags[flag]
}

function copyBlob() {
  const tour = coverSteps(false, false).concat(coverSteps(true, false)).concat(coverSteps(true, true))
    .map(function (s) {
      const names = (s.names || []).map(function (n) { return n.tap + n.tag }).join('')
      return s.tag + s.tap + s.body + names
    }).join('')
  const spots = Object.keys(SPOTS).map(function (k) {
    const s = SPOTS[k]
    return s.tag + s.tap + s.body
  }).join('')
  const board = GROUPS.map(function (g) {
    return g.title + g.tags.map(function (t) { return t.tap + t.tag }).join('')
  }).join('')
  const stops = TOUR_STOPS.map(function (s) { return s.url + s.host + (s.spots || []).join('') }).join('')
  return tour + spots + board + stops
}

module.exports = {
  FLAG: FLAG,
  COVER_URL: COVER_URL,
  GROUPS: GROUPS,
  SPOTS: SPOTS,
  TOUR_STOPS: TOUR_STOPS,
  coverSteps: coverSteps,
  shouldShow: shouldShow,
  shouldShowSpot: shouldShowSpot,
  copyBlob: copyBlob,
  isTourQuery: isTourQuery,
  isTouring: isTouring,
  currentStop: currentStop,
  resetTour: resetTour,
  startTour: startTour,
  enterTourPage: enterTourPage,
  advanceTour: advanceTour,
  continueTour: continueTour,
  abortTour: abortTour,
  runPageStop: runPageStop,
  runOverlayStop: runOverlayStop
}
