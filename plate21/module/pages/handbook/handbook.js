const statusBarBeh = require('../../utils/status-bar')
// P17 考察手册（全局）：进度总览 + 史料卡回看 + 考察报告缩略位
const session = require('../../store/session')
const fieldRecord = require('../../store/field-record')
const achievements = require('../../store/achievements')
const sessionDate = require('../../utils/session-date')
const audioSettings = require('../../utils/audio-settings')
const audioBus = require('../../utils/audio-bus')

// 四份考察记录位（V2.1 对读口径；主线站序=入口→黄花阵→海晏堂→雨果，大水法零对读不占记录位）
const RECORD_SLOTS = [
  { key: 's1', name: '入口 · 拆信对半字' },
  { key: 's2', name: '黄花阵 · 对读四拍' },
  { key: 's3', name: '海晏堂 · 对读三拍' },
  { key: 's4', name: '雨果 · 对年读信' }
]

// 史料卡静态条目（available 按快照站点完成状态推导）
const HISTORY_ITEMS = [
  {
    id: 'huanghuazhen',
    title: '黄花阵 · 中秋灯会',
    source: '圆明园西洋楼景区史料',
    station: 's2',
    lines: [
      '黄花阵，又称万花阵，仿欧洲迷宫而建，阵墙满砌万字不断纹。',
      '中秋之夜，宫女手持黄色彩绸扎成的莲花灯穿行阵中，皇帝登中心亭观赏，先至亭中者得赏。'
    ]
  },
  {
    id: 'haiyantang',
    title: '海晏堂 · 大水法营造史料',
    source: '《西洋楼铜版图·海晏堂》；国家文物局公开资料',
    station: 's3',
    lines: [
      '海晏堂为西洋楼诸景中规模最大的宫殿，阶前设大型喷水池。',
      '常规报时：每个时辰由对应兽首轮流喷水；正午盛景，马首喷水，其余十一兽首一同喷水。',
      '十二生肖兽首中已有 7 尊回归祖国：牛、虎、猴、猪、鼠、兔、马。'
    ]
  },
  {
    id: 'hugo',
    title: '雨果雕像落成记载',
    source: '圆明园管理处档案（2010）',
    station: 's4',
    lines: [
      '2010 年，圆明园罹难 150 周年之际，雨果雕像在西洋楼遗址落成。',
      '雨果在 1861 年的信中写道：「两个强盗闯进了圆明园。一个叫法兰西，一个叫英吉利。」'
    ]
  }
]

// v2 顺路散页：可选站点清单（走过与否按 flags.sideVisited_* 标记，随时可进）。
// 反结算红线：不显示 X/N 完成度——散页只让档案变厚，不做计数催促（V2.1 拍板建议）。
// 大水法已转主线站，散页六处 = 谐奇趣/养雀笼/方外观/蓄水楼/观水法/线法画。
const SIDE_SITES = [
  { key: 'yangquelong', title: '养雀笼', url: '/plate21/module/pages/waypoint/waypoint?site=yangquelong' },
  { key: 'guanshuifa', title: '观水法', url: '/plate21/module/pages/waypoint/waypoint?site=guanshuifa' },
  { key: 'xianfahua', title: '线法画', url: '/plate21/module/pages/waypoint/waypoint?site=xianfahua' }
]

Page({
  behaviors: [statusBarBeh],
  data: {
    slots: [],
    doneCount: 0,
    history: [],
    finaleDone: false,
    letterReady: false,
    name: '',
    sessionDateLabel: '',
    fieldPhotos: fieldRecord.photosFromSnapshot(),
    photoCount: 0,
    achievementList: [],
    achievementCount: 0,
    showHistory: false,
    card: { title: '', source: '', lines: [] },
    sideSites: [],
    audioBgm: true,
    audioVoice: true
  },

  onShow() {
    // V2.2 独立音频开关：进手册即回显当前设备偏好
    const audio = audioSettings.get()
    this.setData({ audioBgm: audio.bgm, audioVoice: audio.voice })
    const snap = session.getSnapshot()
    if (snap) {
      this.renderSnapshot(snap)
    } else {
      // 直达手册（未经封面）：先初始化会话再渲染
      session.init({}).then((s) => this.renderSnapshot(s))
    }
  },

  renderSnapshot(snap) {
    const stations = (snap && snap.stations) || {}
    const fieldPhotos = fieldRecord.photosFromSnapshot(snap)
    const achievementList = achievements.list(snap)
    const slots = RECORD_SLOTS.map((s, index) => ({
      key: s.key,
      name: s.name,
      no: String(index + 1).padStart(2, '0'),
      done: !!stations[s.key]
    }))
    const todayKey = sessionDate.dateKeyFromTimestamp(Date.now())
    const sessionDay = sessionDate.isValidDateKey(snap && snap.sessionDate)
      ? snap.sessionDate
      : todayKey
    const finaleDone = !!(snap && (snap.finale || (snap.flags && snap.flags.collectedReport)))
    const sideFlags = (snap && snap.flags) || {}
    const sideSites = SIDE_SITES.map((s) => ({
      key: s.key,
      title: s.title,
      url: s.url,
      visited: !!sideFlags['sideVisited_' + s.key]
    }))
    this.setData({
      slots,
      doneCount: slots.filter((slot) => slot.done).length,
      history: HISTORY_ITEMS.map((h, index) => ({
        id: h.id,
        no: String(index + 1).padStart(2, '0'),
        title: h.title,
        source: h.source,
        available: !!stations[h.station]
      })),
      finaleDone: finaleDone,
      letterReady: finaleDone && todayKey > sessionDay,
      name: (snap && snap.name) || '',
      sessionDateLabel: sessionDate.formatDateKey(snap && snap.sessionDate),
      fieldPhotos: fieldPhotos,
      photoCount: fieldPhotos.filter(function (photo) { return !!photo.photoPath }).length,
      achievementList: achievementList,
      achievementCount: achievementList.filter(function (item) { return item.unlocked }).length,
      sideSites: sideSites
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

  // v2 回响：次日之信入口
  onOpenLetter() {
    if (!this.data.letterReady) {
      wx.showToast({ title: '明日启封', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/plate21/module/pages/letter/letter' })
  },

  // v2 顺路支线：手册随时可进
  onOpenSide(e) {
    const key = e.currentTarget.dataset.key
    const site = this.data.sideSites.find(function (item) { return item.key === key })
    if (site) wx.navigateTo({ url: site.url })
  },

  // V2.2 独立音频开关：各自独立、即时生效（关=正在播的对应类别立即停）
  onToggleBgm(e) {
    const next = !!(e.detail && e.detail.value)
    this.setData({ audioBgm: next })
    if (!next) audioBus.stopKind('bgm')
    audioSettings.set('bgm', next)
  },

  onToggleVoice(e) {
    const next = !!(e.detail && e.detail.value)
    this.setData({ audioVoice: next })
    if (!next) audioBus.stopKind('voice')
    audioSettings.set('voice', next)
  },

  // 已录史料可点重读：直接弹 history-card
  onReadHistory(e) {
    const idx = e.currentTarget.dataset.index
    const item = this.data.history[idx]
    if (!item || !item.available) return
    const full = HISTORY_ITEMS[idx]
    this.setData({
      card: { title: full.title, source: full.source, lines: full.lines },
      showHistory: true
    })
  },

  onCollectHistory() {
    wx.showToast({ title: '已在考察手册中', icon: 'none' })
    this.setData({ showHistory: false })
  },

  onCloseHistory() {
    this.setData({ showHistory: false })
  }
})
