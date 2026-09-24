const statusBarBeh = require('../../utils/status-bar')
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
    text: '画面里的猎狗、铜鹿和水流终于全部归位。我抬起头，想再和眼前的遗址对照一次。可这一回，我突然不知道该从哪里开始对照了。',
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

const coachHost = require('../../capabilities/play-guide/coach-host')
const mainline = require('../../capabilities/map/sites-mainline')
const session = require('../../store/session')

function mapModel() {
  const sites = mainline.visitState(session.getSnapshot())
  return {
    sites: sites,
    markers: mainline.SITES.map(function (site, index) {
      const row = sites[index]
      return {
        id: index + 1,
        latitude: site.latitude,
        longitude: site.longitude,
        width: 28,
        height: 28,
        iconPath: '/plate21/module/assets/img/icons/ic-map-pin-brass.png',
        callout: {
          content: site.name + (row && row.opened ? '' : ' · 未到'),
          display: 'ALWAYS',
          padding: 4,
          borderRadius: 4,
          fontSize: 11,
          color: '#46382A',
          bgColor: '#F7F4EC'
        }
      }
    }),
    polyline: [{
      points: mainline.SITES.map(function (site) {
        return { latitude: site.latitude, longitude: site.longitude }
      }),
      color: '#8C6239',
      width: 4,
      dottedLine: true,
      arrowLine: true
    }]
  }
}

Page({
  behaviors: [statusBarBeh, coachHost],
  data: {
    leg: null,
    sides: [],
    sideVisited: {},
    advancing: false,
    sites: [],
    markers: [],
    polyline: [],
    center: { latitude: 40.0132, longitude: 116.311 }
  },

  onLoad(options) {
    const leg = LEGS[options.leg] || LEGS['s1-s2']
    const focus = mainline.SITES[Math.min(leg.seg + 1, mainline.SITES.length - 1)]
    this.setData(Object.assign({
      leg: leg,
      sides: leg.sides || [],
      sideVisited: {},
      center: { latitude: focus.latitude, longitude: focus.longitude }
    }, mapModel()))
    this.refreshSideVisited()
  },

  onReady() {},

  onShow() {
    this.setData(Object.assign({ advancing: false }, mapModel()))
    this.refreshSideVisited()
  },

  onOpenVisited(e) {
    const id = e.currentTarget.dataset.id
    const site = (this.data.sites || []).filter(function (row) { return row.id === id })[0]
    if (!site || !site.opened || !site.page) return
    wx.navigateTo({ url: site.page })
  },

  onMarker(e) {
    const index = Number(e.detail && e.detail.markerId) - 1
    const site = (this.data.sites || [])[index]
    if (!site || !site.opened || !site.page) return
    wx.navigateTo({ url: site.page })
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
