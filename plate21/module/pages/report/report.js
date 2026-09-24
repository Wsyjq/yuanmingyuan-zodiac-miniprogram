'use strict'

const session = require('../../store/session')
const gameEntry = require('../../utils/game-entry')
const bridge = require('../../host/bridge')
const renderer = require('../../utils/report-renderer')
const { normalizePhoto } = require('../../utils/photo-pipeline')
const WALK = '/plate21/module/pages/walk/walk'
const SITE_OPTIONS = [{ id: '', label: '现场记录（不指定地点）' }].concat(renderer.SITES)

function invoke(name, options) {
  return new Promise(function (resolve, reject) {
    if (typeof wx[name] !== 'function') return reject(new Error(name + '_unavailable'))
    let settled = false
    const interactive = ['chooseMedia', 'chooseImage', 'showModal', 'previewImage', 'saveImageToPhotosAlbum'].indexOf(name) >= 0
    const timer = interactive ? null : setTimeout(function () {
      if (!settled) { settled = true; reject(new Error(name + '_timeout')) }
    }, 15000)
    function done(callback, value) {
      if (settled) return
      settled = true; clearTimeout(timer); callback(value)
    }
    try {
      wx[name](Object.assign({}, options, {
        success: function (value) { done(resolve, value) },
        fail: function (error) { done(reject, error) }
      }))
    } catch (error) { done(reject, error) }
  })
}
function errorText(error) { return String(error && (error.errMsg || error.message || error.code) || '') }
function cancelled(error) { return /cancel/i.test(errorText(error)) }

Page({
  data: {
    loading: true, loadError: '', model: null, siteOptions: SITE_OPTIONS, siteIndex: 0,
    draftText: '', editingTextId: '', busy: false, recordError: '',
    generating: false, saving: false, previewImages: [], saveError: '',
    savedCount: 0, exportWarning: '', canOpenAlbumSettings: false,
    bonusError: '', letterAvailable: false, letterChecking: false, letterOpening: false,
    letterMessage: '', sheetCount: 1, reminderSupported: false,
    reminderAccepted: false, reminderRequesting: false, reminderMessage: ''
  },

  onLoad: function (options) {
    this._requestedSessionId = options && options.sessionId ? String(options.sessionId) : ''
    this._unloaded = false
    this._loadPromise = this.loadArchive()
    return this._loadPromise
  },
  onReady: function () { this._ready = true; this._maybeGenerate() },
  onShow: function () {
    if (this._loadedOnce && !this._loadPromise) return this.loadArchive()
  },
  onUnload: function () { this._unloaded = true },
  update: function (patch) { if (!this._unloaded) this.setData(patch) },

  loadArchive: async function () {
    this.update({ loading: true, loadError: '' })
    try {
      await gameEntry.init({ source: 'report', sessionId: this._requestedSessionId })
      this.refresh(true)
      this._loadedOnce = true
    } catch (error) {
      this.update({ loading: false, loadError: error.code === 'ARCHIVE_NOT_FOUND' ? '找不到这份档案，请返回考察入口重试。' : '档案暂时无法读取，请重试。' })
    } finally { this._loadPromise = null }
  },
  onRetryLoad: function () { return this.loadArchive() },

  readTarget: function () {
    const current = session.getSnapshot()
    if (!current) throw new Error('snapshot_unavailable')
    if (!this._requestedSessionId || this._requestedSessionId === current.sessionId) return current
    const archive = session.getArchive(this._requestedSessionId)
    if (!archive) { const error = new Error('archive_not_found'); error.code = 'ARCHIVE_NOT_FOUND'; throw error }
    return archive
  },
  refresh: function (checkLetter) {
    try {
      const target = this.readTarget()
      this._sessionId = target.sessionId
      this._target = target
      const model = renderer.buildModel(target)
      const fingerprint = JSON.stringify(model)
      const changed = fingerprint !== this._fingerprint
      this._fingerprint = fingerprint
      this.update({ model: model, loading: false, loadError: '', sheetCount: renderer.buildSheets(model).length,
        reminderSupported: bridge.available('requestReminder'), reminderAccepted: !!(target.run.reminder && target.run.reminder.accepted === true) })
      if (changed) {
        this._renderedFingerprint = ''
        this.update({ previewImages: [], savedCount: 0, exportWarning: '', saveError: '' })
        this._maybeGenerate()
      }
      if (checkLetter) this.checkLetter()
    } catch (error) {
      this.update({ loading: false, loadError: '找不到这份档案，请返回考察入口重试。' })
    }
  },

  checkLetter: async function () {
    if (!this.data.model || !this.data.model.completed || this.data.letterChecking) return
    const sessionId = this._sessionId
    this.update({ letterChecking: true })
    try {
      const result = await session.getLetterState(sessionId)
      if (this._sessionId !== sessionId) return
      this.update({ letterAvailable: !!result.available,
        letterMessage: result.available ? '一封来自档案整理者的信，正在等你。'
          : result.reason === 'not_due' ? '完成考察后的下一个自然日，这封信可以启封。'
            : '来信开放时间需要联网校验；考察作品可以继续查看。' })
    } catch (error) { this.update({ letterAvailable: false, letterMessage: '来信状态暂时无法读取，稍后可以再试。' }) }
    finally { this.update({ letterChecking: false }) }
  },
  onOpenBonus: async function () {
    if (this.data.letterOpening || !this.data.model || !this.data.model.completed) return
    this.update({ letterOpening: true, bonusError: '' })
    try {
      await session.openBonus(this._sessionId)
      await invoke('redirectTo', { url: WALK + '?sessionId=' + encodeURIComponent(this._sessionId) + '&entry=letter' })
    } catch (error) { this.update({ bonusError: '彩蛋暂时无法打开，请重试。' }) }
    finally { this.update({ letterOpening: false }) }
  },
  onOpenLetter: async function () {
    if (this.data.letterOpening || !this.data.model || !this.data.model.completed) return
    this.update({ letterOpening: true })
    try {
      await session.openLetter(this._sessionId)
      await invoke('redirectTo', { url: WALK + '?sessionId=' + encodeURIComponent(this._sessionId) + '&entry=letter' })
    } catch (error) {
      this.update({ letterMessage: error.code === 'LETTER_LOCKED' ? '这封信尚未开放，或需要联网确认时间。到期后仍可从这里进入。' : '来信暂时无法打开，请重试。' })
    } finally { this.update({ letterOpening: false }) }
  },
  onRestart: function () { return invoke('redirectTo', { url: WALK + '?entry=restart' }) },
  onReturn: function () {
    return invoke('redirectTo', { url: WALK + (this._sessionId ? '?sessionId=' + encodeURIComponent(this._sessionId) : '') })
      .catch(() => this.update({ saveError: '暂时无法返回考察，请使用左上角返回后重试。' }))
  },
  onRequestReminder: async function () {
    if (this.data.reminderRequesting || this.data.reminderAccepted || !this.data.model || !this.data.model.completed ||
        !bridge.available('requestReminder')) return
    this.update({ reminderRequesting: true, reminderMessage: '' })
    try {
      const result = await session.requestReminder(this._sessionId)
      this.update({ reminderAccepted: !!(result && result.accepted === true),
        reminderMessage: result && result.accepted === true
          ? '提醒请求已受理。你也可以回到这里自行检查来信。'
          : result && result.status === 'declined' ? '这次没有开启提醒。到期后仍可从这里阅读来信。'
            : '提醒请求暂未受理，可以重试；来信入口仍会保留。' })
    } catch (error) { this.update({ reminderAccepted: false, reminderMessage: '提醒请求暂未受理，可以重试；来信入口仍会保留。' }) }
    finally { this.update({ reminderRequesting: false }) }
  },

  onSiteChange: function (event) {
    const index = Number(event.detail.value)
    this.update({ siteIndex: Number.isInteger(index) && SITE_OPTIONS[index] ? index : 0 })
  },
  onTextInput: function (event) { this.update({ draftText: event.detail.value, recordError: '' }) },
  onEditText: function (event) {
    const record = this.data.model.texts.find(function (item) { return item.id === event.currentTarget.dataset.id })
    if (!record) return
    this.update({ editingTextId: record.id, draftText: record.text,
      siteIndex: Math.max(0, SITE_OPTIONS.findIndex(function (site) { return site.id === record.siteId })) })
    if (wx.pageScrollTo) wx.pageScrollTo({ selector: '#recordEditor', duration: 200 })
  },
  onCancelEdit: function () { this.update({ editingTextId: '', draftText: '', recordError: '' }) },
  recordLocked: function () { return this.data.busy || this.data.saving || this.data.generating || !this.data.model },
  onSaveText: async function () {
    if (this.recordLocked()) return
    const text = String(this.data.draftText || '').trim()
    if (!text) { this.update({ recordError: '先写下一点观察，再保存这条记录。' }); return }
    this.update({ busy: true, recordError: '' })
    try {
      await session.saveRecord({ id: this.data.editingTextId || undefined, kind: 'text', purpose: 'field',
        text: text.slice(0, 500), siteId: SITE_OPTIONS[this.data.siteIndex].id, status: 'private' }, this._sessionId)
      this.update({ editingTextId: '', draftText: '' })
      this.refresh(false)
    } catch (error) { this.update({ recordError: '文字记录没有保存成功，原内容仍保留，请重试。' }) }
    finally { this.update({ busy: false }); this._maybeGenerate() }
  },

  choosePhoto: async function () {
    if (typeof wx.chooseMedia === 'function') {
      const result = await invoke('chooseMedia', { count: 1, mediaType: ['image'], sourceType: ['camera', 'album'], sizeType: ['compressed'] })
      const file = result.tempFiles && result.tempFiles[0]
      return { filePath: file && file.tempFilePath, fileSize: file && file.size }
    }
    const result = await invoke('chooseImage', { count: 1, sizeType: ['compressed'], sourceType: ['camera', 'album'] })
    return { filePath: result.tempFilePaths && result.tempFilePaths[0], fileSize: result.tempFiles && result.tempFiles[0] && result.tempFiles[0].size }
  },
  onAddPhoto: function () { return this.savePhoto('') },
  onReplacePhoto: function (event) { return this.savePhoto(event.currentTarget.dataset.id) },
  savePhoto: async function (recordId) {
    if (this.recordLocked()) return
    const previous = recordId ? this.data.model.photos.find(function (item) { return item.id === recordId }) : null
    if (recordId && !previous) return
    this.update({ busy: true, recordError: '' })
    try {
      const chosen = await this.choosePhoto()
      if (!chosen.filePath) throw new Error('empty_photo')
      const photo = await normalizePhoto(chosen.filePath, { fileSize: chosen.fileSize })
      if (!photo.path || photo.withinBudget === false) throw new Error('photo_too_large')
      const media = await session.saveMedia({ filePath: photo.path, upload: false })
      const filePath = media && (media.localPath || media.filePath)
      if (!media || media.status !== 'local' || !filePath) throw new Error('photo_not_persisted')
      await session.saveRecord({ id: recordId || undefined, kind: 'photo', purpose: 'field', filePath: filePath,
        siteId: previous ? previous.siteId : SITE_OPTIONS[this.data.siteIndex].id, status: 'private',
        width: photo.width, height: photo.height }, this._sessionId)
      this.refresh(false)
    } catch (error) {
      if (!cancelled(error)) this.update({ recordError: /too_large/.test(errorText(error))
        ? '这张照片较大，暂时无法保存。可以换一张，或先留下文字。'
        : '照片未能保存在设备中，原记录没有被替换。请重试，或先留下文字。' })
    } finally { this.update({ busy: false }); this._maybeGenerate() }
  },
  onPreviewPhoto: function (event) {
    const photos = this.data.model.photos.filter(function (photo) { return !!photo.filePath })
    const selected = photos.find(function (photo) { return photo.id === event.currentTarget.dataset.id })
    if (!selected) return
    return invoke('previewImage', { current: selected.filePath, urls: photos.map(function (photo) { return photo.filePath }) })
      .catch(() => this.update({ recordError: '这张照片暂时无法打开，可以替换后重试。' }))
  },
  onDeleteRecord: async function (event) {
    if (this.recordLocked()) return
    const recordId = event.currentTarget.dataset.id
    const record = this.data.model.photos.concat(this.data.model.texts).find(function (item) { return item.id === recordId })
    if (!record) return
    this.update({ busy: true, recordError: '' })
    try {
      const choice = await invoke('showModal', { title: '删除这条私人记录？', content: '考察完成日期和站点进度不会改变。', confirmText: '删除', confirmColor: '#843c2d' })
      if (!choice.confirm) return
      await session.deleteRecord(recordId, this._sessionId)
      if (this.data.editingTextId === recordId) this.onCancelEdit()
      this.refresh(false)
    } catch (error) { this.update({ recordError: '记录暂时无法删除，请重试。' }) }
    finally { this.update({ busy: false }); this._maybeGenerate() }
  },

  _maybeGenerate: function () {
    if (this._ready && !this._unloaded && this.data.model && !this.data.busy && !this.data.generating &&
        this._renderedFingerprint !== this._fingerprint) this.generateArtwork().catch(function () {})
  },
  canvasNode: function () {
    const page = this
    return new Promise(function (resolve, reject) {
      let settled = false
      const timer = setTimeout(function () { if (!settled) { settled = true; reject(new Error('canvas_unavailable')) } }, 5000)
      try {
        wx.createSelectorQuery().in(page).select('#reportCanvas').fields({ node: true, size: true }).exec(function (result) {
          if (settled) return
          settled = true; clearTimeout(timer)
          if (result && result[0] && result[0].node) resolve(result[0].node)
          else reject(new Error('canvas_unavailable'))
        })
      } catch (error) { settled = true; clearTimeout(timer); reject(error) }
    })
  },
  generateArtwork: async function () {
    if (this.data.generating) return null
    if (!this.data.model) throw new Error('archive_unavailable')
    this.update({ generating: true, saveError: '', exportWarning: '' })
    const fingerprint = this._fingerprint
    const sheets = renderer.buildSheets(this.data.model)
    const images = [], missing = []
    try {
      const canvas = await this.canvasNode()
      for (const sheet of sheets) {
        if (this._unloaded || this._fingerprint !== fingerprint) throw new Error('report_changed')
        let ctx = canvas.getContext('2d')
        const layout = renderer.measure(ctx, sheet)
        canvas.width = renderer.WIDTH * 2
        canvas.height = layout.height * 2
        ctx = canvas.getContext('2d'); ctx.scale(2, 2)
        const result = await renderer.draw(ctx, canvas, sheet, layout)
        missing.push.apply(missing, result.missingPhotos)
        const image = await invoke('canvasToTempFilePath', { canvas: canvas, fileType: 'jpg', quality: 0.92,
          destWidth: renderer.WIDTH * 2, destHeight: layout.height * 2 })
        if (!image.tempFilePath) throw new Error('empty_export')
        images.push({ filePath: image.tempFilePath, number: sheet.number })
      }
      if (this._unloaded || this._fingerprint !== fingerprint) throw new Error('report_changed')
      this._renderedFingerprint = fingerprint
      this.update({ previewImages: images, savedCount: 0,
        exportWarning: missing.length ? '有 ' + missing.length + ' 张照片暂时无法读取，作品已标记占位；原记录仍保留，可替换照片后重新生成。' : '' })
      return images
    } catch (error) {
      this.update({ saveError: /canvas_unavailable/.test(errorText(error)) ? '当前设备暂时无法生成作品，请重试。记录和考察进度仍然保留。' : '作品暂时未能生成，请重试。记录和考察进度仍然保留。' })
      throw error
    } finally { this.update({ generating: false }) }
  },
  onRegenerate: function () {
    if (this.data.generating || this.data.busy || this.data.saving) return
    this._renderedFingerprint = ''
    return this.generateArtwork().catch(function () {})
  },
  onPreviewArtwork: function (event) {
    const images = this.data.previewImages
    const index = Number(event.currentTarget.dataset.index) || 0
    if (!images[index]) return
    return invoke('previewImage', { current: images[index].filePath, urls: images.map(function (image) { return image.filePath }) })
      .catch(() => this.update({ saveError: '预览暂时无法打开，可以重新生成后再试。' }))
  },
  onSave: async function () {
    if (this.data.saving || this.data.generating || this.data.busy || !this.data.model) return
    this.update({ saving: true, saveError: '', canOpenAlbumSettings: false })
    try {
      if (this._renderedFingerprint !== this._fingerprint || !this.data.previewImages.length) await this.generateArtwork()
      const images = this.data.previewImages
      if (!images.length) throw new Error('empty_export')
      // If saving sheet 2 fails, a retry continues from sheet 2 instead of duplicating sheet 1.
      for (let i = this.data.savedCount; i < images.length; i++) {
        await invoke('saveImageToPhotosAlbum', { filePath: images[i].filePath })
        this.update({ savedCount: i + 1 })
      }
      session.emit({ name: 'report_saved', result: 'saved' })
      if (!this._unloaded) wx.showToast({ title: '已保存到相册', icon: 'none' })
    } catch (error) {
      const denied = /auth deny|auth denied|authorize|permission/i.test(errorText(error))
      this.update({ canOpenAlbumSettings: denied, saveError: denied ? '相册权限未开启。可打开权限设置，然后继续保存。'
        : cancelled(error) ? '已取消保存。作品和考察记录仍保留在这里。'
          : '作品未能全部保存，请重试。已保存的页不会重复保存，考察完成状态不受影响。' })
      session.emit({ name: 'report_saved', result: 'failed', reason: denied ? 'permission_denied' : 'save_failed' })
    } finally { this.update({ saving: false }) }
  },
  onOpenAlbumSettings: function () { if (wx.openSetting) wx.openSetting({}) }
})
