/**
 * 镂空引导：四片遮罩让出真按钮，旁边旧纸气泡。
 * 几何由页面传入（SelectorQuery 在 Page 上量）；量不到时气泡靠下，不落正中。
 */
const coachMeasure = require('../../capabilities/play-guide/measure')

Component({
  properties: {
    visible: { type: Boolean, value: false },
    closing: { type: Boolean, value: false },
    index: { type: Number, value: 0 },
    total: { type: Number, value: 3 },
    step: { type: Object, value: null },
    hole: { type: Object, value: null },
    win: { type: Object, value: null }
  },

  data: {
    panes: null,
    ring: null,
    bubble: null,
    isLast: false,
    primaryText: '下一步',
    dots: []
  },

  observers: {
    'visible, closing, index, total, step, hole, win': function () {
      this.sync()
    }
  },

  lifetimes: {
    attached() {
      this.sync()
    }
  },

  methods: {
    sync() {
      const total = this.data.total || 1
      const index = this.data.index || 0
      const last = index >= total - 1
      const dots = []
      for (let i = 0; i < total; i++) dots.push({ on: i <= index, i: i })
      this.setData({
        isLast: last,
        primaryText: last ? '我知道了' : '下一步',
        dots: dots,
        panes: this.buildPanes(),
        ring: this.buildRing(),
        bubble: this.buildBubble()
      })
    },

    viewport() {
      const win = this.data.win || {}
      let w = win.windowWidth
      let h = win.windowHeight
      if ((!w || !h) && typeof wx !== 'undefined' && wx.getWindowInfo) {
        try {
          const info = wx.getWindowInfo()
          w = w || info.windowWidth
          h = h || info.windowHeight
        } catch (e) {}
      }
      return {
        w: w || 375,
        h: h || 812
      }
    },

    holeRect() {
      const hole = this.data.hole
      if (hole && hole.width > 0 && hole.height > 0) {
        const pad = 4
        return {
          top: Math.max(0, hole.top - pad),
          left: Math.max(0, hole.left - pad),
          width: hole.width + pad * 2,
          height: hole.height + pad * 2
        }
      }
      return null
    },

    buildPanes() {
      const vp = this.viewport()
      const h = this.holeRect()
      if (!h) return null
      const bottomTop = h.top + h.height
      return {
        top: { top: 0, left: 0, width: vp.w, height: Math.max(0, h.top) },
        left: { top: h.top, left: 0, width: Math.max(0, h.left), height: h.height },
        right: {
          top: h.top,
          left: h.left + h.width,
          width: Math.max(0, vp.w - h.left - h.width),
          height: h.height
        },
        bottom: {
          top: bottomTop,
          left: 0,
          width: vp.w,
          height: Math.max(0, vp.h - bottomTop)
        }
      }
    },

    buildRing() {
      return this.holeRect()
    },

    buildBubble() {
      const names = this.data.step && this.data.step.names
      return coachMeasure.layoutBubble(this.viewport(), this.holeRect(), !!names)
    },

    onNext() {
      if (this.data.closing) return
      this.triggerEvent('next')
    },

    onSkip() {
      if (this.data.closing) return
      this.triggerEvent('skip')
    },

    noop() {}
  }
})
