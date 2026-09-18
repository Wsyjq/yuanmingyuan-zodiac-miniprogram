// P15 考察报告（成果页）：第 21 图成品展示 + 保存相册 + 拓印提示
const session = require('../../store/session')
const fieldRecord = require('../../store/field-record')
const sessionDate = require('../../utils/session-date')

function editionText(no) {
  return no ? '第 ' + no + ' 版' : '第 — 版'
}

// 离屏画布逻辑尺寸（导出分辨率基准，与屏幕 rpx 无关）
const CW = 700
const CH = 1120
const REPORT_PLATE_SRC = '/plate21/module/assets/img/IMG-RUNTIME-PLATE.jpg'

Page({
  data: {
    name: '',
    editionNo: null,
    editionLabel: '第 — 版',
    today: '',
    showRubbing: false,
    saving: false,
    saveError: '',
    canOpenAlbumSettings: false,
    collected: false,
    completed: false,
    completing: false,
    finale: false,
    letterReady: false,
    boardSubmitted: false,
    messageText: '',
    messageConsent: true,
    messageSubmitted: false,
    submittedText: '',
    messageSubmitting: false,
    fieldPhotos: fieldRecord.photosFromSnapshot(),
    photoCount: 0
  },

  onLoad() {
    if (session.getSnapshot()) this.refreshSnapshot()
    else session.init({}).then(() => this.refreshSnapshot())
  },

  onShow() {
    if (session.getSnapshot()) this.refreshSnapshot()
  },

  refreshSnapshot() {
    const snap = session.getSnapshot() || {}
    const flags = snap.flags || {}
    const no = snap.editionNo || null
    const fieldPhotos = fieldRecord.photosFromSnapshot(snap)
    const todayKey = sessionDate.dateKeyFromTimestamp(Date.now())
    const sessionDay = sessionDate.isValidDateKey(snap.sessionDate) ? snap.sessionDate : todayKey
    const finale = !!snap.finale
    this.setData({
      name: snap.name || '无名氏',
      editionNo: no,
      editionLabel: editionText(no),
      today: sessionDate.formatDateKey(snap.sessionDate),
      collected: !!flags.collectedReport,
      completed: !!flags.experienceCompletedAt,
      fieldPhotos: fieldPhotos,
      photoCount: fieldPhotos.filter(function (photo) { return !!photo.photoPath }).length,
      finale: finale,
      letterReady: (finale || !!flags.experienceCompletedAt) && todayKey > sessionDay,
      boardSubmitted: !!flags.boardSubmittedAt,
      messageSubmitted: !!flags.messageSubmittedAt,
      submittedText: flags.messageDraft || '',
      messageText: flags.messageDraft || ''
    })
  },

  onPreviewPhoto(e) {
    const key = e.currentTarget.dataset.key
    const current = this.data.fieldPhotos.find(function (photo) { return photo.key === key })
    const urls = this.data.fieldPhotos.map(function (photo) { return photo.photoPath }).filter(Boolean)
    if (current && current.photoPath && urls.length) {
      wx.previewImage({ current: current.photoPath, urls: urls })
    }
  },

  onRepairPhotos() {
    wx.navigateTo({ url: '/plate21/module/pages/s2-blend/s2-blend?mode=repair' })
  },

  // 「保存到相册」：canvas 离屏合成 → 导出 → 存相册（权限被拒仅 toast）
  onSave() {
    if (this.data.saving) return
    this.setData({ saving: true, saveError: '', canOpenAlbumSettings: false })
    wx.createSelectorQuery().in(this)
      .select('#reportCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setSaveFailure('canvas_unavailable')
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        let dpr = 2
        try {
          const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
          dpr = Math.min(2, Math.max(1, Number(info.pixelRatio) || 1))
        } catch (e) { /* 用默认 dpr */ }
        canvas.width = CW * dpr
        canvas.height = CH * dpr
        ctx.scale(dpr, dpr)
        // INT-201：异步载入玩家现场照片，完成后再导出。
        try {
          await this.drawReport(ctx, canvas)
        } catch (e) {
          // 照片加载失败时 drawReport 内部使用待补录色块，不阻断。
          console.warn('[report] drawReport warning', e && e.message)
        }
        wx.canvasToTempFilePath({
          canvas: canvas,
          success: (r) => {
            wx.saveImageToPhotosAlbum({
              filePath: r.tempFilePath,
              success: () => {
                this.setData({ saving: false, saveError: '', canOpenAlbumSettings: false })
                wx.showToast({ title: '已保存到相册', icon: 'none' })
                session.saveMedia({ type: 'report', image: { filePath: r.tempFilePath }, meta: { editionNo: this.data.editionNo } })
                session.emit({ name: 'report_saved', destination: 'album', success: true, editionNo: this.data.editionNo })
              },
              fail: (error) => this.setSaveFailure('album', error)
            })
          },
          fail: (error) => this.setSaveFailure('canvas_export', error)
        })
      })
  },

  setSaveFailure(stage, error) {
    const message = String(error && error.errMsg || error && error.message || '')
    const denied = /auth deny|auth denied|authorize|permission/i.test(message)
    const cancelled = /cancel/i.test(message)
    const saveError = denied
      ? '没有相册写入权限。可打开设置授权后再次保存。'
      : cancelled
        ? '已取消保存，报告仍保留在小程序中。'
        : stage === 'canvas_unavailable'
          ? '当前设备无法创建报告画布，请稍后重试或截屏留存。'
          : '报告导出失败，请稍后重试。'
    this.setData({ saving: false, saveError: saveError, canOpenAlbumSettings: denied })
    session.emit({
      name: 'report_saved',
      destination: 'album',
      success: false,
      failureReason: denied ? 'permission_denied' : cancelled ? 'cancelled' : stage
    })
    wx.showToast({ title: cancelled ? '已取消保存' : '报告未保存', icon: 'none' })
  },

  onOpenAlbumSettings() {
    if (wx.openSetting) wx.openSetting({})
  },

  // 离屏绘制：第二十一图、玩家四张现场照片、题跋和著录信息。
  async drawReport(ctx, canvas) {
    const name = this.data.name
    // 旧纸底
    ctx.fillStyle = '#F4EDDC'
    ctx.fillRect(0, 0, CW, CH)
    // 万字纹画框（双线）
    ctx.strokeStyle = '#46382A'
    ctx.lineWidth = 3
    ctx.strokeRect(20, 20, CW - 40, CH - 40)
    ctx.lineWidth = 1
    ctx.strokeRect(32, 32, CW - 64, CH - 64)
    // 画题
    ctx.fillStyle = '#46382A'
    ctx.textAlign = 'center'
    ctx.font = '700 30px STSong, SimSun, serif'
    ctx.fillText('西洋楼铜版图·第二十一图', CW / 2, 84)
    // L1 题跋横条
    ctx.fillStyle = '#EBE1CB'
    ctx.strokeStyle = '#46382A'
    ctx.lineWidth = 1
    ctx.fillRect(50, 110, CW - 100, 60)
    ctx.strokeRect(50, 110, CW - 100, 60)
    ctx.fillStyle = '#46382A'
    ctx.font = '15px STKaiti, KaiTi, serif'
    ctx.fillText('前二十幅记录建成，此幅记录后来', CW / 2, 134)
    ctx.fillText('——刻版人的线，砌墙人的照片，你的勾。', CW / 2, 156)

    const loadImage = (src) => new Promise((resolve) => {
      if (!src || !canvas || typeof canvas.createImage !== 'function') return resolve(null)
      const img = canvas.createImage()
      img.onload = function () {
        img.onload = null
        img.onerror = null
        resolve(img)
      }
      img.onerror = function () {
        img.onload = null
        img.onerror = null
        resolve(null)
      }
      img.src = src
    })

    function drawPlaceholder(c, x, y, w, h, label) {
      if (c.setLineDash) c.setLineDash([6, 4])
      c.fillStyle = '#EBE1CB'
      c.strokeStyle = '#C0B49A'
      c.lineWidth = 1.5
      c.fillRect(x, y, w, h)
      c.strokeRect(x, y, w, h)
      if (c.setLineDash) c.setLineDash([])
      c.fillStyle = '#8A7A60'
      c.textAlign = 'center'
      c.font = '13px sans-serif'
      c.fillText(label, x + w / 2, y + h / 2 + 5)
    }

    function drawArchivePlate(c, x, y, w, h) {
      c.save()
      c.translate(x, y)
      c.scale(w / 560, h / 400)
      c.fillStyle = '#E8DABD'
      c.fillRect(0, 0, 560, 400)

      c.strokeStyle = 'rgba(70,56,42,0.18)'
      c.lineWidth = 1
      for (let line = -300; line < 700; line += 22) {
        c.beginPath()
        c.moveTo(line, 0)
        c.lineTo(line + 300, 400)
        c.stroke()
      }

      c.strokeStyle = '#46382A'
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(90, 170)
      c.bezierCurveTo(145, 65, 415, 65, 470, 170)
      c.stroke()
      c.strokeRect(70, 168, 420, 150)

      ;[145, 280, 415].forEach(function (center) {
        c.beginPath()
        c.arc(center, 245, 48, Math.PI, 0)
        c.lineTo(center + 48, 306)
        c.lineTo(center - 48, 306)
        c.closePath()
        c.stroke()
      })

      c.strokeStyle = '#4A6B64'
      c.lineWidth = 2
      ;[-1, 0, 1].forEach(function (offset) {
        c.beginPath()
        c.moveTo(280, 292)
        c.lineTo(280 + offset * 52, 350)
        c.stroke()
      })
      c.strokeStyle = '#46382A'
      c.strokeRect(155, 344, 250, 30)

      c.strokeStyle = 'rgba(166,58,46,0.5)'
      c.lineWidth = 2
      c.beginPath()
      c.arc(475, 65, 31, 0, Math.PI * 2)
      c.stroke()
      c.fillStyle = 'rgba(70,56,42,0.62)'
      c.font = '28px Times New Roman, serif'
      c.textAlign = 'left'
      c.fillText('XXI', 36, 58)
      c.restore()
    }

    function drawCover(c, image, x, y, width, height) {
      const imageWidth = Number(image && (image.naturalWidth || image.width)) || 0
      const imageHeight = Number(image && (image.naturalHeight || image.height)) || 0
      if (!imageWidth || !imageHeight) {
        c.drawImage(image, x, y, width, height)
        return
      }
      const targetRatio = width / height
      const sourceRatio = imageWidth / imageHeight
      let sourceX = 0
      let sourceY = 0
      let sourceWidth = imageWidth
      let sourceHeight = imageHeight
      if (sourceRatio > targetRatio) {
        sourceWidth = imageHeight * targetRatio
        sourceX = (imageWidth - sourceWidth) / 2
      } else {
        sourceHeight = imageWidth / targetRatio
        sourceY = (imageHeight - sourceHeight) / 2
      }
      c.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
    }

    function drawContain(c, image, x, y, width, height) {
      const imageWidth = Number(image && (image.naturalWidth || image.width)) || 0
      const imageHeight = Number(image && (image.naturalHeight || image.height)) || 0
      if (!imageWidth || !imageHeight) {
        c.drawImage(image, x, y, width, height)
        return
      }
      const scale = Math.min(width / imageWidth, height / imageHeight)
      const drawWidth = imageWidth * scale
      const drawHeight = imageHeight * scale
      c.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
    }

    let plateImage = await loadImage(REPORT_PLATE_SRC)
    if (plateImage) drawContain(ctx, plateImage, 70, 190, 560, 400)
    else drawArchivePlate(ctx, 70, 190, 560, 400)
    plateImage = null
    // L2 边框（虚线矩形）
    ctx.strokeStyle = '#A98F5F'
    ctx.lineWidth = 2
    ctx.strokeRect(60, 180, CW - 120, 420)
    ctx.lineWidth = 1
    ctx.strokeRect(70, 190, CW - 140, 400)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#46382A'
    ctx.font = '700 20px STSong, SimSun, serif'
    ctx.fillText('现场四图考察记录', 60, 642)
    ctx.fillStyle = '#8A7A60'
    ctx.font = '12px sans-serif'
    ctx.fillText('以下均为考察者现场拍摄', 60, 664)

    const photoW = 278
    const photoH = 145
    for (let index = 0; index < this.data.fieldPhotos.length; index += 1) {
      const photo = this.data.fieldPhotos[index]
      const x = 60 + (index % 2) * 302
      const y = 684 + Math.floor(index / 2) * 184
      let image = await loadImage(photo.photoPath)
      if (image) drawCover(ctx, image, x, y, photoW, photoH)
      else drawPlaceholder(ctx, x, y, photoW, photoH, '待补录')
      image = null
      ctx.strokeStyle = '#A98F5F'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, photoW, photoH)
      ctx.fillStyle = '#46382A'
      ctx.textAlign = 'left'
      ctx.font = '13px sans-serif'
      ctx.fillText(photo.no + '  ' + photo.title, x, y + photoH + 20)
    }

    // L5 落款 + 署名在照片解码结束后绘制，避免异步图像覆盖著录信息。
    ctx.textAlign = 'right'
    ctx.fillStyle = '#46382A'
    ctx.font = '18px STKaiti, KaiTi, serif'
    ctx.fillText('1747 —— 本次考察', CW - 82, 540)
    ctx.fillStyle = '#A63A2E'
    ctx.font = '22px STKaiti, KaiTi, serif'
    ctx.fillText(name, CW - 82, 572)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#8A7A60'
    ctx.font = '14px sans-serif'
    ctx.fillText('绘制时间：' + this.data.today + '    ' + this.data.editionLabel, CW / 2, 1078)
  },

  // 「收入考察手册」INT-202：真正写入 session，handbook 据此显示缩略
  onCollect() {
    if (this.data.collected) return
    session.setFlag('collectedReport', true).then(() => {
      this.setData({ collected: true })
      wx.showToast({ title: '已收入考察手册', icon: 'none' })
    }).catch(function () { wx.showToast({ title: '收入失败，请重试', icon: 'none' }) })
  },

  // 「拓印提示」：轻提示条 + 剧情文字
  onRubbingHint() {
    this.setData({ showRubbing: true })
  },

  onOpenHandbook() {
    wx.navigateTo({ url: '/plate21/module/pages/handbook/handbook' })
  },

  // —— v2 回响区：明信片投递（开放题不评判，仅落档）——
  onMessageInput(e) {
    this.setData({ messageText: e.detail.value })
  },

  onConsentToggle() {
    this.setData({ messageConsent: !this.data.messageConsent })
  },

  onSubmitMessage() {
    const text = (this.data.messageText || '').trim()
    if (!text) {
      wx.showToast({ title: '写下那句话，再投进信箱', icon: 'none' })
      return
    }
    if (this.data.messageSubmitting) return
    this.setData({ messageSubmitting: true })
    session.setFlag('messageDraft', text)
      .then(() => session.setFlag('messageConsentAnonymous', this.data.messageConsent))
      .then(() => session.setFlag('messageSubmittedAt', Date.now()))
      .then(() => {
        this.setData({ messageSubmitting: false, messageSubmitted: true, submittedText: text })
        wx.showToast({ title: '已投进信箱', icon: 'none' })
      })
      .catch(() => {
        this.setData({ messageSubmitting: false })
        wx.showToast({ title: '投递失败，请重试', icon: 'none' })
      })
  },

  onEditMessage() {
    this.setData({ messageSubmitted: false, messageText: this.data.submittedText })
  },

  onOpenLetter() {
    if (!this.data.letterReady) {
      wx.showToast({ title: '明日启封', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/plate21/module/pages/letter/letter' })
  },

  // 留言簿：通关当天剧情末尾的「写」入口（次日回访链路只负责读）
  onOpenBoard() {
    wx.navigateTo({ url: '/plate21/module/pages/board/board' })
  },

  onFinish() {
    if (this.data.completing) return
    this.setData({ completing: true })
    session.completeExperience().then(() => {
      session.emit({ name: 'module_exit' })
      wx.reLaunch({
        url: '/pages/index/index',
        fail: () => this.setData({ completing: false })
      })
    }).catch(() => {
      this.setData({ completing: false })
      wx.showToast({ title: '完成状态保存失败，请重试', icon: 'none' })
    })
  }
})
