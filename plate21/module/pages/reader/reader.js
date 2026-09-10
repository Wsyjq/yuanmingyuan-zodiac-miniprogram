const knowledge = require('../../config/knowledge'),
  echo = require('../../config/echo'),
  runtime = require('../../config/runtime'),
  domain = require('../../domain/experience'),
  session = require('../../store/session'),
  audio = require('../../services/audio'),
  ui = require('../../services/ui')
Page({
  data: { item: null, position: 0, total: 0, block: null, error: '', sound: {}, mediaPosition: 0 },
  onLoad(q) {
    this._kind = q.kind === 'echo' ? 'echo' : 'reading'
    this._id = q.id
    this._off = audio.get().subscribe((sound) => this.setData({ sound }))
    return (session.getSnapshot() ? Promise.resolve(session.getSnapshot()) : session.init({}))
      .then((s) => {
        const at = domain.unlockAt(s.flags.experienceCompletedAt, runtime.echoUnlockHour)
        const list =
          this._kind === 'echo'
            ? at && Date.now() >= at
              ? echo.chapters.filter((c) => c.published)
              : []
            : knowledge
        const item = list.find((x) => x.id === q.id)
        if (!item || !item.blocks || !item.blocks.length) {
          this.setData({ error: '此内容暂未开放，请返回目录。' })
          return
        }
        const p = s[this._kind][q.id] || {}
        this.setData({
          item,
          total: item.blocks.length,
          position: Math.min(p.position || 0, item.blocks.length - 1)
        })
        this.showBlock()
      })
      .catch(ui.error)
  },
  onHide() {
    if (wx.createVideoContext) wx.createVideoContext('readerVideo', this).pause()
    audio.get().release('reader-video')
  },
  onUnload() {
    if (this._off) this._off()
    audio.get().release('reader-video')
  },
  showBlock() {
    const block = this.data.item.blocks[this.data.position]
    this.setData({ block, mediaPosition: 0 })
    const snap = session.getSnapshot()
    if (block.type === 'video') {
      const state = snap.reading['media-' + this._id + '-' + this.data.position] || {}
      this.setData({ mediaPosition: state.position || 0 })
    }
  },
  move(e) {
    audio.get().release('reader-video')
    const p = this.data.position + Number(e.currentTarget.dataset.delta)
    if (p < 0 || p >= this.data.total) return
    this.setData({ position: p })
    this.showBlock()
    return this.persist(false).catch(ui.error)
  },
  persist(completed) {
    if (!this.data.item) return Promise.resolve()
    const done =
      !!completed || !!((session.getSnapshot()[this._kind] || {})[this._id] || {}).completed
    return this._kind === 'echo'
      ? session.setEchoProgress(this._id, this.data.position, done)
      : session.setReading(this._id, { position: this.data.position, completed: done })
  },
  restart() {
    this.setData({ position: 0 })
    this.showBlock()
    return this.persist(false).catch(ui.error)
  },
  finish() {
    return this.persist(true)
      .then(() => wx.showToast({ title: '阅读进度已保存', icon: 'none' }))
      .catch(ui.error)
  },
  copy(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.url })
  },
  play() {
    const b = this.data.block
    audio.get().playVoice({
      id: 'reader-' + this._id + '-' + this.data.position,
      title: this.data.item.title,
      src: b.src
    })
  },
  pause() {
    audio.get().pause()
  },
  seek(e) {
    audio.get().seek((this.data.sound.duration * e.detail.value) / 100)
  },
  retry() {
    audio.get().retry()
  },
  videoPlay() {
    audio.get().suspend('reader-video')
  },
  videoPause() {
    audio.get().release('reader-video')
  },
  videoTime(e) {
    if (Date.now() - (this._lastMediaSave || 0) < 4000) return
    this._lastMediaSave = Date.now()
    session
      .setReading('media-' + this._id + '-' + this.data.position, {
        position: e.detail.currentTime
      })
      .catch(ui.error)
  },
  mediaError() {
    audio.get().release('reader-video')
    this.setData({ error: '媒体加载失败，可重试或继续阅读文字。' })
  }
})
