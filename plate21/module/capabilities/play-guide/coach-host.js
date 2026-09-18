/**
 * 页面/组件共用：镂空引导的开始、测量、下一步、收起。
 * 同时只允许一处在指（busy），避免一页叠两层。
 */
const session = require('../../store/session')
const playGuide = require('./guide')
const coachMeasure = require('./measure')

let busy = false

module.exports = Behavior({
  data: {
    showCoach: false,
    coachClosing: false,
    coachIndex: 0,
    coachSteps: [],
    coachStep: null,
    coachHole: null,
    coachWin: { top: 0, left: 0, windowWidth: 375, windowHeight: 812 }
  },

  lifetimes: {
    detached() {
      this._clearCoachRetry()
      if (this.data.showCoach) busy = false
    }
  },

  pageLifetimes: {
    hide() {
      this._clearCoachRetry()
    }
  },

  methods: {
    _clearCoachRetry() {
      if (this._coachRetry) {
        clearTimeout(this._coachRetry)
        this._coachRetry = null
      }
    },

    beginCoach(steps, doneFlag) {
      if (!steps || !steps.length) return false
      if (busy) {
        if (this.data.showCoach) return false
        busy = false
      }
      busy = true
      this._coachFlag = doneFlag || null
      this.setData({
        showCoach: true,
        coachClosing: false,
        coachSteps: steps,
        coachIndex: 0,
        coachStep: steps[0],
        coachHole: null
      })
      this.measureCoach()
      return true
    },

    maybeCoach(spots) {
      const list = Array.isArray(spots) ? spots : [spots]
      const snap = session.getSnapshot() || {}
      const pending = list.filter(function (s) {
        return s && playGuide.shouldShowSpot(snap, s.flag)
      })
      if (!pending.length) return true
      return this.beginCoach(pending, null)
    },

    scheduleCoach(spots, delay) {
      const self = this
      const kick = function () {
        self._coachRetry = null
        if (self.maybeCoach(spots)) return
        self._coachRetry = setTimeout(kick, 800)
      }
      this._clearCoachRetry()
      this._coachRetry = setTimeout(kick, delay == null ? 400 : delay)
    },

    runAfterCoach(fn) {
      const self = this
      const go = function () { if (typeof fn === 'function') fn.call(self) }
      if (this.data.showCoach) {
        this.finishCoach(go)
        return
      }
      go()
    },

    measureCoach() {
      const steps = this.data.coachSteps || []
      const step = steps[this.data.coachIndex] || steps[0]
      if (!step || !step.selector) return
      const self = this
      coachMeasure.measureIn(this, step.selector).then(function (got) {
        if (self.data.coachStep && self.data.coachStep.selector !== step.selector) return
        if (!got) {
          if (step.skipIfMissing) {
            self.onCoachNext()
            return
          }
          self.setData({ coachHole: null })
          return
        }
        self.setData({
          coachHole: got.hole,
          coachWin: got.win
        })
      })
    },

    persistCoachStep() {
      const step = this.data.coachStep
      if (step && step.flag) {
        session.setFlag(step.flag, Date.now()).catch(function () {})
      }
    },

    onCoachNext() {
      if (this.data.coachClosing) return
      this.persistCoachStep()
      const last = (this.data.coachSteps || []).length - 1
      if (this.data.coachIndex < last) {
        const next = this.data.coachIndex + 1
        this.setData({
          coachIndex: next,
          coachStep: this.data.coachSteps[next],
          coachHole: null
        })
        this.measureCoach()
        return
      }
      this.finishCoach()
    },

    onCoachSkip() {
      if (playGuide.isTouring()) {
        playGuide.abortTour()
        this._coachFlag = playGuide.FLAG
        this.finishCoach(function () {
          wx.redirectTo({ url: playGuide.COVER_URL })
        })
        return
      }
      this.finishCoach()
    },

    finishCoach(after) {
      if (this.data.coachClosing) return
      this.persistCoachStep()
      this._clearCoachRetry()
      this.setData({ coachClosing: true })
      const self = this
      const close = function () {
        busy = false
        self.setData({ showCoach: false, coachClosing: false, coachHole: null })
        if (typeof after === 'function') after()
        else if (playGuide.isTouring()) playGuide.continueTour()
      }
      const flag = this._coachFlag
      this._coachTimer = setTimeout(function () {
        self._coachTimer = null
        if (flag) {
          session.setFlag(flag, Date.now()).then(close).catch(close)
        } else {
          close()
        }
      }, 250)
    },

    onUnload() {
      this._clearCoachRetry()
      if (this._coachTimer) {
        clearTimeout(this._coachTimer)
        this._coachTimer = null
      }
      if (this.data.showCoach) busy = false
    }
  }
})
