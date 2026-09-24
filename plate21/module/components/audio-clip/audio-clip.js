/** Lifecycle-safe narration player; explicit listenKey opts into autoplay. clips takes priority over legacy src. */
const audioBus = require('../../utils/audio-bus')
const audioSettings = require('../../utils/audio-settings')
const audioSrc = require('../../utils/audio-src')

Component({
  properties: {
    src: { type: String, value: '' },
    clips: { type: Array, value: [] },
    active: { type: Boolean, value: true },
    label: { type: String, value: '播放' },
    compact: { type: Boolean, value: false },
    icon: { type: Boolean, value: false },
    kind: { type: String, value: 'voice' },
    dock: { type: Boolean, value: false },
    listenKey: { type: String, value: '' },
    contextKey: { type: String, value: '' },
    // Accepted for old callers, deliberately never starts audio automatically.
    autoplay: { type: Boolean, value: false }
  },
  data: {
    playing: false, loading: false, progress: 0, failed: false,
    enabled: false, muted: true, dockOpen: true, hasAudio: false,
    segmentIndex: 0, segmentCount: 0
  },
  observers: {
    src() { this.syncPlaylist() },
    clips() { this.syncPlaylist() },
    active(value) { if (!value) this.pause(); else this.autoStart() },
    listenKey() { this.autoStart() }
  },
  lifetimes: {
    attached() {
      this._alive = true
      this._pageVisible = true
      this._appVisible = true
      this._request = this._request || 0
      this.kind = this.data.kind
      audioBus.register(this)
      this._onSettings = (settings) => this.applySettings(settings)
      audioSettings.subscribe(this._onSettings)
      this.applySettings(audioSettings.get())
      this.syncPlaylist()
      this.autoStart()
      this._onAppHide = () => { this._appVisible = false; audioBus.pauseAll() }
      this._onAppShow = () => { this._appVisible = true }
      if (wx.onAppHide) wx.onAppHide(this._onAppHide)
      if (wx.onAppShow) wx.onAppShow(this._onAppShow)
    },
    detached() {
      this.pause()
      this._alive = false
      this.destroyCtx()
      audioBus.unregister(this)
      audioSettings.unsubscribe(this._onSettings)
      if (wx.offAppHide) wx.offAppHide(this._onAppHide)
      if (wx.offAppShow) wx.offAppShow(this._onAppShow)
    }
  },
  pageLifetimes: {
    hide() { this._pageVisible = false; this.pause() },
    show() { this._pageVisible = true }
  },
  methods: {
    autoStart() {
      const key = this.data.listenKey
      if (!key || key === this._autoKey || !this.canPlay() || !this._playlist || !this._playlist.length) return
      this._autoKey = key
      this.onReplay()
    },
    publish(values) {
      this.setData(values)
      if (this._alive) this.triggerEvent('state', {
        playing: this.data.playing, loading: this.data.loading,
        failed: this.data.failed, segmentIndex: this.data.segmentIndex
      })
    },
    syncPlaylist() {
      const candidates = Array.isArray(this.data.clips) && this.data.clips.length
        ? this.data.clips : (this.data.src ? [this.data.src] : [])
      const next = candidates.filter((src) => typeof src === 'string' && src.length)
      if (JSON.stringify(next) === JSON.stringify(this._playlist)) return
      this.pause()
      this.destroyCtx()
      this._playlist = next.slice()
      this.publish({ hasAudio: next.length > 0, segmentCount: next.length,
        segmentIndex: 0, playing: false, loading: false, failed: false, progress: 0 })
      this.autoStart()
    },
    canPlay() {
      return this._alive && this._pageVisible && this._appVisible &&
        this.data.active && this.data.enabled
    },
    applySettings(settings) {
      const enabled = this.data.kind === 'clip' ? true :
        (this.data.kind === 'bgm' ? settings.bgm : settings.voice)
      if (!enabled) this.pause()
      this.setData({ enabled: !!enabled, muted: !enabled })
      this.autoStart()
    },
    onMute() {
      if (this.data.kind === 'clip') { this.pause(); return }
      const key = this.data.kind === 'bgm' ? 'bgm' : 'voice'
      const enabled = !audioSettings.get()[key]
      audioSettings.set(key, enabled)
      if (enabled && !this.isPlaying()) this.onToggle()
    },
    onToggle() {
      if (this.data.playing || this.data.loading) { this.pause(); return }
      if (!this.canPlay() || !this._playlist || !this._playlist.length) return
      if (this._ctx && !this.data.failed) { this.startContext(this._ctx); return }
      this.playSegment(this.data.segmentIndex || 0)
    },
    onReplay() {
      if (!this.canPlay() || !this._playlist || !this._playlist.length) return
      this.pause()
      this.destroyCtx()
      this.playSegment(0)
    },
    playSegment(index) {
      if (!this.canPlay() || !this._playlist[index]) return
      const src = this._playlist[index]
      const contextKey = this.data.contextKey
      this.destroyCtx()
      const request = ++this._request
      this.publish({ segmentIndex: index, loading: true, playing: false, failed: false, progress: 0 })
      audioBus.activate(this)
      const valid = () => request === this._request && this.canPlay() && this._playlist[index] === src
      const fail = () => { if (valid()) this.failPlayback() }
      const ready = () => {
        if (!valid()) return
        if (!wx.createInnerAudioContext) { fail(); return }
        let ctx
        try { ctx = wx.createInnerAudioContext() } catch (err) { fail(); return }
        this._ctx = ctx
        const current = () => this._alive && this._ctx === ctx
        try {
          ctx.src = src
          ctx.onTimeUpdate(() => {
            if (current() && ctx.duration) this.setData({ progress: Math.min(100, Math.round(ctx.currentTime / ctx.duration * 100)) })
          })
          ctx.onEnded(() => {
            if (!current() || !this.data.playing) return
            const hasNext = index + 1 < this._playlist.length
            this.publish({ playing: false, progress: 0 })
            if (hasNext && this.canPlay()) { this.playSegment(index + 1); return }
            this.destroyCtx()
            this.setData({ segmentIndex: 0 })
            audioBus.release(this, { resumeBgm: false })
            this.triggerEvent('ended', { contextKey })
          })
          ctx.onError(() => { if (current()) this.failPlayback() })
          this.startContext(ctx)
        } catch (err) { if (current()) this.failPlayback() }
      }
      const pkg = audioSrc.packageForSrc(src)
      if (pkg && wx.loadSubpackage) {
        try { wx.loadSubpackage({ name: pkg, success: ready, fail }) } catch (err) { fail() }
      } else ready()
    },
    startContext(ctx) {
      if (!this.canPlay() || this._ctx !== ctx) return
      audioBus.activate(this)
      this.publish({ loading: false, playing: true, failed: false })
      try { ctx.play() } catch (err) { this.failPlayback(); return }
      if (this._ctx === ctx && this.data.playing) this.triggerEvent('play')
    },
    failPlayback() {
      this.destroyCtx()
      this.publish({ loading: false, playing: false, failed: true, progress: 0 })
      audioBus.release(this, { resumeBgm: false })
      this.triggerEvent('error')
    },
    onDockFold() { this.setData({ dockOpen: false }) },
    onDockOpen() { this.setData({ dockOpen: true }) },
    isPlaying() { return this.data.playing || this.data.loading },
    pause() {
      this._request = (this._request || 0) + 1
      if (this._ctx) { try { this._ctx.pause() } catch (err) {} }
      this.publish({ playing: false, loading: false })
      audioBus.release(this, { resumeBgm: false })
    },
    // Audio bus must never silently resume spoken narration.
    resume() {},
    destroyCtx() {
      this._request = (this._request || 0) + 1
      const ctx = this._ctx
      this._ctx = null
      if (ctx) { try { ctx.destroy() } catch (err) {} }
    }
  }
})
