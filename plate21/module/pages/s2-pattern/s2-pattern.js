const statusBarBeh = require('../../utils/status-bar')
// 第二站 · 黄花阵 对读四：纹样举纸对照（V2.2 讲述版，骨架沿用 V2.1）
// 玩法：这一路的墙上都是同一种花纹，手里那页印着四种纹样图样——举纸对照，
// 走向对上的那张就是万字纹（另三种墙上没有）。红线：举纸不贴墙。
// 不是四选一测验——判定靠实物对照自校验，小程序只收「我认出了」；可跳过（跳过不发该卡）。
// 收尾（不可跳）：飞书 v3 原文——万字纹寓意＋今墙重建（SL-08）＋前往方外观。
// 之后以原子命令完成第二站，转场走干池（transit s2-s3），不再依赖任何纹样「谜底」。
// 文案与纹样单点在 content/s2-pattern.js。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')
const audioSrc = require('../../utils/audio-src')
const audioBus = require('../../utils/audio-bus')
const glossHost = require('../../utils/gloss-host')
const content = require('../../content/s2-pattern')

const PUZZLE = content.puzzleId
const PATTERNS = content.patterns

Page({
  behaviors: [statusBarBeh, glossHost],
  data: {
    patterns: PATTERNS,
    picked: null,       // 举纸对照后认出的 key
    attempts: 0,
    nudge: '',
    showHistory: false,
    historyLines: content.historyLines,
    cardNumber: content.cardNumber,
    showCardNumber: false,
    solved: false,
    skipped: false,
    showFinale: false,
    lead: content.lead,
    actStrip: content.actStrip,
    finaleReveal: content.finale.reveal,
    finaleClosing: content.finale.closing,
    wallParts: content.wallParts,
    narrSrc: audioSrc.clip(content.clips.main),
    advancing: false,
    today: ''           // 会话锁定日期（日期章用，跨午夜不变化）
  },

  onLoad() {
    session.viewPuzzle(PUZZLE)
    const snap = session.getSnapshot() || {}
    const key = sessionDate.isValidDateKey(snap.sessionDate)
      ? snap.sessionDate
      : sessionDate.dateKeyFromTimestamp(Date.now())
    const puzzle = session.getPuzzle(PUZZLE)
    const skipped = !!(puzzle && puzzle.payload && puzzle.payload.action === 'skipped')
    const done = !!puzzle
    this.setData({
      today: sessionDate.formatShortDate(key),
      cardNumber: Number(session.getCardDigit(PUZZLE)) || content.cardNumber,
      picked: done && !skipped ? content.correctKey : null,
      solved: done && !skipped,
      skipped: skipped,
      showHistory: done && !skipped,
      showCardNumber: done && !skipped,
      showFinale: skipped,
      narrSrc: audioSrc.clip(skipped ? content.clips.finale : content.clips.main),
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
      session.attemptPuzzle(PUZZLE, attempts, true, 'tap')
      this.setData({ solved: true, showHistory: true, showCardNumber: true, attempts: attempts, nudge: '' })
      session.completePuzzle(PUZZLE, { answer: content.correctKey, attempts: attempts }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
    } else if (attempts >= 3) {
      session.attemptPuzzle(PUZZLE, attempts, false, 'tap')
      this.setData({
        picked: content.correctKey,
        solved: true,
        showHistory: true,
        showCardNumber: true,
        attempts: attempts,
        nudge: content.revealNudge
      })
      session.completePuzzle(PUZZLE, { answer: content.correctKey, attempts: attempts, revealed: true }, { collectCard: true })
        .catch(function () { wx.showToast({ title: '进度暂未保存，下一步会重试', icon: 'none' }) })
    } else {
      session.attemptPuzzle(PUZZLE, attempts, false, 'tap')
      this.setData({
        attempts: attempts,
        nudge: content.nudges[attempts - 1]
      })
    }
  },

  onCloseHistory() {
    this.setData({
      showHistory: false,
      showFinale: true,
      narrSrc: audioSrc.clip(content.clips.finale)
    })
  },

  onGoS3() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle(PUZZLE, { attempts: this.data.attempts || 1 }, {
      collectCard: true,
      station: 's2',
      checkpoint: content.next.checkpoint
    }).then(() => {
      wx.redirectTo({ url: content.next.url })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  }
})
