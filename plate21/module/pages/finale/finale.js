// P14 反转揭示（演出页）：分幕自动演出，点按屏幕轻推（不强制等待）
// 幕1 黑屏 → 幕2 生成中打字机 → 幕3 五层拼合 → 幕4 长文叙事（不可跳过）→ 幕5 署名
// 幕3 五层遮片由 CSS transition 揭示，JS 只在五个固定时点切换层级。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')
const motion = require('../../utils/motion')

const TYPE_LINES = [
  '考察报告生成中……',
  '正在整合这一路的见闻……',
  '铭文 · 黄花阵 ✓',
  '兽首 · 海晏堂 ✓',
  '时间 · 雨果 ✓',
  '日期 · 考察日 ✓',
  '报告格式识别中……'
]

// 五层点题短文案，对齐飞书 revision 2174 的“后来者完成新画”主旨。
const LAYER_CAPTIONS = [
  '黄花阵、海晏堂、大水法与雨果雕像',
  '它不是等待被发现的旧画',
  '而是等待后来者完成的新画',
  '它记录毁灭，也记录重生',
  '记录失去，也记录被重新看见'
]
const FINAL_CAPTION = '每一个认真看过它的人，都在画第21幅的第N个版本。'

// 幕4 长文叙事（飞书 revision 2174）
const NOVEL_PARAGRAPHS = [
  { text: '如果你看到这里，说明你已经走完了这条路。你一定很好奇，那幅传闻中的第二十一幅版画，究竟在哪里。' },
  { text: '其实，它从未被藏在某个地方。因为它从来不是一幅等待被发现的旧画。它是一幅等待被后来者完成的“新画”。', quote: true },
  { text: '西洋楼的二十幅版画，把西洋楼收得完完整整——二十幅铜版画，每版红铜二十五公斤，开幅九十三乘五十七厘米，喷泉、石柱、兽首、琉璃瓦，样样俱全。' },
  { text: '可是，站在今天的遗址前，还有许多东西没有被画下来。' },
  { text: '那些断裂的石柱，那些被火焚烧后的痕迹，那些流散海外、等待归来的文物，还有无数后来的人，站在废墟前发出的叹息。' },
  { text: '所以，我留下了这个传闻。希望有一天，会有人因为这个问题，重新走进这片遗址，将那些未曾被记录的一一记下。' },
  { text: '每一个来到这里、认真看过它的人，都在画第21幅的第N个版本。' },
  { text: '它记录毁灭，也记录重生。' },
  { text: '记录失去，也记录被重新看见。' }
]

Page({
  data: {
    act: 1,               // 当前幕 1~5
    night: false,         // 幕1 黑屏（--night）
    typeLines: TYPE_LINES,
    typedCount: 0,        // 幕2 已打出的行数
    layerCount: 0,        // 幕3 已落下的层数（1~5）
    caption: '',          // 幕3 点题短文案
    novel: NOVEL_PARAGRAPHS,
    today: '',
    name: '',
    editionNo: null,      // null → 「第 — 版」
    signing: false,
    signed: false,
    reporting: false
  },

  timers: [],

  later(fn, ms) {
    const t = setTimeout(fn, ms)
    this.timers.push(t)
    return t
  },

  clearTimers() {
    this.timers.forEach(clearTimeout)
    this.timers = []
  },

  onLoad() {
    this._reducedMotion = motion.prefersReducedMotion()
    const snap = session.getSnapshot() || {}
    const signed = !!snap.finale
    this.setData({
      today: sessionDate.formatDateKey(snap.sessionDate),
      act: signed ? 5 : 1,
      name: snap.name || '',
      editionNo: snap.editionNo || null,
      signed: signed,
      layerCount: signed ? 5 : 0,
      caption: signed ? FINAL_CAPTION : ''
    })
    if (signed) return
    // 幕1：整页底色转夜景墨蓝，「屏幕暗了一下」500ms
    this.later(() => this.setData({ night: true }), 60)
    this.later(() => this.startAct(2), 60 + 500)
  },

  onUnload() {
    this.clearTimers()
  },

  startAct(n) {
    this.clearTimers()
    if (n === 2) {
      // 幕2：墨色底变浅回宣纸，打字机逐行
      this.setData({ act: 2, night: false })
      this.later(() => this.typeNext(), 700)
    } else if (n === 3) {
      this.setData({ act: 3, layerCount: 0, caption: '' })
      this.later(() => this.startWipe(), 500)
    } else if (n === 4) {
      this.setData({ act: 4 })
    } else if (n === 5) {
      this.setData({ act: 5, layerCount: 5, caption: FINAL_CAPTION })
    }
  },

  // 幕2：逐行打出（每行间隔 400ms）
  typeNext() {
    const total = this.data.typeLines.length
    if (this.data.typedCount < total) {
      this.setData({ typedCount: this.data.typedCount + 1 })
      this.later(() => this.typeNext(), 400)
    } else {
      this.later(() => this.startAct(3), 900)
    }
  },

  // 幕3：每 600ms 打开一层 CSS 遮片，不在动画帧中 setData。
  startWipe() {
    if (this._reducedMotion) {
      this.setData({ layerCount: 5, caption: FINAL_CAPTION })
      this.later(() => this.startAct(4), 250)
      return
    }
    LAYER_CAPTIONS.forEach((caption, index) => {
      this.later(() => this.setData({ layerCount: index + 1, caption: caption }), index * 600)
    })
    this.later(() => {
      this.setData({ caption: FINAL_CAPTION })
      this.later(() => this.startAct(4), 1800)
    }, 3000)
  },

  // 点按屏幕轻推：当前幕剩余步骤立即完成，再点进入下一幕
  onTapScreen() {
    const act = this.data.act
    if (act === 1) {
      this.startAct(2)
    } else if (act === 2) {
      this.clearTimers()
      if (this.data.typedCount < this.data.typeLines.length) {
        this.setData({ typedCount: this.data.typeLines.length })
        this.later(() => this.startAct(3), 500)
      } else {
        this.startAct(3)
      }
    } else if (act === 3) {
      this.clearTimers()
      if (this.data.layerCount < 5) {
        this.setData({ layerCount: 5, caption: FINAL_CAPTION })
        this.later(() => this.startAct(4), this._reducedMotion ? 100 : 800)
      } else {
        this.startAct(4)
      }
    }
    // 幕4 长文叙事不可跳过；幕5 为表单交互，均不响应轻推
  },

  onNovelFinish() {
    this.startAct(5)
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  // 幕5 署名：sign → claimEdition 取版本号（失败显示「第 — 版」）→ completeFinale
  onSign() {
    if (this.data.signing || this.data.signed) return
    const name = (this.data.name || '').trim() || '无名氏'
    this.setData({ signing: true, name: name })
    session.sign(name)
      .then(() => session.claimEdition())
      .then((no) => {
        this.setData({ editionNo: no, signed: true, signing: false })
        session.emit({ name: 'finale_viewed', editionNo: no })
        return session.completeFinale()
      })
      .then(() => {})
      .catch(() => {
        this.setData({ signing: false })
        wx.showToast({ title: '署名保存失败，请重试', icon: 'none' })
      })
  },

  goReport() {
    if (this.data.reporting) return
    this.setData({ reporting: true })
    session.completeFinale().then(function () { return session.setCheckpoint('report') }).then(() => {
      wx.redirectTo({
        url: '/plate21/module/pages/report/report',
        fail: () => this.setData({ reporting: false })
      })
    }).catch(() => {
      this.setData({ reporting: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  }
})
