/**
 * stamp-toast —— 朱砂盖章反馈（设计文档 §4.4）
 * 白文方印从屏幕中上方落下：1.3→1.0 缩放（outBack 回弹）+ 3° 内随机旋转，
 * 停留 600ms 后淡出。同一时刻只显示一枚章，连续触发合并为最新一枚。
 *
 * 落下动画由 Anime.js（utils/anime）驱动普通对象数值，onUpdate 里 setData 更新 transform；
 * 淡出仍走 CSS transition（opacity）。
 *
 * 用法（页面）：
 *   wxml: <stamp-toast id="stamp" />
 *   js:   this.selectComponent('#stamp').show('考察记录已保存')
 */
const anime = require('../../utils/anime')

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
    scale: 1,
    ty: 0,
    opacity: 1,
    visible: false,
    fading: false
  },

  lifetimes: {
    detached() {
      this._cancelAnim()
      if (this._timer) {
        clearTimeout(this._timer)
        this._timer = null
      }
    }
  },

  methods: {
    _cancelAnim() {
      if (this._anim) {
        this._anim.cancel()
        this._anim = null
      }
    },

    /**
     * 盖章。
     * @param {string} text 印文（如"考察记录已保存"）
     */
    show(text) {
      if (this._timer) {
        clearTimeout(this._timer)
        this._timer = null
      }
      this._cancelAnim()
      const rotate = Math.round((Math.random() * 6 - 3) * 10) / 10
      const state = { s: 1.3, y: -48, o: 0 }
      this.setData({
        text: text, rotate: rotate,
        scale: 1.3, ty: -48, opacity: 0,
        visible: true, fading: false
      })
      // INT-403：盖章瞬间短震（type 参数兼容旧基础库）
      haptic('medium')
      // 落下：缩放 1.3→1.0 带回弹（下冲到约 0.97 再回 1），位移/透明度用 outQuad
      this._anim = anime.animate(state, {
        s: { to: 1, ease: 'outBack' },
        y: 0,
        o: 1,
        duration: 450,
        ease: 'outQuad',
        onUpdate: () => {
          this.setData({
            scale: Math.round(state.s * 1000) / 1000,
            ty: Math.round(state.y * 10) / 10,
            opacity: Math.round(state.o * 1000) / 1000
          })
        }
      })
      this._timer = setTimeout(() => {
        // 淡出：加 fading 类开启 opacity transition，再置 0
        this.setData({ fading: true, opacity: 0 })
        this._timer = setTimeout(() => {
          this.setData({ visible: false, fading: false })
          this._timer = null
        }, 300)
      }, 600)
    }
  }
})
