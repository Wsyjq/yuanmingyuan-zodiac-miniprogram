// 海晏堂 · 十二生肖水力钟（飞书 v3 rev5614 §海晏堂）。
// 观看不同时辰喷水示意 → 回答 14 时对应哪个兽首（未时·羊）→ 推测正午哪个兽首（午马）。
// 答完接转盘花纹匹配（s3-zodiac）。文案与答案按飞书原文。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const audioBus = require('../../utils/audio-bus')
const glossHost = require('../../utils/gloss-host')

// 时辰→兽首：14 时落在未时（13-15 点），正午是午马
const Q1_ANSWERS = ['羊', '羊首', '未羊']
const Q2_ANSWERS = ['马', '马首', '午马']

Page({
  behaviors: [glossHost],
  data: {
    narrSrc: audioSrc.clip('narr-s3-comic'),
    showHistory: false,
    cardNumber: 0,
    historyLines: [
      '池周分布十二兽首铜像代表十二时辰，依次喷水构成报时系统。'
    ],
    // 「海晏堂」= SL-12 挂点（飞书 v3 rev5614 §海晏堂开场）
    introParts: [
      { t: '海晏堂', g: 'sl12' },
      { t: '，名字取自“河清海晏”一词，寓意天下太平。池周分布十二兽首铜像代表十二时辰，依次喷水构成报时系统。十二兽首分别代表不同时辰？这是怎么实现的呢？' }
    ],
    cells: [
      { id: 'zi', time: '子', mark: '鼠', art: 'single', desc: '鼠首先报子时' },
      { id: 'chou', time: '丑', mark: '牛', art: 'handoff', desc: '水线转向牛首' },
      { id: 'noon', time: '午', mark: '', art: 'sundial', desc: '日影逼近正中' },
      { id: 'all', time: '正午', mark: '', art: 'fountain', desc: '十二水位同时亮起' }
    ],
    q1: '',
    q2: '',
    attempts: 0,
    hint: '',
    solved: false,
    followup: false,
    advancing: false
  },

  onInputQ1(e) {
    this.setData({ q1: e.detail.value, hint: '' })
  },

  onInputQ2(e) {
    this.setData({ q2: e.detail.value, hint: '' })
  },

  onConfirm() {
    audioBus.stopKind('voice')
    if (this.data.solved || !this.data.q1 || !this.data.q2) return
    const norm = function (s) { return String(s).replace(/\s+/g, '') }
    const ok = Q1_ANSWERS.indexOf(norm(this.data.q1)) >= 0 && Q2_ANSWERS.indexOf(norm(this.data.q2)) >= 0
    const attempts = this.data.attempts + 1
    if (ok) {
      session.attemptPuzzle('s3-hour', attempts, true, 'text')
      this.setData({
        attempts: attempts,
        solved: true,
        hint: '',
        showHistory: true
      })
      const stamp = this.selectComponent('#stamp')
      if (stamp && stamp.show) stamp.show('考察记录已保存')
      session.completePuzzle('s3-hour', {
        answer: ['羊', '马'],
        attempts: attempts
      }, { collectCard: true }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    session.viewHint('s3-hour', attempts)
    if (attempts >= 3) {
      session.attemptPuzzle('s3-hour', attempts, false, 'text')
      this.setData({
        attempts: attempts,
        solved: true,
        q1: '羊',
        q2: '马',
        hint: '',
        showHistory: true
      })
      session.completePuzzle('s3-hour', {
        answer: ['羊', '马'],
        attempts: attempts,
        revealed: true
      }, { collectCard: true }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    session.attemptPuzzle('s3-hour', attempts, false, 'text')
    this.setData({
      attempts: attempts,
      hint: '一天十二个时辰，每个时辰两个小时。14 时落在未时；正午，是午时。'
    })
  },

  onCloseHistory() {
    this.setData({
      showHistory: false,
      followup: true,
      narrSrc: audioSrc.clip('narr-s3-comic-followup')
    })
  },

  onHistoryNext() {
    this.setData({
      showHistory: false,
      followup: true,
      narrSrc: audioSrc.clip('narr-s3-comic-followup')
    })
  },

  // 答案确认后 → 转盘花纹匹配（飞书 v3 rev5614 §海晏堂 互动玩法｜转盘花纹匹配）
  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true, showHistory: false })
    session.completePuzzle('s3-hour', {
      answer: ['羊', '马'],
      attempts: this.data.attempts || 1
    }, { collectCard: true, checkpoint: 's3-zodiac' }).then(function () {
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
    this.setData({
      cardNumber: Number(session.getCardDigit('s3-hour')),
      solved: !!puzzle,
      q1: puzzle ? '羊' : '',
      q2: puzzle ? '马' : '',
      showHistory: !!puzzle,
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
