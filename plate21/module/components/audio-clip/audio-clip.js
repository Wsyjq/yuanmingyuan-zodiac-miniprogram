/**
 * audio-clip —— 通用音频播放条（V2.2 语音接线的底座组件）。
 * 纸墨风格小播放键 + 细进度线；src 为空或播放出错时整体隐藏，
 * 退回纯文稿阅读态（不出现不可用的按钮）。
 */
Component({
  properties: {
    src: { type: String, value: '' },
    label: { type: String, value: '播放' },
    compact: { type: Boolean, value: false }
  },

  data: {
    playing: false,
    progress: 0,
    failed: false
  },

  lifetimes: {
    detached() {
      this.destroyCtx()
    }
  },

  methods: {
    onToggle() {
      if (!this.data.src || this.data.failed) return
      if (this.data.playing) {
        this.pause()
        return
      }
      if (!wx.createInnerAudioContext) return // 测试/低版本环境安全降级
      if (!this._ctx) {
        const ctx = wx.createInnerAudioContext()
        ctx.src = this.data.src
        ctx.onTimeUpdate(() => {
          if (!ctx.duration) return
          this.setData({ progress: Math.min(100, Math.round(ctx.currentTime / ctx.duration * 100)) })
        })
        ctx.onEnded(() => this.setData({ playing: false, progress: 0 }))
        ctx.onError(() => this.setData({ playing: false, progress: 0, failed: true }))
        this._ctx = ctx
      }
      this._ctx.play()
      this.setData({ playing: true })
    },

    pause() {
      if (this._ctx) {
        try { this._ctx.pause() } catch (e) { /* 上下文已失效则忽略 */ }
      }
      if (this.data.playing) this.setData({ playing: false })
    },

    destroyCtx() {
      if (this._ctx) {
        try { this._ctx.destroy() } catch (e) { /* 忽略 */ }
        this._ctx = null
      }
    }
  }
})
