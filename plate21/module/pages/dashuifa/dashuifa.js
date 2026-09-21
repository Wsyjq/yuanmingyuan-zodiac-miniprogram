// 大水法 · 猎狗逐鹿 + 北望远瀛观。飞书 v3 原文。静默不再当主路径。
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
const YUAN_OPTS = [
  { key: 'A', text: '海晏堂' },
  { key: 'B', text: '远瀛观' },
  { key: 'C', text: '观水法' },
  { key: 'D', text: '谐奇趣' }
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
    yuanOpts: YUAN_OPTS,
    yuanSelected: '',
    yuanAttempts: 0,
    yuanHint: '',
    yuanSolved: false,
    yuanRevealed: false,
    followup: false,
    narrSrc: audioSrc.clip('narr-dashuifa-hunt'),
    // 史料卡挂点（v3 rev 3346）：到站「大水法」SL-14（题前）；
    // 题后「观水法」SL-15、「雨果从来没有来过」SL-17（遗物题前）
    introParts: [
      { t: '顺着档案上的路线继续往前，' },
      { t: '大水法', g: 'sl14' },
      { t: '遗址逐渐出现在眼前。和海晏堂相比，这里的遗迹看起来更直观一些。高大的石构还留在原地，但只看现在的样子，还是很难想象它当年到底是什么样的。' }
    ],
    axisParts: [
      { t: '我抬起头。大水法北侧高台上，就是它。再转身往南，石屏风所在的' },
      { t: '观水法', g: 'sl15' },
      { t: '也在同一条轴上。从北到南：远瀛观、大水法、观水法。它们是一组南北相对的景观，不是三个要依次走进去的下一站。我们走的路却是东西向：西边刚离开海晏堂和蓄水楼，眼前是大水法，再往东才是雨果雕像。' }
    ],
    hugoParts: [
      { t: '不用绕到北面再走一站。站在大水法，抬头看形，低头看水，侧过身能看见观水法的石屏。看完，继续往东。档案下一处标记是一个名字，和一张纸：维克多·雨果，《致巴特勒上尉的信》。不过' },
      { t: '雨果', g: 'sl17' },
      { t: '从来没有来过圆明园。那封公开信，为什么会被放进这份寻找「第二十一图」的档案里呢？' }
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
      revealText: '梅花鹿在喷水池中央，十只猎狗环绕，两只大型卷尾铜兽在水池东西两端。'
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
      session.completePuzzle('ds-hunt', { attempts: result.attempts, revealed: result.revealed })
        .catch(function () {})
      return
    }
    this.setData({ huntAttempts: result.attempts, huntHint: result.hint })
  },

  onAfterNext() {
    this.setData({ stage: 'yuan', narrSrc: audioSrc.clip('narr-dashuifa-yuan') })
    session.viewPuzzle('ds-yuan')
  },

  onYuanSelect(e) {
    if (this.data.yuanSolved) return
    this.setData({ yuanSelected: e.currentTarget.dataset.key })
  },

  onYuanConfirm() {
    if (this.data.yuanSolved || !this.data.yuanSelected) return
    const ok = this.data.yuanSelected === 'B'
    const result = ladder.submit({
      ok: ok,
      attempts: this.data.yuanAttempts,
      hints: ['往北看高台。', '南对面才是观水法。'],
      revealText: '远瀛观位于大水法北侧。'
    })
    session.attemptPuzzle('ds-yuan', result.attempts, ok, 'tap')
    if (result.solved) {
      this.setData({
        yuanAttempts: result.attempts,
        yuanSolved: true,
        yuanRevealed: result.revealed,
        yuanSelected: 'B',
        yuanHint: result.hint,
        followup: true,
        narrSrc: audioSrc.clip('narr-dashuifa-followup')
      })
      session.completePuzzle('ds-yuan', { answer: 'B', attempts: result.attempts, revealed: result.revealed }, {
        checkpoint: 's4-timeline'
      }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    this.setData({ yuanAttempts: result.attempts, yuanHint: result.hint })
  },

  onSkipQuestion() {
    this.onNext()
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
    const yuan = session.getPuzzle('ds-yuan')
    if (yuan) {
      this.setData({
        stage: 'yuan',
        yuanSolved: true,
        yuanSelected: 'B',
        followup: true,
        placed: { deer: 'pool', dogs: 'ring', beasts: 'ends' },
        narrSrc: audioSrc.clip('narr-dashuifa-followup')
      })
    } else if (hunt) {
      this.setData({
        stage: 'after',
        placed: { deer: 'pool', dogs: 'ring', beasts: 'ends' },
        narrSrc: audioSrc.clip('narr-dashuifa-after')
      })
    }
  }
})
