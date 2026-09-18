// 第三站 · 海晏堂 对读一：十二时辰推理（V2.2 讲述版，骨架沿用 V2.1）
// 对读 S3-1：两小问。小问一答案「马」（子鼠丑牛……午马）；
// 小问二答案「午时」（正午十二兽首齐喷）。错 1 次轻晃，错 2 次高亮漫画前两格线索。
// 史料卡：常规报时每时辰对应兽首轮流喷水；正午马首喷水其余十一首齐喷。
// 卡片角落数字：会话锁定日期的月份第一位数字。
// 本页不调 completeStation（S3 由 s3-water 收口）。
// V2.2 新增：蒋友仁台词两段（开场立论「这一片是一座钟」＋揭晓班次），标艺术演绎。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const audioBus = require('../../utils/audio-bus')

Page({
  data: {
    narrSrc: audioSrc.clip('narr-s3-comic'),
    showHistory: false,
    cardNumber: 0,
    historyLines: [
      '常规报时：每个时辰（2 小时）由对应的兽首轮流喷水。',
      '子时（23–1 点）鼠首，丑时（1–3 点）牛首，以此类推。',
      '人们只要看到哪个兽首在喷水，就能知道当时的大致时辰。',
      '正午盛景：到了正午时分，轮到马首喷水——此刻其余十一兽首一同喷水，蔚为壮观。'
    ],
    cells: [
      { id: 'zi', time: '子', mark: '鼠', art: 'single', desc: '鼠首先报子时' },
      { id: 'chou', time: '丑', mark: '牛', art: 'handoff', desc: '水线转向牛首' },
      { id: 'noon', time: '午', mark: '', art: 'sundial', desc: '日影逼近正中' },
      { id: 'all', time: '正午', mark: '', art: 'fountain', desc: '十二水位同时亮起' }
    ],
    twelve: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    heads: ['鼠', '牛', '虎', '兔', '马', '鸡'],
    hours: ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'],
    q1Selected: '',
    q1Attempts: 0,
    q1Done: false,
    q2Selected: '',
    q2Attempts: 0,
    q2Done: false,
    clue: false,
    shakeKey: '',
    skipped: false,
    advancing: false
  },

  onCloseHistory() {
    this.setData({ showHistory: false })
  },

  onHistoryNext() {
    this.setData({ showHistory: false })
  },

  // V2.1 对读一可跳：跳过不发该卡，下一拍（转盘）照常展开。
  onSkip() {
    if (this.data.q1Done) return
    this.setData({ skipped: true, q1Done: true, q2Done: true, clue: false })
    session.attemptPuzzle('s3-hour', this.data.q1Attempts + this.data.q2Attempts, true, 'skip')
    session.completePuzzle('s3-hour', { action: 'skipped', attempts: this.data.q1Attempts + this.data.q2Attempts })
      .catch(function () { /* 进度失败不阻断浏览 */ })
  },

  onQ1(e) {
    // V2.3：答题交互起，压停正在播的人声（做题与听讲不打架）
    audioBus.stopKind('voice')
    if (this.data.q1Done) return
    const v = e.currentTarget.dataset.v
    this.setData({ q1Selected: v })
    if (v === '马') {
      session.attemptPuzzle('s3-hour', this.data.q1Attempts + 1, true, 'tap')
      // INT-404：答对先高亮选中项 300ms（铜绿描金）再切下一问，给即时正反馈
      this.setData({ q1Correct: true, shakeKey: '' })
      this._timers.push(setTimeout(() => this.setData({ q1Done: true, q1Correct: false }), 300))
      return
    }
    this.wrong('q1Attempts')
  },

  onQ2(e) {
    // V2.3：答题交互起，压停正在播的人声（做题与听讲不打架）
    audioBus.stopKind('voice')
    if (this.data.q2Done) return
    const v = e.currentTarget.dataset.v
    this.setData({ q2Selected: v })
    if (v === '午时') {
      session.attemptPuzzle('s3-hour', this.data.q1Attempts + this.data.q2Attempts + 2, true, 'tap')
      this.setData({ q2Done: true, shakeKey: '', showHistory: true })
      this.selectComponent('#stamp').show('考察记录已保存')
      // 收集时辰推理卡片角落数字（月份第一位）——主线：卡片数字 → 日期密码
      session.completePuzzle('s3-hour', {
        answer: { zodiac: '马', hour: '午时' },
        attempts: this.data.q1Attempts + this.data.q2Attempts + 2
      }, { collectCard: true }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    this.wrong('q2Attempts')
  },

  // 错 1 次轻晃；错 2 次高亮漫画前两格线索（clue）+ 文字提示
  wrong(field) {
    const n = this.data[field] + 1
    const v = field === 'q1Attempts' ? this.data.q1Selected : this.data.q2Selected
    this.setData({ [field]: n, shakeKey: v, clue: n >= 2 || this.data.clue })
    session.attemptPuzzle('s3-hour', this.data.q1Attempts + this.data.q2Attempts, false, 'tap')
    if (n === 2) session.viewHint('s3-hour', field === 'q1Attempts' ? 1 : 2)
    this._timers.push(setTimeout(() => this.setData({ shakeKey: '' }), 400))
  },

  onNext() {
    // 采风修订版顺序：comic（时辰推理）→ zodiac（兽首回归）→ water（水显马首）
    if (this.data.advancing) return
    this.setData({ advancing: true, showHistory: false })
    session.completePuzzle('s3-hour', {
      answer: { zodiac: '马', hour: '午时' },
      attempts: this.data.q1Attempts + this.data.q2Attempts + 2
    }, { collectCard: !this.data.skipped, checkpoint: 's3-zodiac' }).then(function () {
      wx.redirectTo({ url: '/plate21/module/pages/s3-zodiac/s3-zodiac' })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  },

  onLoad() {
    this._timers = []
    session.viewPuzzle('s3-hour')
    const puzzle = session.getPuzzle('s3-hour')
    const skipped = !!(puzzle && puzzle.payload && puzzle.payload.action === 'skipped')
    this.setData({
      cardNumber: Number(session.getCardDigit('s3-hour')),
      q1Done: !!puzzle,
      q2Done: !!puzzle,
      skipped: skipped,
      q1Selected: puzzle && !skipped ? '马' : '',
      q2Selected: puzzle && !skipped ? '午时' : '',
      showHistory: !!puzzle && !skipped
    })
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
