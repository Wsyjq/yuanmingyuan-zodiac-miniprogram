/**
 * audio-guide —— 悬浮「语音导览」入口 + 底部讲解面板（v2 双版本）。
 * 基础层 script 到站即读；深讲层 deepScript 永远折叠，玩家点「再听一段」才展开。
 * audio/deepAudio 为 null（当前）：展示文稿阅读态，不出现不可用的播放器按钮。
 * guestPostcard 站点（s4 雨果）展开深讲时附「一位考察者留下的明信片」：
 * 本地种子池确定性取张（同一会话同一张），后端就绪后由 adapter 替换。
 */
const GUIDES = require('./scripts').GUIDES
const postcards = require('./postcards')

let sessionStore = null
// 延迟引入 session：组件可能在快照未建时挂载，取不到则用固定种子兜底。
try { sessionStore = require('../../store/session') } catch (e) { sessionStore = null }

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
    hasDeep: false,
    deepOpen: false,
    deepPlaying: false,
    guest: null,
    progress: 0
  },

  observers: {
    station(id) {
      const guide = GUIDES[id] || null
      this.setData({
        guide: guide,
        hasAudio: !!(guide && guide.audio),
        hasDeep: !!(guide && guide.deepScript && guide.deepScript.length),
        deepOpen: false,
        guest: null
      })
      this._guestPicked = false
    }
  },

  lifetimes: {
    attached() {
      const guide = GUIDES[this.data.station] || null
      this.setData({
        guide: guide,
        hasAudio: !!(guide && guide.audio),
        hasDeep: !!(guide && guide.deepScript && guide.deepScript.length)
      })
    },
    detached() {
      this.destroyCtx()
    }
  },

  methods: {
    onFab() {
      if (!this.data.guide) return
      if (this.data.open) this.close()
      else this.setData({ open: true, closing: false, deepOpen: false })
    },

    close() {
      if (this.data.closing) return
      this.pause()
      this.setData({ closing: true })
      setTimeout(() => {
        this.setData({ open: false, closing: false, deepOpen: false })
      }, 260)
    },

    // 深讲层开关：首次展开时取前人明信片（此后固定不变）并记一次 deepOpened 标记。
    onToggleDeep() {
      const next = !this.data.deepOpen
      if (next) {
        if (!this._guestPicked) {
          this._guestPicked = true
          this.setData({ deepOpen: next, guest: this.pickGuest() })
        } else {
          this.setData({ deepOpen: next })
        }
        this.recordDeepOpened()
        return
      }
      this.setData({ deepOpen: next })
    },

    // 回响信个性化的数据底座：记下玩家在哪一站展开过深讲（每站只记一次）。
    recordDeepOpened() {
      if (!this.data.guide || !sessionStore) return
      try {
        const snap = sessionStore.getSnapshot()
        const key = 'deepOpened_' + this.data.guide.station
        if (snap && snap.flags && snap.flags[key]) return
        sessionStore.setFlag(key, Date.now()).catch(function () {})
      } catch (e) { /* 标记失败不阻断阅读 */ }
    },

    pickGuest() {
      if (!this.data.guide || !this.data.guide.guestPostcard) return null
      let seedKey = 'plate21-seed'
      try {
        const snap = sessionStore && sessionStore.getSnapshot()
        if (snap && snap.sessionDate) seedKey = snap.sessionDate + ':' + this.data.station
      } catch (e) { /* 快照不可用时用固定种子 */ }
      return postcards.pickPostcard(seedKey)
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

    // 深讲音频（deepAudio 就绪后可用；当前为 null，仅展示文稿阅读态）。
    onToggleDeepPlay() {
      if (!this.data.guide || !this.data.guide.deepAudio) return
      if (this.data.deepPlaying) {
        if (this._deepCtx) {
          try { this._deepCtx.pause() } catch (e) {}
        }
        this.setData({ deepPlaying: false })
        return
      }
      if (!this._deepCtx) {
        const ctx = wx.createInnerAudioContext()
        ctx.src = this.data.guide.deepAudio
        ctx.onEnded(() => this.setData({ deepPlaying: false }))
        ctx.onError(() => this.setData({ deepPlaying: false }))
        this._deepCtx = ctx
      }
      this._deepCtx.play()
      this.setData({ deepPlaying: true })
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
      if (this._deepCtx) {
        try { this._deepCtx.destroy() } catch (e) {}
        this._deepCtx = null
      }
    }
  }
})
