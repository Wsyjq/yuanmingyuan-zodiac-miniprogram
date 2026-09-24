// 考察者留言簿：「写」发生在通关当天 report 末尾，「读」在次日回访与信末。
// 状态机与 letter 同口径：notFinished（未完成考察）→ open（通关即可留言，不设日期门）。
// 数据：提交走 session.submitBoardMessage（宿主机检+人工审，rejected 不同意上墙不落已投递态）；
// 自己的话同时落 flags.boardDraft/boardSubmittedAt（本地卡片与 report 入口态）。
// 次日区块「昨日之路」：通关次日起渲染（与 letterReady 同门槛，当日不渲染不留预告）。
// 红线（v2 反结算）：只画走过的点位，零计数、零完成率、不提未走的站。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')

const WALL_COUNT = 6

// 点位文案：意象句原句优先（waypoint motif / 信 / dashuifa 页原文），
// 【新写·评审】s1「纸上二十幅…」、s3「十二个时辰…」、s4「他为一个…」、区块引言。
// otherHalf = 「另一半今天在哪儿」一句（拓展五的回声，不展开）；大水法留白站不挂。
const JOURNEY_POINTS = {
  prologue: { kicker: '入口', title: '那封信', seal: '信', motif: '说好了，到遗址门口再拆。', img: 'IMG-RUNTIME-PROLOGUE-STUDY.jpg' },
  s1: { kicker: '第一站', title: '西洋楼入口', seal: '拆', motif: '纸上二十幅，地上一座园。' },
  xieqiqu: { kicker: '路上', title: '谐奇趣', seal: '谐', motif: '他要什么，就往园子里搬什么。', otherHalf: '南池那条翻尾石鱼，如今在北大未名湖里，还在水里。' },
  s2: { kicker: '第二站', title: '黄花阵', seal: '阵', motif: '有人拿着一幅旧画，把地上的东西补回来了。', otherHalf: '你走的那道墙，是 1987、1989 年照着铜版画重新砌起来的。', img: 'IMG-RUNTIME-MAZE.jpg', fragment: '亭与墙' },
  yangquelong: { kicker: '路上', title: '养雀笼', seal: '雀', motif: '同一座建筑，一半留下来了，一半没有。', otherHalf: '木头的那一半烧了；石头的那一半，今天还站在甬道边。' },
  fangwaiguan: { kicker: '路上', title: '方外观', seal: '方', motif: '这一站没有对读，也没解开什么。她每次来，他陪着来，然后站在门外。' },
  s3: { kicker: '第三站', title: '海晏堂', seal: '晏', motif: '十二个时辰轮流报时，正午十二首齐喷。', otherHalf: '七尊回来了，五尊还没有消息；马首常出门巡展。', img: 'IMG-RUNTIME-DETAIL-BEAST.jpg', fragment: '水力钟' },
  xushuilou: { kicker: '路上', title: '蓄水楼', seal: '蓄', motif: '连它当年怎么转的，我们都不确定了。', otherHalf: '那栏档案还空着——水车怎么转的，三种说法谁也不敢选。' },
  dashuifa: { kicker: '留白', title: '大水法', seal: '水', motif: '档案上说，这里原来是全园水声最大的地方。' },
  guanshuifa: { kicker: '路上', title: '观水法', seal: '观', motif: '喷泉在南，宝座在北，中间隔着水。' },
  xianfahua: { kicker: '路上', title: '线法画', seal: '线', motif: '放下纸，又没有了。', otherHalf: '那几道墙荡然无存；方河清整了，如今种着荷。' },
  s4: { kicker: '第五站', title: '雨果雕像', seal: '雨', motif: '他为一个自己没见过的地方，写了一封信。', otherHalf: '七根石柱流散挪威百余年，2023 年回了家。', img: 'IMG-RUNTIME-HUGO.jpg', fragment: '信' },
  finale: { kicker: '终章', title: '档案夹合上', seal: '档', motif: '中间那块空白，昨天你站着的地方。', img: 'IMG-RUNTIME-PLATE.jpg' }
}

const SIDE_KEYS = ['xieqiqu', 'yangquelong', 'fangwaiguan', 'xushuilou', 'guanshuifa', 'xianfahua']
// 支线正典槽位（脏时间戳/无时间戳时的落位边界，不可穿越相邻锚点）
const SIDE_SLOT = {
  xieqiqu: ['s1', 's2'],
  yangquelong: ['s2', 's3'],
  fangwaiguan: ['s2', 's3'],
  xushuilou: ['s3', 'dashuifa'],
  guanshuifa: ['dashuifa', 's4'],
  xianfahua: ['dashuifa', 's4']
}

function stationTime(snap, station) {
  const records = snap.records || []
  for (let i = 0; i < records.length; i++) {
    if (records[i] && records[i].station === station && records[i].completedAt) {
      return records[i].completedAt
    }
  }
  // legacy 迁移存档兜底：该站日期卡（cardId 前缀）最早的 collectedAt
  const prefix = station + '-'
  let min = null
  Object.keys(snap.cards || {}).forEach(function (cardId) {
    const card = snap.cards[cardId]
    if (cardId.indexOf(prefix) === 0 && card && card.collectedAt) {
      if (min == null || card.collectedAt < min) min = card.collectedAt
    }
  })
  return min
}

// 时间线重建：锚点固定序（prologue→s1→s2→s3→大水法→s4→finale），
// 支线按时间戳插到相邻锚点之间；锚点时间未知或支线无时间戳时按正典槽位落。
function buildTimeline(snap) {
  const flags = snap.flags || {}
  const stations = snap.stations || {}
  const finished = !!(snap.finale || flags.experienceCompletedAt)
  const anchors = ['prologue', 's1', 's2', 's3']
  if (stations.s4 || finished) anchors.push('dashuifa')
  if (stations.s4 || snap.finale) anchors.push('s4')
  if (finished) anchors.push('finale')

  const seq = anchors.map(function (key) {
    let ts = null
    if (key === 'prologue') ts = snap.createdAt || null
    else if (key === 'finale') ts = flags.experienceCompletedAt || null
    else ts = stationTime(snap, key)
    return { kind: 'anchor', key: key, ts: ts }
  })

  const sides = SIDE_KEYS.filter(function (key) {
    return !!flags['sideVisited_' + key]
  }).map(function (key) {
    const ts = Number(flags['sideVisited_' + key])
    return { kind: 'side', key: key, ts: ts > 0 ? ts : null }
  }).sort(function (a, b) { return (a.ts || Infinity) - (b.ts || Infinity) })

  sides.forEach(function (side) {
    const bound = SIDE_SLOT[side.key]
    let lo = -1
    let hi = seq.length
    for (let i = 0; i < seq.length; i++) {
      if (seq[i].key === bound[0]) lo = i
      if (seq[i].key === bound[1]) hi = i
    }
    let insertAt = lo + 1
    for (let i = lo + 1; i < hi; i++) {
      const anchorTs = seq[i].ts
      if (side.ts != null && anchorTs != null && anchorTs <= side.ts) insertAt = i + 1
      else break
    }
    seq.splice(insertAt, 0, side)
  })

  return seq.map(function (event) {
    const conf = JOURNEY_POINTS[event.key] || {}
    const point = {
      key: event.key,
      kicker: conf.kicker || '',
      title: conf.title || '',
      seal: conf.seal || '',
      motif: conf.motif || '',
      otherHalf: conf.otherHalf || '',
      img: conf.img ? '/plate21/module/assets/img/' + conf.img : '',
      chips: []
    }
    const prefix = event.key + '-'
    Object.keys(snap.cards || {}).forEach(function (cardId) {
      const card = snap.cards[cardId]
      if (cardId.indexOf(prefix) === 0 && card) {
        point.chips.push('日期卡 · ' + card.digit)
      }
    })
    if (conf.fragment) point.chips.push('残片 · ' + conf.fragment)
    if (event.key === 'dashuifa') {
      const choice = flags.dashuifaChoice
      if (choice && choice !== 'skipped') point.chips.push('你听见的 · ' + choice)
    }
    if (event.key === 's4' && flags.messageSubmittedAt) point.chips.push('明信片 · 已投进信箱')
    if (event.key === 'finale' && flags.boardSubmittedAt) point.chips.push('留言 · 你的那一句')
    return point
  })
}

Page({
  data: {
    state: 'loading',
    mine: null,
    editing: false,
    draftText: '',
    submitting: false,
    wall: [],
    letterReady: false,
    journeyReady: false,
    journey: [],
    journeyActiveIndex: 0
  },

  onLoad() {
    if (session.getSnapshot()) this.refresh()
    else session.init({}).then(() => this.refresh())
  },

  refresh() {
    const snap = session.getSnapshot() || {}
    const flags = snap.flags || {}
    const finished = !!(snap.finale || flags.experienceCompletedAt)
    if (!finished) {
      this.setData({ state: 'notFinished' })
      return
    }
    const todayKey = sessionDate.dateKeyFromTimestamp(Date.now())
    const sessionDay = sessionDate.isValidDateKey(snap.sessionDate) ? snap.sessionDate : todayKey
    const journeyReady = todayKey > sessionDay
    this.setData({
      state: 'open',
      wall: [],
      mine: flags.boardSubmittedAt ? { text: flags.boardDraft || '' } : null,
      editing: !flags.boardSubmittedAt,
      draftText: flags.boardDraft || '',
      letterReady: journeyReady,
      journeyReady: journeyReady,
      journey: journeyReady ? buildTimeline(snap) : [],
      journeyActiveIndex: 0
    })
    // 留言墙走 adapter 展示池（过审内容；宿主不可用回落官方种子池）
    session.listBoardMessages({ limit: WALL_COUNT }).then((res) => {
      const wall = (res && res.messages || []).map((item, index) => ({
        text: item.text,
        from: item.from,
        date: item.date,
        tilt: index % 2 === 0 ? 'tilt-l' : 'tilt-r'
      }))
      this.setData({ wall: wall })
    }).catch(() => {
      this.setData({ wall: [] })
    })
  },

  onInput(e) {
    this.setData({ draftText: e.detail.value })
  },

  onSubmit() {
    const text = (this.data.draftText || '').trim()
    if (!text) {
      wx.showToast({ title: '写下那句话，再投进档案', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    session.submitBoardMessage(text)
      .then((res) => {
        if (res && res.status === 'rejected') {
          this.setData({ submitting: false })
          wx.showToast({ title: res.reason || '这条话不能展示，改一句再投', icon: 'none' })
          return
        }
        this.setData({ submitting: false, mine: { text: text }, editing: false })
        wx.showToast({
          title: res && res.status === 'accepted' ? '已在档案里了' : '已收到，审核后会展示给后来的人',
          icon: 'none'
        })
      })
      .catch(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '投递失败，请重试', icon: 'none' })
      })
  },

  onEdit() {
    this.setData({ editing: true, draftText: this.data.mine ? this.data.mine.text : '' })
  },

  onPickPoint(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (isNaN(index) || index < 0 || index >= this.data.journey.length) return
    this.setData({ journeyActiveIndex: index })
  },

  onOpenLetter() {
    if (!this.data.letterReady) {
      wx.showToast({ title: '明日启封', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/plate21/module/pages/letter/letter' })
  },

  onOpenReport() {
    wx.navigateTo({ url: '/plate21/module/pages/report/report' })
  },

  onBack() {
    wx.navigateBack({
      fail: function () { wx.reLaunch({ url: '/pages/ticket/ticket' }) }
    })
  }
})
