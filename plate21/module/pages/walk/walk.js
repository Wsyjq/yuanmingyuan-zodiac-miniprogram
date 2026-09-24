const session = require('../../store/session')
const coachHost = require('../../capabilities/play-guide/coach-host')
const engine = require('../../flow/engine')
const pages = require('../../flow/pages')
const play = require('../../play/index')
const cue = require('../../audio/cue')
const progress = require('../../progress/build')
const { screen, PIECES } = require('../../flow/screen')
const nav = require('../../capabilities/map/nav-model')
const sessionDate = require('../../utils/session-date')
const cards = require('../../utils/sl-cards')
const nfcListen = require('../../capabilities/nfc/listen')
const nfcLaunch = require('../../capabilities/nfc/launch')

const STORE_KEY = 'plate21-mainline-run'

// 当天署名停在 FN4。署名日早于今天才进 LT1。引擎不看日期。
function letterIsDue(run, now) {
  if (!run || run.pageId !== 'FN4' || !run.signedAt) return false
  const today = sessionDate.dateKeyFromTimestamp(now == null ? Date.now() : now)
  const signed = sessionDate.dateKeyFromTimestamp(run.signedAt)
  return today > signed
}

const COACH_START = [
  {
    flag: 'coachWalkGoAt',
    selector: '#coachGo',
    tag: '往下翻',
    tap: '继续',
    body: '这一页看完了，点底下朱红的钮往前。',
    skipIfMissing: true
  },
  {
    flag: 'coachWalkSkipAt',
    selector: '#coachSkip',
    tag: '先去园里',
    tap: '先去园里',
    body: '序章可以整段跳过。点浅色这颗，直接到入口。',
    skipIfMissing: true
  }
]

const COACH_SITE = [
  {
    flag: 'coachWalkPuzzleAt',
    selector: '#coachSkip',
    tag: '这处可以不做',
    tap: '这题先跳过',
    body: '不想做就点浅色这颗。跳过不会把答案揭出来。',
    skipIfMissing: true
  },
  {
    flag: 'coachWalkMapAt',
    selector: '#coachMap',
    tag: '打开地图',
    tap: '地图',
    body: '人在点位里时，点侧边这颗看周围。站与站之间那一页本身就是导航。',
    skipIfMissing: true
  },
  {
    flag: 'coachWalkProgressAt',
    selector: '#coachProgress',
    tag: '看进程',
    tap: '进程',
    body: '看哪些点去过、哪些地方跳过了。点一项可以回去。',
    skipIfMissing: true
  }
]

Page({
  behaviors: [coachHost],
  data: {
    view: null,
    progressRows: [],
    showProgress: false,
    showMap: false,
    mapSites: [],
    card: null
  },

  onLoad(options) {
    this.pageQuery = options || {}
    const self = this
    session.init({}).then(function () {
      return session.checkPremiumUnlocked()
    }).then(function (unlocked) {
      if (!unlocked) {
        wx.redirectTo({ url: self.lockedUrl() })
        return
      }
      self.boot()
    }).catch(function () {
      wx.redirectTo({ url: self.lockedUrl() })
    })
  },

  lockedUrl() {
    return nfcLaunch.parse(this.pageQuery) ? nfcLaunch.gateUrl() : '/plate21/module/pages/gate/gate'
  },

  boot() {
    let run = engine.createRun()
    try {
      const saved = wx.getStorageSync(STORE_KEY)
      if (saved && saved.pageId && pages.byId[saved.pageId]) run = saved
    } catch (err) {}
    if (letterIsDue(run)) run = Object.assign({}, run, { pageId: 'LT1' })
    this.run = engine.enter(run, run.pageId)
    this.ui = {}
    const launch = nfcLaunch.parse(this.pageQuery)
    if (launch && this.run.pageId !== 'X1') {
      this.ui.nfcAside = '这张贴是谐奇趣的。走到那一页再听，这一下不算过关。'
    }
    this.render()
    if (launch && this.run.pageId === 'X1') this.markHeard('贴片已经靠近')
    this.coachFor(this.run.pageId)
  },

  coachFor(pageId) {
    if (pageId === 'P1') this.scheduleCoach(COACH_START, 500)
    if (pageId === 'E1') this.scheduleCoach(COACH_SITE, 500)
  },

  render() {
    const view = screen(this.run, this.ui)
    const built = progress.buildProgress(this.run, pages.byId)
    const labels = {
      'quiz-direction': '方位',
      'listen-nfc': '贴片',
      'quiz-envelope': '信封',
      'quiz-lantern': '灯会',
      'prop-flip': '翻图',
      'photo-pavilion': '拍照',
      'quiz-pattern': '花纹',
      'quiz-hour': '时辰',
      'prop-dial': '转盘',
      'quiz-height': '高低',
      'place-animals': '归位'
    }
    const progressRows = built.rows.map(function (row) {
      return Object.assign({}, row, {
        puzzles: (row.puzzles || []).map(function (puzzle) {
          return Object.assign({}, puzzle, { label: labels[puzzle.playId] || puzzle.playId })
        })
      })
    })
    this.setData({
      view: view,
      card: this.cardView(),
      progressRows: progressRows,
      mapSites: nav.listSites()
    })
    this.progressOpen = built.openPageId
    this.syncNfc()
  },

  cardView() {
    const found = cards.get(this.ui.cardKey)
    if (!found) return null
    return {
      title: String(found.title || '').replace(/^SL-\d+\s*·\s*/, ''),
      source: found.source,
      image: found.image || '',
      caption: found.caption || '',
      lines: found.layers,
      more: false
    }
  },

  syncNfc() {
    const page = pages.byId[this.run.pageId]
    if (!page || page.playId !== 'listen-nfc') {
      this.stopNfc()
      return
    }
    if (this.nfcOn) return
    this.nfcOn = true
    const self = this
    this.nfcHandle = nfcListen.start({
      onTag: function () { self.markHeard('贴片读到了，声景在放') },
      onStatus: function (status) {
        if (status === 'unsupported') self.ui.nfcStatus = '这台手机读不了贴片，可以直接听'
        else if (status === 'foreign') self.ui.nfcStatus = '这张贴片不是谐奇趣的'
        else self.ui.nfcStatus = status
        self.render()
      }
    })
  },

  stopNfc() {
    this.nfcOn = false
    if (this.nfcHandle) {
      this.nfcHandle.stop()
      this.nfcHandle = null
    }
  },

  markHeard(status) {
    this.ui.heard = true
    this.ui.nfcStatus = status
    this.playSound()
    this.render()
  },

  playSound() {
    if (typeof wx === 'undefined' || typeof wx.createInnerAudioContext !== 'function') return
    if (this.audio) {
      try { this.audio.stop() } catch (err) {}
    }
    const audio = wx.createInnerAudioContext()
    audio.src = nfcListen.SOUND
    audio.play()
    this.audio = audio
  },

  persist() {
    try { wx.setStorageSync(STORE_KEY, this.run) } catch (err) {}
  },

  go(nextRun) {
    this.ui = {}
    this.run = engine.enter(nextRun, nextRun.pageId)
    this.persist()
    this.setData({ showProgress: false, showMap: false })
    this.render()
    this.coachFor(this.run.pageId)
  },

  onChoose(e) {
    this.ui.choice = e.currentTarget.dataset.value
    this.ui.again = false
    this.render()
  },

  onToggle(e) {
    const key = e.currentTarget.dataset.key
    this.ui[key] = !this.ui[key]
    this.ui.again = false
    this.render()
  },

  onField(e) {
    this.ui[e.currentTarget.dataset.key] = e.detail.value
    this.ui.again = false
    this.render()
  },

  noop() {},

  onPrimary() {
    const page = pages.byId[this.run.pageId]
    if (!page) return
    if (page.playId === 'prop-flip' && !this.ui.flipped) {
      this.ui.flipped = true
      this.render()
      return
    }
    if (page.playId) {
      const result = play.submit(page.playId, this.action())
      if (result.status === 'again') {
        this.ui.again = true
        this.render()
        return
      }
      if (result.status === 'solved') {
        const marked = Object.assign({}, this.run, {
          puzzles: Object.assign({}, this.run.puzzles, { [page.playId]: 'solved' })
        })
        this.go(engine.complete(marked, page.id))
        return
      }
    }
    if (page.kind === 'sign') {
      this.run = Object.assign({}, this.run, { signedAt: Date.now() })
      this.persist()
      wx.showToast({ title: '明天再来看那封信', icon: 'none' })
      return
    }
    if (!page.next) return
    this.go(engine.complete(this.run, page.id))
  },

  onSkip() {
    const page = pages.byId[this.run.pageId]
    if (!page || !page.skipTo) return
    this.go(engine.skip(this.run, page.id))
  },

  onMapSite(e) {
    const data = e.currentTarget.dataset
    wx.openLocation({
      latitude: Number(data.lat),
      longitude: Number(data.lng),
      name: data.name,
      scale: 16
    })
  },

  onNavigate() {
    const view = this.data.view
    if (!view || !view.nav) return
    const to = view.nav.to
    wx.openLocation({
      latitude: to.latitude,
      longitude: to.longitude,
      name: to.name,
      scale: 16
    })
  },

  onOpenMap() {
    this.setData({ showMap: true, showProgress: false })
  },

  onCloseMap() {
    this.setData({ showMap: false })
  },

  onOpenProgress() {
    this.render()
    this.setData({ showProgress: true, showMap: false })
  },

  onCloseProgress() {
    this.setData({ showProgress: false })
  },

  onProgressRow(e) {
    const pageId = this.progressOpen(e.currentTarget.dataset.row)
    if (!pageId) return
    this.go(Object.assign({}, this.run, { pageId: pageId }))
  },

  onProgressPlay(e) {
    const pageId = e.currentTarget.dataset.page
    if (!pageId) return
    this.go(Object.assign({}, this.run, { pageId: pageId }))
  },

  action() {
    const placed = this.ui.placed || {}
    const animals = {}
    PIECES.forEach(function (piece) {
      animals[piece.id] = placed[piece.id] === piece.slot
    })
    return {
      value: this.ui.choice || this.ui.text || '',
      played: !!this.ui.heard,
      confirmed: true,
      count: this.ui.count || 0,
      hour14: (this.ui.hour14 || '').trim(),
      noon: (this.ui.noon || '').trim(),
      deer: animals.deer,
      dogs: animals.dogs,
      beasts: animals.beasts
    }
  },

  onSpot(e) {
    this.ui.spot = e.currentTarget.dataset.id
    this.ui.again = false
    this.render()
  },

  onBeast(e) {
    this.ui.beast = e.currentTarget.dataset.branch
    this.ui.noonWatch = false
    this.render()
  },

  onNoonWatch() {
    this.ui.noonWatch = true
    this.ui.beast = ''
    this.render()
  },

  onPiece(e) {
    this.ui.selectedPiece = e.currentTarget.dataset.id
    this.ui.again = false
    this.render()
  },

  onSlot(e) {
    const pieceId = this.ui.selectedPiece
    if (!pieceId) return
    const slotId = e.currentTarget.dataset.id
    const placed = Object.assign({}, this.ui.placed)
    Object.keys(placed).forEach(function (key) {
      if (placed[key] === slotId) delete placed[key]
    })
    placed[pieceId] = slotId
    this.ui.placed = placed
    this.ui.selectedPiece = ''
    this.ui.again = false
    this.render()
  },

  onDirectListen() {
    this.markHeard('直接在听')
  },

  onTerm(e) {
    this.ui.cardKey = e.currentTarget.dataset.key
    this.ui.cardLayer = 1
    this.render()
  },

  onCardMore() {
    this.ui.cardLayer = (this.ui.cardLayer || 1) + 1
    this.render()
  },

  onCardClose() {
    this.ui.cardKey = ''
    this.render()
  },

  onPrev() {
    const self = this
    session.listBoardMessages({ limit: 1 }).then(function (res) {
      const note = res && res.messages && res.messages[0]
      self.ui.prevNote = note ? note.from + '：' + note.text : '还没有经审核的上一位留言'
      self.render()
    }).catch(function () {
      self.ui.prevNote = '留言这会儿打不开'
      self.render()
    })
  },

  onLeaveText() {
    const text = String(this.ui.leaveText || '').trim()
    if (!text) {
      this.ui.leftAck = '先写一句'
      this.render()
      return
    }
    this.submitLeave(text)
  },

  onLeaveWish() {
    const text = String(this.ui.wish || '').trim()
    if (!text) {
      this.ui.leftAck = '写一个你希望他再看一眼的地方'
      this.render()
      return
    }
    this.submitLeave('替我再看一眼：' + text)
  },

  onLeavePhoto() {
    const self = this
    this.shoot(function (path) {
      self.ui.photo = path
      self.submitLeave('今天在遗址拍下的一张照片。')
    })
  },

  submitLeave(text) {
    const self = this
    session.submitBoardMessage(text).then(function () {
      self.ui.leftAck = '已收下。审核通过后，才会出现在下一位的信里。'
      self.render()
    }).catch(function () {
      self.ui.leftAck = '这会儿没送出去'
      self.render()
    })
  },

  onShoot() {
    const self = this
    this.shoot(function (path) {
      self.ui.photo = path
      self.ui.count = (self.ui.count || 0) + 1
      self.ui.again = false
      self.render()
    })
  },

  shoot(done) {
    if (typeof wx === 'undefined' || typeof wx.chooseImage !== 'function') return
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: function (res) {
        done(res.tempFilePaths && res.tempFilePaths[0])
      }
    })
  },

  onUnload() {
    this.stopNfc()
    if (this.audio) {
      try { this.audio.stop() } catch (err) {}
    }
  }
})
