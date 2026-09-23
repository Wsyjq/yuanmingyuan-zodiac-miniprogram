// 序章（采风修订版玩法）
// novel-view 纯叙事 → 取出并拆开实体信封 → 信中指引 → 前往第一站。
const session = require('../../store/session')

Page({
  data: {
    // 序章叙事（对照采风修订版原文）
    paragraphs: [
      { text: '我在博物馆做了两年研究助理，日常都是在整理馆藏图像档案。一天下午，我在整理一批清代铜版画的数字化记录，翻到《西洋楼铜版图》二十幅的条目。' },
      { image: 'IMG-P01', src: '/plate21/module/assets/img/IMG-RUNTIME-PROLOGUE-STUDY.jpg', caption: '图像档案整理台' },
      { text: '《西洋楼铜版图》于乾隆四十六年至五十一年（1781–1786），由宫廷画家伊兰泰起稿、造办处刻印，贺清泰、潘廷璋等参与，记录了圆明园西洋楼建成时的全貌。这是常识，所有图录都这么写。' },
      { text: '但有一份民国年间的著录卡片，在"第二十图"后面用铅笔补了一行小字：' },
      { text: '闻有第二十一图，未见。', quote: true },
      { image: 'IMG-P02', src: '/plate21/module/assets/img/IMG-RUNTIME-PROLOGUE-CARD.jpg', caption: '民国著录卡片特写' },
      { text: '字迹潦草，像是随手记下的传闻。再往后查，零星还有几处类似的记载——有人说它被藏起来了，有人说它根本没画完，有人说它早就毁了。没有一份能给出实证。传闻在学术档案的缝隙里反复出现，像一根刺，拔不掉，也按不平。' },
      { text: '我继续翻阅那份残缺的档案，在附件夹中，发现了一份尚未整理完成的考察资料。' },
      { text: '里面有一封信、一张手绘路线图、几张空白记录页，以及几件用于现场记录的工具。', highlight: true },
      { text: '我把那只尚未拆封的信封拿在手里。封口已经有些发脆，接下来的答案，也许要从它开始。' }
    ],
    props: ['手绘路线图', '空白记录页', '现场记录工具'],
    showPack: false,
    showEnvelope: false,
    advancing: false
  },

  onNovelFinish() {
    // 叙事结束后，引导玩家操作手中的实体信封。
    this.setData({ showEnvelope: true })
  },

  // 玩家确认已经读完实体信件后，再展示信中内容并推进剧情。
  onOpenEnvelope() {
    session.attemptPuzzle('prologue-envelope', 1, true, 'physical')
    this.setData({ showEnvelope: false, showPack: true })
    session.completePuzzle('prologue-envelope', { action: 'opened-and-read' }).catch(function () {
      wx.showToast({ title: '进度暂未保存，继续时会重试', icon: 'none' })
    })
    this._timers.push(setTimeout(() => {
      const stamp = this.selectComponent('#stamp')
      if (stamp) stamp.show('考察资料已备好')
    }, 800))
  },

  onGoS1() {
    if (this.data.advancing) return
    this.setData({ advancing: true })
    session.completePuzzle('prologue-envelope', { action: 'opened-and-read' }, { checkpoint: 's1-decode' }).then(() => {
      wx.navigateTo({
        url: '/plate21/module/pages/s1-decode/s1-decode',
        fail: () => this.setData({ advancing: false })
      })
    }).catch(() => {
      this.setData({ advancing: false })
      wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
    })
  },

  onLoad() {
    this._timers = []
    session.viewPuzzle('prologue-envelope')
    if (session.isPuzzleComplete('prologue-envelope')) {
      this.setData({ showPack: true })
    }
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
