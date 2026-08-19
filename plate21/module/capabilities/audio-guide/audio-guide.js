/**
 * audio-guide —— 悬浮「语音导览」入口 + 底部讲解面板。
 * audio 配置就绪时：InnerAudioContext 播放/暂停 + 进度条；
 * audio 为 null（当前）：展示该站文稿阅读态，不出现不可用的播放器按钮。
 */
const GUIDES = require('./scripts').GUIDES

Component({
  properties: {
    station: { type: String, value: '' }
  },

  data: {
    guide: null,
    open: false,
    closing: false,
    playing: false,
    hasAudio: false,
    progress: 0
  },

  observers: {
    station(id) {
      const guide = GUIDES[id] || null
      this.setData({ guide: guide, hasAudio: !!(guide && guide.audio) })
    }
  },

  lifetimes: {
    attached() {
      const guide = GUIDES[this.data.station] || null
      this.setData({ guide: guide, hasAudio: !!(guide && guide.audio) })
    },
    detached() {
      this.destroyCtx()
    }
  },

  methods: {
    onFab() {
      if (!this.data.guide) return
      if (this.data.open) this.close()
      else this.setData({ open: true, closing: false })
    },

    close() {
      if (this.data.closing) return
      this.pause()
      this.setData({ closing: true })
      setTimeout(() => {
        this.setData({ open: false, closing: false })
      }, 260)
    },

    onTogglePlay() {
      if (!this.data.hasAudio) return
      if (this.data.playing) {
        this.pause()
        return
      }
      if (!this._ctx) this.createCtx()
      if (!this._ctx) return
      this._ctx.play()
      this.setData({ playing: true })
    },

    pause() {
      if (this._ctx) {
        try { this._ctx.pause() } catch (e) {}
      }
      if (this.data.playing) this.setData({ playing: false })
    },

    createCtx() {
      if (!wx.createInnerAudioContext || !this.data.guide || !this.data.guide.audio) return
      const ctx = wx.createInnerAudioContext()
      ctx.src = this.data.guide.audio
      ctx.onTimeUpdate(() => {
        if (!ctx.duration) return
        this.setData({ progress: Math.min(100, Math.round(ctx.currentTime / ctx.duration * 100)) })
      })
      ctx.onEnded(() => this.setData({ playing: false, progress: 0 }))
      ctx.onError(() => this.setData({ playing: false }))
      this._ctx = ctx
    },

    destroyCtx() {
      if (this._ctx) {
        try { this._ctx.destroy() } catch (e) {}
        this._ctx = null
      }
    }
  }
})
