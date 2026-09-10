// P17 考察手册（全局）：进度总览 + 史料卡回看 + 考察报告缩略位
const session = require('../../store/session')
const echoDomain=require('../../domain/experience'),runtime=require('../../config/runtime')
const fieldRecord = require('../../store/field-record')
const achievements = require('../../store/achievements')
const sessionDate = require('../../utils/session-date')

// 四份考察记录位（采风修订版四站结构）
const RECORD_SLOTS = [
  { key: 's1', name: '拆信封破译' },
  { key: 's2', name: '黄花阵考察' },
  { key: 's3', name: '兽首与水显' },
  { key: 's4', name: '时间轴与密码' }
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

// v2 顺路支线：可选站点清单（走过与否按 flags.sideVisited_* 统计，随时可进）
const SIDE_SITES = [
  { key: 'xieqiqu', title: '谐奇趣', url: '/plate21/module/pages/waypoint/waypoint?site=xieqiqu' },
  { key: 'yangquelong', title: '养雀笼', url: '/plate21/module/pages/waypoint/waypoint?site=yangquelong' },
  { key: 'fangwaiguan', title: '方外观', url: '/plate21/module/pages/waypoint/waypoint?site=fangwaiguan' },
  { key: 'xushuilou', title: '蓄水楼', url: '/plate21/module/pages/waypoint/waypoint?site=xushuilou' },
  { key: 'dashuifa', title: '大水法 · 留白', url: '/plate21/module/pages/dashuifa/dashuifa' },
  { key: 'xianfahua', title: '线法画', url: '/plate21/module/pages/waypoint/waypoint?site=xianfahua' }
]

Page({
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
    sideVisitedCount: 0
  },

  onLibrary() { wx.navigateTo({url:"/plate21/module/pages/library/library"}) },

  onShow() {
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
      letterReady: !!echoDomain.unlockAt((snap.flags||{}).experienceCompletedAt,runtime.echoUnlockHour) && Date.now()>=echoDomain.unlockAt((snap.flags||{}).experienceCompletedAt,runtime.echoUnlockHour),
      name: (snap && snap.name) || '',
      sessionDateLabel: sessionDate.formatDateKey(snap && snap.sessionDate),
      fieldPhotos: fieldPhotos,
      photoCount: fieldPhotos.filter(function (photo) { return !!photo.photoPath }).length,
      achievementList: achievementList,
      achievementCount: achievementList.filter(function (item) { return item.unlocked }).length,
      sideSites: sideSites,
      sideVisitedCount: sideSites.filter(function (item) { return item.visited }).length
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
  onOpenLetter() { wx.navigateTo({url:'/plate21/module/pages/echo/echo'}) },

  // v2 顺路支线：手册随时可进
  onOpenSide(e) {
    const key = e.currentTarget.dataset.key
    const site = this.data.sideSites.find(function (item) { return item.key === key })
    if (site) wx.navigateTo({ url: site.url })
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
