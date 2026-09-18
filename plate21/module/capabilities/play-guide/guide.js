/**
 * 开玩引导：封面镂空三钮；各页第一次见到路上钮再指一次。
 * 红标题直说这个钮干什么。游客侧不出现「谜题」。
 */

const FLAG = 'playGuideSeenAt'

const SPOTS = {
  go: {
    flag: 'coachGoAt',
    selector: '#coachGo',
    tag: '去下一站',
    tap: '继续前往',
    body: '这一页做完了，点它往前。',
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
  map: {
    flag: 'coachMapAt',
    selector: '#coachMap',
    tag: '打开地图',
    tap: '右下角针尖',
    body: '看你现在在哪、下一站往哪走。',
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
    },
    {
      selector: '#coachHelp',
      tag: '再看玩法',
      tap: '玩法说明',
      body: '各钮干什么，忘了来这里查。'
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
      { tap: '继续 / 继续前往', tag: '去下一站' },
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
  return tour + spots + board
}

module.exports = {
  FLAG: FLAG,
  GROUPS: GROUPS,
  SPOTS: SPOTS,
  coverSteps: coverSteps,
  shouldShow: shouldShow,
  shouldShowSpot: shouldShowSpot,
  copyBlob: copyBlob
}
