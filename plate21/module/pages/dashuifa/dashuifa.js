// 大水法 · 猎狗逐鹿 + 北望远瀛观。飞书 v3 原文。静默不再当主路径。
const session = require('../../store/session')
const ladder = require('../../utils/attempt-ladder')
const playGuide = require('../../capabilities/play-guide/guide')
const coachHost = require('../../capabilities/play-guide/coach-host')

const PIECES = [
  { key: 'deer', label: '梅花鹿', zone: 'pool' },
  { key: 'dogs', label: '猎狗', zone: 'ring' },
  { key: 'beasts', label: '卷尾铜兽', zone: 'ends' }
]
const ZONES = [
  { key: 'pool', label: '喷水池中央' },
  { key: 'ring', label: '环绕梅花鹿' },
  { key: 'ends', label: '水池东西两端' }
]
const YUAN_OPTS = [
  { key: 'A', text: '海晏堂' },
  { key: 'B', text: '远瀛观' },
  { key: 'C', text: '观水法' },
  { key: 'D', text: '谐奇趣' }
]

Page({
  behaviors: [coachHost],
  data: {
    stage: 'hunt',
    pieces: PIECES,
    zones: ZONES,
    placed: {},
    holding: '',
    huntAttempts: 0,
    huntHint: '',
    yuanOpts: YUAN_OPTS,
    yuanSelected: '',
    yuanAttempts: 0,
    yuanHint: '',
    yuanSolved: false,
    yuanRevealed: false,
    followup: false
  },

  onHold(e) {
    if (this.data.stage !== 'hunt') return
    this.setData({ holding: e.currentTarget.dataset.key })
  },

  onDrop(e) {
    if (this.data.stage !== 'hunt' || !this.data.holding) return
    const zone = e.currentTarget.dataset.zone
    const placed = Object.assign({}, this.data.placed)
    placed[this.data.holding] = zone
    this.setData({ placed: placed, holding: '' })
  },

  onHuntConfirm() {
    if (this.data.stage !== 'hunt') return
    const placed = this.data.placed
    const ok = PIECES.every(function (p) { return placed[p.key] === p.zone })
    const result = ladder.submit({
      ok: ok,
      attempts: this.data.huntAttempts,
      hints: ['鹿在水池中间。', '狗围着鹿，两端还有铜兽。'],
      revealText: '梅花鹿在喷水池中央，十只猎狗环绕，两只大型卷尾铜兽在水池东西两端。'
    })
    session.attemptPuzzle('ds-hunt', result.attempts, ok, 'tap')
    if (result.solved) {
      const auto = {}
      PIECES.forEach(function (p) { auto[p.key] = p.zone })
      this.setData({
        huntAttempts: result.attempts,
        huntHint: result.hint,
        placed: auto,
        stage: 'after'
      })
      session.completePuzzle('ds-hunt', { attempts: result.attempts, revealed: result.revealed })
        .catch(function () {})
      return
    }
    this.setData({ huntAttempts: result.attempts, huntHint: result.hint })
  },

  onAfterNext() {
    this.setData({ stage: 'yuan' })
    session.viewPuzzle('ds-yuan')
  },

  onYuanSelect(e) {
    if (this.data.yuanSolved) return
    this.setData({ yuanSelected: e.currentTarget.dataset.key })
  },

  onYuanConfirm() {
    if (this.data.yuanSolved || !this.data.yuanSelected) return
    const ok = this.data.yuanSelected === 'B'
    const result = ladder.submit({
      ok: ok,
      attempts: this.data.yuanAttempts,
      hints: ['往北看高台。', '南对面才是观水法。'],
      revealText: '远瀛观位于大水法北侧。'
    })
    session.attemptPuzzle('ds-yuan', result.attempts, ok, 'tap')
    if (result.solved) {
      this.setData({
        yuanAttempts: result.attempts,
        yuanSolved: true,
        yuanRevealed: result.revealed,
        yuanSelected: 'B',
        yuanHint: result.hint,
        followup: true
      })
      session.completePuzzle('ds-yuan', { answer: 'B', attempts: result.attempts, revealed: result.revealed }, {
        checkpoint: 's4-timeline'
      }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    this.setData({ yuanAttempts: result.attempts, yuanHint: result.hint })
  },

  onSkipQuestion() {
    this.onNext()
  },

  onNext() {
    wx.redirectTo({
      url: '/plate21/module/pages/transit/transit?leg=ds-s4',
      fail: () => wx.showToast({ title: '页面跳转失败，请重试', icon: 'none' })
    })
  },

  onLoad() {
    session.viewPuzzle('ds-hunt')
    const hunt = session.getPuzzle('ds-hunt')
    const yuan = session.getPuzzle('ds-yuan')
    if (yuan) {
      this.setData({ stage: 'yuan', yuanSolved: true, yuanSelected: 'B', followup: true, placed: { deer: 'pool', dogs: 'ring', beasts: 'ends' } })
    } else if (hunt) {
      this.setData({ stage: 'after', placed: { deer: 'pool', dogs: 'ring', beasts: 'ends' } })
    }
  }
})
