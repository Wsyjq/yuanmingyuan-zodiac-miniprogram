// 序章（V2.1 可用稿 · 受邀者口径）
// novel-view 叙事（你对西洋楼有兴趣 → 馆里的人请你来 → 档案翻一翻 → 闻有第二十一图，未见）
// → 档案交接面板（信不拆，到门口再拆）→ 前往西洋楼入口（s1-decode 拆信读信）。
const session = require('../../store/session')

Page({
  data: {
    // 序章叙事（docs/剧情可用稿-主线走一遍.md §序章，2026-09-11「你」视角定稿）
    paragraphs: [
      { text: '你对圆明园的西洋楼有兴趣，不然不会读到这里。这套铜版画一共二十幅，记下过它完整时候的样子；今天地上剩下的，是遗址。' },
      { text: '馆里整理这套图的人给你留了一封信，请你来现场走一趟。信封没拆，说好了到遗址门口再拆。随信还有一份没走完的档案，愿意看的话，一并交到你手上。' },
      { text: '档案夹的封面印着：西洋楼铜版图。你先翻一翻。' },
      { text: '二十幅，一幅一号。图录里写着，乾隆四十六年到五十一年，宫廷画家伊兰泰起稿，造办处刻版刷印，贺清泰、潘廷璋这些在宫里当差的西洋画家也搭过手。画的是刚建成的样子，喷泉、石柱、楼顶都在，一样不缺。这些都是常识。' },
      { text: '让人停住的是夹在后面那张民国著录卡。「第二十图」的条目后面，有人用铅笔补了一行小字：' },
      { text: '闻有第二十一图，未见。', quote: true },
      { image: 'IMG-P02', src: '/plate21/module/assets/img/IMG-RUNTIME-PROLOGUE-CARD.jpg', caption: '民国著录卡片 · 铅笔补记' },
      { text: '你把图名清单从头数了一遍，一到二十，盛景收完。第二十一行不在清单里，空着，没有着落。' },
      { text: '再往后翻，类似的说法零星还有几处。有人说它被藏起来了，有人说根本没画完，有人说它早就和楼一起烧成了灰。谁也没拿出过实证。这些话就夹在档案的缝里，拔不掉，也按不平。' },
      { text: '二十页图里，只有黄花阵那一页后来多夹了一张照片，回形针还别着。正面像一处工地，矮墙的走向和画上的迷宫几乎一样，没有任何说明。翻过来，背面有一行钢笔字：' },
      { text: '照原图，复位。1987、1989。', quote: true },
      { text: '照这行字说，那道墙是一九八几年的人照着这张画重新砌起来的。字现在就能读；可墙到底新不新、跟画对不对得上，隔着纸说不清，得到跟前才算数。' },
      { text: '每一页的边上留着一道空栏，印着两行小字：' },
      { text: '对得上的，划个勾；对不上的，记下来。', quote: true },
      { text: '最底下压着一份封套，封口上一行字：' },
      { text: '到像下拆。', quote: true },
      { text: '铜版画上，楼是完整的。条目旁边不知是谁抄了半句乾隆自己的话：' },
      { text: '水法不过工巧之一端……中国之大，何奇不有。', quote: true },
      { text: '后来楼烧了。画还在。' },
      { text: '邀请写的就是这儿。到了门口，再拆信。', highlight: true }
    ],
    // 交接清点：档案夹里的东西（信不拆，到门口再拆——V2.1 序章口径）
    props: [
      '一封信 · 封着，到门口再拆',
      '二十幅铜版图 · 每幅有号',
      '民国著录卡 · 铅笔补了一行',
      '夹照片的一页 · 回形针还别着',
      '页边空栏 · 对得上划勾，对不上记下',
      '一份封套 · 写着「到像下拆」'
    ],
    showHandover: false,
    advancing: false
  },

  onNovelFinish() {
    // 叙事结束：清点交到手上的档案。信不拆——到遗址门口再拆。
    this.setData({ showHandover: true })
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
  },

  onLoad() {
    this._timers = []
    session.viewPuzzle('prologue-envelope')
    if (session.isPuzzleComplete('prologue-envelope')) {
      this.setData({ showHandover: true })
    }
  },

  onUnload() {
    ;(this._timers || []).forEach(clearTimeout)
  }
})
