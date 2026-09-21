// 第二站 · 黄花阵 对读四：纹样举纸对照（V2.2 讲述版，骨架沿用 V2.1）
// 玩法：这一路的墙上都是同一种花纹，手里那页印着四种纹样图样——举纸对照，
// 走向对上的那张就是万字纹（另三种墙上没有）。红线：举纸不贴墙。
// 不是四选一测验——判定靠实物对照自校验，小程序只收「我认出了」；可跳过（跳过不发该卡）。
// 卡片角落数字：6（年4=6）。
// 收尾（不可跳）：翻照片背面「照原图，复位。1987、1989」＋离墙看砖＋砌墙师傅台词＋补的是四、五号 → 记进空栏。
// 之后以原子命令完成第二站，转场走干池（transit s2-s3），不再依赖任何纹样「谜底」。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')
const audioSrc = require('../../utils/audio-src')
const audioBus = require('../../utils/audio-bus')
const glossHost = require('../../utils/gloss-host')

// 四种候选纹样使用项目方确认可商用的 AI 图片衍生文件。
const PATTERNS = [
  { key: 'wanzi', name: '万字回纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-WANZI.jpg', desc: '回转连绵，万字不断', correct: true },
  { key: 'beike', name: '贝壳饰', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SHELL.jpg', desc: '扇形放射，卷叶环绕', correct: false },
  { key: 'juanco', name: '卷草饰', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SCROLL.jpg', desc: '卷曲枝条彼此对称', correct: false },
  { key: 'hualan', name: '花篮饰', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-BASKET.jpg', desc: '花束盛于西式饰篮', correct: false }
]

const HISTORY_LINES = [
  '迷宫墙体满砌万字回纹，回转连绵，又名万字不断纹。',
  '档案里这一页印了四种图样；这一路墙上反复出现的，只有其中一种。'
]

// 收尾叙事（V2.2 §第二站：看砖不摸墙，砌墙师傅是这一页的第二个人声）
const FINALE_LEAD = [
  '都对完了，还有最后一件事：把那张照片翻过来。背面一行钢笔字——'
]
const FINALE_QUOTE = '照原图，复位。1987、1989。'
const FINALE_BRIDGE = '这行字什么意思？'
const FINALE_TAIL = [
  '字看过了，砖也看了，这行字才跟眼前的东西对上：刚才走过的这座阵，是一九八几年的人，照着两百年前的一幅画，一块砖一块砖砌回来的。他们砌的是画黄花阵的那两号——就算二十号全照着砌回地上，要找的那一页，还是没有人画。'
]

Page({
  behaviors: [glossHost],
  data: {
    patterns: PATTERNS,
    picked: null,       // 举纸对照后认出的 key
    attempts: 0,
    nudge: '',
    showHistory: false,
    historyLines: HISTORY_LINES,
    cardNumber: 6,
    showCardNumber: false,
    solved: false,
    skipped: false,
    showFinale: false,
    finaleLead: FINALE_LEAD,
    finaleQuote: FINALE_QUOTE,
    finaleBridge: FINALE_BRIDGE,
    finaleTail: FINALE_TAIL,
    // 「原墙」= SL-08 史料卡挂点（v3 rev 3346：四道题全完后才说今墙是重建）
    wallParts: [
      { t: '走出迷宫，档案里有一行后来补上的记录：眼前能走进去的墙，并不是乾隆年间留下的' },
      { t: '原墙', g: 'sl08' },
      { t: '。' }
    ],
    masonClip: audioSrc.clip('dlg-huanghuazhen-5'),
    bricklayerClip: audioSrc.clip('dlg-huanghuazhen-6'),
    narrSrc: audioSrc.clip('narr-s2-pattern'),
    advancing: false,
    today: ''           // 会话锁定日期（日期章用，跨午夜不变化）
  },

  onLoad() {
    session.viewPuzzle('s2-pattern')
    const snap = session.getSnapshot() || {}
    const key = sessionDate.isValidDateKey(snap.sessionDate)
      ? snap.sessionDate
      : sessionDate.dateKeyFromTimestamp(Date.now())
    const puzzle = session.getPuzzle('s2-pattern')
    const skipped = !!(puzzle && puzzle.payload && puzzle.payload.action === 'skipped')
    const done = !!puzzle
    this.setData({
      today: sessionDate.formatShortDate(key),
      cardNumber: Number(session.getCardDigit('s2-pattern')) || 6,
      picked: done && !skipped ? 'wanzi' : null,
      solved: done && !skipped,
      skipped: skipped,
      showHistory: done && !skipped,
      showCardNumber: done && !skipped,
      showFinale: skipped,
      narrSrc: audioSrc.clip(skipped ? 'narr-s2-pattern-finale' : 'narr-s2-pattern'),
      attempts: Number(puzzle && puzzle.payload && puzzle.payload.attempts) || 0
    })
  },

  onPick(e) {
    if (this.data.solved || this.data.skipped) return
    this.setData({ picked: e.currentTarget.dataset.key, nudge: '' })
  },

  // 我认出了：举纸对照走向吻合即自校验。认成另三种时只轻推回去再比，不判错不锁。
  onConfirm() {
    // V2.3：答题交互起，压停正在播的人声（做题与听讲不打架）
    audioBus.stopKind('voice')
    if (!this.data.picked || this.data.solved || this.data.skipped) return
    const right = PATTERNS.find((p) => p.key === this.data.picked).correct
    const attempts = this.data.attempts + 1
    if (right) {
      session.attemptPuzzle('s2-pattern', attempts, true, 'tap')
      this.setData({ solved: true, showHistory: true, showCardNumber: true, attempts: attempts, nudge: '' })
      session.completePuzzle('s2-pattern', { answer: 'wanzi', attempts: attempts }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
    } else if (attempts >= 3) {
      session.attemptPuzzle('s2-pattern', attempts, false, 'tap')
      this.setData({
        picked: 'wanzi',
        solved: true,
        showHistory: true,
        showCardNumber: true,
        attempts: attempts,
        nudge: '迷宫墙体刻满万字回纹，寓意福寿绵长。'
      })
      session.completePuzzle('s2-pattern', { answer: 'wanzi', attempts: attempts, revealed: true }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
    } else {
      session.attemptPuzzle('s2-pattern', attempts, false, 'tap')
      this.setData({
        attempts: attempts,
        nudge: attempts === 1
          ? '墙上反复出现的那种。'
          : '回转连绵的那一种。'
      })
    }
  },

  onCloseHistory() {
    this.setData({
      showHistory: false,
      showFinale: true,
      narrSrc: audioSrc.clip('narr-s2-pattern-finale')
    })
  },

  onGoS3() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('s2-pattern', { attempts: this.data.attempts || 1 }, {
      collectCard: true,
      station: 's2',
      checkpoint: 'fw-three'
    }).then(() => {
      wx.redirectTo({ url: '/plate21/module/pages/transit/transit?leg=s2-fw' })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  }
})
