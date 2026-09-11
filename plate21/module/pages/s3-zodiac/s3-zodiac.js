const session = require('../../store/session')
const answers = require('../../utils/puzzle-answers')

const RETURNED = answers.RETURNED_ZODIAC
const HISTORY_LINES = [
  '截至目前，十二生肖兽首中共有 7 尊已回归祖国，',
  '分别是：牛、虎、猴、猪、鼠、兔、马。',
  '其余龙、蛇、羊、鸡、狗 5 尊至今下落不明。'
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
    showCardNumber: false,
    operated: false,
    solved: false,
    skipped: false,
    showHandoff: false,
    advancing: false
  },

  onLoad() {
    session.viewPuzzle('s3-zodiac')
    const puzzle = session.getPuzzle('s3-zodiac')
    const skipped = !!(puzzle && puzzle.payload && puzzle.payload.action === 'skipped')
    this.setData({
      cardNumber: Number(session.getCardDigit('s3-zodiac')),
      operated: !!puzzle,
      solved: !!puzzle,
      skipped: skipped,
      showHistory: !!puzzle && !skipped,
      showCardNumber: !!puzzle && !skipped,
      showHandoff: skipped,
      answerInput: puzzle && !skipped ? RETURNED.join('、') : '',
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
    session.viewHint('s3-zodiac', 1)
    this.setData({ hintText: '应当得到七个生肖。按实体转盘上的图示逐一核对，不必考虑仍下落不明的五尊。' })
  },

  onConfirm() {
    if (this.data.showHistory) return
    const parsed = answers.parseReturnedZodiac(this.data.answerInput)
    if (!parsed.selected.length && !parsed.extra.length) {
      wx.showToast({ title: '请先填写转盘结果', icon: 'none' })
      return
    }
    const correct = parsed.correct
    session.attemptPuzzle('s3-zodiac', this.data.attempts + 1, correct, 'physical')
    if (correct) {
      this.setData({ solved: true, showHistory: true, showCardNumber: true, wrongTip: '' })
      session.completePuzzle('s3-zodiac', { answer: parsed.selected, attempts: this.data.attempts + 1 }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
      return
    }
    const attempts = this.data.attempts + 1
    this.setData({
      attempts,
      wrongTip: parsed.extra.length
        ? '结果中包含尚未回归的生肖：' + parsed.extra.join('、') + '。请回到实体转盘重新核对。'
        : '还缺少 ' + parsed.missing.length + ' 个生肖，请回到实体转盘重新核对。'
    })
  },

  onCloseHistory() {
    this.setData({ showHistory: false, showHandoff: this.data.solved })
  },

  onHistoryNext() {
    this.setData({ showHistory: false, showHandoff: true })
  },

  // V2.1 对读二可跳：跳过不发该卡，水显纸交接照常。
  onSkip() {
    if (this.data.solved) return
    this.setData({ skipped: true, solved: true, showHistory: false, showCardNumber: false, showHandoff: true })
    session.attemptPuzzle('s3-zodiac', this.data.attempts, true, 'skip')
    session.completePuzzle('s3-zodiac', { action: 'skipped', attempts: this.data.attempts })
      .catch(function () { /* 进度失败不阻断浏览 */ })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s3-zodiac', {
      answer: RETURNED,
      attempts: this.data.attempts || 1
    }, { collectCard: !this.data.skipped, checkpoint: 's3-water' }).then(function () {
      wx.redirectTo({ url: '/plate21/module/pages/s3-water/s3-water' })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  }
})
