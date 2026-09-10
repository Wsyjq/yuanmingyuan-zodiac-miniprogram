const session = require('../../store/session'),
  sync = require('../../services/sync'),
  pipeline = require('../../utils/photo-pipeline'),
  exporter = require('../../services/journal-export'),
  ui = require('../../services/ui')
function blank() {
  return {
    id: 'entry-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    text: '',
    name: '',
    photos: [],
    status: 'draft'
  }
}
Page({
  data: {
    entries: [],
    entry: null,
    busy: false,
    message: '保存在本机 · 仅自己可见',
    cloud: false,
    conflict: false,
    remoteSummary: '',
    exports: []
  },
  onShow() {
    return (session.getSnapshot() ? Promise.resolve(session.getSnapshot()) : session.init({}))
      .then(() => {
        this.refresh()
        this.setData({ cloud: sync.available() })
        const draft = wx.getStorageSync('plate21_journal_editor')
        if (draft && !this.data.entry) {
          const old = session.getSnapshot().journal[draft.entry.id]
          if (!old || old.updatedAt === draft.expectedUpdatedAt) {
            this._expected = draft.expectedUpdatedAt
            this.setData({ entry: draft.entry, message: '已恢复未完成的草稿 · 保存在本机' })
          }
        }
      })
      .catch(ui.error)
  },
  refresh() {
    this.setData({
      entries: Object.values((session.getSnapshot() || {}).journal || {}).sort(
        (a, b) => b.updatedAt - a.updatedAt
      )
    })
  },
  async create() {
    if (this.data.entry && !(await this.saveCurrent())) return
    this._expected = undefined
    this.setData({ entry: blank(), exports: [] })
    this.cache()
  },
  async edit(e) {
    if (this.data.entry && !(await this.saveCurrent())) return
    const entry = session.getSnapshot().journal[e.currentTarget.dataset.id]
    if (!entry) return
    this._expected = entry.updatedAt
    this.setData({ entry: JSON.parse(JSON.stringify(entry)), exports: [] })
    this.cache()
  },
  input(e) {
    this.setData({ ['entry.' + e.currentTarget.dataset.field]: e.detail.value })
    this.cache()
  },
  cache() {
    try {
      wx.setStorageSync('plate21_journal_editor', {
        entry: this.data.entry,
        expectedUpdatedAt: this._expected
      })
    } catch (e) {
      this.setData({ message: '草稿缓存失败，请导出文字或重试保存' })
    }
  },
  clearEditor() {
    this.setData({ entry: null })
    wx.removeStorageSync('plate21_journal_editor')
  },
  async close() {
    if (this.data.entry && !(await this.saveCurrent())) return
    this.clearEditor()
  },
  saveCurrent() {
    return this.save({ currentTarget: { dataset: { status: this.data.entry.status } } })
  },
  photo() {
    if (!this.data.entry || this.data.busy || this.data.entry.photos.length >= 4) return
    this.setData({ busy: true })
    wx.chooseMedia({
      count: 4 - this.data.entry.photos.length,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: async (r) => {
        try {
          const photos = this.data.entry.photos.slice()
          for (const f of r.tempFiles) {
            const p = await pipeline.normalizePhoto(f.tempFilePath, { fileSize: f.size })
            if (!p.withinBudget) throw new Error('照片超过 1 MB，请换一张或保留文字记录')
            const saved = await new Promise((resolve, reject) =>
              wx.saveFile({
                tempFilePath: p.path,
                success: (v) => resolve(v.savedFilePath),
                fail: reject
              })
            )
            photos.push(saved)
          }
          this.setData({ 'entry.photos': photos })
          this.cache()
        } catch (e) {
          ui.error(e)
        } finally {
          this.setData({ busy: false })
        }
      },
      fail: () => this.setData({ busy: false })
    })
  },
  removePhoto(e) {
    const photos = this.data.entry.photos.filter(
      (p, i) => i !== Number(e.currentTarget.dataset.index)
    )
    this.setData({ 'entry.photos': photos })
    this.cache()
  },
  save(e) {
    if (this.data.busy || !this.data.entry) return
    this.setData({ busy: true })
    const entry = Object.assign({}, this.data.entry, {
      status: (e && e.currentTarget.dataset.status) || 'draft'
    })
    return session
      .saveEntry(entry, this._expected)
      .then((s) => {
        const saved = s.journal[entry.id]
        this._expected = saved.updatedAt
        this.setData({ entry: saved, message: '已保存到本机 · 仅自己可见' })
        this.cache()
        this.refresh()
        return true
      })
      .catch((error) => {
        ui.error(error)
        return false
      })
      .then((saved) => {
        this.setData({ busy: false })
        return saved
      })
  },
  remove(e) {
    const entry = session.getSnapshot().journal[e.currentTarget.dataset.id]
    wx.showModal({
      title: '删除这条私人记录？',
      content: '删除会在下次同步时更新到云端。已导出的纪念图仍保留。',
      confirmText: '删除',
      success: (r) => {
        if (!r.confirm) return
        session
          .deleteEntry(entry.id, entry.updatedAt)
          .then(() => {
            if (this.data.entry && this.data.entry.id === entry.id) this.clearEditor()
            this.refresh()
          })
          .catch(ui.error)
      }
    })
  },
  async export() {
    if (this.data.busy || !this.data.entry) return
    this.setData({ busy: true, exports: [] })
    try {
      const files = await exporter.exportEntry(this, this.data.entry)
      this.setData({
        exports: files,
        message: '纪念图已生成，可预览或保存。长文字和照片分别成页。'
      })
      wx.previewImage({ urls: files, current: files[0] })
    } catch (e) {
      ui.error(new Error('纪念图导出失败，请重试；文字草稿仍保留'))
    } finally {
      this.setData({ busy: false })
    }
  },
  album(e) {
    wx.saveImageToPhotosAlbum({
      filePath: e.currentTarget.dataset.path,
      success: () => wx.showToast({ title: '已保存' }),
      fail: () =>
        wx.showModal({
          title: '相册保存未完成',
          content: '可在设置中允许相册权限后重试，或打开预览保存。',
          confirmText: '打开设置',
          success: (r) => {
            if (r.confirm) wx.openSetting({})
          }
        })
    })
  },
  async sync() {
    if (this.data.busy) return
    if (this.data.entry && !(await this.saveCurrent())) return
    this.setData({ busy: true })
    try {
      const result = await sync.sync()
      this.acceptSync(result)
    } catch (e) {
      this.setData({ message: '同步未完成，本机内容仍保留。可重试。' })
      ui.error(e)
    } finally {
      this.setData({ busy: false })
    }
  },
  acceptSync(result) {
    if (result.conflict) {
      this._remote = result.remote
      const s = result.remote.snapshot || {}
      this.setData({
        conflict: true,
        remoteSummary:
          '云端有 ' +
          Object.keys(s.journal || {}).length +
          ' 条私人记录；更新时间 ' +
          new Date(s.updatedAt || Date.now()).toLocaleString() +
          '\n' +
          Object.values(s.journal || {})
            .slice(0, 3)
            .map((e) => (e.name || '未署名') + '：' + (e.text || '空白记录').slice(0, 80))
            .join('\n'),
        message: '两份存档不同，请选择；不会自动覆盖。'
      })
    } else {
      this.setData({ conflict: false, message: '已同步私人云存档 · 仅自己可见' })
      this.refresh()
    }
  },
  async resolve(e) {
    if (this.data.busy) return
    if (this.data.entry && !(await this.saveCurrent())) return
    this.setData({ busy: true })
    try {
      if (e.currentTarget.dataset.choice === 'cloud') {
        await sync.pull(this._remote)
        this.clearEditor()
        this.acceptSync({ saved: true })
      } else this.acceptSync(await sync.push(this._remote.version))
    } catch (err) {
      ui.error(err)
    } finally {
      this.setData({ busy: false })
    }
  },
  async finish() {
    if (this.data.entry && !(await this.saveCurrent())) return
    return session
      .completeExperience()
      .then(() => ui.go('echo'))
      .catch(ui.error)
  },
  report() {
    ui.go('report')
  }
})
