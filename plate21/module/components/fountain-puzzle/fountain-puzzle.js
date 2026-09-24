'use strict'
const model = require('../../play/fountain-placement')
const resources = require('../../host/resources')
const ROOT = '/plate21/module/assets/img/'
const JETS = [
  { x: 28, y: 50, w: 23, h: 25, angle: -5 }, { x: 33, y: 46, w: 20, h: 26, angle: -12 },
  { x: 39, y: 43, w: 13, h: 30, angle: -15 }, { x: 50, y: 42, w: 15, h: 30, angle: 10 },
  { x: 51, y: 46, w: 20, h: 26, angle: 8 }, { x: 51, y: 50, w: 25, h: 25, angle: 5 },
  { x: 26, y: 61, w: 24, h: 14, angle: -12 }, { x: 33, y: 60, w: 17, h: 18, angle: -5 },
  { x: 50, y: 60, w: 20, h: 16, angle: 5 }, { x: 51, y: 63, w: 25, h: 13, angle: 12 }
].map((j, i) => Object.assign(j, { id: i, delay: -(i % 4) * 0.3 }))
Component({
  properties: { placed: { type: Object, value: null }, active: { type: Boolean, value: true }, readOnly: { type: Boolean, value: false } },
  data: { pieces: [], settled: {}, complete: false, flowing: false, selected: '', drag: null, notice: '', failed: false, jets: JETS, hidden: false },
  observers: {
    placed(value) { if (this._alive) this.sync(value) },
    active(value) { if (!value) this.cancel(); this.setData({ flowing: !!value && !this.data.hidden && this.data.complete }) }
  },
  lifetimes: {
    attached() {
      this._alive = true
      this.setData({ base: resources.resolve(ROOT + 'dashuifa-empty.jpg', 'asset'),
        pieces: [{ id: 'deer', label: '梅花鹿', src: resources.resolve(ROOT + 'dashuifa-deer.png', 'asset') },
          { id: 'dogs', label: '十只猎犬', src: resources.resolve(ROOT + 'dashuifa-dogs.png', 'asset') }] })
      this.sync(this.properties.placed)
    },
    detached() { this._alive = false; this._touch = null; this._rect = null }
  },
  pageLifetimes: {
    hide() { this.cancel(); this.setData({ hidden: true, flowing: false }) },
    show() { this.setData({ hidden: false, flowing: this.properties.active && this.data.complete }) },
    resize() { this.cancel(); this._rect = null }
  },
  methods: {
    sync(value) {
      const settled = model.normalize(value), complete = model.complete(settled)
      this.setData({ settled, complete, flowing: complete && this.properties.active && !this.data.hidden })
    },
    allowed() { return this._alive && this.properties.active && !this.properties.readOnly && !this.data.hidden },
    cancel() { this._touch = null; this.setData({ drag: null }) },
    onStart(e) {
      if (!this.allowed()) return
      const id = e.currentTarget.dataset.id, point = e.touches && e.touches[0]
      if (!model.TARGETS[id] || !point || this.data.settled[id]) return
      const touch = this._touch = { id, startX: point.clientX, startY: point.clientY, moved: false, point, ready: false }
      this.setData({ selected: id, notice: '' })
      this.createSelectorQuery().select('.fountain-scene').boundingClientRect(rect => {
        if (!this._alive || this._touch !== touch || !this.allowed()) return
        this._rect = rect; touch.ready = true
      }).exec()
    },
    onMove(e) {
      const t = this._touch, p = e.touches && e.touches[0]
      if (!t || !p || !this.allowed()) return
      t.point = p
      if (Math.hypot(p.clientX - t.startX, p.clientY - t.startY) > 6) t.moved = true
      if (t.moved) this.setData({ drag: { id: t.id, x: p.clientX - 48, y: p.clientY - 48, src: this.data.pieces.find(item => item.id === t.id).src } })
    },
    onEnd(e) {
      const t = this._touch
      if (!t) return
      if (this.allowed() && t.moved) {
        const p = e.changedTouches && e.changedTouches[0] || t.point
        const result = t.ready ? model.drop(this.data.settled, t.id, p, this._rect) : { accepted: false }
        if (result.accepted) this.commit(result.placed)
        else this.setData({ notice: '再对照铜版图，试试另一个位置。' })
      }
      this.cancel()
    },
    onSelect(e) { if (this.allowed()) this.setData({ selected: e.currentTarget.dataset.id, notice: '' }) },
    onTarget(e) {
      if (!this.allowed() || !this.data.selected) return
      const id = this.data.selected
      if (e.currentTarget.dataset.id !== id) { this.setData({ notice: '再对照铜版图，试试另一个位置。' }); return }
      this.commit(Object.assign({}, this.data.settled, { [id]: model.TARGETS[id].slot }))
    },
    commit(placed) {
      this.sync(placed)
      this.setData({ selected: '', notice: model.complete(placed) ? '水流，又回到了这里。' : '归位了，再找找另一组。' })
      this.triggerEvent('change', { placed: model.normalize(placed) })
    },
    onReplay() { if (this.data.complete && this.properties.active) this.setData({ flowing: !this.data.flowing }) },
    onImageError() { this.setData({ failed: true }) },
    onRetry() { this.setData({ failed: false }) }
  }
})
