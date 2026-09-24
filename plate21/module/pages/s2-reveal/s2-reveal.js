// 第二站 · 黄花阵名字由来（飞书 rev5614：翻面揭晓，不再开放作答）。
// 文案单点在 content/s2-reveal.js。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const audioBus = require('../../utils/audio-bus')
const coachHost = require('../../capabilities/play-guide/coach-host')
const content = require('../../content/s2-reveal')

const PUZZLE = content.puzzleId

Page({
  behaviors: [coachHost],
  data: {
    showHistory: false,
    historyLines: content.historyLines,
    cardNumber: 0,
    showCardNumber: false,
    solved: false,
    skipped: false,
    advancing: false,
    narrSrc: audioSrc.clip(content.clips.main)
  },

  onLoad() {
    session.viewPuzzle(PUZZLE)
    const puzzle = session.getPuzzle(PUZZLE)
    const skipped = !!(puzzle && puzzle.payload && puzzle.payload.action === 'skipped')
    this.setData({
      cardNumber: Number(session.getCardDigit(PUZZLE)),
      solved: !!puzzle,
      skipped: skipped,
      showHistory: !!puzzle && !skipped,
      showCardNumber: false
    })
  },

  onReady() {},

  onFlip() {
    if (this.data.showHistory || this.data.solved) return
    audioBus.stopKind('voice')
    this.setData({
      solved: true,
      showHistory: false,
      showCardNumber: false
    })
    session.attemptPuzzle(PUZZLE, 1, true, 'tap')
    session.completePuzzle(PUZZLE, { action: 'flip', attempts: 1 }, { collectCard: true })
      .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
  },

  onHistoryNext() {
    this.setData({ showHistory: false, narrSrc: audioSrc.clip(content.clips.followup) })
  },

  onCloseHistory() {
    this.setData({ showHistory: false, narrSrc: audioSrc.clip(content.clips.followup) })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true, showHistory: false })
    session.completePuzzle(PUZZLE, {
      action: 'flip',
      attempts: 1
    }, { collectCard: true, checkpoint: content.next.checkpoint }).then(() => {
      wx.redirectTo({
        url: content.next.url,
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
