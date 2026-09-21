// 序章（V2.1 可用稿 · 受邀者口径）
// novel-view 叙事（你对西洋楼有兴趣 → 馆里的人请你来 → 档案翻一翻 → 闻有第二十一图，未见）
// → 档案交接面板（信不拆，到门口再拆）→ 前往西洋楼入口（s1-decode 拆信读信）。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')
const playGuide = require('../../capabilities/play-guide/guide')
const coachHost = require('../../capabilities/play-guide/coach-host')
const glossHost = require('../../utils/gloss-host')

Page({
  behaviors: [coachHost, glossHost],
  data: {
    // 序章叙事（docs/剧情可用稿-人物对话版-V2.3.md §序章：段落收短、删「这些都是常识」「照这行字说」「愿意看的话」）
    paragraphs: [
      { text: '我是一名从历史系毕业的研究助理，大多数时候，都是在图书馆整理馆藏档案、核对图录还有补录那些没人愿意细看的编号和出处。前几天一天下午，我整理到一批圆明园档案，顺手翻开了《西洋楼铜版图》的著录条目。', parts: [
        { t: '我是一名从历史系毕业的研究助理，大多数时候，都是在图书馆整理馆藏档案、核对图录还有补录那些没人愿意细看的编号和出处。前几天一天下午，我整理到一批圆明园档案，顺手翻开了' },
        { t: '《西洋楼铜版图》', g: 'sl01' },
        { t: '的著录条目。' }
      ] },
      { text: '档案夹的封面印着「西洋楼铜版图」。翻开，二十幅，一幅一号。图录页写着：乾隆四十六年到五十一年，宫廷画家伊兰泰起稿，造办处刻版刷印，贺清泰、潘廷璋这些在宫里当差的西洋画家也搭过手。画的是刚建成的样子，喷泉、石柱、楼顶都在，一样不缺。' },
      { text: '翻到后面，是一张民国著录卡。「第二十图」的条目后面，有人用铅笔补了一行小字——' },
      { image: 'IMG-P02', src: '/plate21/module/assets/img/IMG-RUNTIME-PROLOGUE-CARD.jpg', caption: '民国著录卡片 · 铅笔补记' },
      { text: '闻有第二十一图，未见。', quote: true },
      { text: '数一下图名：一到二十，盛景收完；第二十一行不在清单里，空着。档案缝里还夹着几种说法——藏起来了，没画完，跟楼一起烧了，谁也没拿出实证。' },
      { text: '每页边上留着一道空栏，印着两行小字：' },
      { text: '对得上的，划个勾；对不上的，记下来。', quote: true },
      { text: '档案最底下压着一份封套，封口上写着：' },
      { text: '到像下拆。', quote: true },
      { text: '条目旁边，不知是谁抄了半句乾隆自己的话——' },
      { text: '水法不过工巧之一端……中国之大，何奇不有。', quote: true },
      { text: '后来楼烧了。画还在。邀请写的就是这儿。', highlight: true }
    ],
    // 交接清点：档案夹里的东西（信不拆，到门口再拆——V2.1 序章口径）
    props: [
      '一封信 · 封着，到门口再拆',
      '二十幅铜版图 · 每幅有号',
      '民国著录卡 · 铅笔补了一行',
      '一张路线图 · 入口到雕像',
      '页边空栏 · 对得上划勾，对不上记下',
      '一份封套 · 写着「到像下拆」'
    ],
    showHandover: false,
    narrSrc: audioSrc.clip('narr-prologue-p01'),
    advancing: false
  },

  onNovelPage(e) {
    if (this.data.showHandover) return
    const n = String((e.detail && e.detail.index || 0) + 1).padStart(2, '0')
    this.setData({ narrSrc: audioSrc.clip('narr-prologue-p' + n) })
  },

  onNovelFinish() {
    // 叙事结束：清点交到手上的档案。信不拆——到遗址门口再拆。
    this.setData({ showHandover: true, narrSrc: audioSrc.clip('narr-prologue-handover') })
    this.scheduleCoach([playGuide.SPOTS.go])
  },

  // 确认收好档案（信仍封着）。拆信读信在入口站 s1-decode 完成。
  onTakeArchive() {
    session.attemptPuzzle('prologue-envelope', 1, true, 'physical')
    session.completePuzzle('prologue-envelope', { action: 'archive-received' }).catch(function () {
      wx.showToast({ title: '进度暂未保存，继续时会重试', icon: 'none' })
    })
    this._timers.push(setTimeout(() => {
      const stamp = this.selectComponent('#stamp')
      if (stamp) stamp.show('档案已收好')
    }, 800))
  },

  onGoS1() {
    this.runAfterCoach(function () {
      if (this.data.advancing) return
      this.setData({ advancing: true })
      session.completePuzzle('prologue-envelope', { action: 'archive-received' }, { checkpoint: 's1-decode' }).then(() => {
        wx.navigateTo({
          url: '/plate21/module/pages/s1-decode/s1-decode',
          fail: () => this.setData({ advancing: false })
        })
      }).catch(() => {
        this.setData({ advancing: false })
        wx.showToast({ title: '进度保存失败，请重试', icon: 'none' })
      })
    })
  },

  onReady() {
    const spots = [playGuide.SPOTS.listen]
    if (this.data.showHandover) spots.push(playGuide.SPOTS.go)
    this.scheduleCoach(spots)
  },

  onLoad() {
    this._timers = []
    session.viewPuzzle('prologue-envelope')
    if (session.isPuzzleComplete('prologue-envelope')) {
      this.setData({ showHandover: true, narrSrc: audioSrc.clip('narr-prologue-handover') })
    }
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
