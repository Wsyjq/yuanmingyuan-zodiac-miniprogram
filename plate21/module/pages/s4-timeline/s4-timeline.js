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
const anime = require('../../utils/anime')

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

const CARD_W = 340
const CARD_H = 130
const AREA_TOP = 588 // 卡片区起点（rpx）：标题 190 + 时间轴区 + 间距

function buildCards(solved) {
  return CARDS.map((c, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 25 + col * 360
    const y = AREA_TOP + row * 150
    return {
      ...c,
      x, y, ox: x, oy: y, w: CARD_W, h: CARD_H,
      placed: !!solved, dragging: false
    }
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
    goldW: 0,       // 金线宽度（rpx），归位后由引擎驱动 0→1660
    sx: 0,          // 屏幕轻震位移（rpx），引擎驱动
    sy: 0,
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
    session.viewPuzzle('s4-timeline')
    const info = wx.getWindowInfo()
    this.pxRatio = info.windowWidth / 750
    this.dragger = drag.create({ width: CARD_W, height: CARD_H })
    const solved = session.isPuzzleComplete('s4-timeline')
    this.setData({
      phase: solved ? 'puzzle' : 'novel',
      cardNumber: Number(session.getCardDigit('s4-timeline')),
      slots: buildSlots(solved),
      cards: buildCards(solved),
      goldW: solved ? 1660 : 0,
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
    this.dragger.start(e, { id: idx, x: c.x, y: c.y })
    // INT-402：拖拽开始时预量取槽位（含滚动偏移），供 onMove 磁吸预提示
    drag.measure('.tl-slot').then(rects => { this._slotRects = rects })
    this.setData({ [`cards[${idx}].dragging`]: true })
  },

  onCardSelect(e) {
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
      scrollLeft: Math.max(0, slotIndex * 170 * this.pxRatio - 120)
    })
    haptic('light')
    if (this.data.cards.every(function (item) { return item.placed })) this.finish()
  },

  onCardMove(e) {
    const r = this.dragger.move(e)
    if (!r) return
    this.setData({ [`cards[${r.id}].x`]: r.x, [`cards[${r.id}].y`]: r.y })
    // INT-402：磁吸预提示——用拖拽开始时缓存的槽位判定（onMove 不重复 measure）
    this.updateNear(r.x, r.y, this.data.cards[r.id])
  },

  // INT-402：拖到槽位上方时槽位高亮（松手前可见吸附预提示）
  updateNear(x, y, card) {
    if (!this._slotRects || !card) return
    const hit = drag.hitTest(x, y, card.w, card.h, this._slotRects, 0)
    if (hit === this._nearSlot) return
    const updates = {}
    if (this._nearSlot >= 0) updates[`slots[${this._nearSlot}].near`] = false
    if (hit >= 0) updates[`slots[${hit}].near`] = true
    this._nearSlot = hit
    this.setData(updates)
  },

  onCardEnd(e) {
    const r = this.dragger.end(e)
    if (!r) return
    this.clearNear()   // INT-402：抬手清除磁吸预提示
    const idx = r.id
    const c = this.data.cards[idx]
    // 槽位在横向滚动区内，每次投放实时量取（含滚动偏移）
    drag.measure('.tl-slot').then(rects => {
      const hit = drag.hitTest(r.x, r.y, c.w, c.h, rects, 40)
      const updates = { [`cards[${idx}].dragging`]: false }
      if (hit === c.target) {
        updates[`cards[${idx}].placed`] = true
        updates[`slots[${hit}].filled`] = c.title
        // 滚动时间轴，让刚填入的槽位进入视野
        updates.scrollLeft = Math.max(0, hit * 170 * this.pxRatio - 120)
        updates.selectedCard = -1
        updates.pointTip = '归位正确，继续选择下一张事件卡。'
        this.setData(updates)
        haptic('light')   // INT-403：事件卡吸附
        if (this.data.cards.every(it => it.placed)) this.finish()
      } else {
        const attempts = this.data.attempts + 1
        this.setData({ attempts: attempts })
        session.attemptPuzzle('s4-timeline', attempts, false, 'drag')
        // INT-401：弹回走 200ms tween（替代 setData 跳变）
        updates[`cards[${idx}].dragging`] = false
        this.setData(updates)
        this.snapBack(idx, c.ox, c.oy, r.x, r.y)
        if (hit >= 0) this.flashSlot(hit)
      }
    })
  },

  // INT-401：拖错弹回过渡——从落点 (fx,fy) 平滑回到原位 (ox,oy)，200ms outQuad
  snapBack(idx, ox, oy, fx, fy) {
    if (this._snapAnim) this._snapAnim.cancel()
    const self = this
    const p = { x: fx, y: fy }
    this._snapAnim = anime.animate(p, {
      x: ox,
      y: oy,
      duration: 200,
      ease: 'outQuad',
      onUpdate: () => self.setData({
        [`cards[${idx}].x`]: Math.round(p.x * 10) / 10,
        [`cards[${idx}].y`]: Math.round(p.y * 10) / 10
      })
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
    const attempts = this.data.attempts + 1
    this.setData({ attempts: attempts })
    session.attemptPuzzle('s4-timeline', attempts, true, 'drag_or_tap')
    // 金线流动 + 屏幕轻震（Anime.js 驱动数值）→ 独白 → 盖章落库
    haptic('medium')   // INT-403：完成时刻短震（与屏震动画同步）
    const self = this
    const gold = { w: 0 }
    this._goldAnim = anime.animate(gold, {
      w: 1660,
      duration: 1400,
      ease: 'linear',
      onUpdate: () => self.setData({ goldW: Math.round(gold.w) })
    })
    const shake = { x: 0, y: 0 }
    this._shakeAnim = anime.animate(shake, {
      x: [-8, 8, -5, 5, 0],
      y: [2, -2, 1, -1, 0],
      duration: 600,
      ease: 'linear',
      onUpdate: () => self.setData({
        sx: Math.round(shake.x * 10) / 10,
        sy: Math.round(shake.y * 10) / 10
      }),
      onComplete: () => self.setData({ sx: 0, sy: 0 })
    })
    this._timers.push(setTimeout(() => {
      this.setData({ monologue: true, showHistory: true })
      // 收集时间轴卡片角落数字（日期第二位）——主线：卡片数字 → 日期密码
      session.completePuzzle('s4-timeline', {
        answer: SLOTS.map(function (slot) { return slot.label }),
        attempts: attempts
      }, { collectCard: true }).catch(() => {
        this.setData({ saveError: '时间轴进度暂未保存，下一步会自动重试。' })
      })
    }, 1400))
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

  // INT-101/102/401：清理 anime 动画与定时器，防止卸载后 setData 报错
  onUnload() {
    if (this._goldAnim) this._goldAnim.cancel()
    if (this._shakeAnim) this._shakeAnim.cancel()
    if (this._snapAnim) this._snapAnim.cancel()
    ;(this._timers || []).forEach(clearTimeout)
  }
})
