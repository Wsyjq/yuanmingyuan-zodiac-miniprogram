// P03 站间过渡（通用页，设计文档 §4.6 / §5-P03）
// query: leg = s1-s2 / s2-s3 / s3-s4
// 三段式：墨晕转场进入 → 路线推进图（黄铜点位 + 当前段铜绿加粗线）→ 该段环境叙事 → 继续前往。

// 三段过渡配置（四站结构：西洋楼入口 → 黄花阵 → 海晏堂·大水法 → 雨果雕像）
// side：v2 顺路支线的可选入口（不进主线，停不停由玩家决定；走完支线一键回主线）。
const LEGS = {
  's1-s2': {
    from: '西洋楼入口',
    to: '黄花阵',
    seg: 0,
    text: '信封指引的方向，正是前方那座迷宫。穿过断柱与荒草，往黄花阵去。',
    side: {
      key: 'xieqiqu',
      title: '谐奇趣',
      hook: '第一座欧式水法大殿。站在台基中间，听左边和右边一起响。',
      url: '/plate21/module/pages/waypoint/waypoint?site=xieqiqu'
    },
    next: '/plate21/module/pages/s2-quiz/s2-quiz'
  },
  's2-s3': {
    from: '黄花阵',
    to: '海晏堂 · 大水法',
    seg: 1,
    text: '万字纹寓意福寿绵长，并不暗示“水”。展开资料袋里的手绘路线图：从黄花阵沿标注向东北行进，下一处圈注正是海晏堂·大水法。',
    side: {
      key: 'yangquelong',
      title: '养雀笼 · 方外观',
      hook: '一半烧了的大门，和一座有人在门外等过的殿。',
      url: '/plate21/module/pages/waypoint/waypoint?site=yangquelong'
    },
    next: '/plate21/module/pages/s3-comic/s3-comic'
  },
  's3-s4': {
    from: '海晏堂 · 大水法',
    to: '雨果雕像',
    seg: 2,
    text: '让水显纸自然晾干后收回资料袋。马首曾经流失海外，也终于回到圆明园；而在劫掠发生后的 1861 年，雨果写信公开谴责这场掠夺。循着信件线索，去近旁树荫下寻找他的雕像。',
    side: {
      key: 'xushuilou',
      title: '蓄水楼 · 大水法 · 线法画',
      hook: '水从哪儿来，去哪儿了；还有两分钟，什么都不做。',
      url: '/plate21/module/pages/waypoint/waypoint?site=xushuilou'
    },
    next: '/plate21/module/pages/s4-timeline/s4-timeline'
  }
}

// 四站在地图占位块上的点位（rpx，容器 670×480）
const POINTS = [
  { name: '西洋楼入口', x: 90, y: 400 },
  { name: '黄花阵', x: 260, y: 290 },
  { name: '海晏堂', x: 430, y: 180 },
  { name: '雨果雕像', x: 600, y: 70 }
]

Page({
  data: {
    leg: null,
    side: null,
    sideVisited: false,
    points: POINTS,
    lines: [],
    advancing: false
  },

  onLoad(options) {
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
    this.setData({ leg: leg, side: leg.side || null, sideVisited: false, lines: lines, points: points })
  },

  onShow() {
    // 从支线返回本页时刷新「已走过」标记
    const leg = this.data.leg
    if (!leg || !leg.side) return
    try {
      const snap = require('../../store/session').getSnapshot()
      this.setData({ sideVisited: !!(snap && snap.flags && snap.flags['sideVisited_' + leg.side.key]) })
    } catch (e) { /* 快照不可用时忽略 */ }
  },

  // v2 顺路支线：可选进入，不影响主线推进
  onOpenSide() {
    if (this.data.advancing) return
    wx.navigateTo({ url: this.data.side.url })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    wx.redirectTo({
      url: this.data.leg.next,
      fail: () => {
        this.setData({ advancing: false })
        wx.showToast({ title: '页面跳转失败，请重试', icon: 'none' })
      }
    })
  }
})
