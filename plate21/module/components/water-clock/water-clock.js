'use strict'

const model = require('../../play/water-clock')
const renderer = require('./renderer')
const audioBus = require('../../utils/audio-bus')
const ASSETS = '/plate21/module/components/water-clock/assets/'

Component({
  properties: {
    state: { type: Object, value: null },
    active: { type: Boolean, value: true }
  },
  data: {
    loading: true, staticMode: false, playing: false, completed: false,
    stage: 'observe', time: 0, elapsed: 0, seekMax: model.QUESTION_AT,
    sound: false, showHours: false, wrong14: false, prediction: '', notice: '',
    clock: '入画', label: '', caption: '', beasts: [], shotSrc: ASSETS + 'paint.jpg',
    hourOptions: model.HOUR_OPTIONS, predictions: model.PREDICTIONS,
    hours: model.NAMES.map(function (name, i) { return { name: model.BRANCHES[i] + name, range: model.HOURS[i] } })
  },
  observers: {
    state: function (value) {
      if (!this._alive || JSON.stringify(value) === this._lastEmitted) return
      this._cancelFrame()
      this._state = model.createState(value)
      this._viewKey = ''
      this._view()
      this._paint()
      this._syncSound()
    },
    active: function (value) {
      if (this._alive && !value) this._suspend()
    }
  },
  lifetimes: {
    attached: function () {
      this._alive = true
      this._hidden = false
      this._state = model.createState(this.properties.state)
      this._assets = {}
      this._frame = null
      this._view()
    },
    ready: function () { this._initCanvas() },
    detached: function () {
      this._suspend()
      this._alive = false
      clearTimeout(this._loadTimeout)
      this._canvas = null
      this._context = null
      this._assets = null
    }
  },
  pageLifetimes: {
    hide: function () { this._hidden = true; this._suspend() },
    show: function () { this._hidden = false },
    resize: function () {
      if (!this._alive || this._state.staticMode) return
      this._suspend()
      this._initCanvas()
    }
  },
  methods: {
    _initCanvas: function () {
      if (!this._alive) return
      if (this._state.staticMode) { this.setData({ loading: false }); return }
      const self = this
      clearTimeout(this._loadTimeout)
      this._loadTimeout = setTimeout(function () { self._fallback('画面加载较慢，已切换到静态讲解。') }, 5000)
      try {
        this.createSelectorQuery().select('#waterClockCanvas').fields({ node: true, size: true }).exec(function (result) {
          if (!self._alive || self._state.staticMode) return
          const info = result && result[0]
          const canvas = info && info.node
          if (!canvas || !canvas.getContext || !canvas.createImage || !canvas.requestAnimationFrame) {
            self._fallback('此设备使用静态讲解，也可以完成水力钟探索。')
            return
          }
          try {
            const device = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
            const dpr = Math.min(2, Math.max(1, Number(device.pixelRatio) || 1))
            const width = Math.max(240, Number(info.width) || 320)
            const height = Math.max(160, Number(info.height) || 215)
            canvas.width = Math.round(width * dpr)
            canvas.height = Math.round(height * dpr)
            const context = canvas.getContext('2d')
            context.scale(canvas.width / renderer.WIDTH, canvas.height / renderer.HEIGHT)
            self._canvas = canvas
            self._context = context
            Promise.all(['paint', 'wide', 'close'].map(function (key) {
              return new Promise(function (resolve, reject) {
                const image = canvas.createImage()
                image.onload = function () { resolve({ key: key, image: image }) }
                image.onerror = reject
                image.src = ASSETS + key + '.jpg'
              })
            })).then(function (loaded) {
              if (!self._alive || self._state.staticMode || self._canvas !== canvas) return
              clearTimeout(self._loadTimeout)
              loaded.forEach(function (item) { self._assets[item.key] = item.image })
              self.setData({ loading: false })
              self._paint()
            }).catch(function () {
              if (self._alive && self._canvas === canvas) self._fallback('动画素材暂时无法打开，请跟随静态讲解继续。')
            })
          } catch (err) { self._fallback('动画暂时不可用，已切换到静态讲解。') }
        })
      } catch (err) { this._fallback('此设备使用静态讲解，也可以完成水力钟探索。') }
    },

    _fallback: function (message) {
      if (!this._alive) return
      clearTimeout(this._loadTimeout)
      this._cancelFrame()
      this._destroySound()
      this.setData({ loading: false, sound: false, notice: message || '静态讲解已开启。' })
      this._dispatch({ type: 'static' })
    },

    _paint: function () {
      if (!this._alive || !this._context || !this._assets.close || this._state.staticMode) return
      try { renderer.draw(this._context, this._assets, this._state.time) }
      catch (err) { this._fallback('画面暂时不可用，已切换到静态讲解。') }
    },

    _view: function () {
      if (!this._alive || !this._state) return
      const state = this._state, scene = model.scene(state.time), phase = model.stage(state)
      const key = [Math.floor(state.time), phase, state.playing, state.prediction, state.attempts14, state.staticMode, scene.lit.join(',')].join('|')
      if (this._viewKey === key) return
      this._viewKey = key
      this.setData({
        time: state.time, elapsed: Math.floor(state.time), stage: phase,
        playing: state.playing, staticMode: state.staticMode, completed: state.completed,
        seekMax: state.completed ? model.DURATION : model.QUESTION_AT,
        wrong14: state.attempts14 > 0 && !state.answer14,
        prediction: state.prediction, clock: scene.clock, label: scene.label,
        caption: scene.caption, shotSrc: ASSETS + scene.shot + '.jpg',
        beasts: model.NAMES.map(function (name, i) {
          return { name: name, lit: scene.lit.indexOf(i) >= 0, spraying: scene.active.indexOf(i) >= 0 }
        })
      })
    },

    _publish: function () {
      if (!this._alive) return
      const snapshot = Object.assign({}, this._state)
      this._lastEmitted = JSON.stringify(snapshot)
      this._publishedSecond = Math.floor(snapshot.time)
      this.triggerEvent('change', { state: snapshot })
    },

    _dispatch: function (event) {
      if (!this._alive || !this._state) return
      if ((!this.properties.active || this._hidden) && event.type !== 'pause' && event.type !== 'static') return
      const wasComplete = this._state.completed
      this._state = model.reduce(this._state, event)
      this._view()
      this._paint()
      this._publish()
      this._syncSound()
      if (!this._state.playing) this._cancelFrame()
      else this._startFrame()
      if (!wasComplete && this._state.completed) this.triggerEvent('complete', { state: Object.assign({}, this._state) })
    },

    _startFrame: function () {
      if (this._frame != null || !this._canvas || !this._state.playing || !this.properties.active || this._hidden) return
      const self = this
      this._lastFrameTime = 0
      this._lastDrawTime = 0
      function next(now) {
        self._frame = null
        if (!self._alive || !self._state.playing || self._hidden || !self.properties.active) return
        const time = Number(now) || Date.now()
        const dt = self._lastFrameTime ? Math.min(0.15, Math.max(0, (time - self._lastFrameTime) / 1000)) : 0
        self._lastFrameTime = time
        const wasComplete = self._state.completed
        self._state = model.reduce(self._state, { type: 'tick', seconds: dt })
        // Render at <= 25 fps. Native view updates and storage events are much less frequent.
        if (time - self._lastDrawTime >= 40 || !self._state.playing) {
          self._lastDrawTime = time
          self._paint()
          self._view()
        }
        if (Math.floor(self._state.time) !== self._publishedSecond || !self._state.playing) self._publish()
        self._syncSound()
        if (!wasComplete && self._state.completed) self.triggerEvent('complete', { state: Object.assign({}, self._state) })
        if (self._alive && self._state.playing && !self._state.staticMode) self._frame = self._canvas.requestAnimationFrame(next)
      }
      this._frame = this._canvas.requestAnimationFrame(next)
    },

    _cancelFrame: function () {
      if (this._frame != null && this._canvas) {
        try { this._canvas.cancelAnimationFrame(this._frame) } catch (err) {}
      }
      this._frame = null
    },

    _suspend: function () {
      if (!this._alive || !this._state) return
      this._state = model.reduce(this._state, { type: 'pause' })
      this._cancelFrame()
      this._destroySound()
      this._view()
      this._publish()
    },

    _syncSound: function () {
      if (!this._audio) return
      const shouldPlay = this.data.sound && this._state.playing && this._state.time >= 8 && !this._hidden && this.properties.active
      if (shouldPlay && !this._soundPlaying) {
        audioBus.activate(this._audioPlayer)
        this._soundPlaying = true
        try { this._audio.play() } catch (err) { this._soundPlaying = false }
      } else if (!shouldPlay && this._soundPlaying) {
        this._soundPlaying = false
        try { this._audio.pause() } catch (err) {}
        if (audioBus.isActive(this._audioPlayer)) audioBus.release(this._audioPlayer)
      }
    },

    _destroySound: function () {
      if (this._audioPlayer) audioBus.unregister(this._audioPlayer)
      if (this._audio) { try { this._audio.stop(); this._audio.destroy() } catch (err) {} }
      this._audio = null
      this._audioPlayer = null
      this._soundPlaying = false
      if (this._alive) this.setData({ sound: false })
    },

    onSound: function () {
      if (!this.properties.active || this._hidden || !this._alive) return
      if (this.data.sound) { this.setData({ sound: false }); this._syncSound(); return }
      if (!this._audio) {
        try {
          const self = this
          this._audio = wx.createInnerAudioContext()
          this._audio.src = ASSETS + 'water.wav'
          this._audio.loop = true
          this._audio.volume = 0.25
          this._audio.onError(function () {
            if (!self._alive) return
            self._destroySound()
            self.setData({ notice: '水声暂时不可用，画面与答题可以继续。' })
          })
          this._audioPlayer = {
            kind: 'sfx', isPlaying: function () { return !!self._soundPlaying },
            pause: function () {
              // Another player owns audio now; require an explicit tap to resume this sound.
              self._soundPlaying = false
              if (self._audio) self._audio.pause()
              if (self._alive) self.setData({ sound: false })
            }
          }
          audioBus.register(this._audioPlayer)
        } catch (err) { this.setData({ notice: '水声暂时不可用，画面与答题可以继续。' }); return }
      }
      this.setData({ sound: true })
      this._syncSound()
    },

    onPlay: function () {
      if (!this.properties.active || this._hidden) return
      audioBus.stopKind('voice')
      if (this._state.staticMode) {
        if (this._state.completed) {
          const next = [8, 12, 20, 26, 32, 40].filter((t) => t > this._state.time)[0]
          this._dispatch({ type: 'seek', time: next == null ? 0 : next })
        } else this._dispatch({ type: 'staticNext' })
      } else this._dispatch({ type: this._state.playing ? 'pause' : 'play' })
    },
    onStatic: function () { this._fallback('静态讲解已开启，按顺序看图也可以完成探索。') },
    onSeek: function (event) { this._dispatch({ type: 'seek', time: event.detail.value }) },
    onAnswer14: function (event) { this._dispatch({ type: 'answer14', id: event.currentTarget.dataset.id }) },
    onPredict: function (event) { this._dispatch({ type: 'predict', id: event.currentTarget.dataset.id }) },
    onConfirm: function () { audioBus.stopKind('voice'); this._dispatch({ type: 'confirm' }) },
    onReplay: function () { this._dispatch({ type: 'replay' }) },
    onReplayNoon: function () { this._dispatch({ type: 'replay', noon: true }) },
    onToggleHours: function () { this.setData({ showHours: !this.data.showHours }) }
  }
})
