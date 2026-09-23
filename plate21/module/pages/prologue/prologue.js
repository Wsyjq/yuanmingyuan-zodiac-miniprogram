// 序章（飞书 v3 rev4379 §序章）
// novel-view 叙事（小纸片 → 问老师 → 档案袋 → 旧日记「寻廿一图」→ 丙午年）
// → 档案交接清点面板 → 前往西洋楼入口（s1-decode）。
// 文案单点在 content/prologue.js。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const playGuide = require('../../capabilities/play-guide/guide')
const coachHost = require('../../capabilities/play-guide/coach-host')
const glossHost = require('../../utils/gloss-host')
const content = require('../../content/prologue')

Page({
  behaviors: [coachHost, glossHost],
  data: {
    paragraphs: content.paragraphs,
    props: content.props,
    showHandover: false,
    narrSrc: audioSrc.clip(content.clipPrefix + '01'),
    advancing: false
  },

  onNovelPage(e) {
    if (this.data.showHandover) return
    const n = String((e.detail && e.detail.index || 0) + 1).padStart(2, '0')
    this.setData({ narrSrc: audioSrc.clip(content.clipPrefix + n) })
  },

  onNovelFinish() {
    // 叙事结束：清点档案袋里的考察资料
    this.setData({ showHandover: true, narrSrc: audioSrc.clip(content.clips.handover) })
    this.scheduleCoach([playGuide.SPOTS.go])
  },

  // 确认收好档案。西洋楼入口一章在 s1-decode 完成。
  onTakeArchive() {
    session.attemptPuzzle('prologue-envelope', 1, true, 'physical')
    session.completePuzzle('prologue-envelope', { action: 'archive-received' }).catch(function () {
      wx.showToast({ title: '进度暂未保存，继续时会重试', icon: 'none' })
    })
    this._timers.push(setTimeout(() => {
      const stamp = this.selectComponent('#stamp')
      if (stamp) stamp.show('档案已收好')
    }, 800))
  },

  onGoS1() {
    this.runAfterCoach(function () {
      if (this.data.advancing) return
      this.setData({ advancing: true })
      session.completePuzzle('prologue-envelope', { action: 'archive-received' }, { checkpoint: 's1-decode' }).then(() => {
        wx.navigateTo({
          url: '/plate21/module/pages/s1-decode/s1-decode',
          fail: () => this.setData({ advancing: false })
        })
      }).catch(() => {
        this.setData({ advancing: false })
        wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
      })
    })
  },

  onReady() {
    const spots = [playGuide.SPOTS.listen]
    if (this.data.showHandover) spots.push(playGuide.SPOTS.go)
    this.scheduleCoach(spots)
  },

  onLoad() {
    this._timers = []
    session.viewPuzzle('prologue-envelope')
    if (session.isPuzzleComplete('prologue-envelope')) {
      this.setData({ showHandover: true, narrSrc: audioSrc.clip(content.clips.handover) })
    }
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
