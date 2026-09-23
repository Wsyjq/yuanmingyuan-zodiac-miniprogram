// 第一站 · 西洋楼入口（飞书 v3 rev4379 §西洋楼入口）：
// 到站导语 → 地图判方位（长春园四选一，答案 d 东北）→ 揭晓叙述。
// 文案与选项按飞书原文；页面保留 puzzleId「s1-decode」与既有存档/检查点兼容。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const playGuide = require('../../capabilities/play-guide/guide')
const coachHost = require('../../capabilities/play-guide/coach-host')
const glossHost = require('../../utils/gloss-host')

const ANSWER = 'D'
const OPTIONS = [
  { key: 'A', text: '西北' },
  { key: 'B', text: '东南' },
  { key: 'C', text: '西南' },
  { key: 'D', text: '东北' }
]

Page({
  behaviors: [coachHost, glossHost],
  data: {
    narrSrc: audioSrc.clip('narr-s1-decode-sealed'),
    options: OPTIONS,
    selected: '',
    attempts: 0,
    hintText: '',
    solved: false,
    revealed: false,
    advancing: false,
    // 到站导语（飞书原文）
    leadParts: [
      { t: '来到了' },
      { t: '西洋楼', g: 'sl02' },
      { t: '入口，我从背包里面取出档案袋，还有那份地图，决定按照上面手绘的路线图走。' }
    ],
    // 揭晓叙述（飞书原文）：西洋楼沿长春园北界东西展开
    revealParts: [
      { t: '西洋楼沿着' },
      { t: '长春园', g: 'sl05' },
      { t: '的北界东西展开。虽然叫“楼”，但它不是一栋楼，而是一组楼殿、喷泉和庭园的总称。谐奇趣、方外观、大水法……今天我将一一踏足，去找寻第二十一幅图的线索。' }
    ],
    followup: '档案袋里还有几张西洋楼的铜版画，或许我在现场中能对应起来这几幅铜版画对应的建筑名字，以及现在长什么样。'
  },

  onReady() {
    if (playGuide.isTouring()) {
      playGuide.runPageStop(this)
      return
    }
    if (!this.data.solved) this.scheduleCoach([playGuide.SPOTS.listen])
  },

  onLoad(options) {
    if (playGuide.enterTourPage('pages/s1-decode/s1-decode', options)) {
      this.setData({ touring: true })
      return
    }
    session.viewPuzzle('s1-decode')
    const puzzle = session.getPuzzle('s1-decode')
    if (puzzle) {
      this.setData({
        solved: true,
        selected: ANSWER,
        narrSrc: audioSrc.clip('narr-s1-decode-solved'),
        attempts: Number(puzzle.payload && puzzle.payload.attempts) || 1
      })
    }
  },

  onSelect(e) {
    if (this.data.solved) return
    this.setData({ selected: e.currentTarget.dataset.key, hintText: '' })
  },

  onConfirm() {
    if (!this.data.selected || this.data.solved) return
    const attempts = this.data.attempts + 1
    if (this.data.selected === ANSWER) {
      session.attemptPuzzle('s1-decode', attempts, true, 'tap')
      this.setData({ solved: true, attempts, hintText: '', narrSrc: audioSrc.clip('narr-s1-decode-solved') })
      session.completePuzzle('s1-decode', { answer: ANSWER, attempts: attempts }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    session.attemptPuzzle('s1-decode', attempts, false, 'tap')
    if (attempts >= 3) {
      this.setData({
        solved: true,
        revealed: true,
        attempts,
        selected: ANSWER,
        hintText: '西洋楼贴着长春园的北围墙。',
        narrSrc: audioSrc.clip('narr-s1-decode-solved')
      })
      session.completePuzzle('s1-decode', { answer: ANSWER, attempts: attempts, revealed: true }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    this.setData({
      attempts,
      hintText: '再看看地图上西洋楼贴着长春园的哪一边。'
    })
  },

  onGoNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s1-decode', { answer: ANSWER, attempts: this.data.attempts }, {
      station: 's1',
      record: { payload: { answer: ANSWER, attempts: this.data.attempts } },
      checkpoint: 'xq-sound'
    })
      .then(function () {
        wx.redirectTo({ url: '/plate21/module/pages/transit/transit?leg=s1-xq' })
      })
      .catch(() => {
        this.setData({ advancing: false })
        wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
      })
  }
})
