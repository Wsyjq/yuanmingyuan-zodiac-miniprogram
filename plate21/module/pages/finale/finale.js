// P14 结局（V2.1 可用稿）：三张正页残片拼合 → 空栏摊开 → 此处待绘 → 署名定格。
// 幕1 黑屏 → 幕2 生成中打字机 → 幕3 拼合揭示 → 幕4 长文叙事（不可跳过）→ 幕5 署名。
// 红线：禁止宣言段/金句排比/「第 N 版」（已废）；定格副行＝今日对读。非馆藏原件。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')
const motion = require('../../utils/motion')
const audioSrc = require('../../utils/audio-src')

const TYPE_LINES = [
  '考察报告生成中……',
  '正页残片 · 三张在格 ✓',
  '黄花阵 · 亭与墙 ✓',
  '海晏堂 · 水力钟 ✓',
  '雨果 · 信 ✓',
  '报告格式识别中……'
]

// 拼合五层（V2.1：主线三张正页残片拼出轮廓与空白；路上的夹页只加厚，不叠也在）
const LAYER_CAPTIONS = [
  '亭与墙 —— 黄花阵那一页的残片',
  '水力钟 —— 海晏堂那一页的残片',
  '信 —— 雨果那一页的残片',
  '路上翻过的夹页可叠上去加细节，不叠也在',
  '中央空着一大块，印着四个很浅的字'
]
const FINAL_CAPTION = '此处待绘。'

// 幕4 长文叙事（V2.1 §结局；无宣言段，意义从一路的空栏里长出来）
const NOVEL_PARAGRAPHS = [
  { text: '在像前的台阶上坐下来，把档案夹摊开，三张残片取出来摆在一块儿。' },
  { text: '三张残片边缘是异形切口，只有一种排法能接上。拼错，接不上；不拍照、不提交——接上了，自己就知道。' },
  { text: '拼好了。是一幅长卷的轮廓，铜版画的笔意，从迷宫的亭子一路排到这几根柱子。只是中间空着一大块。空白处印着四个很浅的字：此处待绘。' },
  { text: '路上翻过那些夹页的话，这时可以叠在长卷周围——谐奇趣的楼、养雀笼的门、线法画的雪山，细节会变厚。没翻过，轮廓和空白一样在。' },
  { text: '再把这一路划过的空栏摊开。对得上的，勾还在；对不上的，那几笔也还在。哪样多、哪样少，没有人替你算。' },
  { text: '看看中间那块空白——从进门到现在走过的地方，都在这张纸的边上。空着的这一块，就是你站着的位置。', highlight: true },
  { text: '剩下的，是你的名字，和今天的日期。' }
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
    narrSrc: audioSrc.clip('narr-finale'),
    today: '',
    name: '',
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

  // 幕5 署名：sign → completeFinale（V2.1 定格无「第 N 版」）
  onSign() {
    if (this.data.signing || this.data.signed) return
    const name = (this.data.name || '').trim() || '无名氏'
    this.setData({ signing: true, name: name })
    session.sign(name)
      .then(() => {
        this.setData({ signed: true, signing: false })
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
