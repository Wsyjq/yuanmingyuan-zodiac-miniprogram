// v2「回响」：次日之信。完成考察的次日出信；一次性、无按钮、反结算。
// 状态机：notFinished（未完成考察）→ sealed（当日，明日启封）→ open（次日起）。
const session = require('../../store/session')
const sessionDate = require('../../utils/session-date')

// 运营维护位：马首实况一行（v2 设计 §回信附一样东西）。null = 整段隐藏。
// 示例：'顺便说一句，马首现在不在园子里，它在上海展出，到11月30日。一件东西回了家，又出门了。'
const HORSE_UPDATE = null

Page({
  data: {
    state: 'loading',
    revealed: false,
    paragraphs: []
  },

  onLoad() {
    if (session.getSnapshot()) this.refresh()
    else session.init({}).then(() => this.refresh())
  },

  refresh() {
    const snap = session.getSnapshot() || {}
    const flags = snap.flags || {}
    const todayKey = sessionDate.dateKeyFromTimestamp(Date.now())
    const sessionDay = sessionDate.isValidDateKey(snap.sessionDate) ? snap.sessionDate : todayKey
    const finished = !!(snap.finale || flags.experienceCompletedAt)
    if (!finished) {
      this.setData({ state: 'notFinished' })
      return
    }
    if (!(todayKey > sessionDay)) {
      this.setData({ state: 'sealed' })
      return
    }
    this.setData({ state: 'open', paragraphs: this.buildParagraphs(flags) })
    // 首开记录（幂等）：只写一次，重复进入显示同一封信。
    if (!flags.dailyLetterOpenedAt) {
      session.setFlag('dailyLetterOpenedAt', Date.now()).catch(function () {})
    }
  },

  // 信件正文为飞书 v3 rev5614「彩蛋：离园之后」（次日推送的彩蛋信件）。
  // 「下面我要揭晓了」之后点按钮展开后半（老师现身）；配图 letter-teacher.jpg。
  // HORSE_UPDATE 为运营维护位（null = 隐藏）。
  buildParagraphs(flags) {
    const paras = [
      { text: '昨天，你已经来过西洋楼了' },
      { text: '想必你还不知道那个考察档案究竟是谁人留下的' },
      { text: '下面我要揭晓了：' }
    ]
    if (this.data.revealed) {
      paras.push({ image: '/plate21/module/assets/img/letter-teacher.jpg' })
      paras.push({ text: '是老师！', cls: 'quote' })
      paras.push({ text: '不错，我的这个学生历史系毕业，习惯于历史学的训练思维，总喜欢靠文献研究过去。我啊，总想带着他去现场考察下，可是实在是老迈多病，于是我把年少时候考察的经历一一记下，设成谜题，供我的学生训练，也算是带他去考察了。' })
      paras.push({ text: '关于圆明园西洋楼，还有很多，老夫来不及说也没来得及设计谜题，借此机会，再和你多絮叨几句：' })
      paras.push({ text: '《西洋楼铜版画》二十幅，乾隆四十六年至五十一年由伊兰泰起稿、造办处在北京刻印，共印200份（首版100、加印100），用于赏赐并陈设紫禁城、三山五园及各行宫。现在在含经堂中，就存有这套铜版画，下次再来圆明园，你可以亲自去看看；谐奇趣的翻尾石鱼现在在北京大学未名湖西侧水中。观水法的巴洛克门底座，现在在颐和园仁寿门前。大水法的石鱼一对于2006年11月回归，现存圆明园展览馆。' })
      paras.push({ text: '在这份档案中，只有第一站我通过日记的方式指引他走到了黄花阵，剩下的全靠他自己去想。' })
      paras.push({ text: '我能带他走过第一步，剩下的路还要融会贯通自己走。' })
      paras.push({ text: '老夫日记中写下“丙午年于西洋楼”，想必这小子还要去猜到底是哪个丙午年，其实就是2026年。' })
      paras.push({ text: '这个档案我还会继续流传下去，请你一定要替老夫保密啊，让更多的人去亲自找找第二十一幅画吧。' })
    }
    if (HORSE_UPDATE) paras.push({ text: HORSE_UPDATE, cls: 'aside' })
    return paras
  },

  onReveal() {
    if (this.data.revealed) return
    this.setData({ revealed: true, paragraphs: this.buildParagraphs((session.getSnapshot() || {}).flags || {}) })
  },

  onBack() {
    wx.navigateBack({
      fail: function () { wx.reLaunch({ url: '/pages/index/index' }) }
    })
  },

  // 信末脚注：去读大家的留言（写发生在通关当天 report，回访链路只读）
  onOpenBoard() {
    wx.navigateTo({ url: '/plate21/module/pages/board/board' })
  }
})
