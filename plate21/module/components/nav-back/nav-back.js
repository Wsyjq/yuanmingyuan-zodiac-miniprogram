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
      try {
        require('../../store/trail').remember()
      } catch (err) {}
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('back')
      try {
        const coach = require('../../capabilities/play-guide/coach-host')
        if (coach.resetBusy) coach.resetBusy()
        const session = require('../../store/session')
        const cloud = require('../../store/cloud-sync')
        cloud.push(session.getSnapshot())
      } catch (err) { /* 返回不能被存档失败挡住 */ }
      if (this.data.custom) return
      let prev = ''
      try {
        prev = require('../../store/trail').popBack()
      } catch (err) {}
      if (prev) {
        wx.redirectTo({
          url: prev,
          fail: function () { wx.reLaunch({ url: '/pages/index/index' }) }
        })
        return
      }
      wx.reLaunch({ url: '/pages/index/index' })
    }
  }
})
