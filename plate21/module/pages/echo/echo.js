const session = require('../../store/session'),
  config = require('../../config/echo'),
  runtime = require('../../config/runtime'),
  domain = require('../../domain/experience'),
  ui = require('../../services/ui')
function stamp(t) {
  const d = new Date(t + 8 * 3600000)
  return (
    d.getUTCFullYear() +
    '年' +
    (d.getUTCMonth() + 1) +
    '月' +
    d.getUTCDate() +
    '日 ' +
    String(d.getUTCHours()).padStart(2, '0') +
    ':00（北京时间）'
  )
}
Page({
  data: { unlocked: false, unlockLabel: '', chapters: [], letter: null, completed: false },
  onShow() {
    return (session.getSnapshot() ? Promise.resolve(session.getSnapshot()) : session.init({}))
      .then((s) => {
        const t = domain.unlockAt(s.flags.experienceCompletedAt, runtime.echoUnlockHour),
          unlocked = !!t && Date.now() >= t
        this.setData({
          completed: !!t,
          unlocked,
          unlockLabel: t ? stamp(t) : '',
          letter: unlocked && config.letter && config.letter.published ? config.letter : null,
          chapters: unlocked
            ? config.chapters
                .filter((c) => c.published)
                .map((c) => Object.assign({}, c, { progress: s.echo[c.id] || {} }))
            : []
        })
      })
      .catch(ui.error)
  },
  open(e) {
    wx.navigateTo({
      url: '/plate21/module/pages/reader/reader?kind=echo&id=' + e.currentTarget.dataset.id
    })
  },
  journal() {
    ui.go('journal')
  }
})
