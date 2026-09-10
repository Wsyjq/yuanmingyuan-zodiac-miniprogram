// v2 顺路支线站（可选）：谐奇趣 / 养雀笼 / 方外观 / 蓄水楼 / 线法画。
// 主线不经过此页——入口在 transit 的「顺路」卡片与考察手册；站点内容配置驱动。
// 顺路站红线：不设谜题判定、不要求输入、不做裁判（v2「留白」设计）；
// 蓄水楼五段拼卡为实体道具自校验，页面只做操作引导 + 拼合后展开背面注释。
const session = require('../../store/session')

const SITES = {
  xieqiqu: {
    no: 'S·A',
    title: '顺路 · 谐奇趣',
    audioStation: 't-xieqiqu',
    intro: '绕过那道土坡，一片汉白玉的残基横在眼前，比想象的大得多——谐奇趣，乾隆十六年秋天建成，是西洋楼里第一座盖起来的欧式水法大殿。',
    beats: [
      {
        kicker: '手迹 · 铜版画校样页',
        lines: [
          '档案翻到这册档案最老的一页——那套铜版画的校样。起稿的人叫伊兰泰，乾隆四十六年动笔，一画画了六年。',
          '两百多年过去，纸上的线还在。你接下来看到的每一处，这套画里都有。'
        ]
      },
      {
        kicker: '现场 · 听',
        lines: [
          '此处不设谜题，只做一次听觉引导。',
          '站到台基中间：先往左边听，再往右边听。',
          '当年乾隆就坐在你现在站的位置——左边是中乐，右边是西乐，一起响。'
        ]
      },
      {
        kicker: '道具 · 取景框卡',
        prop: true,
        lines: [
          '卡上这张线稿，就是当年那套版上的一座楼。举起它，闭上一只眼，让纸上的楼和地上的台基对齐——它们会接成同一座建筑。',
          '对上就是对上了。不拍照、不识别、不提交。',
          '图样残片·一（谐奇趣主楼轮廓），收进档案夹第一格。'
        ]
      }
    ],
    motif: '东西不在原来的地方，不一定就是没了。',
    next: '/plate21/module/pages/s2-quiz/s2-quiz',
    nextLabel: '回到主线 · 前往黄花阵'
  },
  yangquelong: {
    no: 'S·B',
    title: '顺路 · 养雀笼',
    audioStation: 't-yangquelong',
    intro: '这一路全是断柱碎石，可眼前这座大理石门框几乎一样不缺——养雀笼。中间是过道门，两侧原来养着孔雀和各种珍禽。',
    beats: [
      {
        kicker: '手迹 · 老照片复印件',
        lines: [
          '档案里夹着一页老照片的复印件——最早拍下这片废墟的那批人留下的。纸边泛黄，背面没有字。',
          '这一路后来的许多记录，都是从这批照片往后接着写的。'
        ]
      },
      {
        kicker: '现场 · 看',
        lines: [
          '从东面看：券顶、壁柱、雕花，西洋的涡卷，边缘还很利。',
          '绕到西面——什么都没有。档案写着：东面是大理石西洋门，西面是中式木牌坊。',
          '木头的那一半，1860 年烧了。留下来的那一半，是石头做的。'
        ]
      },
      {
        kicker: '道具 · 叠层卡',
        prop: true,
        lines: [
          '两张半透明卡：一张印东面石门的完整线稿，一张印西面牌坊的复原线稿。',
          '叠在一起，举起来对着天光看——两个半边合成一座完整的门。叠错了错位一眼就能看出来。',
          '图样残片·二（养雀笼东西两面），收进档案夹第二格。'
        ]
      }
    ],
    motif: '同一座建筑，一半留下来了，一半没有。',
    next: '/plate21/module/pages/waypoint/waypoint?site=fangwaiguan',
    nextLabel: '继续顺路 · 方外观'
  },
  fangwaiguan: {
    no: 'S·C',
    title: '顺路 · 方外观',
    audioStation: 't-fangwaiguan',
    intro: '档案里关于这座殿，只有一行字。再往前几十步，一座三开间的台基，方方正正——方外观，乾隆二十四年建成，原来是一座礼拜殿，供着阿拉伯文碑刻。',
    beats: [
      {
        kicker: '口径 · 必读',
        lines: [
          '档案：这里是给容妃做礼拜用的。容妃在《清史稿》里有记载，确有其人。',
          '「香妃」「体有异香」属于民间传说，没有实证——不与史料混讲。',
          '正对面隔着石桥是五竹亭。档案说，她每次来，乾隆都陪着来。但他不进去。'
        ]
      },
      {
        kicker: '道具 · 纹样对照卡',
        prop: true,
        lines: [
          '卡上印六种纹样：番花、卷草、贝壳、莲花、缠枝、几何回纹。拿着卡绕台基走一圈，找到一种就用铅笔划一道。',
          '关键规则：档案上的数目和现场对不上——对不上就对上了，产品不做裁判。',
          '图样残片·三，收进档案夹第三格。'
        ]
      },
      {
        kicker: '道具 · 等候卡',
        prop: true,
        lines: [
          '卡背有一行浅色小字：「你在外面等过谁？」',
          '想到了一个人，就把名字写在背面。',
          '写完就收起来吧——这张不拍照、不提交、不进留言池。小程序全程不介入。'
        ]
      }
    ],
    motif: '能留下来的到底是什么。',
    next: '/plate21/module/pages/s3-comic/s3-comic',
    nextLabel: '回到主线 · 前往海晏堂'
  },
  xushuilou: {
    no: 'S·D',
    title: '顺路 · 蓄水楼',
    audioStation: 't-xushuilou',
    intro: '绕到海晏堂背面，是一座很高的工字形土台——蓄水楼，也叫锡海：楼顶是铺了锡板防渗的大蓄水池，一次能蓄一百六十多立方米。',
    beats: [
      {
        kicker: '现场 · 量',
        lines: [
          '水提到楼顶，靠高差的压力经铜管送到各处喷口——不用任何动力，因为水已经在高处了。',
          '举起道具包里的量高绳，比一比这个台子有多高。没有正确答案，不要求输入。',
          '水要被提到那个高度。一天十二个时辰，不能停。'
        ]
      },
      {
        kicker: '手迹 · 三页纸与一处空栏',
        lines: [
          '关于这台机器怎么转，档案里有三页纸，年代都不一样。',
          '一页是论文的复印件，写人力蹬攀；一页是复原图的图说，写畜力齿轮；还有一页旧图说，写的是骡子拉水车。',
          '三页纸的末尾，都留着同一处空栏——整理这册档案的人，哪一页也没敢勾。'
        ]
      },
      {
        kicker: '谜题 · 水循环五段拼卡',
        prop: true,
        confirm: true,
        lines: [
          '五段硬卡条各印一个环节，两端切成不同的凹凸形状——只有正确顺序才能完整咬合，而且首尾也能咬合。',
          '提示一：从最低的地方开始想——水最先在哪儿？',
          '提示二：水到了楼顶之后呢？喷出去的水又去了哪儿？',
          '自校验：拼错了插不进去，拼对了自己就知道。不拍照、不识别、不提交。图样残片·四，收进档案夹第四格。'
        ]
      }
    ],
    reveal: [
      '水道：东西两侧为明道，南北两侧为暗道。',
      '汲水池：四角各一，全用石条砌成。',
      '水车：操作间在二楼。',
      '锡海：四壁铺锡板，蓄水一百六十余立方米。',
      '铜管喷口：靠高差产生压强，不用动力。',
      '拼到最后一段你会发现：它能接回第一段——这不是一条线，是一个圈。',
      '隔了两百四十年，两代人对着同一台机器，记下的东西对不上。',
      '（史料：2015 年 10 月至 12 月的考古发掘已探明整套循环——四个水车汲水池，与相连的水道。）'
    ],
    motif: '连它当年怎么转的，我们都不确定了。',
    next: '/plate21/module/pages/dashuifa/dashuifa',
    nextLabel: '继续顺路 · 大水法'
  },
  xianfahua: {
    no: 'S·E',
    title: '顺路 · 线法画',
    audioStation: 't-xianfahua',
    intro: '几排砖墙的基址，一层层往里收，中间一条笔直的通道——要不是档案上画着，会以为只是几道普通的矮墙。',
    beats: [
      {
        kicker: '现场 · 看',
        lines: [
          '这里叫线法画：乾隆命人用西洋的透视法，把西洋风景画画在这几排砖墙上。',
          '从方河西岸往东看，七道断墙会显出纵深，像一条望不到头的西方街市。',
          '如今线法墙已荡然无存；方河已清整植荷。'
        ]
      },
      {
        kicker: '道具 · 透视框卡 + 雪山线稿',
        prop: true,
        lines: [
          '样式雷的图上，这几排墙是收着口的——越往里越窄，为的是把你的眼睛骗到底。',
          '把雪山村庄羊群的线稿垫在透视框后面，举起对着空着的墙基——纸上的雪山落在墙的位置上，那幅画就补回去了。',
          '对上就是对上了。不拍照、不提交。',
          '图样残片·五（线法画雪山），收进档案夹第五格。'
        ]
      }
    ],
    motif: '放下纸，又没有了。',
    next: '/plate21/module/pages/s4-timeline/s4-timeline',
    nextLabel: '回到主线 · 前往雨果雕像'
  }
}

Page({
  data: {
    site: null,
    confirmed: false,
    revealLines: []
  },

  onLoad(options) {
    const key = SITES[options.site] ? options.site : 'xieqiqu'
    const site = SITES[key]
    this._key = key
    this._next = site.next
    this.setData({ site: site, confirmed: false, revealLines: [] })
    this.recordVisit(key)
  },

  // 支线记账：走过即记（幂等一次），供 transit「已走过」与手册统计使用。
  recordVisit(key) {
    try {
      const snap = session.getSnapshot()
      if (!snap) return
      if (snap.flags && snap.flags['sideVisited_' + key]) return
      session.setFlag('sideVisited_' + key, Date.now())
        .then(() => { session.emit({ name: 'side_visited', site: key }) })
        .catch(() => {})
    } catch (e) { /* 记账失败不阻断浏览 */ }
  },

  // 蓄水楼拼卡：拼合确认后才展开卡条背面注释（不判定对错）。
  onConfirm() {
    if (this.data.confirmed) return
    this.setData({ confirmed: true, revealLines: this.data.site.reveal || [] })
    try {
      const snap = session.getSnapshot()
      if (snap && !(snap.flags && snap.flags.xishuilouConfirmed)) {
        session.setFlag('xishuilouConfirmed', Date.now()).catch(() => {})
      }
    } catch (e) { /* 忽略 */ }
  },

  onNext() {
    wx.redirectTo({
      url: this._next,
      fail: () => wx.showToast({ title: '页面跳转失败，请重试', icon: 'none' })
    })
  }
})
