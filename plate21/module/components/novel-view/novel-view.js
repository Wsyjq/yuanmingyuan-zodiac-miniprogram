/**
 * 复古档案手账阅读器：每页打包约一屏字数的段落块（buildPages 分页），
 * 文字整段落墨、块间级联显影，支持点按与滑动翻页。
 */
const motion = require('../../utils/motion')
const novelPages = require('../../utils/novel-pages')

const REVEAL_MIN_MS = 520
const REVEAL_MAX_MS = 1200
const REVEAL_MS_PER_CHAR = 12
const BLOCK_STAGGER_MS = 150
const INTENT_SLOP = 10
const FLICK_MIN_DISTANCE = 16

function pageLabel(index) {
  return String(index + 1).padStart(2, '0')
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
    turnDuration: { type: Number, value: 460 },
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
    currentPage: [],
    leadIndex: -1,
    blockDelay: BLOCK_STAGGER_MS,
    revealDuration: REVEAL_MIN_MS,
    typing: false,
    showAll: false,
    turning: false,
    turnDirection: '',
    turnPage: [],
    turnLeadIndex: -1,
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
      this._reducedMotion = motion.prefersReducedMotion()
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
      this._finished = false
      this._pages = novelPages.buildPages(value)
      this.setData({
        pageIndex: 0,
        pageCount: this._pages.length,
        countLabel: pageLabel(this._pages.length - 1),
        turning: false,
        turnDirection: '',
        turnItem: {},
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
      const page = this._pages[index] || []
      const charCount = page.reduce(function (sum, item) {
        return item && item.image ? sum : sum + novelPages.textLength(item && item.text)
      }, 0)
      // 首个非图片、非引文块承担整页首字下沉
      const leadIndex = page.findIndex(function (item) {
        return item && !item.image && !item.quote
      })
      const staggerTotal = Math.max(0, page.length - 1) * BLOCK_STAGGER_MS
      const typing = charCount > 0 && !this._reducedMotion
      const revealDuration = Math.min(REVEAL_MAX_MS, Math.max(REVEAL_MIN_MS, charCount * REVEAL_MS_PER_CHAR))
      this._clearTypeTimer()
      this.setData({
        pageIndex: index,
        pageLabel: pageLabel(index),
        currentPage: page,
        leadIndex: leadIndex,
        revealDuration,
        typing,
        showAll: !typing,
        turning: false,
        turnDirection: '',
        turnPage: []
      })
      if (typing) {
        this._typeTimer = setTimeout(() => this._finishTyping(), revealDuration + staggerTotal)
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
      if (this._reducedMotion) {
        this._activatePage(targetIndex)
        return
      }
      this._clearTypeTimer()
      const targetPage = this._pages[targetIndex] || []
      this.setData({
        pageIndex: targetIndex,
        pageLabel: pageLabel(targetIndex),
        currentPage: targetPage,
        leadIndex: targetPage.findIndex(function (item) {
          return item && !item.image && !item.quote
        }),
        typing: false,
        showAll: false,
        turning: true,
        turnDirection: direction,
        turnPage: this.data.currentPage,
        turnLeadIndex: this.data.leadIndex,
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
        if (this._finished) return
        this._finished = true
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
      if (this._lastDragUpdate && now - this._lastDragUpdate < 32 && armed === this.data.gestureArmed) return
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
