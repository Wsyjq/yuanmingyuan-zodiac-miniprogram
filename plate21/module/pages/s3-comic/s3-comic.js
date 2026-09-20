// 海晏堂 · 正午水力钟。飞书 v3 原文一问。下一站蓄水楼。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const audioBus = require('../../utils/audio-bus')
const ladder = require('../../utils/attempt-ladder')

const OPTIONS = [
  { key: 'A', text: '只有“午马”喷水' },
  { key: 'B', text: '十二生肖同时喷水' },
  { key: 'C', text: '鼠、马同时喷水' },
  { key: 'D', text: '所有兽首停止喷水' }
]
const CORRECT = 'B'
const HINTS = [
  '“各守一时”很好理解，再想想“至午而全见”。',
  '常规是轮值，正午不同。'
]
const REVEAL = '海晏堂十二生肖喷水装置按照十二时辰依次喷水，到正午时，十二尊兽首会一同喷水，因此也被称作“水力钟”。'

Page({
  data: {
    narrSrc: audioSrc.clip('narr-s3-comic'),
    showHistory: false,
    cardNumber: 0,
    historyLines: [
      '海晏堂十二生肖喷水装置按照十二时辰依次喷水，到正午时，十二尊兽首会一同喷水，因此也被称作“水力钟”。'
    ],
    cells: [
      { id: 'zi', time: '子', mark: '鼠', art: 'single', desc: '鼠首先报子时' },
      { id: 'chou', time: '丑', mark: '牛', art: 'handoff', desc: '水线转向牛首' },
      { id: 'noon', time: '午', mark: '', art: 'sundial', desc: '日影逼近正中' },
      { id: 'all', time: '正午', mark: '', art: 'fountain', desc: '十二水位同时亮起' }
    ],
    options: OPTIONS,
    selected: '',
    attempts: 0,
    hint: '',
    solved: false,
    revealed: false,
    followup: false,
    advancing: false
  },

  onSelect(e) {
    if (this.data.solved) return
    this.setData({ selected: e.currentTarget.dataset.key })
  },

  onConfirm() {
    audioBus.stopKind('voice')
    if (this.data.solved || !this.data.selected) return
    const ok = this.data.selected === CORRECT
    const result = ladder.submit({
      ok: ok,
      attempts: this.data.attempts,
      hints: HINTS,
      revealText: REVEAL
    })
    session.attemptPuzzle('s3-hour', result.attempts, ok, 'tap')
    if (result.solved) {
      this.setData({
        attempts: result.attempts,
        solved: true,
        revealed: result.revealed,
        hint: result.hint,
        selected: CORRECT,
        showHistory: true
      })
      const stamp = this.selectComponent('#stamp')
      if (stamp && stamp.show) stamp.show('考察记录已保存')
      session.completePuzzle('s3-hour', {
        answer: CORRECT,
        attempts: result.attempts,
        revealed: result.revealed
      }, { collectCard: true }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    session.viewHint('s3-hour', result.attempts)
    this.setData({ attempts: result.attempts, hint: result.hint })
  },

  onCloseHistory() {
    this.setData({ showHistory: false, followup: true })
  },

  onHistoryNext() {
    this.setData({ showHistory: false, followup: true })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true, showHistory: false })
    session.completePuzzle('s3-hour', {
      answer: CORRECT,
      attempts: this.data.attempts || 1
    }, { collectCard: true, checkpoint: 'xs-height' }).then(function () {
      wx.redirectTo({ url: '/plate21/module/pages/transit/transit?leg=s3-xs' })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  },

  onLoad() {
    this._timers = []
    session.viewPuzzle('s3-hour')
    const puzzle = session.getPuzzle('s3-hour')
    this.setData({
      cardNumber: Number(session.getCardDigit('s3-hour')),
      solved: !!puzzle,
      selected: puzzle ? CORRECT : '',
      showHistory: !!puzzle,
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
