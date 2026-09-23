// 雨果雕像（飞书 v3 rev5614 §雨果雕像）：纯叙事页。
// rev5614 已删去时间线排序、四遗物卡与密码锁；本页读完即往结局（finale）。
// puzzleId 仍记 s4-timeline（含日期卡收集），仅为存档/卡链兼容。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const glossHost = require('../../utils/gloss-host')

Page({
  behaviors: [glossHost],
  data: {
    narrSrc: audioSrc.clip('narr-s4-timeline'),
    advancing: false,
    paragraphs: [
      '1861年，圆明园被焚毁后的第二年，雨果在法国写下《致巴特勒上尉的信》，公开谴责英法联军对圆明园的劫掠和焚毁。奇怪的是，他从来没有来过这里。如今，他的雕像就立在西洋楼遗址旁，静静地凝视着那断壁残垣。'
    ],
    hugoParts: [
      { t: '同样愤怒的还有面前的这位法国作家——' },
      { t: '雨果', g: 'sl17' },
      { t: '。' }
    ]
  },

  onLoad() {
    session.viewPuzzle('s4-timeline')
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s4-timeline', { action: 'read', attempts: 1 }, {
      collectCard: true,
      checkpoint: 'finale'
    }).then(function () {
      wx.redirectTo({ url: '/plate21/module/pages/finale/finale' })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  }
})
