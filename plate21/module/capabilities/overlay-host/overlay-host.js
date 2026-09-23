/**
 * page-overlays —— 页面级能力宿主。
 * 按 capabilities/registry 中登记的路由渲染对应悬浮入口（地图 / 语音导览），
 * 并订阅成就解锁事件弹印章 toast。页面只需在 wxml 加一行 <page-overlays />。
 */
const registry = require('../registry')
const achievements = require('../../store/achievements')
const playGuide = require('../play-guide/guide')
const coachHost = require('../play-guide/coach-host')

Component({
  behaviors: [coachHost],
  properties: {
    // 可选：页面级导览站覆盖（如 transit 三段各有顺路站，由页面按 leg 传入）。
    // 优先于 registry 静态配置；为空时回落 caps.audio。
    audioStation: { type: String, value: '' }
  },

  data: {
    caps: { map: false, audio: null }
  },

  lifetimes: {
    attached() {
      let route = ''
      try {
        const pages = getCurrentPages()
        const current = pages && pages[pages.length - 1]
        route = (current && current.route) || ''
      } catch (e) {}
      // registry 键为 'pages/xxx' 短路由；真机 route 形如 'plate21/module/pages/xxx'
      let short = route.replace(/^\/?plate21\/module\//, '')
      if (playGuide.isTouring()) {
        const stop = playGuide.currentStop()
        if (stop && stop.route) short = stop.route
      }
      let caps = registry.capabilitiesFor(short)
      if (playGuide.isTouring()) {
        const stop = playGuide.currentStop()
        const spots = (stop && stop.spots) || []
        caps = {
          map: spots.indexOf('map') >= 0,
          audio: spots.indexOf('guide') >= 0 ? (caps.audio || 's2') : null
        }
      }
      this.setData({ caps: caps })
      achievements.onUnlock((rule) => {
        const stamp = this.selectComponent('#achStamp')
        if (stamp && stamp.show) stamp.show('成就 · ' + rule.title)
      })
      if (playGuide.runOverlayStop(this)) return
      if (playGuide.isTouring()) return
      if (caps.map) this.scheduleCoach([playGuide.SPOTS.map], 700)
    }
  },

  methods: {
    onOpenMap() {
      const self = this
      this.runAfterCoach(function () {
        const drawer = self.selectComponent('#mapDrawer')
        if (drawer && drawer.open) drawer.open()
      })
    }
  }
})
