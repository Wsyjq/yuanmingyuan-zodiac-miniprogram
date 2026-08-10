/**
 * nav-back —— 页面左上角自绘返回钮（墨线圆圈 + 左箭头）
 * 全部页面 navigationStyle: custom，统一用本组件处理返回/关闭。
 *
 * props:
 *   delta  Number  返回层数，默认 1
 *   custom Boolean 置 true 时不执行 navigateBack，仅触发 bind:back，由页面自定义
 * 事件:
 *   bind:back 点击返回钮（custom=true 时页面接管）
 */
Component({
  properties: {
    delta: { type: Number, value: 1 },
    custom: { type: Boolean, value: false }
  },

  data: {
    statusBarHeight: 0
  },

  lifetimes: {
    attached() {
      try {
        const info = wx.getWindowInfo()
        this.setData({ statusBarHeight: info.statusBarHeight || 0 })
      } catch (e) {
        this.setData({ statusBarHeight: 20 })
      }
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('back')
      if (this.data.custom) return
      const pages = getCurrentPages()
      if (pages.length > this.data.delta) {
        wx.navigateBack({ delta: this.data.delta })
      } else {
        // 栈内没有上一页（如直接以分包页面启动）：回演示主页
        wx.reLaunch({ url: '/pages/index/index' })
      }
    }
  }
})
