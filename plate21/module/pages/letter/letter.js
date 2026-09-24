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
    paragraphs: [],
    prevNote: '',
    leaveText: '',
    wish: '',
    leftAck: ''
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

  // 信件正文为《第廿一图v3》Word「彩蛋：离园之后」。
  // 先见两句，点开后才是老师的信；配图 letter-teacher.jpg。
  buildParagraphs() {
    const paras = [
      { text: '昨天，你已经走完了西洋楼。' },
      { text: '但昨天，还有一件事没有告诉你。' }
    ]
    if (this.data.revealed) {
      paras.push({ image: '/assets/fig/letter-teacher.jpg' })
      ;[
        '不错，这份档案，最初确实是我留下的。',
        '我那个学生是历史系出身，受惯了历史学的训练，碰见什么问题，总想着先翻文献、查目录、找出处。我一直想带他真正去现场走一趟——有些东西，坐在书桌前是看不出来的。只是那几年我身体已经不大好了，实在没办法陪着他从头走到尾。',
        '所以我想了个办法。我把年轻时在西洋楼考察时看过的、想过的东西重新整理出来，又故意添上了一些线索，做成这只档案袋。那张写着“闻有第二十一图，未见”的纸片，那本故作神秘的旧日记，还有一路上的地图、谜题和提示——都是我安排的。',
        '我知道他一定会上钩。果然，他带着这只档案袋去了西洋楼。不过，有件事后来连我自己也没有想到。后来，又有人拿着它走了一遍。再后来，又有了第三个人、第四个人……',
        '每个人寻找的都是同一幅“第二十一图”，走过的也是差不多的一条路，可最后留下来的东西却都不一样。有人记住了黄花阵的屋檐，有人一直在研究水法，有人在大水法前站了很久，也有人只留下了一张照片、一句话。',
        '所以你今天看到的这份档案，早就不只是我当年留给一个学生的考察题了。你只是许多“第二十一图探寻者”中的一位。',
        '关于圆明园西洋楼，还有很多事情，我当年没来得及编进谜题里。既然你已经走到这里了，老夫再多絮叨几句。',
        '《西洋楼铜版画》共有二十幅，乾隆四十六年至五十一年由伊兰泰起稿、造办处在北京刻印。如今，在圆明园含经堂中仍可以看到这套铜版画；谐奇趣的翻尾石鱼，如今还能在北京大学未名湖西侧见到；观水法巴洛克石门的部分构件后来辗转到了颐和园；大水法的一对石鱼，也已经回到了圆明园。',
        '你今天走过的这些地方，并没有全部消失。有些东西留在原地，有些散落到了别处，有些留在旧画里，还有一些，只留在后来人的记录中。',
        '至于这份档案——我其实只真正替第一个学生安排好了第一步。日记把他引到黄花阵以后，后面的路，我故意没有再替他写死。我能告诉他去哪里，却不能替他决定在那里看到什么。',
        '那本日记最后写着：“丙午年于西洋楼。”想必当年第一个拿到档案的傻小子，还真认真算过究竟是哪一个丙午年。1786？1846？1906？1966？都不是。其实就是2026年。那本所谓的“旧日记”，也是我故意做旧的。',
        '不过，先别急着怪老夫骗你。因为这个骗局，后来慢慢变成了一件真的事情。第二十一幅旧铜版画从来没有存在过。可这么多年来，已经真的有许多人，为了寻找它来到这里，重新看了一遍西洋楼，又留下了一点属于自己的东西。',
        '上一位探寻“第二十一图”的人，也给你留下了一件东西。',
        '看完了吗？他当时也不知道，这些东西最后会被谁看到。就像现在的你，也不知道下一次打开这只档案袋的人是谁。',
        '你愿意为下一位来到这里的人，留下点什么吗？可以是一句话。可以是一张今天拍下的照片。也可以是一个你希望他到了现场以后，替你再看一眼的地方。',
        '你留下的内容，在经过审核之后，也许会出现在下一位探寻者收到的“次日回信”里。到那时候，你也会成为这份档案的一部分。',
        '至于“第二十一图”究竟在哪里——我想，你现在应该已经不需要老夫告诉你答案了。这份档案还会继续传下去。所以，还请替老夫保守这个关于第廿一图的秘密。'
      ].forEach(function (text) { paras.push({ text: text }) })
    }
    if (HORSE_UPDATE) paras.push({ text: HORSE_UPDATE, cls: 'aside' })
    return paras
  },

  onReveal() {
    if (this.data.revealed) return
    this.setData({ revealed: true, paragraphs: this.buildParagraphs() })
  },

  onPrev() {
    const self = this
    session.listBoardMessages({ limit: 1 }).then(function (res) {
      const note = res && res.messages && res.messages[0]
      self.setData({
        prevNote: note ? note.from + '：' + note.text : '还没有经审核的上一位留言'
      })
    }).catch(function () {
      self.setData({ prevNote: '留言这会儿打不开' })
    })
  },

  onLeaveInput(e) {
    const key = e.currentTarget.dataset.key
    if (key) this.setData({ [key]: e.detail.value })
  },

  onLeaveText() {
    const text = String(this.data.leaveText || '').trim()
    if (!text) {
      this.setData({ leftAck: '先写一句' })
      return
    }
    this.submitLeave(text)
  },

  onLeaveWish() {
    const text = String(this.data.wish || '').trim()
    if (!text) {
      this.setData({ leftAck: '写一个你希望他再看一眼的地方' })
      return
    }
    this.submitLeave('替我再看一眼：' + text)
  },

  onLeavePhoto() {
    const self = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: function () { self.submitLeave('今天在遗址拍下的一张照片。') }
    })
  },

  submitLeave(text) {
    const self = this
    session.submitBoardMessage(text).then(function () {
      self.setData({ leftAck: '已收下。审核通过后，才会出现在下一位的信里。' })
    }).catch(function () {
      self.setData({ leftAck: '这会儿没送出去' })
    })
  },

  onBack() {
    wx.navigateBack({
      fail: function () { wx.reLaunch({ url: '/pages/ticket/ticket' }) }
    })
  },

  // 信末脚注：去读大家的留言（写发生在通关当天 report，回访链路只读）
  onOpenBoard() {
    wx.navigateTo({ url: '/plate21/module/pages/board/board' })
  }
})
