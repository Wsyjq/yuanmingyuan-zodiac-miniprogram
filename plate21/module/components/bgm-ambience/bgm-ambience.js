/**
 * bgm-ambience —— 站点氛围背景音乐（V2.2 全量 BGM 接入）。
 *
 * 不可见组件：按 station 属性（或当前页面路由）取 bgm/ 下对应曲目，loop 低音量常驻。
 * 规则：
 *   - 受「背景音乐」独立开关控制（utils/audio-settings），关闭即停、打开即续；
 *   - 经 audio-bus 让路：任何人声开播时压低暂停，人声结束自动恢复；
 *   - 页面 onHide 暂停、onShow 续播（翻页离开即换曲/停曲）；
 *   - 站点映射表里没有的页（大水法=零配乐设计红线、观水法、转场与枢纽页）不播。
 * 音频文件在本地 bgm/（gitignore），经 utils/audio-src.js 的 bgm() 取流，生产换 CDN 同源。
 */
const audioSrc = require('../../utils/audio-src')
const audioSettings = require('../../utils/audio-settings')
const audioBus = require('../../utils/audio-bus')

// 路由段 → 曲目（bgm/README.md 的站点表；大水法有意缺席）
const ROUTE_BGM = [
  { match: /pages\/(prologue|s1-decode)\//, file: 'bgm-01-xiyanglou.mp3' },
  { match: /pages\/s2-/, file: 'bgm-02-huanghuazhen.mp3' },
  { match: /pages\/s3-/, file: 'bgm-04-haiyantang.mp3' },
  { match: /pages\/s4-/, file: 'bgm-12-yugao.mp3' },
  { match: /pages\/finale\//, file: 'bgm-06-zhongzhang.mp3' },
  { match: /pages\/letter\//, file: 'bgm-13-huixiang.mp3' }
]

// 散页站点（waypoint 传 station 属性，与 audio-guide 同一标识）
const STATION_BGM = {
  't-xieqiqu': 'bgm-07x-xieqiqu-dual.mp3',
  't-yangquelong': 'bgm-09-yangquelong.mp3',
  't-fangwaiguan': 'bgm-03-fangwaiguan.mp3',
  't-xushuilou': 'bgm-10-xushuilou.mp3',
  't-xianfahua': 'bgm-11-xianfahua.mp3'
}

function pickBgm(station) {
  if (station) return STATION_BGM[station] || ''
  try {
    const pages = getCurrentPages()
    const route = pages && pages.length ? pages[pages.length - 1].route : ''
    const hit = ROUTE_BGM.find((item) => item.match.test(route))
    return hit ? hit.file : ''
  } catch (e) {
    return ''
  }
}

Component({
  properties: {
    station: { type: String, value: '' }
  },

  lifetimes: {
    attached() {
      this.kind = 'bgm'
      this._file = pickBgm(this.data.station)
      audioBus.register(this)
      this._onSettings = (settings) => {
        if (settings.bgm) this.start(true)
        else this.stop()
      }
      audioSettings.subscribe(this._onSettings)
      if (audioSettings.get().bgm) this.start(false)
    },
    detached() {
      audioBus.unregister(this)
      audioSettings.unsubscribe(this._onSettings)
      this.destroyCtx()
    }
  },

  pageLifetimes: {
    show() {
      if (audioSettings.get().bgm) this.start(true)
    },
    hide() {
      this.pause()
    }
  },

  methods: {
    ensureCtx() {
      if (this._ctx || !this._file || !wx.createInnerAudioContext) return this._ctx
      const ctx = wx.createInnerAudioContext()
      ctx.src = audioSrc.bgm(this._file)
      ctx.loop = true
      ctx.volume = 0.55
      ctx.onError(() => { this._playing = false })
      this._ctx = ctx
      this._playing = false
      return ctx
    },

    // manual=true 表示用户刚打开开关/回页面，从头续播；false 表示静默尝试
    start(manual) {
      const ctx = this.ensureCtx()
      if (!ctx) return
      if (this._playing) return
      try { ctx.play() } catch (e) { return }
      this._playing = true
      if (manual) audioBus.activate(this)
    },

    stop() {
      if (this._ctx) {
        try { this._ctx.pause() } catch (e) { /* 忽略 */ }
      }
      this._playing = false
    },

    // audio-bus 约定接口
    isPlaying() { return !!this._playing },
    pause() { this.stop() },
    resume() {
      if (audioSettings.get().bgm) this.start(false)
    },

    destroyCtx() {
      if (this._ctx) {
        try { this._ctx.destroy() } catch (e) { /* 忽略 */ }
        this._ctx = null
      }
      this._playing = false
    }
  }
})
