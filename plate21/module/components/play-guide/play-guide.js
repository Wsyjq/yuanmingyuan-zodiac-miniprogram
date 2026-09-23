/**
 * 开玩引导浮层：一页小标签板（不再分页长文）。
 */
const guide = require('../../capabilities/play-guide/guide')

Component({
  properties: {
    visible: { type: Boolean, value: false },
    mode: { type: String, value: 'start' },
    closing: { type: Boolean, value: false }
  },

  data: {
    groups: guide.GROUPS,
    primaryText: '开 始 走',
    showSkip: true
  },

  observers: {
    'visible, mode': function () {
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
      this.setData({
        groups: guide.GROUPS,
        primaryText: '知 道 了',
        showSkip: false
      })
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
