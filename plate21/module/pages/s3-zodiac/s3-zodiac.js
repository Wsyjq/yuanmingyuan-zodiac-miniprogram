const session = require('../../store/session')

const ALL_ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const RETURNED = ['鼠', '牛', '虎', '兔', '马', '猴', '猪']
const HISTORY_LINES = [
  '截至目前，十二生肖兽首中共有 7 尊已回归祖国，',
  '分别是：牛、虎、猴、猪、鼠、兔、马。',
  '其余龙、蛇、羊、鸡、狗 5 尊至今下落不明。'
]

function parseZodiac(value) {
  const text = String(value || '')
  return ALL_ZODIAC.filter((name) => text.includes(name))
}

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
    showHandoff: false,
    advancing: false
  },

  onLoad() {
    session.viewPuzzle('s3-zodiac')
    const puzzle = session.getPuzzle('s3-zodiac')
    this.setData({
      cardNumber: Number(session.getCardDigit('s3-zodiac')),
      operated: !!puzzle,
      solved: !!puzzle,
      showHistory: !!puzzle,
      showCardNumber: !!puzzle,
      answerInput: puzzle ? RETURNED.join('、') : '',
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
    const chosen = parseZodiac(this.data.answerInput)
    if (!chosen.length) {
      wx.showToast({ title: '请先填写转盘结果', icon: 'none' })
      return
    }
    const correct = chosen.length === RETURNED.length && RETURNED.every((name) => chosen.includes(name))
    session.attemptPuzzle('s3-zodiac', this.data.attempts + 1, correct, 'physical')
    if (correct) {
      this.setData({ solved: true, showHistory: true, showCardNumber: true, wrongTip: '' })
      session.completePuzzle('s3-zodiac', { answer: chosen, attempts: this.data.attempts + 1 }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
      return
    }
    const attempts = this.data.attempts + 1
    this.setData({
      attempts,
      wrongTip: `目前识别到 ${chosen.length} 个生肖，结果还没有完全对应。请回到实体转盘重新核对。`
    })
  },

  onCloseHistory() {
    this.setData({ showHistory: false, showHandoff: this.data.solved })
  },

  onHistoryNext() {
    this.setData({ showHistory: false, showHandoff: true })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s3-zodiac', {
      answer: RETURNED,
      attempts: this.data.attempts || 1
    }, { collectCard: true, checkpoint: 's3-water' }).then(function () {
      wx.redirectTo({ url: '/plate21/module/pages/s3-water/s3-water' })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  }
})
