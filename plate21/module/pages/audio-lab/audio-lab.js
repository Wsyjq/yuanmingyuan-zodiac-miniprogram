const media = require('../../config/media'),
  audio = require('../../services/audio')
Page({
  data: { enabled: false, tracks: [], base: '', sound: {} },
  onLoad() {
    let enabled = false
    try {
      enabled = wx.getAccountInfoSync().miniProgram.envVersion === 'develop'
    } catch (e) {}
    this.setData({
      enabled,
      tracks: enabled ? media.tracks : [],
      base: enabled ? wx.getStorageSync('plate21_dev_media_base') || '' : ''
    })
    this._off = audio.get().subscribe((sound) => this.setData({ sound }))
  },
  onUnload() {
    if (this._off) this._off()
  },
  input(e) {
    this.setData({ base: e.detail.value })
  },
  save() {
    if (!this.data.enabled) return
    const b = this.data.base.trim()
    if (b && !/^https?:\/\/[^\s]+$/.test(b)) {
      wx.showToast({ title: '请填写完整 http(s) 地址', icon: 'none' })
      return
    }
    wx.setStorageSync('plate21_dev_media_base', b)
    wx.showToast({ title: '试听地址已保存', icon: 'none' })
  },
  play(e) {
    if (this.data.enabled)
      audio.get().toggleBgm(media.tracks.find((t) => t.id === e.currentTarget.dataset.id))
  },
  pause() {
    audio.get().toggleBgm()
  },
  volume(e) {
    audio.get().prefs({ volume: e.detail.value / 100 })
  }
})
