'use strict'

// 第二站 · 黄花阵 对读三：亭子线稿对眼前这座亭（V2.1 可用稿）。
// 举线稿对照，用手机拍下中西混作的细节——找到一处即算；四处细目都拍，记录更厚。
// 最低交付只记录玩家实际拍摄结果，不调用或伪造场景识别。
// 文案与点位单点在 content/s2-blend.js。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')
const photoPipeline = require('../../utils/photo-pipeline')
const audioSrc = require('../../utils/audio-src')
const content = require('../../content/s2-blend')

const POINTS = content.points
const PUZZLE = content.puzzleId

function formatDate(timestamp) {
  return sessionDate.formatArchiveDate(sessionDate.dateKeyFromTimestamp(timestamp || Date.now()))
}

function buildPoints(photos, capturedAtBySlot) {
  const saved = photos || {}
  const capturedAt = capturedAtBySlot || {}
  return POINTS.map(function (point) {
    return Object.assign({}, point, {
      photoPath: saved[point.key] || '',
      capturedAt: Number(capturedAt[point.key]) || 0
    })
  })
}

function photoMap(points) {
  return (points || []).reduce(function (result, point) {
    if (point.photoPath) result[point.key] = point.photoPath
    return result
  }, {})
}

function keepPhoto(tempFilePath) {
  if (!wx.saveFile) return Promise.resolve({ path: tempFilePath, persisted: false })
  return new Promise(function (resolve) {
    wx.saveFile({
      tempFilePath: tempFilePath,
      success: function (res) {
        resolve({ path: res.savedFilePath || tempFilePath, persisted: !!res.savedFilePath })
      },
      fail: function () {
        resolve({ path: tempFilePath, persisted: false })
      }
    })
  })
}

Page({
  data: {
    points: buildPoints(),
    photoCount: 0,
    completeAttempts: 0,
    busyKey: '',
    captureError: '',
    persistenceWarning: '',
    showRecordCard: false,
    showHistory: false,
    historyLines: content.historyLines,
    cardNumber: 2,
    showCardNumber: false,
    done: false,
    readyNext: false,
    advancing: false,
    dateLabel: formatDate(),
    narrSrc: audioSrc.clip(content.clips.main)
  },

  onLoad() {
    this._active = true
    session.viewPuzzle(PUZZLE)
    const snap = session.getSnapshot()
    if (snap) {
      this.restoreFromSnapshot(snap)
    } else {
      session.init({}).then((next) => {
        if (this._active) this.restoreFromSnapshot(next)
      })
    }
  },

  restoreFromSnapshot(snap) {
    const flags = (snap && snap.flags) || {}
    const completed = flags.s2PhotoRecord
    const savedDraft = flags.s2PhotoDraft
    const hasNewerDraft = !!(completed && savedDraft &&
      (Number(savedDraft.revision) || 0) > (Number(completed.draftRevision) || 0))
    const draft = hasNewerDraft ? savedDraft : (completed || savedDraft || {})
    const points = buildPoints(draft.photos, draft.capturedAt)
    const photoCount = Object.keys(photoMap(points)).length
    this.setData({
      points: points,
      photoCount: photoCount,
      done: !!completed && !hasNewerDraft && photoCount >= 1,
      dateLabel: draft.dateLabel || sessionDate.formatArchiveDate(snap && snap.sessionDate) || formatDate(),
      cardNumber: Number(session.getCardDigit(PUZZLE))
    })
  },

  onCapture(e) {
    return this.choosePhoto(e.currentTarget.dataset.key, ['camera'])
  },

  onStageTap(e) {
    const key = e.currentTarget.dataset.key
    const point = this.data.points.find(function (item) { return item.key === key })
    return point && point.photoPath ? this.onPreview(e) : this.onCapture(e)
  },

  onChooseAlbum(e) {
    return this.choosePhoto(e.currentTarget.dataset.key, ['album'])
  },

  choosePhoto(key, sourceType) {
    if (!key || this.data.busyKey) return Promise.resolve(false)
    const previousPoints = this.data.points.map(function (point) { return Object.assign({}, point) })
    let savedFile = null
    let oldPath = ''
    let oldLocalPath = ''
    this.setData({ busyKey: key, captureError: '', persistenceWarning: '' })

    const selection = new Promise(function (resolve, reject) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: sourceType,
        sizeType: ['compressed'],
        success: resolve,
        fail: reject
      })
    })

    return selection.then((res) => {
      const file = res && res.tempFiles && res.tempFiles[0]
      if (!file || !file.tempFilePath) throw new Error('empty_media')
      return photoPipeline.normalizePhoto(file.tempFilePath, {
        fileSize: file.size,
        onFallback: function (reason) {
          session.capabilityFallback('photo_normalize', reason)
        }
      }).then(function (normalized) {
        return keepPhoto(normalized.path).then(function (saved) {
          saved.normalization = normalized
          return saved
        })
      })
    }).then((saved) => {
      savedFile = saved
      if (!this._active) throw new Error('page_unloaded')
      const capturedAt = Date.now()
      const oldPoint = this.data.points.find(function (point) { return point.key === key })
      oldPath = oldPoint && oldPoint.photoPath || ''
      const currentSnapshot = session.getSnapshot()
      const currentFlags = currentSnapshot && currentSnapshot.flags || {}
      const currentRecord = currentFlags.s2PhotoDraft || currentFlags.s2PhotoRecord || {}
      oldLocalPath = currentRecord.localPhotos && currentRecord.localPhotos[key] ||
        (!/^https?:\/\//i.test(oldPath) ? oldPath : '')
      const points = this.data.points.map(function (point) {
        return point.key === key
          ? Object.assign({}, point, { photoPath: saved.path, capturedAt: capturedAt })
          : point
      })
      const photos = photoMap(points)
      this.setData({
        points: points,
        photoCount: Object.keys(photos).length,
        busyKey: '',
        done: false,
        persistenceWarning: saved.persisted ? '' : '照片已记录，但本地持久化失败；请在离开本页前完成考察卡。'
      })
      if (!saved.persisted) session.capabilityFallback('saveFile', 'local_persistence_failed')

      return session.saveMedia({
        type: 'photo',
        image: { filePath: saved.path },
        meta: {
          puzzle: PUZZLE,
          slot: key,
          width: saved.normalization.width,
          height: saved.normalization.height,
          bytes: saved.normalization.bytes,
          normalization: saved.normalization.strategy
        }
      }).then((media) => {
        const snap = session.getSnapshot()
        const flags = (snap && snap.flags) || {}
        const previous = flags.s2PhotoDraft || flags.s2PhotoRecord || {}
        const persistedPhotos = Object.assign({}, previous.photos || {})
        const localPhotos = Object.assign({}, previous.localPhotos || {})
        const mediaIds = Object.assign({}, previous.mediaIds || {})
        const capturedAtBySlot = Object.assign({}, previous.capturedAt || {})
        persistedPhotos[key] = media && media.url ? media.url : saved.path
        localPhotos[key] = saved.path
        delete mediaIds[key]
        if (media && media.mediaId) mediaIds[key] = media.mediaId
        capturedAtBySlot[key] = capturedAt
        return session.setFlag('s2PhotoDraft', {
          version: 1,
          revision: Math.max(Number(previous.revision) || 0, Number(previous.draftRevision) || 0) + 1,
          photos: persistedPhotos,
          localPhotos: localPhotos,
          mediaIds: mediaIds,
          capturedAt: capturedAtBySlot,
          dateLabel: this.data.dateLabel,
          updatedAt: Date.now()
        })
      }).then(function () {
        if (oldLocalPath && oldLocalPath !== saved.path && !/^https?:\/\//i.test(oldLocalPath) && wx.removeSavedFile) {
          wx.removeSavedFile({ filePath: oldLocalPath, fail: function () {} })
        }
        return true
      })
    }).catch((error) => {
      const message = String(error && error.errMsg || error && error.message || '')
      if (savedFile && savedFile.persisted && savedFile.path !== oldPath && wx.removeSavedFile) {
        wx.removeSavedFile({ filePath: savedFile.path, fail: function () {} })
      }
      if (message === 'page_unloaded') return false
      const denied = /auth deny|auth denied|authorize no response/.test(message)
      const cancelled = /cancel/.test(message)
      if (denied) session.capabilityFallback('camera_or_album', 'permission_denied')
      else if (!cancelled) session.capabilityFallback('camera_or_album', 'media_selection_failed')
      this.setData({
        points: savedFile ? previousPoints : this.data.points,
        photoCount: savedFile ? Object.keys(photoMap(previousPoints)).length : this.data.photoCount,
        busyKey: '',
        captureError: cancelled
          ? ''
          : denied
            ? '未获得相机或相册权限，请打开设置后重试。'
            : '没有取得照片，请重新拍摄或从相册补录。'
      })
      return false
    })
  },

  onOpenSettings() {
    if (wx.openSetting) wx.openSetting({})
  },

  onPreview(e) {
    const key = e.currentTarget.dataset.key
    const current = this.data.points.find(function (point) { return point.key === key })
    const urls = this.data.points.map(function (point) { return point.photoPath }).filter(Boolean)
    if (!current || !current.photoPath || !urls.length) return
    wx.previewImage({ current: current.photoPath, urls: urls })
  },

  onComplete() {
    const completeAttempts = this.data.completeAttempts + 1
    this.setData({ completeAttempts: completeAttempts })
    // V2.1：观察＋拍照，产品不判图——拍到一处即算，四处更厚。
    if (this.data.photoCount < 1) {
      session.attemptPuzzle(PUZZLE, completeAttempts, false, 'camera')
      wx.showToast({ title: '至少拍下一处细节', icon: 'none' })
      return Promise.resolve(false)
    }
    if (this.data.done) {
      this.onNext()
      return Promise.resolve(true)
    }
    session.attemptPuzzle(PUZZLE, completeAttempts, true, 'camera')

    const snap = session.getSnapshot()
    const draft = snap && snap.flags && snap.flags.s2PhotoDraft
    const record = {
      version: 1,
      photos: draft && draft.photos ? draft.photos : photoMap(this.data.points),
      localPhotos: draft && draft.localPhotos ? draft.localPhotos : photoMap(this.data.points),
      mediaIds: draft && draft.mediaIds ? draft.mediaIds : {},
      capturedAt: draft && draft.capturedAt
        ? draft.capturedAt
        : this.data.points.reduce(function (result, point) {
            if (point.capturedAt) result[point.key] = point.capturedAt
            return result
          }, {}),
      draftRevision: Number(draft && draft.revision) || 0,
      dateLabel: this.data.dateLabel,
      completedAt: Date.now()
    }
    this.setData({ done: true })
    return session.setFlag('s2PhotoRecord', record)
      .then(function () {
        return session.completePuzzle(PUZZLE, {
          slots: POINTS.map(function (point) { return point.key }),
          completedAt: record.completedAt
        }, { collectCard: true })
      })
      .then(() => {
        this.onNext()
        return true
      })
      .catch((error) => {
        console.warn('[s2-blend] 四图考察卡进度保存失败', error && error.message)
        this.setData({ done: false, showRecordCard: false, captureError: '考察卡保存失败，请重新生成。' })
        return false
      })
  },

  onCloseRecord() {
    this.setData({ showRecordCard: false })
  },

  noop() {},

  onAcceptRecord() {
    this.setData({
      showRecordCard: false,
      showHistory: true,
      showCardNumber: true
    })
  },

  onCloseHistory() {
    this.setData({ showHistory: false, readyNext: this.data.done })
  },

  onSkipShot() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle(PUZZLE, { action: 'skipped' }, {
      checkpoint: content.next.checkpoint
    }).then(() => {
      wx.redirectTo({
        url: content.next.url,
        fail: () => this.setData({ advancing: false })
      })
    }).catch(() => this.setData({ advancing: false }))
  },

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    this.setData({ showHistory: false })
    session.completePuzzle(PUZZLE, { slots: POINTS.map(function (point) { return point.key }) }, {
      collectCard: true,
      checkpoint: content.next.checkpoint
    }).then(() => {
      wx.redirectTo({
        url: content.next.url,
        fail: () => this.setData({ advancing: false })
      })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  },

  onUnload() {
    this._active = false
  }
})
