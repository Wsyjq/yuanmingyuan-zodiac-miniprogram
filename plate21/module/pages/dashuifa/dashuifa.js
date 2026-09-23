// 大水法 · 猎狗逐鹿 + 火毁转场（飞书 v3 rev5614 §大水法）。
// 归位三构件 → 喷水场景重现 → 画面破碎转入火烧视频 → 前往雨果雕像。
// （rev5614 已删远瀛观问答；ds-yuan 谜题 id 仅为旧存档兼容保留在 progress-flow。）
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const ladder = require('../../utils/attempt-ladder')
const playGuide = require('../../capabilities/play-guide/guide')
const coachHost = require('../../capabilities/play-guide/coach-host')
const glossHost = require('../../utils/gloss-host')

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

Page({
  behaviors: [coachHost, glossHost],
  data: {
    stage: 'hunt',
    pieces: PIECES,
    zones: ZONES,
    placed: {},
    holding: '',
    huntAttempts: 0,
    huntHint: '',
    narrSrc: audioSrc.clip('narr-dashuifa-hunt'),
    // 史料卡挂点（飞书 v3）：到站「大水法」SL-14
    introParts: [
      { t: '顺着档案上的路线继续往前，' },
      { t: '大水法', g: 'sl14' },
      { t: '遗址逐渐出现在眼前。和海晏堂相比，这里的遗迹看起来更直观一些。高大的石构还留在原地，但只看现在的样子，还是很难想象它当年到底是什么样的。在小学课文中圆明园的插图，也就是这里的实拍图。' }
    ]
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
      revealText: '大水法中央原有一只铜制梅花鹿，鹿角喷水；周围十只铜猎狗同时向鹿喷水，组成“猎狗逐鹿”的场景，喷水池东西两端还设有大型卷尾铜兽。水流、雕塑和建筑共同组成了一整套动态景观。'
    })
    session.attemptPuzzle('ds-hunt', result.attempts, ok, 'tap')
    if (result.solved) {
      const auto = {}
      PIECES.forEach(function (p) { auto[p.key] = p.zone })
      this.setData({
        huntAttempts: result.attempts,
        huntHint: result.hint,
        placed: auto,
        stage: 'after',
        narrSrc: audioSrc.clip('narr-dashuifa-after')
      })
      session.completePuzzle('ds-hunt', { attempts: result.attempts, revealed: result.revealed }, {
        checkpoint: 's4-timeline'
      })
        .catch(function () {})
      return
    }
    this.setData({ huntAttempts: result.attempts, huntHint: result.hint })
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
    if (hunt) {
      this.setData({
        stage: 'after',
        placed: { deer: 'pool', dogs: 'ring', beasts: 'ends' },
        narrSrc: audioSrc.clip('narr-dashuifa-after')
      })
    }
  }
})
