// 黄花阵 · 修建目的（四选一）。
// 文案单点在 content/s2-quiz.js；答题流程（选择/判分/史料卡/后续旁白）走 quiz-host 公共行为。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const playGuide = require('../../capabilities/play-guide/guide')
const coachHost = require('../../capabilities/play-guide/coach-host')
const glossHost = require('../../utils/gloss-host')
const quizHost = require('../../utils/quiz-host')
const content = require('../../content/s2-quiz')
const sl07 = require('../../utils/sl-cards').get('sl07')

Page({
  behaviors: [coachHost, glossHost, quizHost],
  data: {
    content: content,
    options: content.options,
    cardNumber: content.cardNumber,
    introParts: content.introParts,
    historyLines: sl07.lines,
    historyImage: sl07.image || '',
    narrSrc: audioSrc.clip(content.clips.main)
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true, showHistory: false })
    session.completePuzzle(content.puzzleId, { attempts: this.data.attempts || 1, answer: content.correct }, {
      collectCard: true,
      checkpoint: content.next.checkpoint
    }).then(function () {
      wx.redirectTo({ url: content.next.url })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  },

  onLoad(options) {
    this._timers = []
    if (playGuide.enterTourPage('pages/s2-quiz/s2-quiz', options)) {
      this.setData({ touring: true, solved: false, followup: false, showHistory: false })
      return
    }
    session.viewPuzzle(content.puzzleId)
    const puzzle = session.getPuzzle(content.puzzleId)
    this.setData({
      cardNumber: Number(session.getCardDigit(content.puzzleId)) || content.cardNumber,
      solved: !!puzzle,
      selected: puzzle ? content.correct : '',
      showHistory: !!puzzle,
      followup: false,
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
