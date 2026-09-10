const cards = require('../../config/knowledge'),
  session = require('../../store/session'),
  ui = require('../../services/ui')
Page({
  data: {
    cards: [],
    filter: 'all',
    filters: [
      { id: 'all', title: '全部' },
      { id: 's1', title: '入口' },
      { id: 's2', title: '黄花阵' },
      { id: 's3', title: '海晏堂' },
      { id: 's4', title: '雨果' },
      { id: 'favorite', title: '已收藏' },
      { id: 'later', title: '稍后读' }
    ]
  },
  onShow() {
    return (session.getSnapshot() ? Promise.resolve(session.getSnapshot()) : session.init({}))
      .then(() => this.refresh())
      .catch(ui.error)
  },
  refresh() {
    const s = session.getSnapshot() || {},
      f = this.data.filter
    this.setData({
      cards: cards
        .filter(
          (c) =>
            f === 'all' ||
            c.station === f ||
            ((f === 'favorite' || f === 'later') && (s.reading[c.id] || {})[f])
        )
        .map((c) => Object.assign({}, c, { saved: s.reading[c.id] || {} }))
    })
  },
  filter(e) {
    this.setData({ filter: e.currentTarget.dataset.id })
    this.refresh()
  },
  open(e) {
    wx.navigateTo({ url: '/plate21/module/pages/reader/reader?id=' + e.currentTarget.dataset.id })
  },
  toggle(e) {
    const d = e.currentTarget.dataset,
      s = session.getSnapshot(),
      p = {}
    p[d.key] = !(s.reading[d.id] || {})[d.key]
    return session
      .setReading(d.id, p)
      .then(() => this.refresh())
      .catch(ui.error)
  }
})
