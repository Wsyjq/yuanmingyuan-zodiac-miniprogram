// P16 结尾 / 完结：VID-E01 离场视频（poster 兜底）+ 三段结尾叙事 + 完结卡
// INT-203：接入 <video> 组件骨架，videoSrc 空时 poster 兜底，播放图标可点；
//         进页时 stamp-toast 盖「考察完结」印，作为终章仪式感。
const session = require('../../store/session')
const VIDEO_SRC = ''   // VID-E01 真视频就位后填入路径；空串走 poster 兜底

Page({
  data: {
    videoSrc: VIDEO_SRC,
    skipped: false   // 「跳过」后的播完态
  },

  exitEmitted: false,

  emitExit() {
    if (this.exitEmitted) return
    this.exitEmitted = true
    session.emit({ name: 'module_exit' })
  },

  onReady() {
    // 真视频就位后用于 play()/pause() 控制；poster 兜底期亦可创建（无副作用）
    // 台架（H5）无此 API，try/catch 容错不阻断
    try {
      this.videoContext = wx.createVideoContext('endVideo', this)
    } catch (e) { /* 台架环境静默 */ }
  },

  onShow() {},

  // 播放图标点击：有真视频则播放，无则诚实提示生成中
  onPlay() {
    if (this.data.videoSrc) {
      if (this.videoContext) this.videoContext.play()
    } else {
      wx.showToast({ title: '离场视频生成中，敬请期待', icon: 'none' })
    }
  },

  onSkip() {
    // 「跳过」：若在播则暂停（不跳叙事）；poster 兜底期置 skipped 态
    if (this.data.videoSrc && this.videoContext) this.videoContext.pause()
    this.setData({ skipped: true })
  },

  goHandbook() {
    wx.navigateTo({ url: '/plate21/module/pages/handbook/handbook' })
  },

  // 「返回」：清理模块页栈并直接回宿主首页。
  onBack() {
    this.emitExit()
    wx.reLaunch({ url: '/pages/index/index' })
  },

  // 侧滑/手势退出同样补一条 module_exit
  onUnload() {
    this.emitExit()
  }
})
