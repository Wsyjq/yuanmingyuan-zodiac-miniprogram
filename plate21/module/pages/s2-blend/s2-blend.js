'use strict'

// 第二站 · 谜题3：现场拍摄四处中西结合细节，生成一张考察卡。
// 最低交付只记录玩家实际拍摄结果，不调用或伪造场景识别。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')
const photoPipeline = require('../../utils/photo-pipeline')

const POINTS = [
  {
    key: 'dome',
    no: '01',
    title: '穹顶与飞檐',
    desc: '同时纳入西式穹顶与中式八角飞檐。',
    guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-DOME.jpg'
  },
  {
    key: 'beast',
    no: '02',
    title: '檐角立兽',
    desc: '拍清飞檐角部的小型立式装饰。',
    guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-BEAST.jpg'
  },
  {
    key: 'lotus',
    no: '03',
    title: '莲座宝瓶',
    desc: '记录中式莲座与西洋宝瓶花苞的组合。',
    guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-LOTUS.jpg'
  },
  {
    key: 'swan',
    no: '04',
    title: '双天鹅蝙蝠纹',
    desc: '对准弧形基座，记录双天鹅与蝙蝠纹细节。',
    guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-SWAN.jpg'
  }
]

const HISTORY_LINES = [
  '西学东渐后的皇家审美转译。',
  '西洋楼黄花阵中心亭，西式穹顶与中式八角飞檐并存；',
  '檐角立兽、莲座宝瓶、双天鹅间暗藏的蝙蝠纹——',
  '西方形制与中式吉祥寓意的叠加，是清宫石匠的本土化改造。'
]

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
    historyLines: HISTORY_LINES,
    cardNumber: 2,
    showCardNumber: false,
    done: false,
    readyNext: false,
    advancing: false,
    dateLabel: formatDate()
  },

  onLoad() {
    this._active = true
    session.viewPuzzle('s2-blend')
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
      done: !!completed && !hasNewerDraft && photoCount === POINTS.length,
      dateLabel: draft.dateLabel || sessionDate.formatArchiveDate(snap && snap.sessionDate) || formatDate(),
      cardNumber: Number(session.getCardDigit('s2-blend'))
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
          puzzle: 's2-blend',
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
    if (this.data.photoCount < POINTS.length) {
      session.attemptPuzzle('s2-blend', completeAttempts, false, 'camera')
      wx.showToast({ title: '请先完成四处拍摄', icon: 'none' })
      return Promise.resolve(false)
    }
    if (this.data.done) {
      this.setData({ showRecordCard: true })
      return Promise.resolve(true)
    }
    session.attemptPuzzle('s2-blend', completeAttempts, true, 'camera')

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
    this.setData({ done: true, showRecordCard: true })
    return session.setFlag('s2PhotoRecord', record)
      .then(function () {
        return session.completePuzzle('s2-blend', {
          slots: POINTS.map(function (point) { return point.key }),
          completedAt: record.completedAt
        }, { collectCard: true })
      })
      .then(function () { return true })
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

  onNext() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    this.setData({ showHistory: false })
    session.completePuzzle('s2-blend', { slots: POINTS.map(function (point) { return point.key }) }, {
      collectCard: true,
      checkpoint: 's2-pattern'
    }).then(() => {
      wx.redirectTo({
        url: '/plate21/module/pages/s2-pattern/s2-pattern',
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
