const session = require('../../store/session')
const engine = require('../../flow/engine')
const pages = require('../../flow/pages')
const play = require('../../play')
const cue = require('../../audio/cue')
const progress = require('../../progress/build')
const { screen } = require('../../flow/screen')
const nav = require('../../capabilities/map/nav-model')

const STORE_KEY = 'plate21-mainline-run'

Page({
  data: {
    view: null,
    progressRows: [],
    showProgress: false,
    showMap: false,
    mapSites: []
  },

  onLoad() {
    const self = this
    session.init({}).then(function () {
      return session.checkPremiumUnlocked()
    }).then(function (unlocked) {
      if (!unlocked) {
        wx.redirectTo({ url: '/plate21/module/pages/gate/gate' })
        return
      }
      self.boot()
    }).catch(function () {
      wx.redirectTo({ url: '/plate21/module/pages/gate/gate' })
    })
  },

  boot() {
    let run = engine.createRun()
    try {
      const saved = wx.getStorageSync(STORE_KEY)
      if (saved && saved.pageId && pages.byId[saved.pageId]) run = saved
    } catch (err) {}
    this.run = engine.enter(run, run.pageId)
    this.ui = {}
    this.render()
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
      progressRows: progressRows,
      mapSites: nav.listSites()
    })
    this.progressOpen = built.openPageId
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
    return {
      value: this.ui.choice || this.ui.text || '',
      played: true,
      confirmed: true,
      count: this.ui.count || 0,
      hour14: this.ui.hour14 || '',
      noon: this.ui.noon || '',
      deer: !!this.ui.deer,
      dogs: !!this.ui.dogs,
      beasts: !!this.ui.beasts
    }
  },

  onShoot() {
    const self = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success() {
        self.ui.count = (self.ui.count || 0) + 1
        self.ui.again = false
        self.render()
      }
    })
  }
})
