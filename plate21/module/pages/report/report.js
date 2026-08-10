// P15 考察报告（成果页）：第 21 图成品展示 + 保存相册 + 拓印提示
const session = require('../../store/session')
const fieldRecord = require('../../store/field-record')

function sessionDateText(key) {
  const valid = /^\d{8}$/.test(key || '')
  const d = valid
    ? new Date(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, Number(key.slice(6, 8)))
    : new Date()
  return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日'
}

function editionText(no) {
  return no ? '第 ' + no + ' 版' : '第 — 版'
}

// 离屏画布逻辑尺寸（导出分辨率基准，与屏幕 rpx 无关）
const CW = 700
const CH = 1120

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
    const no = snap.editionNo || null
    const fieldPhotos = fieldRecord.photosFromSnapshot(snap)
    this.setData({
      name: snap.name || '无名氏',
      editionNo: no,
      editionLabel: editionText(no),
      today: sessionDateText(snap.sessionDate),
      collected: !!(snap.flags && snap.flags.collectedReport),
      fieldPhotos: fieldPhotos,
      photoCount: fieldPhotos.filter(function (photo) { return !!photo.photoPath }).length
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
          dpr = info.pixelRatio || 2
        } catch (e) { /* 用默认 dpr */ }
        canvas.width = CW * dpr
        canvas.height = CH * dpr
        ctx.scale(dpr, dpr)
        // INT-201：异步绘制（含 IMG-F06 真图加载），完成后再导出
        try {
          await this.drawReport(ctx, canvas)
        } catch (e) {
          // 图片加载失败时 drawReport 内部已 fallback 色块，不阻断
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
  drawReport(ctx, canvas) {
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
    ctx.fillText('前二十幅记录建成，此幅记录毁灭之后', CW / 2, 134)
    ctx.fillText('——被修复，被注视，被重新看见。', CW / 2, 156)

    const loadImage = (src) => new Promise((resolve) => {
      if (!src || !canvas || typeof canvas.createImage !== 'function') return resolve(null)
      const img = canvas.createImage()
      img.onload = function () { resolve(img) }
      img.onerror = function () { resolve(null) }
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

    const sources = ['/plate21/module/assets/img/IMG-F06.jpg'].concat(
      this.data.fieldPhotos.map(function (photo) { return photo.photoPath })
    )
    return Promise.all(sources.map(loadImage)).then((images) => {
      const main = images[0]
      if (main) ctx.drawImage(main, 70, 190, 560, 400)
      else drawPlaceholder(ctx, 70, 190, 560, 400, '第二十一图')

      // L2 边框（虚线矩形）
      ctx.strokeStyle = '#A98F5F'
      ctx.lineWidth = 2
      ctx.strokeRect(60, 180, CW - 120, 420)
      ctx.lineWidth = 1
      ctx.strokeRect(70, 190, CW - 140, 400)

      // L5 落款 + 署名
      ctx.textAlign = 'right'
      ctx.fillStyle = '#46382A'
      ctx.font = '18px STKaiti, KaiTi, serif'
      ctx.fillText('1747 —— 今日', CW - 82, 540)
      ctx.fillStyle = '#A63A2E'
      ctx.font = '22px STKaiti, KaiTi, serif'
      ctx.fillText(name, CW - 82, 572)

      ctx.textAlign = 'left'
      ctx.fillStyle = '#46382A'
      ctx.font = '700 20px STSong, SimSun, serif'
      ctx.fillText('现场四图考察记录', 60, 642)
      ctx.fillStyle = '#8A7A60'
      ctx.font = '12px sans-serif'
      ctx.fillText('以下均为考察者现场拍摄', 60, 664)

      const photoW = 278
      const photoH = 145
      this.data.fieldPhotos.forEach(function (photo, index) {
        const x = 60 + (index % 2) * 302
        const y = 684 + Math.floor(index / 2) * 184
        const image = images[index + 1]
        if (image) ctx.drawImage(image, x, y, photoW, photoH)
        else drawPlaceholder(ctx, x, y, photoW, photoH, '待补录')
        ctx.strokeStyle = '#A98F5F'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, photoW, photoH)
        ctx.fillStyle = '#46382A'
        ctx.textAlign = 'left'
        ctx.font = '13px sans-serif'
        ctx.fillText(photo.no + '  ' + photo.title, x, y + photoH + 20)
      })

      // 底部著录行：日期 + 版本号
      ctx.textAlign = 'center'
      ctx.fillStyle = '#8A7A60'
      ctx.font = '14px sans-serif'
      ctx.fillText('绘制时间：' + this.data.today + '    ' + this.data.editionLabel, CW / 2, 1078)
    })
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

  onContinue() {
    wx.redirectTo({ url: '/plate21/module/pages/ending/ending' })
  }
})
