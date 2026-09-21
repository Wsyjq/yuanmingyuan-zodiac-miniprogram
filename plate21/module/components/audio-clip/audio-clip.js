/**
 * audio-clip —— 通用音频播放条（V2.2 语音接线的底座组件）。
 * 纸墨风格小播放键 + 细进度线；src 为空、播放出错或「人声讲述」开关关闭时
 * 整体隐藏，退回纯文稿阅读态（不出现不可用的按钮）。
 * kind：'voice'（默认，受人声开关控制）｜'bgm'（受背景音乐开关控制）｜
 *       'clip'（题目素材音，如声景听题——不受开关隐藏，玩家必须能随时听）。
 * dock：页级讲述音频的悬浮可伸缩形态——默认展开为右下角胶囊播放条
 *       （播放/暂停 + 进度 + 收起），收起后是一枚小圆钮，点开即回来。
 * 事件：bind:play（起播）/ bind:ended（自然播完）。
 * 经 utils/audio-bus 单路互斥：起这路时其余在播的暂停。
 */
const audioBus = require('../../utils/audio-bus')
const audioSettings = require('../../utils/audio-settings')

Component({
  properties: {
    src: { type: String, value: '' },
    label: { type: String, value: '播放' },
    compact: { type: Boolean, value: false },
    icon: { type: Boolean, value: false },
    kind: { type: String, value: 'voice' },
    dock: { type: Boolean, value: false }
  },

  data: {
    playing: false,
    progress: 0,
    failed: false,
    enabled: true,
    dockOpen: true
  },

  observers: {
    src(src) {
      const wasPlaying = this.data.playing
      this.destroyCtx()
      this.setData({ playing: false, progress: 0, failed: false })
      if (wasPlaying && src && this.data.enabled) {
        const self = this
        setTimeout(function () { self.onToggle() }, 0)
      }
    }
  },

  lifetimes: {
    attached() {
      this.kind = this.data.kind
      audioBus.register(this)
      this._onSettings = (settings) => {
        this.applySettings(settings)
      }
      audioSettings.subscribe(this._onSettings)
      this.applySettings(audioSettings.get())
    },
    detached() {
      audioBus.unregister(this)
      audioSettings.unsubscribe(this._onSettings)
      this.destroyCtx()
    }
  },

  methods: {
    applySettings(settings) {
      const enabled = this.data.kind === 'clip' ? true : (this.data.kind === 'bgm' ? settings.bgm : settings.voice)
      if (!enabled && this.data.playing) this.pause()
      this.setData({ enabled: enabled })
    },

    onToggle() {
      if (!this.data.src || this.data.failed || !this.data.enabled) return
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
        ctx.onEnded(() => {
          this.setData({ playing: false, progress: 0 })
          if (audioBus.isActive(this)) audioBus.release()
          this.triggerEvent('ended')
        })
        ctx.onError(() => {
          this.setData({ playing: false, progress: 0, failed: true })
          if (audioBus.isActive(this)) audioBus.release()
        })
        this._ctx = ctx
      }
      audioBus.activate(this)
      this._ctx.play()
      this.setData({ playing: true })
      this.triggerEvent('play')
    },

    // dock 形态：收起为小圆钮 / 展开回播放条
    onDockFold() {
      this.setData({ dockOpen: false })
    },

    onDockOpen() {
      this.setData({ dockOpen: true })
    },

    // audio-bus 约定接口
    isPlaying() {
      return this.data.playing
    },

    pause() {
      if (this._ctx) {
        try { this._ctx.pause() } catch (e) { /* 上下文已失效则忽略 */ }
      }
      if (this.data.playing) {
        this.setData({ playing: false })
        if (audioBus.isActive(this)) audioBus.release()
      }
    },

    resume() {
      if (this._ctx && this.data.enabled && !this.data.playing) {
        try { this._ctx.play() } catch (e) { return }
        this.setData({ playing: true })
      }
    },

    destroyCtx() {
      if (this._ctx) {
        try { this._ctx.destroy() } catch (e) { /* 忽略 */ }
        this._ctx = null
      }
    }
  }
})
