// 站点页（主线计分站 + 顺路散页）：谐奇趣 / 养雀笼 / 方外观 / 蓄水楼 / 观水法 / 线法画。
// 主线站（xieqiqu / fangwaiguan / xushuilou）：导语、谜题、揭晓、收尾按飞书 v3 rev4379 逐字；
// 养雀笼 / 观水法 / 线法画为可选散页（v3 正文之外的补充内容，入口在 transit 散页卡与考察手册）。
// 散页红线：不设谜题判定、不要求输入、不做裁判、不出日期卡。
// dialogues[].clipId 对应 tools/gen_voice.py 产物（audio/v22/dlg-*.mp3），无服务时自动退回纯文稿。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const ladder = require('../../utils/attempt-ladder')
const glossHost = require('../../utils/gloss-host')
const nfcLaunch = require('../../capabilities/nfc/launch')

const SITES = {
  xieqiqu: {
    no: 'S·A',
    title: '谐奇趣',
    scored: true,
    audioStation: 't-xieqiqu',
    narrClip: 'narr-x1',
    narrFollowup: 'narr-x2',
    narrReveal: 'narr-x3',
    intro: '按照路线图走进入口，就来到了谐奇趣。我记得这是西洋楼景区建成的第一座欧式建筑，也是中国皇家园林史上首座西洋建筑。主楼前后都曾设有水法，这里还曾用于演奏中西音乐。怪不得叫“谐奇趣”，要是能听听当时的音乐就好了。',
    introParts: [
      { t: '按照路线图走进入口，就来到了' },
      { t: '谐奇趣', g: 'sl03' },
      { t: '。我记得这是西洋楼景区建成的第一座欧式建筑，也是中国皇家园林史上首座西洋建筑。主楼前后都曾设有水法，这里还曾用于演奏中西音乐。怪不得叫“谐奇趣”，要是能听听当时的音乐就好了。' }
    ],
    image: '',
    quiz: {
      puzzleId: 'xq-sound',
      listenOnly: true,
      listenFile: '/voice-a/dj06-xieqiqu-soundscape-30s-v2.mp3',
      prompt: '喷泉声、少数民族音乐和西洋音乐',
      multi: false,
      options: [],
      correct: [],
      hints: [],
      revealText: '',
      historyTitle: '谐奇趣',
      historyLines: [],
      followup: [
        '如此悠扬动耳的音乐，真不愧“谐奇趣”三字之名。'
      ]
    },
    // 站尾谜题（飞书 v3 rev5614 §谐奇趣）：日记和信封指引第一站的方向
    textPuzzle: {
      puzzleId: 'xq-next',
      prompt: '下一站要到哪里去呢？我一时没有了头绪。',
      lead: '日记和信封会指引你第一站的方向。',
      steps: [
        '翻开日记，看它把你往哪一站引。',
        '再拿信封：封口处一半字，背面一半字。',
        '两半拼起来，把站名写在下面。'
      ],
      hints: ['信封的封口处和信的背面都有一半的字，拼接起来看一下！'],
      placeholder: '写下站名',
      answer: '黄花阵',
      solvedText: '原来线索在这里上！下一站的去处很明确了：黄花阵。'
    },
    beats: [],
    motif: '如此悠扬动耳的音乐，真不愧“谐奇趣”三字之名。',
    next: '/plate21/module/pages/transit/transit?leg=xq-s2',
    nextLabel: '继续前往黄花阵',
    checkpoint: 's2-purpose'
  },
  yangquelong: {
    no: 'S·B',
    title: '顺路 · 养雀笼',
    audioStation: 't-yangquelong',
    narrClip: 'narr-waypoint-yangquelong',
    intro: '甬道走到一半，右手边一座门。这一路全是断柱碎石，这座大理石门框却几乎一样不缺：券顶、壁柱、雕花都在。这一页的人声很轻，怕吵着什么。',
    beats: [
      {
        action: '两张卡冲着天光叠起来，看一座完整的门回到纸上。',
        kicker: '现场 · 听',
        lines: [],
        dialogues: [
          { speaker: '喂雀人', text: '轻点声，孔雀在歇着。这儿是养雀笼，中间是过道门，两边笼里养的是孔雀和珍禽。这门两面不一般：东面，石头的，洋式；西面，木头的，牌坊。木头那面省工，石头那面气派。孔雀认生，你退远两步，它该开了。', clipId: 'dlg-yangquelong-1' }
        ]
      },
      {
        kicker: '道具 · 叠层卡',
        prop: true,
        lines: [
          '从东面看一遍，再绕到西面。西面什么都没有——木头的那一半，烧了。这一页配了两张半透明卡，一张石头面，一张木头面，冲着天光叠起来，纸上会合出一座完整的门。'
        ],
        dialogues: [
          { speaker: '喂雀人', text: '两张纸，一张石头面，一张木头面。冲着天光叠起来，木头面会回到石头面上。轻点，别折。', clipId: 'dlg-yangquelong-2' }
        ]
      },
      {
        kicker: '收尾 · 石头那一半',
        lines: [
          '放下纸，眼前只剩石头那一半。',
          '卡背＝散页残片·两半门（不进结局必需拼图），收进档案夹。不设对读，人声停在这儿。'
        ]
      }
    ],
    motif: '同一座建筑，一半留下来了，一半没有。',
    next: '/plate21/module/pages/waypoint/waypoint?site=fangwaiguan',
    nextLabel: '继续顺路 · 方外观'
  },
  fangwaiguan: {
    no: 'S·C',
    title: '方外观',
    scored: false,
    audioStation: 't-fangwaiguan',
    narrClip: 'narr-waypoint-fangwaiguan',
    intro: '现在的方外观只剩下部分台基和石构，不过档案中的铜版图还保存着它原本的样子：两层西式楼体、半环形石阶，上面却盖着中国传统样式的重檐屋顶，内部曾设置阿拉伯文碑刻。可是西式楼体、中式屋顶、阿拉伯文碑刻，为什么会同时出现在一座建筑里？',
    introParts: [
      { t: '现在的' },
      { t: '方外观', g: 'sl09' },
      { t: '只剩下部分台基和石构，不过档案中的铜版图还保存着它原本的样子：两层西式楼体、半环形石阶，上面却盖着中国传统样式的重檐屋顶，内部曾设置阿拉伯文碑刻。可是西式楼体、中式屋顶、阿拉伯文碑刻，为什么会同时出现在一座建筑里？' }
    ],
    image: '',
    beats: [
      {
        kicker: '档案 · 页边',
        lines: [],
        quotes: [],
        fadeCard: true,
        fadeImage: '/assets/fig/rongfei.jpg',
        fadeName: '容妃',
        parts: [
          { t: '容妃', g: 'sl10' }
        ]
      },
      {
        kicker: '对面',
        lines: [],
        image: '/plate21/module/assets/img/plate-zhuting.jpg',
        imageNote: '竹亭北面 · 铜版画对照位',
        action: '点开五竹亭【SL11】',
        parts: [
          { t: '方外观的对面便是“' },
          { t: '五竹亭', g: 'sl11' },
          { t: '”' }
        ]
      },
      {
        kicker: '见证',
        lines: [
          '这里，后来又留下了不少与乾隆、容妃有关的故事。哪些可以得到史料印证，哪些只是后来人的想象，如今已经很难一一分清。离开五竹亭时，我回头看了一眼。这里留下的故事很安静——一座礼拜的建筑，一组亭子，还有一些真假难辨的旧闻。',
          '真假难辨的旧闻？这第二十一幅铜版画或许也算是真假难辨的旧闻吧，到现在为止，我还没有任何收获。来不及多想了，我决定继续往东走。'
        ]
      }
    ],

    motif: '这里留下的故事很安静——一座礼拜的建筑，一组亭子，还有一些真假难辨的旧闻。',
    next: '/plate21/module/pages/transit/transit?leg=fw-s3',
    nextLabel: '下一站：海晏堂',
    checkpoint: 's3-hour'
  },
  xushuilou: {
    no: 'S·D',
    title: '蓄水楼',
    scored: true,
    audioStation: 't-xushuilou',
    narrClip: 'narr-waypoint-xushuilou',
    intro: '原来喷泉的水，靠的就是这座蓄水楼。这里是海晏堂北面的高台蓄水，不是谐奇趣西北那座。刚才在海晏堂看见兽首喷水，水源在这里。可是为什么能把水提高呢？特刊里似乎有线索',
    introParts: [
      { t: '原来喷泉的水，靠的就是这座' },
      { t: '蓄水楼', g: 'sl13' },
      { t: '。这里是海晏堂北面的高台蓄水，不是谐奇趣西北那座。刚才在海晏堂看见兽首喷水，水源在这里。可是为什么能把水提高呢？特刊里似乎有线索' }
    ],
    image: '',
    quiz: {
      puzzleId: 'xs-height',
      cardPuzzleId: 's3-water',
      action: '翻特刊，选蓄水楼为了方便供水通常会建得比较',
      prompt: '蓄水楼为了方便供水，通常会建得比较',
      multi: false,
      options: [
        { key: 'A', text: '高' },
        { key: 'B', text: '低' }
      ],
      correct: ['A'],
      hints: [
        '没有电泵。',
        '要高过喷口。'
      ],
      revealText: '抬高蓄水，用高度差换成水压，再从喷嘴喷出。',
      historyTitle: '蓄水楼 · 喷泉原理',
      historyLines: require('../../utils/sl-cards').get('sl04').lines,
      followup: [
        { parts: [
          { t: '原来喷泉里面的' },
          { t: '物理原理', g: 'sl04' },
          { t: '是这样的：抬高蓄水，用高度差换成水压，再从喷嘴喷出。' }
        ] }
      ]
    },
    beats: [],
    motif: '抬高蓄水，用高度差换成水压，再从喷嘴喷出。',
    next: '/plate21/module/pages/transit/transit?leg=xs-ds',
    nextLabel: '前往大水法',
    checkpoint: 'ds-hunt'
  },
  guanshuifa: {
    no: 'S·F',
    title: '顺路 · 观水法',
    audioStation: 't-guanshuifa',
    narrClip: 'narr-waypoint-guanshuifa',
    intro: '大水法对面，坐南朝北一座平台，上面设过宝座。皇帝当年就在这儿看喷泉：喷泉在南，宝座在北，中间隔着水。档案里记着，乾隆五十八年的英国使团、六十年的荷兰使臣，都被安排在这儿瞻仰过水法。写的是「曾安排」，没写死谁坐过、坐没坐上那张椅子。这一页的人声，话不多。',
    beats: [
      {
        kicker: '现场 · 看',
        lines: [],
        dialogues: [
          { speaker: '乾隆', text: '坐这儿。水，在那边。远人来，领他们看的，就是这个。', clipId: 'dlg-guanshuifa-1', note: '历史人物 · 台词为艺术演绎' }
        ],
        stageNote: '停。',
        dialogues2: [
          { speaker: '乾隆', text: '水法，不过工巧之一端。……中国之大，何奇不有。', clipId: 'dlg-guanshuifa-2', note: '末句引乾隆泽兰堂原注 · 台词为艺术演绎' }
        ]
      },
      {
        kicker: '收尾 · 谁对着谁',
        lines: [
          '入口抄的那半句，原主人在这一页。看看宝座和喷泉，谁对着谁。',
          '不出题，无道具，不设对读。看完就走。'
        ]
      }
    ],
    motif: '喷泉在南，宝座在北，中间隔着水。',
    next: '/plate21/module/pages/s4-timeline/s4-timeline',
    nextLabel: '收好夹页 · 前往雨果雕像'
  },
  xianfahua: {
    no: 'S·E',
    title: '顺路 · 线法画',
    audioStation: 't-xianfahua',
    narrClip: 'narr-waypoint-xianfahua',
    intro: '再往东，是几排砖墙的基址，一层层往里收，越往里越窄，中间一条笔直的通道；要不是档案上画着，这里只像几道普通的矮墙。这一页的人声，是当年挂画的画师。',
    beats: [
      {
        action: '把雪山线稿垫进透视框，举起来对最里那道墙；眼睛凑到框上，从这头往里看。',
        kicker: '现场 · 看',
        lines: [],
        dialogues: [
          { speaker: '画师', text: '站我站的这个地方，方河西岸，往东看。这一片叫线法画：一排墙，挂一排画，画的是西洋景，雪山，街市，望不到头。这法子是西洋的透视，平的墙，从这头往里看，就看出了远近，一条走得进去的街。', clipId: 'dlg-xianfahua-1' }
        ]
      },
      {
        kicker: '道具 · 透视框＋雪山线稿',
        prop: true,
        lines: [
          '墙现在没有了，方河清整过，种了荷；画不在了，纸上还有一张——这一页配了透视框和一张雪山线稿。'
        ],
        dialogues: [
          { speaker: '画师', text: '现在墙空着，画也没了，就剩纸上这一张。你把那张雪山垫到框后头，举起来，对准最里那道墙。眼睛凑到框上，从这头往里看。', clipId: 'dlg-xianfahua-2' }
        ]
      },
      {
        kicker: '收尾 · 放下纸',
        lines: [
          '纸上的雪山落在墙的位置上，合起来的那一下，那片街市确实在那儿；放下纸，又没有了。',
          '对上就是对上了。卡背＝散页残片·雪山（不进结局必需拼图），收进档案夹。'
        ],
        dialogues: [
          { speaker: '画师', text: '收好。别折。', clipId: 'dlg-xianfahua-3' }
        ]
      }
    ],
    motif: '放下纸，又没有了。',
    next: '/plate21/module/pages/s4-timeline/s4-timeline',
    nextLabel: '收好夹页 · 前往雨果雕像'
  }
}

// 术语史料卡：数据统一在 utils/sl-cards（v3 正文 rev 3346 的 16 张 SL 卡），
// 主卡内术语与正文 gloss-text 关键词点开同一张小卡（gloss-host 行为），返回即回。
function narrForSite(site, opts) {
  opts = opts || {}
  if (!site) return ''
  if (opts.reveal && site.narrReveal) return audioSrc.clip(site.narrReveal)
  if (opts.followup && site.narrFollowup) return audioSrc.clip(site.narrFollowup)
  if (!site.narrClip) return ''
  if (site.scored) {
    return audioSrc.clip(opts.followup ? site.narrClip + '-followup' : site.narrClip)
  }
  const step = opts.step || 0
  const steps = opts.steps || []
  const st = steps[step]
  if (!st || st.type === 'dual') return ''
  if (st.type === 'intro') return audioSrc.clip(site.narrClip)
  if (st.type === 'end') return audioSrc.clip(site.narrClip + '-end')
  if (st.type === 'beat') {
    const lines = (st.beat && st.beat.lines) || []
    if (!lines.length) {
      if (st.beat && st.beat.parts && st.beat.parts.length) {
        return audioSrc.clip(site.narrClip + '-followup')
      }
      return ''
    }
    let bi = 0
    for (let i = 0; i < step; i++) {
      if (steps[i].type === 'beat') bi++
    }
    return audioSrc.clip(site.narrClip + '-b' + (bi + 1))
  }
  return ''
}

function playNarr(pageInst, src) {
  const apply = function () { pageInst.setData({ narrSrc: src || '' }) }
  const pack = String(src || '').match(/^\/(voice-[a-z]+)\//)
  if (!pack || typeof wx.loadSubpackage !== 'function') {
    apply()
    return
  }
  wx.loadSubpackage({ name: pack[1], success: apply, fail: apply })
}

function withOn(site, selected) {
  if (!site || !site.quiz) return site
  const sel = selected || []
  return Object.assign({}, site, {
    quiz: Object.assign({}, site.quiz, {
      options: site.quiz.options.map(function (opt) {
        return Object.assign({}, opt, { on: sel.indexOf(opt.key) >= 0 })
      })
    })
  })
}

Page({
  behaviors: [glossHost],
  data: {
    advancing: false,
    site: null,
    confirmed: false,
    revealLines: [],
    selected: [],
    attempts: 0,
    hint: '',
    solved: false,
    revealed: false,
    followup: false,
    showHistory: false,
    listened: false,
    listenSrc: '',
    textInput: '',
    textSolved: false,
    textHint: '',
    nfcNote: ''
  },

  onLoad(options) {
    const query = options || {}
    const launch = nfcLaunch.parse(query)
    if (!launch || query.site !== nfcLaunch.SITE) {
      this.openSite(query, null)
      return
    }
    const self = this
    const ready = session.getSnapshot() ? Promise.resolve() : session.init({})
    ready.then(function () {
      return session.checkPremiumUnlocked()
    }).then(function (unlocked) {
      if (!unlocked) {
        wx.redirectTo({ url: nfcLaunch.gateUrl() })
        return
      }
      self.openSite(query, launch)
    }).catch(function () {
      wx.redirectTo({ url: nfcLaunch.gateUrl() })
    })
  },

  openSite(options, launch) {
    const query = options || {}
    const key = SITES[query.site] ? query.site : 'xieqiqu'
    const site = SITES[key]
    this._key = key
    this._next = site.next
    const quiz = site.quiz
    const puzzleId = quiz && quiz.puzzleId
    if (puzzleId) session.viewPuzzle(puzzleId)
    const puzzle = puzzleId ? session.getPuzzle(puzzleId) : null
    const steps = [{ type: 'intro' }].concat(
      (site.beats || []).map(function (b) { return { type: 'beat', beat: b } })
    )
    if (site.bgmFile) steps.push({ type: 'dual' })
    steps.push({ type: 'end' })
    const selected = puzzle && quiz ? quiz.correct.slice() : []
    const tp = site.textPuzzle
    const tpSolved = tp ? !!session.getPuzzle(tp.puzzleId) : false
    if (tp) session.viewPuzzle(tp.puzzleId)
    let nfcNote = ''
    if (launch && key === nfcLaunch.SITE) {
      nfcNote = '贴片已经靠近。点「听」，播出' + nfcLaunch.LINE + '。这一下本身不算过关。'
    }
    this.setData({
      site: withOn(site, selected),
      steps: steps,
      step: 0,
      confirmed: false,
      revealLines: [],
      narrSrc: '',
      bgmSrc: site.bgmFile ? audioSrc.bgm(site.bgmFile) : '',
      listenSrc: quiz && quiz.listenFile ? quiz.listenFile : '',
      selected: selected,
      solved: !!puzzle,
      followup: !!puzzle,
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0,
      listened: !!puzzle || !(quiz && quiz.listenFile),
      textSolved: tpSolved,
      textInput: tpSolved ? tp.answer : '',
      nfcNote: nfcNote
    })
    this.recordVisit(key)
    playNarr(this, narrForSite(site, { followup: !!puzzle, step: 0, steps: steps }))
  },

  onToggle(e) {
    if (this.data.solved) return
    const quiz = this.data.site.quiz
    const key = e.currentTarget.dataset.key
    let selected
    if (!quiz.multi) {
      selected = [key]
    } else {
      selected = this.data.selected.slice()
      const i = selected.indexOf(key)
      if (i >= 0) selected.splice(i, 1)
      else selected.push(key)
    }
    this.setData({ selected: selected, site: withOn(this.data.site, selected) })
  },

  // 听题：audio-clip kind=clip（可暂停/有进度，不受人声开关隐藏），起播即记已听。
  onListenPlay() {
    this.setData({ listened: true })
  },

  onHeard() {
    const site = this.data.site
    if (!site || !site.quiz || !site.quiz.listenOnly || this.data.followup) return
    session.completePuzzle(site.quiz.puzzleId, { heard: true }, { checkpoint: site.checkpoint }).catch(function () {})
    this.setData({
      followup: true,
      solved: true,
      showHistory: false
    })
    playNarr(this, narrForSite(site, { followup: true }))
  },

  onQuizConfirm() {
    const site = this.data.site
    const quiz = site.quiz
    if (!quiz || this.data.solved) return
    if (quiz.listenFile && !this.data.listened) {
      wx.showToast({ title: '先听完再勾', icon: 'none' })
      return
    }
    if (!this.data.selected.length) return
    const ok = quiz.multi
      ? ladder.judgeMulti(this.data.selected, quiz.correct, {
        minCorrect: quiz.passMinCorrect,
        maxWrong: quiz.passMaxWrong
      })
      : this.data.selected[0] === quiz.correct[0]
    const result = ladder.submit({
      ok: ok,
      attempts: this.data.attempts,
      hints: quiz.hints,
      revealText: quiz.revealText
    })
    session.attemptPuzzle(quiz.puzzleId, result.attempts, ok, 'tap')
    if (result.solved) {
      this.setData({
        attempts: result.attempts,
        solved: true,
        revealed: result.revealed,
        hint: result.hint,
        selected: quiz.correct.slice(),
        site: withOn(this.data.site, quiz.correct),
        showHistory: true
      })
      const payload = { answer: quiz.correct.slice(), attempts: result.attempts, revealed: result.revealed }
      const finish = function () {
        return session.completePuzzle(quiz.puzzleId, payload, { checkpoint: site.checkpoint })
      }
      const cardId = quiz.cardPuzzleId
      const run = cardId
        ? session.completePuzzle(cardId, payload, { collectCard: true }).then(finish)
        : finish()
      run.catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    this.setData({ attempts: result.attempts, hint: result.hint })
  },

  onCloseHistory() {
    this.setData({
      showHistory: false,
      followup: true
    })
    playNarr(this, narrForSite(this.data.site, { followup: true }))
  },

  // 术语史料卡弹层：onGlossary/onGlossClose 与 gloss 状态由 gloss-host 行为提供。
  onStepNext() {
    if (this.data.step < this.data.steps.length - 1) {
      const step = this.data.step + 1
      this.setData({
        step: step,
        narrSrc: narrForSite(this.data.site, { step: step, steps: this.data.steps })
      })
      this.resetScroll()
    }
  },

  onStepPrev() {
    if (this.data.step > 0) {
      const step = this.data.step - 1
      this.setData({
        step: step,
        narrSrc: narrForSite(this.data.site, { step: step, steps: this.data.steps })
      })
      this.resetScroll()
    }
  },

  resetScroll() {
    if (wx.pageScrollTo) wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },

  // 支线记账：走过即记（幂等一次），供 transit「已走过」与手册统计使用。
  recordVisit(key) {
    try {
      if (key === 'xieqiqu' || key === 'fangwaiguan' || key === 'xushuilou') return
      const snap = session.getSnapshot()
      if (!snap) return
      if (snap.flags && snap.flags['sideVisited_' + key]) return
      session.setFlag('sideVisited_' + key, Date.now())
        .then(() => { session.emit({ name: 'side_visited', site: key }) })
        .catch(() => {})
    } catch (e) { /* 记账失败不阻断浏览 */ }
  },

  // 蓄水楼拼卡：拼合确认后才展开卡条背面注释（不判定对错）。
  onConfirm() {
    if (this.data.confirmed) return
    this.setData({ confirmed: true, revealLines: this.data.site.reveal || [] })
    try {
      const snap = session.getSnapshot()
      if (snap && !(snap.flags && snap.flags.xishuilouConfirmed)) {
        session.setFlag('xishuilouConfirmed', Date.now()).catch(() => {})
      }
    } catch (e) { /* 忽略 */ }
  },

  // 站尾文本谜题（v3 rev5614）：两半字拼出下一站名；答错出提示，三次直接揭晓
  onTextInput(e) {
    this.setData({ textInput: e.detail.value, textHint: '' })
  },

  onTextSubmit() {
    const tp = this.data.site && this.data.site.textPuzzle
    if (!tp || this.data.textSolved) return
    const value = String(this.data.textInput || '').replace(/\s+/g, '')
    if (!value) {
      this.setData({ textHint: '对着信封拼出下一站的名字，再提交' })
      return
    }
    const attempts = (this._textAttempts || 0) + 1
    this._textAttempts = attempts
    if (value.includes(tp.answer)) {
      session.attemptPuzzle(tp.puzzleId, attempts, true, 'text')
      this.setData({ textSolved: true, textHint: '' })
      playNarr(this, narrForSite(this.data.site, { reveal: true }))
      session.completePuzzle(tp.puzzleId, { answer: tp.answer, attempts: attempts }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    session.attemptPuzzle(tp.puzzleId, attempts, false, 'text')
    if (attempts >= 3) {
      this.setData({ textSolved: true, textInput: tp.answer, textHint: '' })
      session.completePuzzle(tp.puzzleId, { answer: tp.answer, attempts: attempts, revealed: true }).catch(function () {
        wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' })
      })
      return
    }
    this.setData({ textHint: tp.hints[Math.min(attempts - 1, tp.hints.length - 1)] })
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    wx.redirectTo({
      url: this._next,
      fail: () => wx.showToast({ title: '页面跳转失败，请重试', icon: 'none' })
    })
  }
})
