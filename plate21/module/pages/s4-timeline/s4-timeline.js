/**
 * 第四站 · 雨果雕像时间轴排序（采风修订版）
 * 流程：站名叙事 2 段 + 雨果铭文引文卡 → HistoryCard（雕像落成记载）→ 谜题区：
 * 横向时间轴 5 个槽位（1747 / 1760 / 1860 / 1861 / 2010）；
 * 打乱的 5 张事件卡。拖对吸附、拖错弹回。
 * 全部归位 → 金线流动 + 屏幕轻震 → 独白 + 卡片角落数字（日期第二位）
 * → 前往密码输入页（本页不直接收口第四站，密码校验通过后原子完成 s4）。
 */
const session = require('../../store/session')
const drag = require('../../utils/drag')
const motion = require('../../utils/motion')
const audioSrc = require('../../utils/audio-src')
const audioBus = require('../../utils/audio-bus')

// INT-403：触觉反馈辅助——wx.vibrateShort 带 type 参数，旧基础库降级为无参
function haptic(type) {
  try {
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: type || 'light', fail: function () { wx.vibrateShort && wx.vibrateShort() } })
    }
  } catch (e) { /* 部分设备/台架不支持，静默 */ }
}

// 站名叙事（V2.2 讲述版 §第五站：守档人全剧首次出声，先对年再读信）
const PARAGRAPHS = [
  '1861年，圆明园被焚毁后的第二年，雨果在法国写下《致巴特勒上尉的信》，公开谴责英法联军对圆明园的劫掠和焚毁。奇怪的是，他从来没有来过这里。如今，他的雕像就立在西洋楼遗址旁。',
  '档案袋里另夹着一封同名的信。这不是序章里那本未写完的考察日记，也不是写给「后来者」的私人嘱托——是一份印好的公开信节选，放在档案里当物证。'
]

const QUOTE = '2010年，这尊雕像落成，法国雕塑家娜什拉·凯努女士无偿创作，中法两方代表共同揭幕，作为中法文化交流的纪念。'

// 站尾收束（V2.2：守档人四段台词串起 拆封套→读信→四件东西→开放问→收束）
const MONOLOGUE_PARAGRAPHS = [
  '排完才对上：信是一八六一年写的，写的人从没来过中国；像是二〇一〇年才立的。年对齐了，再读信。'
]

const RELIC_CARDS = [
  { no: '一', text: '观水法石屏风。曾搬进城里私园，1977 年运回原址。圆明园第一件完整回归的流失文物。' },
  { no: '二', text: '翻尾石鱼。谐奇趣南池那条，现在北京大学未名湖西侧。去过谐奇趣的人会多一声，原来那座空池说的就是它。没去过，这张卡自己也成立。' },
  { no: '三', text: '七根汉白玉石柱。流到挪威一百多年，完好，2023 年回来了。' },
  { no: '四', text: '铜鹿和十只铜狗。大水法池里的。1860 年之后没有任何下落。石座还在，东西没了。' }
]

const OPEN_QUESTION = '一样东西放在哪儿，才算被保住了？'

const HISTORY_LINES = [
  '将排列好顺序的时间轴和图片形成一张卡片：',
  '1747 西洋楼始建 → 1760 核心景观形成 → 1860 英法联军火烧圆明园 →',
  '1861 雨果致巴特勒上尉的信 → 2010 雨果雕像落成。'
]

// 槽位（顺序即正确答案）：5 个年份节点（采风修订版精简）
const SLOTS = [
  { label: '1747' }, { label: '1760' }, { label: '1860' }, { label: '1861' }, { label: '2010' }
]

// 事件卡（托盘顺序刻意打乱）；target = 槽位下标
const CARDS = [
  { id: 'c2010', title: '雨果雕像落成', sub: '中法文化交流纪念', target: 4 },
  { id: 'c1860', title: '英法联军火烧圆明园', sub: '一场劫火留下废墟', target: 2 },
  { id: 'c1747', title: '西洋楼开始建造', sub: '营造由此开始', target: 0 },
  { id: 'c1861', title: '雨果致巴特勒上尉的信', sub: '公开谴责这场掠夺', target: 3 },
  { id: 'c1760', title: '早期核心景观基本形成', sub: '远瀛观等景观仍有增建', target: 1 }
]

function buildCards(solved) {
  return CARDS.map((card) => {
    return Object.assign({}, card, {
      placed: !!solved,
      dragging: false,
      dragStyle: ''
    })
  })
}

function eventPoint(event, ending) {
  const list = ending ? event.changedTouches : event.touches
  const touch = list && list[0]
  return touch ? { x: Number(touch.clientX) || 0, y: Number(touch.clientY) || 0 } : null
}

function pointHit(point, rects, tolerance) {
  if (!point || !Array.isArray(rects)) return -1
  const extra = Number(tolerance) || 0
  return rects.findIndex(function (rect) {
    return rect && point.x >= rect.left - extra && point.x <= rect.left + rect.width + extra &&
      point.y >= rect.top - extra && point.y <= rect.top + rect.height + extra
  })
}

function buildSlots(solved) {
  return SLOTS.map((slot, index) => {
    const card = solved && CARDS.find((item) => item.target === index)
    return { ...slot, filled: card ? card.title : '', flash: false }
  })
}

Page({
  data: {
    phase: 'novel', // novel | puzzle
    paragraphs: PARAGRAPHS,
    quote: QUOTE,
    monologueParagraphs: MONOLOGUE_PARAGRAPHS,
    relicCards: RELIC_CARDS,
    openQuestion: OPEN_QUESTION,
    showHistory: false,
    historyLines: HISTORY_LINES,
    slots: SLOTS.map(s => ({ ...s, filled: '', flash: false })),
    cards: [],
    scrollLeft: 0,
    timelineComplete: false,
    monologue: false, // 独白 + 生成报告按钮
    skipped: false,   // V2.1：时间轴可跳，跳过直接读信（不发日期卡）
    cardNumber: 0,    // 时间轴卡片角落数字（日期第二位）
    saveError: '',
    selectedCard: -1,
    pointTip: '',
    attempts: 0,
    advancing: false,
    narrSrc: audioSrc.clip('narr-s4-timeline')
  },

  onLoad() {
    this._timers = []
    this._reducedMotion = motion.prefersReducedMotion()
    session.viewPuzzle('s4-timeline')
    const solved = session.isPuzzleComplete('s4-timeline')
    const skipped = !!(solved && session.getPuzzle('s4-timeline') && session.getPuzzle('s4-timeline').payload && session.getPuzzle('s4-timeline').payload.action === 'skipped')
    this.setData({
      phase: solved ? 'puzzle' : 'novel',
      narrSrc: audioSrc.clip(solved ? 'narr-s4-timeline-mono' : 'narr-s4-timeline'),
      cardNumber: Number(session.getCardDigit('s4-timeline')),
      slots: buildSlots(solved),
      cards: buildCards(solved),
      timelineComplete: solved && !skipped,
      monologue: solved,
      skipped: skipped,
      showHistory: solved && !skipped
    })
  },

  onNovelFinish() {
    this.setData({ phase: 'puzzle', showHistory: false, narrSrc: '' })
  },

  onCloseHistory() {
    this.setData({ showHistory: false })
  },

  onCardStart(e) {
    // V2.3：答题交互起，压停正在播的人声（做题与听讲不打架）
    audioBus.stopKind('voice')
    const idx = e.currentTarget.dataset.idx
    const c = this.data.cards[idx]
    if (!c || c.placed || this.data.monologue) return
    const point = eventPoint(e, false)
    if (!point) return
    this._dragState = { id: Number(idx), start: point, last: point, moved: false }
    this._lastDragUpdate = 0
    drag.measure('.tl-slot').then(rects => { this._slotRects = rects })
    this.setData({ [`cards[${idx}].dragging`]: true })
  },

  onCardSelect(e) {
    if (this._ignoreCardTapUntil && Date.now() < this._ignoreCardTapUntil) return
    const index = Number(e.currentTarget.dataset.idx)
    const card = this.data.cards[index]
    if (!card || card.placed || this.data.monologue) return
    this.setData({ selectedCard: index, pointTip: '已选“' + card.title + '”，再点对应年份。' })
  },

  onSlotTap(e) {
    if (this.data.monologue) return
    const slotIndex = Number(e.currentTarget.dataset.index)
    const cardIndex = this.data.selectedCard
    const card = this.data.cards[cardIndex]
    if (!card) {
      this.setData({ pointTip: '也可以先点一张事件卡，再点它对应的年份。' })
      return
    }
    if (card.target !== slotIndex) {
      const attempts = this.data.attempts + 1
      this.setData({ attempts: attempts })
      session.attemptPuzzle('s4-timeline', attempts, false, 'tap')
      this.setData({ pointTip: '年份没有对应，再核对事件发生的先后。' })
      this.flashSlot(slotIndex)
      return
    }
    this.setData({
      [`cards[${cardIndex}].placed`]: true,
      [`slots[${slotIndex}].filled`]: card.title,
      selectedCard: -1,
      pointTip: '归位正确，继续选择下一张事件卡。',
      scrollLeft: Math.max(0, slotIndex * 170 * drag.ratio() - 120)
    })
    haptic('light')
    if (this.data.cards.every(function (item) { return item.placed })) this.finish()
  },

  onCardMove(e) {
    const state = this._dragState
    const point = eventPoint(e, false)
    if (!state || !point) return
    state.last = point
    const dx = point.x - state.start.x
    const dy = point.y - state.start.y
    state.moved = state.moved || Math.abs(dx) + Math.abs(dy) > 8
    const now = Date.now()
    if (now - this._lastDragUpdate < 32) return
    this._lastDragUpdate = now
    this.setData({
      [`cards[${state.id}].dragStyle`]: 'transform:translate3d(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px,0);'
    })
    this.updateNear(point)
  },

  // INT-402：拖到槽位上方时槽位高亮（松手前可见吸附预提示）
  updateNear(point) {
    if (!this._slotRects) return
    const hit = pointHit(point, this._slotRects, 8)
    if (hit === this._nearSlot) return
    const updates = {}
    if (this._nearSlot >= 0) updates[`slots[${this._nearSlot}].near`] = false
    if (hit >= 0) updates[`slots[${hit}].near`] = true
    this._nearSlot = hit
    this.setData(updates)
  },

  onCardEnd(e) {
    const state = this._dragState
    if (!state) return
    const point = eventPoint(e, true) || state.last
    const idx = state.id
    this._dragState = null
    this.clearNear()
    if (!state.moved) {
      this.setData({ [`cards[${idx}].dragging`]: false, [`cards[${idx}].dragStyle`]: '' })
      return
    }
    this._ignoreCardTapUntil = Date.now() + 250
    const c = this.data.cards[idx]
    drag.measure('.tl-slot').then(rects => {
      const hit = pointHit(point, rects, 20)
      const updates = {
        [`cards[${idx}].dragging`]: false,
        [`cards[${idx}].dragStyle`]: ''
      }
      if (hit === c.target) {
        updates[`cards[${idx}].placed`] = true
        updates[`slots[${hit}].filled`] = c.title
        // 滚动时间轴，让刚填入的槽位进入视野
        updates.scrollLeft = Math.max(0, hit * 170 * drag.ratio() - 120)
        updates.selectedCard = -1
        updates.pointTip = '归位正确，继续选择下一张事件卡。'
        this.setData(updates)
        haptic('light')   // INT-403：事件卡吸附
        if (this.data.cards.every(it => it.placed)) this.finish()
      } else {
        const attempts = this.data.attempts + 1
        this.setData({ attempts: attempts })
        session.attemptPuzzle('s4-timeline', attempts, false, 'drag')
        this.setData(updates)
        if (hit >= 0) this.flashSlot(hit)
      }
    })
  },

  // INT-402：清除磁吸预提示高亮
  clearNear() {
    if (this._nearSlot >= 0) {
      this.setData({ [`slots[${this._nearSlot}].near`]: false })
      this._nearSlot = -1
    }
  },

  flashSlot(i) {
    this.setData({ [`slots[${i}].flash`]: true })
    this._timers.push(setTimeout(() => this.setData({ [`slots[${i}].flash`]: false }), 400))
  },

  finish() {
    if (this.data.timelineComplete) return
    const attempts = this.data.attempts + 1
    this.setData({ attempts: attempts })
    session.attemptPuzzle('s4-timeline', attempts, true, 'drag_or_tap')
    haptic('medium')
    this.setData({ timelineComplete: true })
    const self = this
    this._timers.push(setTimeout(() => {
      this.setData({
        monologue: true,
        showHistory: true,
        narrSrc: audioSrc.clip('narr-s4-timeline-mono')
      })
      // 收集时间轴卡片角落数字（日期第二位）——主线：卡片数字 → 日期密码
      session.completePuzzle('s4-timeline', {
        answer: SLOTS.map(function (slot) { return slot.label }),
        attempts: attempts
      }, { collectCard: true }).catch(() => {
        this.setData({ saveError: '时间轴进度暂未保存，下一步会自动重试。' })
      })
    }, this._reducedMotion ? 0 : 900))
  },

  // V2.1：时间轴可跳——跳过不发该卡，直接进读信收尾（monologue）。
  onSkipTimeline() {
    if (this.data.monologue) return
    this.setData({
      monologue: true,
      skipped: true,
      narrSrc: audioSrc.clip('narr-s4-timeline-mono')
    })
    session.attemptPuzzle('s4-timeline', this.data.attempts, true, 'skip')
    session.completePuzzle('s4-timeline', { action: 'skipped', attempts: this.data.attempts })
      .catch(() => {
        this.setData({ saveError: '进度暂未保存，下一步会自动重试。' })
      })
  },

  // 前往密码输入页（第四站在密码校验通过后才 completeStation）
  goReport() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s4-timeline', {
      answer: SLOTS.map(function (slot) { return slot.label }),
      attempts: this.data.attempts || 1
    }, { collectCard: !this.data.skipped, checkpoint: 's4-password' }).then(() => {
      wx.redirectTo({
        url: '/plate21/module/pages/s4-password/s4-password',
        fail: () => this.setData({ advancing: false })
      })
    }).catch(() => {
      this.setData({ advancing: false, saveError: '进度保存失败，请再次点击重试。' })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  },

  onUnload() {
    this._dragState = null
    ;(this._timers || []).forEach(clearTimeout)
  }
})
