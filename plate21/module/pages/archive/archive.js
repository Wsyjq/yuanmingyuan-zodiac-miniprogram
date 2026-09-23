const session = require('../../store/session')
const sl = require('../../utils/sl-cards')

Page({
  data: { cards: [], gloss: null },

  onShow() {
    const load = session.getSnapshot() ? Promise.resolve() : session.init({})
    load.then(() => {
      const flags = (session.getSnapshot() && session.getSnapshot().flags) || {}
      const cards = Object.keys(sl.SL_CARDS).filter(function (key) {
        return flags['cardSeen_' + key]
      }).map(function (key) {
        const card = sl.get(key)
        return { key: key, title: card.title }
      })
      this.setData({ cards: cards })
    })
  },

  onOpen(e) {
    const card = sl.get(e.currentTarget.dataset.key)
    if (!card) return
    this.setData({ gloss: card })
  },

  onClose() {
    this.setData({ gloss: null })
  }
})
