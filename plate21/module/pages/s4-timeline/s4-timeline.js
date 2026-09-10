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

// INT-403：触觉反馈辅助——wx.vibrateShort 带 type 参数，旧基础库降级为无参
function haptic(type) {
  try {
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: type || 'light', fail: function () { wx.vibrateShort && wx.vibrateShort() } })
    }
  } catch (e) { /* 部分设备/台架不支持，静默 */ }
}

const PARAGRAPHS = [
  '两百多年前，也曾有人与我有同样的悲愤。',
  '他不是中国人，他没有亲眼见过圆明园的辉煌，也没有站在这片废墟之中。',
  '当他得知这样一座凝聚人类文明成果的园林遭到破坏时，他依然写下了《致巴特勒上尉的信》，公开谴责这场掠夺。',
  '雨果雕像是一尊立于花岗岩底座上的青铜半身像。他的面容在树荫下沉静，眉头微蹙，目光投向远方的大水法残柱。',
  '雨果没有来到圆明园，却通过留下来的资料、图像和文字，想象出了这座园林曾经的辉煌，也记下了全人类文明的遗憾。',
  '而今天，我站在这些残留下来的遗迹面前，也试图寻找那些被时间掩埋的故事。'
]

const QUOTE = '2010年，这尊雕像落成，法国雕塑家娜什拉·凯努女士无偿创作，中法两方代表共同揭幕，作为中法文化交流的纪念。'

const HISTORY_LINES = [
  '将排列好顺序的时间轴和图片形成一张卡片：',
  '1747 西洋楼始建 → 1760 核心景观形成 → 1860 英法联军火烧圆明园 →',
  '1861 雨果致巴特勒上尉的信 → 2010 雨果雕像落成。'
]

// 槽位（顺序即正确答案）：5 个年份节点（采风修订版精简）
const SLOTS = require('../../config/tasks').s4_timeline_slots

// 事件卡（托盘顺序刻意打乱）；target = 槽位下标
const CARDS = require('../../config/tasks').s4_timeline_cards

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
    showHistory: false,
    historyLines: HISTORY_LINES,
    slots: SLOTS.map(s => ({ ...s, filled: '', flash: false })),
    cards: [],
    scrollLeft: 0,
    timelineComplete: false,
    monologue: false, // 独白 + 生成报告按钮
    cardNumber: 0,    // 时间轴卡片角落数字（日期第二位）
    saveError: '',
    selectedCard: -1,
    pointTip: '',
    attempts: 0,
    advancing: false,
  },

  onLoad() {
    this._timers = []
    this._reducedMotion = motion.prefersReducedMotion()
    session.viewPuzzle('s4-timeline')
    const solved = session.isPuzzleComplete('s4-timeline')
    this.setData({
      phase: solved ? 'puzzle' : 'novel',
      cardNumber: Number(session.getCardDigit('s4-timeline')),
      slots: buildSlots(solved),
      cards: buildCards(solved),
      timelineComplete: solved,
      monologue: solved,
      showHistory: solved
    })
  },

  onNovelFinish() {
    this.setData({ phase: 'puzzle', showHistory: false })
  },

  onCloseHistory() {
    this.setData({ showHistory: false })
  },

  onCardStart(e) {
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
      this.setData({ monologue: true, showHistory: true })
      // 收集时间轴卡片角落数字（日期第二位）——主线：卡片数字 → 日期密码
      session.completePuzzle('s4-timeline', {
        answer: SLOTS.map(function (slot) { return slot.label }),
        attempts: attempts
      }, { collectCard: true }).catch(() => {
        this.setData({ saveError: '时间轴进度暂未保存，下一步会自动重试。' })
      })
    }, this._reducedMotion ? 0 : 900))
  },

  // 前往密码输入页（第四站在密码校验通过后才 completeStation）
  goReport() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s4-timeline', {
      answer: SLOTS.map(function (slot) { return slot.label }),
      attempts: this.data.attempts || 1
    }, { collectCard: true, checkpoint: 's4-password' }).then(() => {
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
