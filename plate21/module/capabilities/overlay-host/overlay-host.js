/**
 * page-overlays —— 页面级能力宿主。
 * 按 capabilities/registry 中登记的路由渲染对应悬浮入口（地图 / 语音导览），
 * 并订阅成就解锁事件弹印章 toast。页面只需在 wxml 加一行 <page-overlays />。
 */
const registry = require('../registry')
const achievements = require('../../store/achievements')

Component({
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
      const short = route.replace(/^\/?plate21\/module\//, '')
      this.setData({ caps: registry.capabilitiesFor(short) })
      achievements.onUnlock((rule) => {
        const stamp = this.selectComponent('#achStamp')
        if (stamp && stamp.show) stamp.show('成就 · ' + rule.title)
      })
    }
  },

  methods: {
    onOpenMap() {
      const drawer = this.selectComponent('#mapDrawer')
      if (drawer && drawer.open) drawer.open()
    }
  }
})
