// P03 站间过渡（通用页，设计文档 §4.6 / §5-P03；剧情文案对齐 V2.1 可用稿）
// query: leg = s1-s2 / s2-s3 / s3-s4 / s4-s5
// 三段式：墨晕转场进入 → 路线推进图（黄铜点位 + 当前段铜绿加粗线）→ 该段环境叙事 → 继续前往。
//
// 主线五点（V2.1）：入口 → 黄花阵 → 海晏堂 → 大水法（主线站，无对读）→ 雨果雕像。
// sides：v2 顺路散页的可选入口（数组，一段可挂多张；不进主线，停不停由玩家决定）。
// 转场红线（总设定 §5）：现场先发生，台词后跟上——不预告雨果、不发明象征、导航退页脚。

// 四段过渡配置
const LEGS = {
  's1-s2': {
    from: '西洋楼入口',
    to: '黄花阵',
    seg: 0,
    text: '两半合上，是三个字：黄花阵。正是夹着那张照片的一页。往东，墙齐腰高，是一座迷宫。',
    sides: [
      {
        key: 'xieqiqu',
        title: '谐奇趣',
        hook: '去迷宫的路上会先经过西洋楼的第一座殿。档案里最早的那页图，就是从那儿起稿的。路过能翻就翻。不翻也行。',
        url: '/plate21/module/pages/waypoint/waypoint?site=xieqiqu'
      }
    ],
    next: '/plate21/module/pages/s2-quiz/s2-quiz'
  },
  's2-s3': {
    from: '黄花阵',
    to: '海晏堂',
    seg: 1,
    text: '从迷宫出来往东，地势塌下去一块，露出一口干池子。画上的喷泉还在喷，池子是干的。往东，路上第一座水法大殿，档案的下一页就是它。',
    sides: [
      {
        key: 'yangquelong',
        title: '养雀笼 · 方外观',
        hook: '甬道右手有一座门，东面还完整，西面什么都没有。再往前几十步，还有一页，档案上只有一行字。',
        url: '/plate21/module/pages/waypoint/waypoint?site=yangquelong'
      }
    ],
    next: '/plate21/module/pages/s3-comic/s3-comic'
  },
  's3-s4': {
    from: '海晏堂',
    to: '大水法',
    seg: 2,
    text: '把水显纸晾干收好，往东看——几根残柱已经戳在视线尽头。档案的下一页就在那儿，画上水花翻得很凶。',
    sides: [
      {
        key: 'xushuilou',
        title: '蓄水楼',
        hook: '路过一座土台。喷泉没有电泵，水是从那儿来的。路过能翻就翻，不翻也行。',
        url: '/plate21/module/pages/waypoint/waypoint?site=xushuilou'
      }
    ],
    next: '/plate21/module/pages/dashuifa/dashuifa'
  },
  's4-s5': {
    from: '大水法',
    to: '雨果雕像',
    seg: 3,
    text: '往东本就是出路。草地当中立着一尊铜像——先看见人，再翻档案。夹里最后一份封套上写着：到像下拆。',
    sides: [
      {
        key: 'guanshuifa',
        title: '观水法',
        hook: '皇帝看喷泉坐在南面。档案里夹着这一页。路过能翻就翻。',
        url: '/plate21/module/pages/waypoint/waypoint?site=guanshuifa'
      },
      {
        key: 'xianfahua',
        title: '线法画',
        hook: '往东还有几道空墙。档案上说那里曾经有一条假的街。能翻就翻，不翻也行。',
        url: '/plate21/module/pages/waypoint/waypoint?site=xianfahua'
      }
    ],
    next: '/plate21/module/pages/s4-timeline/s4-timeline'
  }
}

// 五站在地图占位块上的点位（rpx，容器 670×480；从西往东）
const POINTS = [
  { name: '西洋楼入口', x: 85, y: 400 },
  { name: '黄花阵', x: 240, y: 305 },
  { name: '海晏堂', x: 385, y: 220 },
  { name: '大水法', x: 515, y: 145 },
  { name: '雨果雕像', x: 615, y: 65 }
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
    this.scheduleCoach([playGuide.SPOTS.side, playGuide.SPOTS.go])
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
