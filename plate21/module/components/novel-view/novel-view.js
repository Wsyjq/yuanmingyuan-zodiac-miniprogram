/**
 * 复古档案手账阅读器：一段内容对应一张纸，文字逐字显现，支持点按与滑动翻页。
 */
const CHAR_MS = 34
const INTENT_SLOP = 10
const FLICK_MIN_DISTANCE = 16

function pageLabel(index) {
  return String(index + 1).padStart(2, '0')
}

function itemChars(item) {
  return String((item && item.text) || '').split('')
}

Component({
  properties: {
    title: { type: String, value: '' },
    paragraphs: {
      type: Array,
      value: [],
      observer(value) {
        if (this._attached) this._resetPages(value)
      }
    },
    finishText: { type: String, value: '继续' },
    turnDuration: { type: Number, value: 680 },
    swipeDistance: { type: Number, value: 42 },
    flickVelocity: { type: Number, value: 0.38 },
    dragMaxAngle: { type: Number, value: 5 },
    hapticFeedback: { type: Boolean, value: true },
    settleHaptic: { type: Boolean, value: true }
  },

  data: {
    pageIndex: 0,
    pageCount: 1,
    pageLabel: '01',
    countLabel: '01',
    currentItem: {},
    currentChars: [],
    typing: false,
    showAll: false,
    turning: false,
    turnDirection: '',
    turnItem: {},
    turnChars: [],
    turnPageLabel: '01',
    dragging: false,
    gestureArmed: false,
    gestureDirection: '',
    dragProgress: 0,
    dragStyle: '',
    curlStyle: ''
  },

  lifetimes: {
    attached() {
      this._attached = true
      this._lastHapticAt = 0
      this._resetPages(this.properties.paragraphs)
    },
    detached() {
      this._attached = false
      this._clearTimers()
    }
  },

  methods: {
    _resetPages(value) {
      this._clearTimers()
      this._pages = Array.isArray(value) && value.length ? value.slice() : [{ text: '' }]
      this.setData({
        pageIndex: 0,
        pageCount: this._pages.length,
        countLabel: pageLabel(this._pages.length - 1),
        turning: false,
        turnDirection: '',
        turnItem: {},
        turnChars: [],
        dragging: false,
        gestureArmed: false,
        gestureDirection: '',
        dragProgress: 0,
        dragStyle: '',
        curlStyle: ''
      })
      this._activatePage(0)
    },

    _activatePage(index) {
      const item = this._pages[index] || { text: '' }
      const chars = itemChars(item)
      const typing = chars.length > 0
      this._clearTypeTimer()
      this.setData({
        pageIndex: index,
        pageLabel: pageLabel(index),
        currentItem: item,
        currentChars: chars,
        typing,
        showAll: !typing,
        turning: false,
        turnDirection: '',
        turnItem: {},
        turnChars: []
      })
      if (typing) {
        const duration = Math.min(6500, Math.max(700, chars.length * CHAR_MS + 240))
        this._typeTimer = setTimeout(() => this._finishTyping(), duration)
      }
    },

    _finishTyping() {
      this._clearTypeTimer()
      if (this.data.typing || !this.data.showAll) {
        this.setData({ typing: false, showAll: true })
      }
    },

    _startTurn(targetIndex, direction, startHapticDone) {
      if (this.data.turning || targetIndex < 0 || targetIndex >= this._pages.length) return
      this._clearTypeTimer()
      const targetItem = this._pages[targetIndex] || { text: '' }
      this.setData({
        pageIndex: targetIndex,
        pageLabel: pageLabel(targetIndex),
        currentItem: targetItem,
        currentChars: [],
        typing: false,
        showAll: false,
        turning: true,
        turnDirection: direction,
        turnItem: this.data.currentItem,
        turnChars: itemChars(this.data.currentItem),
        turnPageLabel: pageLabel(this.data.pageIndex)
      })
      if (!startHapticDone) this._pulseHaptic('light')
      const duration = Math.max(320, Number(this.properties.turnDuration) || 680)
      this._turnTimer = setTimeout(() => this._finishTurn(), duration + 30)
    },

    _finishTurn() {
      if (!this.data.turning) return
      this._clearTurnTimer()
      this._activatePage(this.data.pageIndex)
      if (this.properties.settleHaptic) this._pulseHaptic('light', true)
    },

    _clearTypeTimer() {
      if (!this._typeTimer) return
      clearTimeout(this._typeTimer)
      this._typeTimer = null
    },

    _clearTurnTimer() {
      if (!this._turnTimer) return
      clearTimeout(this._turnTimer)
      this._turnTimer = null
    },

    _clearTimers() {
      this._clearTypeTimer()
      this._clearTurnTimer()
    },

    onPaperTap() {
      if (this.data.turning || (this._ignoreTapUntil && Date.now() < this._ignoreTapUntil)) return
      if (this.data.typing) {
        this._finishTyping()
        return
      }
      this.onNext()
    },

    onPrev() {
      if (this.data.turning || this.data.pageIndex <= 0) return
      if (this.data.typing) this._finishTyping()
      this._startTurn(this.data.pageIndex - 1, 'prev')
    },

    onNext() {
      if (this.data.turning) return
      if (this.data.typing) {
        this._finishTyping()
        return
      }
      if (this.data.pageIndex >= this.data.pageCount - 1) {
        this._pulseHaptic('medium')
        this.triggerEvent('finish')
        return
      }
      this._startTurn(this.data.pageIndex + 1, 'next')
    },

    onTurnAnimationEnd(e) {
      if (e && e.target && e.currentTarget && e.target.id !== e.currentTarget.id) return
      this._finishTurn()
    },

    onTouchStart(e) {
      if (this.data.turning) return
      const touch = e.touches && e.touches[0]
      if (!touch) return
      this._gestureStart = {
        x: Number(touch.clientX),
        y: Number(touch.clientY),
        time: Date.now()
      }
      this._gestureLock = ''
      this._gestureHapticFired = false
      this._lastDragUpdate = 0
    },

    onTouchMove(e) {
      if (!this._gestureStart || this.data.turning) return
      const touch = e.touches && e.touches[0]
      if (!touch) return
      const dx = Number(touch.clientX) - this._gestureStart.x
      const dy = Number(touch.clientY) - this._gestureStart.y
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)

      if (!this._gestureLock) {
        if (Math.max(absX, absY) < INTENT_SLOP) return
        if (absY > absX * 1.08) {
          this._gestureLock = 'vertical'
          return
        }
        if (absX > absY * 1.15) this._gestureLock = 'horizontal'
        else return
      }
      if (this._gestureLock !== 'horizontal') return

      const direction = dx < 0 ? 'next' : 'prev'
      const valid = direction === 'next'
        ? this.data.pageIndex < this.data.pageCount - 1
        : this.data.pageIndex > 0
      const threshold = this._swipeDistance()
      const progress = Math.min(1, absX / threshold)
      const visualProgress = valid ? progress : progress * 0.2
      const armed = valid && absX >= threshold

      if (armed && !this.data.gestureArmed && !this._gestureHapticFired) {
        this._gestureHapticFired = this._pulseHaptic('light')
      }

      const now = Date.now()
      if (this._lastDragUpdate && now - this._lastDragUpdate < 16 && armed === this.data.gestureArmed) return
      this._lastDragUpdate = now
      const maxAngle = Math.max(0, Number(this.properties.dragMaxAngle) || 5)
      const angle = (direction === 'next' ? -1 : 1) * maxAngle * visualProgress
      const shift = Math.max(-9, Math.min(9, dx * 0.055))
      const curlSize = 48 + Math.round(visualProgress * 76)
      this.setData({
        dragging: true,
        gestureArmed: armed,
        gestureDirection: direction,
        dragProgress: visualProgress,
        dragStyle: `transform: translate3d(${shift.toFixed(2)}px, 0, 0) rotateY(${angle.toFixed(2)}deg);`,
        curlStyle: `width:${curlSize}rpx;height:${curlSize}rpx;opacity:${(0.62 + visualProgress * 0.38).toFixed(2)};`
      })
    },

    onTouchEnd(e) {
      if (!this._gestureStart) return
      const touch = e.changedTouches && e.changedTouches[0]
      const endX = touch ? Number(touch.clientX) : this._gestureStart.x
      const endY = touch ? Number(touch.clientY) : this._gestureStart.y
      const dx = endX - this._gestureStart.x
      const dy = endY - this._gestureStart.y
      const distance = Math.abs(dx)
      const elapsed = Math.max(1, Date.now() - this._gestureStart.time)
      const velocity = distance / elapsed
      const direction = dx < 0 ? 'next' : 'prev'
      const valid = direction === 'next'
        ? this.data.pageIndex < this.data.pageCount - 1
        : this.data.pageIndex > 0
      const inferredHorizontal = !this._gestureLock && distance >= INTENT_SLOP && Math.abs(dx) > Math.abs(dy) * 1.15
      const horizontal = (this._gestureLock === 'horizontal' || inferredHorizontal) && Math.abs(dx) > Math.abs(dy)
      const commit = horizontal && valid && (
        distance >= this._swipeDistance() ||
        (distance >= FLICK_MIN_DISTANCE && velocity >= Number(this.properties.flickVelocity || 0.38))
      )
      const startHapticDone = this._gestureHapticFired

      if (horizontal) this._ignoreTapUntil = Date.now() + 400
      this._resetGesture()
      if (!commit) return
      if (this.data.typing) this._finishTyping()
      const target = direction === 'next' ? this.data.pageIndex + 1 : this.data.pageIndex - 1
      this._startTurn(target, direction, startHapticDone)
    },

    onTouchCancel() {
      this._resetGesture()
    },

    _resetGesture() {
      this._gestureStart = null
      this._gestureLock = ''
      this._gestureHapticFired = false
      this._lastDragUpdate = 0
      if (this.data.dragging || this.data.gestureArmed) {
        this.setData({
          dragging: false,
          gestureArmed: false,
          gestureDirection: '',
          dragProgress: 0,
          dragStyle: '',
          curlStyle: ''
        })
      }
    },

    _swipeDistance() {
      const configured = Number(this.properties.swipeDistance)
      if (configured > 0) return configured
      if (typeof wx !== 'undefined' && wx.getWindowInfo) {
        const width = Number(wx.getWindowInfo().windowWidth) || 375
        return Math.max(36, Math.min(56, width * 0.11))
      }
      return 42
    },

    _pulseHaptic(type, force) {
      if (!this.properties.hapticFeedback || typeof wx === 'undefined' || !wx.vibrateShort) return false
      const now = Date.now()
      if (!force && now - this._lastHapticAt < 90) return false
      this._lastHapticAt = now
      try {
        wx.vibrateShort({ type, fail() {} })
        return true
      } catch (err) {
        return false
      }
    }
  }
})
