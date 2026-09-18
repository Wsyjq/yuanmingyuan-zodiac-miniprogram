// 第二站 · 黄花阵 对读二：黄花从灯上来（V2.2 讲述版，骨架沿用 V2.1）
// 玩法：小程序弹图（宫女手持黄色彩绸莲花灯），用户语音或文字回答名字由来，
//      本地关键词匹配（莲花灯 / 黄色彩绸 / 宫女），命中即过。
// 史料：宫女手持黄色彩绸扎成的莲花灯，迷宫因此得名黄花阵。卡片角落数字 0。
// V2.2 新增：揭晓后宫女台词（dlg-huanghuazhen-2）＋俯视卡进阵转场。
//
// TODO（下轮迭代）：接入语音输入 + API 语义校验；当前为文字输入 + 本地关键词匹配。
const session = require('../../store/session')
const answers = require('../../utils/puzzle-answers')
const audioSrc = require('../../utils/audio-src')
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
    attempts: 0,
    showHistory: false,
    historyLines: HISTORY_LINES,
    cardNumber: 0,
    showCardNumber: false,
    hint: '',
    solved: false,
    skipped: false,
    advancing: false,
    narrSrc: audioSrc.clip('narr-s2-reveal')
  },

  onInput(e) {
    this.setData({ answer: e.detail.value, hint: '' })
  },

  onSubmit() {
    if (this.data.showHistory) return
    const ans = (this.data.answer || '').trim()
    const attempts = this.data.attempts + 1
    if (ans.length === 0) {
      this.setData({ hint: '请输入你的猜测' })
      return
    }
    const result = answers.classifyHuanghuaName(ans)
    session.attemptPuzzle('s2-name', attempts, result === 'correct', 'text')
    if (result === 'correct') {
      this.setData({ showHistory: true, showCardNumber: true, solved: true, attempts: attempts })
      session.completePuzzle('s2-name', { answer: ans, attempts: attempts }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
    } else {
      let hint = result === 'partial'
        ? '方向对了，再说清楚：那是什么灯，或是用什么材料扎成的？'
        : '再想想，这个迷宫和「黄花」有什么关系？'
      if (attempts === 2 && result !== 'partial') {
        hint = '看看参考图——宫女们手里举着什么东西？'
        session.viewHint('s2-name', 1)
      } else if (attempts >= 3) {
        hint = '提示：是「莲花灯」——用黄色彩绸扎成的莲花灯。试试输入「莲花灯」。'
        if (attempts === 3) session.viewHint('s2-name', 2)
      }
      this.setData({ attempts: attempts, hint: hint })
    }
  },

  onLoad() {
    session.viewPuzzle('s2-name')
    const puzzle = session.getPuzzle('s2-name')
    const skipped = !!(puzzle && puzzle.payload && puzzle.payload.action === 'skipped')
    this.setData({
      cardNumber: Number(session.getCardDigit('s2-name')),
      solved: !!puzzle,
      skipped: skipped,
      showHistory: !!puzzle && !skipped,
      showCardNumber: !!puzzle && !skipped,
      answer: puzzle && puzzle.payload && puzzle.payload.answer || '',
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onReady() {
    if (!this.data.solved) this.scheduleCoach([playGuide.SPOTS.skip])
  },

  onHistoryNext() {
    this.setData({ showHistory: false })
  },

  onCloseHistory() {
    this.setData({ showHistory: false })
  },

  // V2.1 对读二可跳：跳过不发该卡，揭晓照常给（下一拍在亭下）。
  onSkip() {
    this.runAfterCoach(function () {
      if (this.data.solved) return
      this.setData({ solved: true, skipped: true, showHistory: false })
      session.attemptPuzzle('s2-name', this.data.attempts, true, 'skip')
      session.completePuzzle('s2-name', { action: 'skipped', attempts: this.data.attempts })
        .catch(function () { /* 进度失败不阻断浏览 */ })
    })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true, showHistory: false })
    session.completePuzzle('s2-name', {
      answer: this.data.answer,
      attempts: this.data.attempts || 1
    }, { collectCard: !this.data.skipped, checkpoint: 's2-blend' }).then(() => {
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
