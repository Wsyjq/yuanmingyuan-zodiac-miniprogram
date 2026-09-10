const session = require('../../store/session')

const ANSWER = require('../../config/tasks').tasks['s1-decode'].answer

Page({
  data: {
    answerInput: '',
    attempts: 0,
    hintLevel: 0,
    hintText: '',
    wrongTip: '',
    solved: false,
    advancing: false
  },

  onLoad() {
    session.viewPuzzle('s1-decode')
    const puzzle = session.getPuzzle('s1-decode')
    if (puzzle) {
      this.setData({
        solved: true,
        answerInput: ANSWER,
        attempts: Number(puzzle.payload && puzzle.payload.attempts) || 1
      })
    }
  },

  onInput(e) {
    this.setData({ answerInput: e.detail.value, wrongTip: '' })
  },

  onShowSurfaceHint() {
    session.viewHint('s1-decode', 1)
    this.setData({
      hintLevel: Math.max(this.data.hintLevel, 1),
      hintText: '先对照信封封口和信纸背面的半字，不要只看单个字形。'
    })
  },

  onShowJoinHint() {
    session.viewHint('s1-decode', 2)
    this.setData({
      hintLevel: 2,
      hintText: '把对应位置的两半字在脑中合拢，完整地点由三个字组成。'
    })
  },

  onSubmit() {
    const value = String(this.data.answerInput || '').replace(/\s+/g, '')
    if (!value) {
      wx.showToast({ title: '请先填写地点', icon: 'none' })
      return
    }
    if (value.includes(ANSWER)) {
      const attempts = this.data.attempts + 1
      session.attemptPuzzle('s1-decode', attempts, true, 'text')
      this.setData({ solved: true, attempts, wrongTip: '' })
      session.completePuzzle('s1-decode', { answer: ANSWER, attempts: attempts }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    const attempts = this.data.attempts + 1
    session.attemptPuzzle('s1-decode', attempts, false, 'text')
    this.setData({
      attempts,
      wrongTip: attempts > 1
        ? '还不是这个地点。试着把对应位置的上下半字拼成完整汉字。'
        : '答案没有对上，再检查一次实体信封。'
    })
  },

  onGoNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s1-decode', { answer: ANSWER, attempts: this.data.attempts }, {
      station: 's1',
      record: { payload: { answer: ANSWER, attempts: this.data.attempts } },
      checkpoint: 's2-purpose'
    })
      .then(function () {
        wx.redirectTo({ url: '/plate21/module/pages/transit/transit?leg=s1-s2' })
      })
      .catch(() => {
        this.setData({ advancing: false })
        wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
      })
  }
})
