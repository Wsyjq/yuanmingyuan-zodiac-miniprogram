'use strict'
function split(lines) { return (lines || []).map(String).filter(line => line.trim()) }
Component({
  properties: { chapter: String, heading: String, lines: Array, cursor: Number, scene: String, active: Boolean, busy: Boolean },
  data: { text: '', index: 0, total: 0, typing: false, history: false, past: [], scrollTop: 0 },
  observers: {
    'chapter, lines': function () { if (this._alive) this._load() },
    active: function (value) { if (!value) this._stop(); else if (this._alive && !this.data.history) this._type() }
  },
  lifetimes: {
    attached() { this._alive = true; this._load() },
    detached() { this._alive = false; this._stop() }
  },
  pageLifetimes: { hide() { this._stop() }, show() { if (this.properties.active) this._type() } },
  methods: {
    _stop() { clearTimeout(this._timer); this._timer = null },
    _load() {
      const key = this.properties.chapter + JSON.stringify(this.properties.lines)
      if (key === this._key) return
      this._key = key; this._stop(); this._parts = split(this.properties.lines)
      const index = Math.max(0, Math.min(this._parts.length - 1, Number(this.properties.cursor) || 0))
      this._count = 0
      this.setData({ index, total: this._parts.length, text: '', history: false, typing: true, scrollTop: 0 })
      this._type()
    },
    _type() {
      this._stop()
      if (!this._alive || !this.properties.active || this.data.history) return
      const chars = Array.from((this._parts || [])[this.data.index] || '')
      if (this._count >= chars.length) { this.setData({ typing: false }); return }
      this._timer = setTimeout(() => {
        if (!this._alive || !this.properties.active) return
        this._count++
        this.setData({ text: chars.slice(0, this._count).join(''), typing: this._count < chars.length })
        this._type()
      }, 40)
    },
    onNext() {
      if (!this.properties.active || this.properties.busy || this.data.history) return
      if (this.data.typing) {
        this._stop(); const text = this._parts[this.data.index] || ''; this._count = Array.from(text).length
        this.setData({ text, typing: false }); return
      }
      if (this.data.index + 1 >= this._parts.length) { this.triggerEvent('complete'); return }
      const index = this.data.index + 1; this._count = 0
      this.setData({ scrollTop: this._scrollTop || 1 })
      this.setData({ index, text: '', typing: true, scrollTop: 0 })
      this._scrollTop = 0
      this.triggerEvent('progress', { index }); this._type()
    },
    onHistory() {
      this._stop()
      this.setData({ history: !this.data.history, past: this._parts.slice(0, this.data.index).concat(this.data.text ? [this.data.text] : []) })
      if (!this.data.history) this._type()
    },
    onDialogueScroll(e) { this._scrollTop = e.detail.scrollTop },
    noop() {},
    onImageError() { this.setData({ imageFailed: true }) }
  }
})
