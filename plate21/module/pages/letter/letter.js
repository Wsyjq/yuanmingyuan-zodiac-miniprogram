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

  // 信件正文为 v2 权威稿（docs/feishu-import/第廿一图_v2.md「回响」节，可直接用）。
  // 动态段一：明信片投递块，仅投递过的玩家显示；动态段二：HORSE_UPDATE，运营维护。
  buildParagraphs(flags) {
    const paras = [
      { text: '见字如面。' },
      { text: '先认一件事：序章那行铅笔字，是我写的。卡片是民国的，字不是。' },
      { text: '昨天你走完了那条路。我不知道你是谁，也不知道你走到哪一站的时候停得最久。' },
      { text: '我把档案交出去的时候，其实心里有点没底。那份东西是残的——好几页只画了个土台子，好几处我自己也没查清楚。你在蓄水楼点开深讲层的时候，大概已经发现了：那一栏我是空着的。三种说法摆在那儿，我一种也不敢选。' },
      { text: '我不太确定这样交给你，算不算失职。' },
      { text: '但我后来想明白一件事，是在黄花阵想明白的。' },
      { text: '你摸过那道墙。那道墙是1987年和1989年，有人照着一幅两百年前的画，一块砖一块砖重新砌起来的。他们手上那幅画，就是我一直在找的那套铜版画里的一张。' },
      { text: '所以那件事早就发生过了——有人拿着一幅旧画，把地上的东西补回来了。不是补成原来的样子，原来的样子回不来了。是补成了今天你能走进去的样子。' },
      { text: '那我要找的第二十一幅，大概也不用再找了。' },
      { text: '它不在哪个库房里，也不在哪本目录的第二十一行。它在昨天你走过的那条路上，在你举起来对准残基的那张纸上，在你写完就收起来、没打算给任何人看的那张卡上。', cls: 'quote' }
    ]
    if (flags.messageSubmittedAt) {
      paras.push({ text: '还有一件事想告诉你。' })
      paras.push({ text: '你昨天投进信箱的那张明信片，我读了。', cls: 'quote' })
      paras.push({ text: '我不打算回答你写的那个问题。我也不知道答案。' })
      paras.push({ text: '但我把它放进档案了。下一个来的人，会读到你写的那一句。' })
      paras.push({ text: '就像你昨天读到的那封信，是两百年前一个没来过这儿的人写的。' })
    }
    paras.push({ text: '档案还是残的。不过现在比昨天多了一页。' })
    paras.push({ text: '往后，档案跟着你了。' })
    if (HORSE_UPDATE) paras.push({ text: HORSE_UPDATE, cls: 'aside' })
    paras.push({ text: '——那个还在整理档案的人', cls: 'sign' })
    return paras
  },

  onBack() {
    wx.navigateBack({
      fail: function () { wx.reLaunch({ url: '/pages/index/index' }) }
    })
  }
})
