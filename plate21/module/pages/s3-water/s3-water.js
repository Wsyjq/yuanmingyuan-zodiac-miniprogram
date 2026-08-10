const session = require('../../store/session')

const HISTORY_LINES = [
  '马首铜像曾流失海外，后由澳门爱国企业家何鸿燊先生出资购回。',
  '2019年，他正式将其捐赠给国家文物局。',
  '2020年12月1日，国家文物局将马首正式划拨给北京市海淀区圆明园管理处收藏，',
  '使其成为第一件回归圆明园原址的兽首。',
  '圆明园选择了园内正觉寺作为展示场地，并将其中的文物建筑文殊亭设为马首的专属展区。'
]

Page({
  data: {
    answerInput: '',
    attempts: 0,
    hintText: '',
    wrongTip: '',
    showHistory: false,
    historyLines: HISTORY_LINES,
    cardNumber: 0,
    operated: false,
    solved: false,
    showHandoff: false,
    advancing: false
  },

  onLoad() {
    session.viewPuzzle('s3-water')
    const puzzle = session.getPuzzle('s3-water')
    this.setData({
      cardNumber: Number(session.getCardDigit('s3-water')),
      operated: !!puzzle,
      solved: !!puzzle,
      showHistory: !!puzzle,
      answerInput: puzzle ? '马首' : '',
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onOperationComplete() {
    this.setData({ operated: true })
  },

  onInput(e) {
    this.setData({ answerInput: e.detail.value, wrongTip: '' })
  },

  onHint() {
    session.viewHint('s3-water', 1)
    this.setData({ hintText: '纸面显出的应是一尊生肖兽首。等待轮廓和文字稳定后再作答。' })
  },

  onSubmit() {
    if (this.data.showHistory) return
    const value = String(this.data.answerInput || '').replace(/\s+/g, '')
    if (!value) {
      wx.showToast({ title: '请先填写纸上答案', icon: 'none' })
      return
    }
    if (value.includes('马首')) {
      const attempts = this.data.attempts + 1
      session.attemptPuzzle('s3-water', attempts, true, 'physical')
      this.setData({ solved: true, showHistory: true, attempts, wrongTip: '' })
      session.completePuzzle('s3-water', { answer: '马首', attempts: attempts }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
      return
    }
    const attempts = this.data.attempts + 1
    session.attemptPuzzle('s3-water', attempts, false, 'physical')
    this.setData({
      attempts,
      wrongTip: attempts > 1
        ? '答案仍未对应。让纸面均匀显色，再观察兽首名称。'
        : '纸上显出的不是这个答案，请重新观察实体水显纸。'
    })
  },

  onHistoryNext() {
    this.setData({ showHistory: false, showHandoff: true })
  },

  onCloseHistory() {
    this.setData({ showHistory: false, showHandoff: this.data.solved })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s3-water', { answer: '马首', attempts: this.data.attempts || 1 }, {
      collectCard: true,
      station: 's3',
      checkpoint: 's4-timeline'
    })
      .then(function () {
        wx.redirectTo({ url: '/plate21/module/pages/transit/transit?leg=s3-s4' })
      })
      .catch(() => this.setData({ advancing: false }))
  }
})
