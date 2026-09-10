const session = require('../../store/session'),
  config = require('../../config/experience'),
  domain = require('../../domain/experience'),
  flow = require('../../store/progress-flow'),
  ui = require('../../services/ui')
Page({
  data: {
    nodes: [],
    modes: config.MODES,
    mode: 'adult',
    resumeTitle: '序章',
    error: '',
    dev: false
  },
  onShow() {
    return (session.getSnapshot() ? Promise.resolve(session.getSnapshot()) : session.init({}))
      .then((s) => {
        const labels = {
          visited: '已访问',
          skipped: '已跳过',
          later: '稍后体验',
          completed: '已完成'
        }
        let dev = false
        try {
          dev = wx.getAccountInfoSync().miniProgram.envVersion === 'develop'
        } catch (e) {}
        this.setData({ dev })
        const resume = flow.deriveCheckpoint(s)
        this._resume = resume
        this.setData({
          mode: s.preferences.mode,
          resumeTitle: (config.node(resume) || {}).title,
          nodes: config.NODES.concat(config.EXTRA_NODES).map((n) =>
            Object.assign({}, n, { status: labels[domain.visitStatus(s, n.id)] || '未访问' })
          )
        })
      })
      .catch((e) => this.setData({ error: e.message }))
  },
  mode(e) {
    return session
      .setMode(e.currentTarget.dataset.id)
      .then(() => this.onShow())
      .catch(ui.error)
  },
  go(e) {
    wx.redirectTo({ url: config.route(e.currentTarget.dataset.id) })
  },
  resume() {
    wx.redirectTo({ url: config.route(this._resume) })
  },
  lab() {
    ui.go('audio-lab')
  },
  journal() {
    ui.go('journal')
  },
  library() {
    ui.go('library')
  },
  echo() {
    ui.go('echo')
  },
  map() {
    wx.navigateTo({ url: '/plate21/module/pages/handbook/handbook' })
  }
})
