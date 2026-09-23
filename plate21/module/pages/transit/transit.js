// 站间过渡。v3 主线：入口→谐奇趣→黄花阵→方外观→海晏堂→蓄水楼→大水法→雨果。
// 旧 leg 名仍可打开，落到新的下一段，避免旧存档卡死。
// 转场正文取飞书 v3「剧情内容」离站句。散页不再挂主链。

const WP = '/plate21/module/pages/waypoint/waypoint'

const LEGS = {
  's1-xq': {
    from: '西洋楼入口',
    to: '谐奇趣',
    seg: 0,
    text: '按照路线图走进入口，就来到了谐奇趣。',
    sides: [],
    next: WP + '?site=xieqiqu'
  },
  'xq-s2': {
    from: '谐奇趣',
    to: '黄花阵',
    seg: 1,
    text: '原来线索在这里上！下一站的去处很明确了：黄花阵。',
    sides: [],
    next: '/plate21/module/pages/s2-quiz/s2-quiz'
  },
  's2-fw': {
    from: '黄花阵',
    to: '方外观',
    seg: 2,
    text: '我按照地图继续走，下一站是方外观。',
    sides: [],
    next: WP + '?site=fangwaiguan'
  },
  'fw-s3': {
    from: '方外观',
    to: '海晏堂',
    seg: 3,
    text: '下一站：海晏堂。',
    sides: [],
    next: '/plate21/module/pages/s3-comic/s3-comic'
  },
  's3-xs': {
    from: '海晏堂',
    to: '蓄水楼',
    seg: 4,
    text: '可是这些喷泉怎么喷出的水呢？水力钟在眼前，水源却不在水池里。地图上面我看到了蓄水楼，或许喷泉正是靠它喷水。',
    sides: [],
    next: WP + '?site=xushuilou'
  },
  'xs-ds': {
    from: '蓄水楼',
    to: '大水法',
    seg: 5,
    text: '顺着档案上的路线继续往前，大水法遗址逐渐出现在眼前。',
    sides: [],
    next: '/plate21/module/pages/dashuifa/dashuifa'
  },
  'ds-s4': {
    from: '大水法',
    to: '雨果雕像',
    seg: 6,
    text: '都没了，一场火过后，这些都没了……',
    sides: [],
    next: '/plate21/module/pages/s4-timeline/s4-timeline'
  }
}

LEGS['s1-s2'] = LEGS['s1-xq']
LEGS['s2-s3'] = LEGS['s2-fw']
LEGS['s3-s4'] = LEGS['s3-xs']
LEGS['s4-s5'] = LEGS['ds-s4']

const POINTS = [
  { name: '入口', x: 55, y: 430 },
  { name: '谐奇趣', x: 140, y: 370 },
  { name: '黄花阵', x: 225, y: 315 },
  { name: '方外观', x: 310, y: 260 },
  { name: '海晏堂', x: 395, y: 210 },
  { name: '蓄水楼', x: 470, y: 165 },
  { name: '大水法', x: 545, y: 115 },
  { name: '雨果', x: 620, y: 65 }
]

const playGuide = require('../../capabilities/play-guide/guide')
const coachHost = require('../../capabilities/play-guide/coach-host')

Page({
  behaviors: [coachHost],
  data: {
    leg: null,
    sides: [],
    sideVisited: {},
    points: POINTS,
    lines: [],
    advancing: false
  },

  onLoad(options) {
    if (playGuide.enterTourPage('pages/transit/transit', options)) {
      this.setData({ touring: true })
    }
    const leg = LEGS[options.leg] || LEGS['s1-s2']
    // 计算各段连线的位置 / 长度 / 角度，当前段用铜绿加粗示意
    const lines = []
    for (let i = 0; i < POINTS.length - 1; i++) {
      const a = POINTS[i]
      const b = POINTS[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      lines.push({
        left: a.x,
        top: a.y,
        width: Math.sqrt(dx * dx + dy * dy),
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
        current: i === leg.seg
      })
    }
    // INT-405：点位状态——已过点（index <= seg）打勾变暗，当前目标点（seg+1）呼吸高亮
    const points = POINTS.map((p, i) => ({
      ...p,
      done: i <= leg.seg,           // 已抵达（含起点）
      current: i === leg.seg + 1    // 当前前往的目标点
    }))
    this.setData({ leg: leg, sides: leg.sides || [], sideVisited: {}, lines: lines, points: points })
    this.refreshSideVisited()
  },

  onReady() {
    if (playGuide.isTouring()) {
      playGuide.runPageStop(this)
      return
    }
    const spots = (this.data.sides || []).length
      ? [playGuide.SPOTS.side, playGuide.SPOTS.go]
      : [playGuide.SPOTS.go]
    this.scheduleCoach(spots)
  },

  onShow() {
    // 从支线返回本页时刷新「已走过」标记
    this.refreshSideVisited()
  },

  refreshSideVisited() {
    const leg = this.data.leg
    if (!leg || !(leg.sides || []).length) return
    try {
      const snap = require('../../store/session').getSnapshot()
      const flags = (snap && snap.flags) || {}
      const visited = {}
      leg.sides.forEach(function (side) {
        visited[side.key] = !!flags['sideVisited_' + side.key]
      })
      this.setData({ sideVisited: visited })
    } catch (e) { /* 快照不可用时忽略 */ }
  },

  // v2 顺路散页：可选进入，不影响主线推进
  onOpenSide(e) {
    const url = e.currentTarget.dataset.url
    this.runAfterCoach(function () {
      if (this.data.advancing) return
      if (url) wx.navigateTo({ url: url })
    })
  },

  onNext() {
    this.runAfterCoach(function () {
      if (this.data.advancing) return
      this.setData({ advancing: true })
      wx.redirectTo({
        url: this.data.leg.next,
        fail: () => {
          this.setData({ advancing: false })
          wx.showToast({ title: '页面跳转失败，请重试', icon: 'none' })
        }
      })
    })
  }
})
