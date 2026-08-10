/**
 * stamp-toast —— 朱砂盖章反馈（设计文档 §4.4）
 * 白文方印从屏幕中上方落下：CSS 回弹 + 3° 内随机旋转，
 * 停留 600ms 后淡出。同一时刻只显示一枚章，连续触发合并为最新一枚。
 *
 * 动画仅切换 mounted/fading 状态，不在动画帧中 setData。
 *
 * 用法（页面）：
 *   wxml: <stamp-toast id="stamp" />
 *   js:   this.selectComponent('#stamp').show('考察记录已保存')
 */
// INT-403：触觉反馈辅助——wx.vibrateShort 带 type 参数，旧基础库降级为无参
function haptic(type) {
  try {
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: type || 'light', fail: function () { wx.vibrateShort && wx.vibrateShort() } })
    }
  } catch (e) { /* 部分设备/台架不支持，静默 */ }
}

Component({
  data: {
    text: '',
    rotate: 0,
    visible: false,
    fading: false
  },

  lifetimes: {
    attached() {
      this._attached = true
      this._showToken = 0
    },
    detached() {
      this._attached = false
      this._showToken += 1
      if (this._mountTimer) clearTimeout(this._mountTimer)
      if (this._timer) {
        clearTimeout(this._timer)
        this._timer = null
      }
    }
  },

  methods: {
    /**
     * 盖章。
     * @param {string} text 印文（如"考察记录已保存"）
     */
    show(text) {
      if (this._timer) {
        clearTimeout(this._timer)
        this._timer = null
      }
      const rotate = Math.round((Math.random() * 6 - 3) * 10) / 10
      if (this._mountTimer) clearTimeout(this._mountTimer)
      this.setData({ visible: false, fading: false })
      const token = ++this._showToken
      const mount = () => {
        this._mountTimer = null
        if (!this._attached || token !== this._showToken) return
        this.setData({ text: text, rotate: rotate, visible: true, fading: false })
        haptic('medium')
        this._timer = setTimeout(() => {
          this.setData({ fading: true })
          this._timer = setTimeout(() => {
            this.setData({ visible: false, fading: false })
            this._timer = null
          }, 300)
        }, 600)
      }
      if (wx.nextTick) wx.nextTick(mount)
      else this._mountTimer = setTimeout(mount, 0)
    }
  }
})
