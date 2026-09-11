// 第一站 · 西洋楼入口（V2.1 可用稿）：拆信读信 → 封口半字 → 两半合上=黄花阵。
// 三段交互：sealed（到门口，撕开封口）→ reading（去读纸上的信）→ puzzle（半字拼合，输入校验）。
// 信的内容只在实体信纸上（正面＝信全文，背面＝上半截字），软件不重复呈现，本页只给引导与判定。
// 判定：拼出「黄花阵」即过，不拍照、不提交；卡住才出提示。
const session = require('../../store/session')

const ANSWER = '黄花阵'

// 信全文见 docs/剧情可用稿-主线走一遍.md §第一站【信·可直接用】，印在实体信纸正面，此处不再复制。

Page({
  data: {
    stage: 'sealed', // sealed → reading → puzzle
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
        stage: 'puzzle',
        solved: true,
        answerInput: ANSWER,
        attempts: Number(puzzle.payload && puzzle.payload.attempts) || 1
      })
    }
  },

  // 撕开封口：转到「去读纸上的信」。信不在屏幕上，这里只给一句引导。
  onTear() {
    this.setData({ stage: 'reading' })
  },

  // 读完纸信，回头看封口上那半截字
  onReadDone() {
    this.setData({ stage: 'puzzle' })
  },

  onInput(e) {
    this.setData({ answerInput: e.detail.value, wrongTip: '' })
  },

  onShowSurfaceHint() {
    session.viewHint('s1-decode', 1)
    this.setData({
      hintLevel: Math.max(this.data.hintLevel, 1),
      hintText: '封口上留着半截字，只有下面一半。'
    })
  },

  onShowJoinHint() {
    session.viewHint('s1-decode', 2)
    this.setData({
      hintLevel: 2,
      hintText: '信纸翻过来，背面印着上面那一半。两半合上。'
    })
  },

  onSubmit() {
    const value = String(this.data.answerInput || '').replace(/\s+/g, '')
    if (!value) {
      wx.showToast({ title: '先填一个地点试试', icon: 'none' })
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
        ? '还不是这三个字。封口那半和信纸背面那半，要对上位置再合。'
        : '答案没有对上。先看看封口上留着的那半截字。'
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
