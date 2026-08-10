// P03 站间过渡（通用页，设计文档 §4.6 / §5-P03）
// query: leg = s1-s2 / s2-s3 / s3-s4
// 三段式：墨晕转场进入 → 路线推进图（黄铜点位 + 当前段铜绿加粗线）→ 该段环境叙事 → 继续前往。

// 三段过渡配置（四站结构：西洋楼入口 → 黄花阵 → 海晏堂·大水法 → 雨果雕像）
const LEGS = {
  's1-s2': {
    from: '西洋楼入口',
    to: '黄花阵',
    seg: 0,
    text: '信封指引的方向，正是前方那座迷宫。穿过断柱与荒草，往黄花阵去。',
    next: '/plate21/module/pages/s2-quiz/s2-quiz'
  },
  's2-s3': {
    from: '黄花阵',
    to: '海晏堂 · 大水法',
    seg: 1,
    text: '万字纹寓意福寿绵长，并不暗示“水”。展开资料袋里的手绘路线图：从黄花阵沿标注向东北行进，下一处圈注正是海晏堂·大水法。',
    next: '/plate21/module/pages/s3-comic/s3-comic'
  },
  's3-s4': {
    from: '海晏堂 · 大水法',
    to: '雨果雕像',
    seg: 2,
    text: '让水显纸自然晾干后收回资料袋。马首曾经流失海外，也终于回到圆明园；而在劫掠发生后的 1861 年，雨果写信公开谴责这场掠夺。循着信件线索，去近旁树荫下寻找他的雕像。',
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
    this.setData({ leg: leg, lines: lines, points: points })
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
