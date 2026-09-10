const config = require('../../config/experience'),
  session = require('../../store/session'),
  ui = require('../../services/ui')
const guides = require('../../config/narration').GUIDES
Component({
  properties: { nodeId: { type: String, value: '' } },
  data: { expanded: false, node: null, guide: null, deep: false, hint: 0, busy: false },
  lifetimes: {
    attached() {
      this.refresh()
    }
  },
  pageLifetimes: {
    show() {
      this.refresh()
    }
  },
  methods: {
    refresh() {
      const n = config.node(
        this.data.nodeId,
        (session.getSnapshot() || {}).preferences && session.getSnapshot().preferences.mode
      )
      this.setData({
        completed: session.isPuzzleComplete(this.data.nodeId),
        node: n,
        guide: n ? guides[n.station] || null : null
      })
    },
    toggle() {
      this.setData({ expanded: !this.data.expanded })
    },
    deep() {
      this.setData({ deep: !this.data.deep })
    },
    hint() {
      this.setData({ hint: Math.min(2, this.data.hint + 1) })
    },
    advance(e) {
      if (this.data.busy) return
      const n = config.next(this.data.nodeId)
      this.setData({ busy: true })
      return session
        .visit(this.data.nodeId, e.currentTarget.dataset.status, n.id)
        .then(
          () =>
            new Promise((resolve, reject) =>
              wx.redirectTo({ url: config.route(n.id), success: resolve, fail: reject })
            )
        )
        .catch(ui.error)
        .then(() => this.setData({ busy: false }))
    }
  }
})
