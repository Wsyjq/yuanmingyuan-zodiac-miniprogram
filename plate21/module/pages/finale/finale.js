const statusBarBeh = require('../../utils/status-bar')
// P14 结局（飞书 v3 rev4379 §结局）：五张残片拼合 → 新铜版画浮现 → 档案主人最后一段记录 → 署名定格。
// 幕1 黑屏 → 幕2 重新组合记录 → 幕3 拼合揭示 → 幕4 长文叙事（不可跳过）→ 幕5 署名。
// 版本编号走 claimEdition。领不到号时署名屏写「第 — 版」，不挡住署名。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')
const motion = require('../../utils/motion')
const audioSrc = require('../../utils/audio-src')

// 幕2（飞书 v3：屏幕开始重新组合一路上的记录……几秒后，一份新的档案生成）
const TYPE_LINES = [
  '屏幕开始重新组合一路上的记录',
  '完成过的谜题 ✓',
  '收集到的图样 ✓',
  '经过的地点 ✓',
  '今天的日期 ✓',
  '一份新的档案生成中……'
]

// 幕3 五层拼合（飞书 v3 rev5614 §结局：画面记录的是我一路走过的地方）
const LAYER_CAPTIONS = [
  '黄花阵的中心亭',
  '海晏堂残存的石座',
  '大水法的断壁',
  '雨果雕像前停留的身影',
  '档案包和其中的文件'
]
const FINAL_CAPTION = '第二十一图。'

// 幕4 长文叙事（飞书 v3 rev5614 §结局原文）
const NOVEL_PARAGRAPHS = [
  { pack: 1, text: '至此，西洋楼遗址已经快走完了，可是，第二十一幅画到底在哪呢？' },
  { pack: 1, text: '屏幕暗了一下，然后亮起，一幅画面缓缓浮现。密集交错的线条构成明暗，锐利的刻痕描绘着建筑轮廓，仿佛一幅真正的《西洋楼铜版图》。' },
  { pack: 1, text: '画面中没有乾隆时期的宫苑盛景。' },
  { pack: 1, text: '而是记录着我一路走过的地方：黄花阵的中心亭、海晏堂残存的石座、大水法的断壁，以及雨果雕像前停留的身影……以及档案包和其中的文件。' },
  { pack: 2, text: '这究竟是怎么回事？' },
  { pack: 2, text: '屏幕中缓缓出来了一封信：如果你看到这里，说明你已经走完了这条路。你一定很好奇，那幅传闻中的第二十一幅版画，究竟在哪里。其实，它从未被藏在某个地方。因为它从来不是一幅等待被发现的旧画。它是一幅等待被后来者完成的“新画”。' },
  { pack: 2, text: '西洋楼的二十幅版画，把西洋楼记录得完完整整，喷泉、石柱、兽首、琉璃瓦，样样俱全。' },
  { pack: 3, text: '可是，站在今天的遗址前，还有许多东西没有被画下来。那些断裂的石柱，那些被火焚烧后的痕迹，那些流散海外、等待归来的文物，还有无数后来的人，站在废墟前发出的叹息。所以，我留下了这个传闻。希望有一天，会有人因为这个问题，重新走进这片遗址，将那些未曾被记录的一一记下。' },
  { pack: 3, text: '每一个来到这里、认真看过它的人，都在画第21幅的第N个版本。' },
  { pack: 3, text: '它记录毁灭，也记录重生。记录失去，也记录被重新看见。' },
  { pack: 3, text: '几秒后，一份新的档案生成。' }
]

Page({
  behaviors: [statusBarBeh],
  data: {
    act: 1,               // 当前幕 1~5
    night: false,         // 幕1 黑屏（--night）
    typeLines: TYPE_LINES,
    typedCount: 0,        // 幕2 已打出的行数
    layerCount: 0,        // 幕3 已落下的层数（1~5）
    caption: '',          // 幕3 点题短文案
    novel: NOVEL_PARAGRAPHS,
    narrSrc: '',
    today: '',
    name: '',
    signing: false,
    signed: false,
    reporting: false,
    editionNo: null
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
    // V2.3 回显：全程仅两处游客输入，只在结局屏显（跳过/未走到则不显示）
    const flags = snap.flags || {}
    const choiceMap = { '风声': '风声', '人声与鸟鸣': '人声与鸟鸣', '几乎什么都听不到': '几乎什么都听不到' }
    const echoDashuifa = choiceMap[flags.dashuifaChoice] || ''
    const echoPostcard = flags.messageSubmittedAt ? '已投递，进了档案' : ''
    this.setData({
      today: sessionDate.formatDateKey(snap.sessionDate),
      act: signed ? 5 : 1,
      name: snap.name || '',
      signed: signed,
      editionNo: snap.editionNo || null,
      layerCount: signed ? 5 : 0,
      caption: signed ? FINAL_CAPTION : '',
      echoDashuifa: echoDashuifa,
      echoPostcard: echoPostcard
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
      this.setData({ act: 4, narrSrc: audioSrc.clip('narr-finale-p01') })
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

  onNovelPage(e) {
    const n = String((e.detail && e.detail.index || 0) + 1).padStart(2, '0')
    this.setData({ narrSrc: audioSrc.clip('narr-finale-p' + n) })
  },

  onNovelFinish() {
    this.startAct(5)
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  // 幕5 署名：sign → claimEdition → completeFinale。飞书记录要「第 N 版」。
  onSign() {
    if (this.data.signing || this.data.signed) return
    const name = (this.data.name || '').trim() || '无名氏'
    this.setData({ signing: true, name: name })
    session.sign(name)
      .then(function () { return session.claimEdition() })
      .then((editionNo) => {
        this.setData({ signed: true, signing: false, editionNo: editionNo || null })
        session.emit({ name: 'finale_viewed' })
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
