const registry = require('../registry')
const achievements = require('../../store/achievements')
const session = require('../../store/session')
const config = require('../../config/experience')
const audio = require('../../services/audio')
const ui = require('../../services/ui')
Component({
  properties: { audioStation:{type:String,value:''}, nodeId: { type: String, value: '' }, inline: {type:Boolean,value:false} },
  data: {
    caps: { map: false, audio: null },
    open: false,
    node: null,
    hint: 0,
    sound: {},
    busy: false,
    quiet: false,
    remaining: 120
  },
  lifetimes: {
    attached() {
      let route = ''
      try {
        const pages = getCurrentPages()
        route = pages[pages.length - 1].route
      } catch (e) {}
      this.setData({
        caps: registry.capabilitiesFor(route.replace(/^\/?plate21\/module\//, '')),
        node: config.node(this.data.nodeId, ((session.getSnapshot() || {}).preferences || {}).mode)
      })
      this._off = audio
        .get()
        .subscribe((sound) =>
          this.setData({ sound, quiet: sound.quiet, remaining: sound.remaining })
        )
      this._offStamp = achievements.onUnlock((rule) => {
        const c = this.selectComponent('#achStamp')
        if (c && c.show) c.show('成就 · ' + rule.title)
      })
      this.enter()
    },
    detached() {
      if (this._off) this._off()
      if (this._offStamp) this._offStamp()
    }
  },
  pageLifetimes: {
    show() {
      this.enter()
    }
  },
  methods: {
    enter() {
      if (this._entering) return
      this._entering = true
      const ready = session.getSnapshot()
        ? Promise.resolve(session.getSnapshot())
        : session.init({})
      return ready
        .then((s) => {
          const node = config.node(this.data.nodeId, s.preferences.mode)
          this.setData({ node })
          if (node) {
            audio.get().setStation(node.station)
            return session.visit(node.id, 'visited')
          }
        })
        .catch(ui.error)
        .then(() => {
          this._entering = false
        })
    },
    toggle() {
      this.setData({ open: !this.data.open })
    },
    close() {
      this.setData({ open: false })
    },
    noop() {},
    onOpenMap() {
      this.close()
      const drawer = this.selectComponent('#mapDrawer')
      if (drawer && drawer.open) drawer.open()
    },
    journey() {
      ui.go('journey')
    },
    journal() {
      ui.go('journal')
    },
    library() {
      ui.go('library')
    },
    hint() {
      this.setData({ hint: Math.min(2, this.data.hint + 1) })
    },
    advance(e) {
      if (this.data.busy || !this.data.node) return
      const n = config.next(this.data.node.id)
      this.setData({ busy: true })
      return session
        .visit(this.data.node.id, e.currentTarget.dataset.status, n.id)
        .then(
          () =>
            new Promise((resolve, reject) =>
              wx.redirectTo({ url: config.route(n.id), success: resolve, fail: reject })
            )
        )
        .catch(ui.error)
        .then(() => this.setData({ busy: false }))
    },
    toggleBgm() {
      audio.get().toggleBgm()
    },
    mute() {
      audio.get().prefs({ muted: !this.data.sound.muted })
    },
    volume(e) {
      audio.get().prefs({ volume: e.detail.value / 100 })
    },
    continuous(e) {
      audio.get().prefs({ continuous: e.detail.value })
    },
    toggleVoice() {
      if (this.data.sound.playing) audio.get().pause()
      else audio.get().resume()
    },
    seek(e) {
      audio.get().seek((this.data.sound.duration * e.detail.value) / 100)
    },
    retry() {
      audio.get().retry()
    },
    retryBgm() {
      audio.get().retryBgm()
    },
    startQuiet() {
      audio.get().suspend('quiet')
    },
    endQuiet() {
      audio.get().release('quiet')
    }
  }
})
