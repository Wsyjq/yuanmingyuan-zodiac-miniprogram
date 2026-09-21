// 第二站 · 黄花阵 对读二：黄花从灯上来（V2.2 讲述版）
// 玩法：对照 DJ-09 黄花阵图（地图＋宫女游玩图）与屏上参考图，文字作答；
//      调 answer-judge 检验意思。字数 40；每次答错给提示，第三次揭晓标准答案。
// 史料：宫女手持黄色彩绸扎成的莲花灯，迷宫因此得名黄花阵。卡片角落数字 0。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const audioBus = require('../../utils/audio-bus')
const judge = require('../../utils/answer-judge')
const playGuide = require('../../capabilities/play-guide/guide')
const coachHost = require('../../capabilities/play-guide/coach-host')

const HISTORY_LINES = [
  '黄花阵名字由来：',
  '由于宫女们手持黄色彩绸扎成的莲花灯，',
  '所以这个迷宫也得名「黄花阵」。'
]

Page({
  behaviors: [coachHost],
  data: {
    answer: '',
    charCount: 0,
    maxChars: judge.MAX_INPUT_CHARS,
    maxAttempts: judge.MAX_FREEFORM_ATTEMPTS,
    attempts: 0,
    checking: false,
    hint: '',
    showHistory: false,
    historyLines: HISTORY_LINES,
    cardNumber: 0,
    showCardNumber: false,
    solved: false,
    skipped: false,
    advancing: false,
    narrSrc: audioSrc.clip('narr-s2-reveal')
  },

  onLoad() {
    session.viewPuzzle('s2-name')
    const puzzle = session.getPuzzle('s2-name')
    const skipped = !!(puzzle && puzzle.payload && puzzle.payload.action === 'skipped')
    const savedAnswer = puzzle && puzzle.payload && puzzle.payload.answer || ''
    this.setData({
      cardNumber: Number(session.getCardDigit('s2-name')),
      solved: !!puzzle,
      skipped: skipped,
      showHistory: !!puzzle && !skipped,
      showCardNumber: !!puzzle && !skipped,
      answer: savedAnswer,
      charCount: judge.countChars(savedAnswer),
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onReady() {},

  onInput(e) {
    const clipped = judge.clipInput(e.detail.value || '')
    this.setData({
      answer: clipped,
      charCount: judge.countChars(clipped)
    })
  },

  onSubmit() {
    if (this.data.showHistory || this.data.solved || this.data.checking) return Promise.resolve()
    audioBus.stopKind('voice')
    const check = judge.validateInput(this.data.answer)
    if (!check.ok) {
      this.setData({ hint: check.hint })
      return Promise.resolve()
    }
    this.setData({ checking: true, hint: '' })
    const self = this
    return judge.judge({ puzzleId: 's2-name', text: check.text }).then(function (result) {
      self._applyFreeformResult(result)
    }).catch(function () {
      self._applyFreeformResult({
        ok: true,
        verdict: 'wrong',
        hint: judge.WRONG_HINT,
        source: 'unavailable',
        text: check.text
      })
    })
  },

  _applyFreeformResult(result) {
    if (this.data.solved) {
      this.setData({ checking: false })
      return
    }
    if (!result.ok) {
      this.setData({ checking: false, hint: result.hint || '请重新回答' })
      return
    }
    const attempts = this.data.attempts + 1
    const correct = result.verdict === 'correct'
    session.attemptPuzzle('s2-name', attempts, correct, 'text')
    if (correct) {
      this.setData({
        checking: false,
        showHistory: true,
        showCardNumber: true,
        solved: true,
        attempts: attempts,
        hint: ''
      })
      session.completePuzzle('s2-name', { answer: result.text, attempts: attempts }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
      return
    }
    session.viewHint('s2-name', attempts)
    if (judge.shouldRevealAnswer(attempts)) {
      this.setData({
        checking: false,
        attempts: attempts,
        hint: '',
        solved: true,
        showHistory: true,
        showCardNumber: true,
        answer: judge.GOLD_ANSWER
      })
      session.completePuzzle('s2-name', {
        answer: judge.GOLD_ANSWER,
        attempts: attempts,
        revealed: true
      }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
      return
    }
    this.setData({
      checking: false,
      attempts: attempts,
      hint: judge.hintForAttempt(attempts)
    })
  },

  onHistoryNext() {
    this.setData({ showHistory: false, narrSrc: audioSrc.clip('narr-s2-reveal-followup') })
  },

  onCloseHistory() {
    this.setData({ showHistory: false, narrSrc: audioSrc.clip('narr-s2-reveal-followup') })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true, showHistory: false })
    session.completePuzzle('s2-name', {
      answer: this.data.answer,
      attempts: this.data.attempts || 1
    }, { collectCard: true, checkpoint: 's2-blend' }).then(() => {
      wx.redirectTo({
        url: '/plate21/module/pages/s2-blend/s2-blend',
        fail: () => {
          this.setData({ advancing: false })
          wx.showToast({ title: '页面跳转失败，请重试', icon: 'none' })
        }
      })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  }
})
