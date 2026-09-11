// v2 顺路散页站（可选）：谐奇趣 / 养雀笼 / 方外观 / 蓄水楼 / 观水法 / 线法画。
// 主线不经过此页——入口在 transit 的散页卡与考察手册；站点内容配置驱动。
// 散页红线（V2.2 讲述版，V2.1 全部沿用）：不设谜题判定、不要求输入、不做裁判、不出日期卡；
// 人不出题、不调度游客、不知身后事；蓄水楼五段拼卡为实体道具自校验，页面只做操作引导。
// 正文与台词逐句取自 docs/剧情可用稿-人物对话版-V2.2.md（骨架/道具/残片与 V2.1 一致）。
// dialogues[].clipId 对应 tools/gen_voice.py 产物（audio/v22/dlg-*.mp3），无服务时自动退回纯文稿。
const session = require('../../store/session')
const audioSrc = require('../../utils/audio-src')

const SITES = {
  xieqiqu: {
    no: 'S·A',
    title: '顺路 · 谐奇趣',
    audioStation: 't-xieqiqu',
    narrClip: 'narr-waypoint-xieqiqu',
    bgmFile: 'bgm-07x-xieqiqu-dual.mp3',
    intro: '还没到迷宫，先撞见一处废墟。绕过一道土坡，一片汉白玉的残基横在眼前，台基上还立着几根柱子，柱头的卷草纹让风磨圆了，花瓣的层数还数得清。档案里多出来的这一页，写着这里叫谐奇趣：西洋楼里第一座盖起来的欧式水法大殿，乾隆十六年秋天建成；主楼三层，楼前两侧各有一排琉璃厅。',
    beats: [
      {
        kicker: '现场 · 听',
        lines: [
          '东侧、西侧，中乐、西乐，同时响。先别急着走，站到台基中间去，正对主楼：当年皇帝就在正楼当中用膳，他听乐的位置，和你现在站的这条线是同一条。这一页留了声音，站对了位置，两边会自己响起来。'
        ],
        dialogues: [
          { speaker: '东厅乐师', aside: '左声道', text: '调音了，调音了，万岁爷落座前得过一遍。笙先起，笛跟着，琵琶托底，一样都不许抢。快着点儿，今儿的菜多。', clipId: 'dlg-xieqiqu-1' },
          { speaker: '西厅乐师', aside: '右声道', text: '你们过你们的，我们调我们的，谁也不碍谁。提琴这根弦又松了，这天儿……算了，管风琴先来。我们这边就这点好，省弦。', clipId: 'dlg-xieqiqu-2' },
          { speaker: '东厅乐师', aside: '左声道', text: '待会儿可要一块儿来了。今儿万岁爷在正楼用膳，咱们两边同时响，他那边听得见我这边，我这边也听得见他那边。就怕你们那洋调，跟我这笙笛打架。', clipId: 'dlg-xieqiqu-3' },
          { speaker: '西厅乐师', aside: '右声道', text: '打不了架。各吹各的，各拉各的，声儿都往正楼送。他两边都要，爱听哪边，听哪边。', clipId: 'dlg-xieqiqu-4' }
        ],
        stageNote: '两边先后响，先分后合。左是笙笛琵琶，右是提琴管风琴。听多久自己定。',
        dialogues2: [
          { speaker: '东厅乐师', aside: '左声道', text: '听见没有？没打架。这楼是园子里头一座洋楼，往后东边还一座接一座。他要什么，就往园子里搬什么。', clipId: 'dlg-xieqiqu-5' },
          { speaker: '西厅乐师', aside: '右声道', text: '本来就打不了。各是各的调，都往中间那个人耳朵里去。可不是么，连我都是搬来的。', clipId: 'dlg-xieqiqu-6' }
        ]
      },
      {
        kicker: '道具 · 取景框卡',
        prop: true,
        lines: [
          '两边的东西都是他自己挑的，都要，那就并排摆在自己手边。听完，这一页还有一件事要办：试试纸上的楼和地上的楼，还对不对得上。掏出那张卡片——中间挖空的那张，印着这座楼；举起来，闭上一只眼，让纸上的楼落到这片石头上。',
          '硬卡中间镂空，印谐奇趣主楼线稿。烧的是梁柱门窗，石头台基还在，所以轮廓还对得上。对上就是对上了。不拍照、不提交。',
          '卡背＝散页残片·谐奇趣轮廓（不进结局必需拼图），收进档案夹。'
        ]
      },
      {
        kicker: '收尾 · 南池',
        lines: [
          '纸上的线条落在石头上，位置差不多：画是两百多年前的，石头是眼前的，中间烧过一场火，轮廓居然还咬得上。南边有一口海棠形的水池，可以沿池边走一圈：池里原先有铜羊、铜鸭，还有一条西洋式的翻尾石鱼，一起喷水；基座的痕迹还在，鱼不在了。',
          '它的下落，档案记在别处——那条石鱼如今在北京大学的未名湖里。回头看一眼，基座还空着。合上档案，往黄花阵走，迷宫就在前头。'
        ]
      }
    ],
    motif: '他要什么，就往园子里搬什么。',
    next: '/plate21/module/pages/s2-quiz/s2-quiz',
    nextLabel: '收好夹页 · 前往黄花阵'
  },
  yangquelong: {
    no: 'S·B',
    title: '顺路 · 养雀笼',
    audioStation: 't-yangquelong',
    narrClip: 'narr-waypoint-yangquelong',
    intro: '甬道走到一半，右手边一座门。这一路全是断柱碎石，这座大理石门框却几乎一样不缺：券顶、壁柱、雕花都在。这一页的人声很轻，怕吵着什么。',
    beats: [
      {
        kicker: '现场 · 听',
        lines: [],
        dialogues: [
          { speaker: '喂雀人', text: '轻点声，孔雀在歇着。这儿是养雀笼，中间是过道门，两边笼里养的是孔雀和珍禽。这门两面不一般：东面，石头的，洋式；西面，木头的，牌坊。木头那面省工，石头那面气派。孔雀认生，你退远两步，它该开了。', clipId: 'dlg-yangquelong-1' }
        ]
      },
      {
        kicker: '道具 · 叠层卡',
        prop: true,
        lines: [
          '从东面看一遍，再绕到西面。西面什么都没有——木头的那一半，烧了。这一页配了两张半透明卡，一张石头面，一张木头面，冲着天光叠起来，纸上会合出一座完整的门。'
        ],
        dialogues: [
          { speaker: '喂雀人', text: '两张纸，一张石头面，一张木头面。冲着天光叠起来，木头面会回到石头面上。轻点，别折。', clipId: 'dlg-yangquelong-2' }
        ]
      },
      {
        kicker: '收尾 · 石头那一半',
        lines: [
          '放下纸，眼前只剩石头那一半。',
          '卡背＝散页残片·两半门（不进结局必需拼图），收进档案夹。不设对读，人声停在这儿。'
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
    narrClip: 'narr-waypoint-fangwaiguan',
    intro: '再往前几十步，是一座三开间的台基，方方正正。剩得不多：柱础，几级石阶，半截墙；可地方选得讲究，前面有池子，后面正对一片开阔地。档案里关于这座殿，只有一行字——',
    beats: [
      {
        kicker: '档案 · 一行字',
        lines: [],
        quotes: [
          '方外观，乾隆二十四年建成，殿里供着阿拉伯文的碑刻，是给一位维吾尔族的妃子做礼拜用的——容妃，民间叫她香妃。（容妃《清史稿》有载；「香妃」「体有异香」为民间传说，无实证。）',
          '同页还有半句：她每次来，乾隆都陪着来。'
        ],
        dialogues: [
          { speaker: '当差的人', text: '轿子到桥那头，就不往前抬了。娘娘自己进去，我们在外头候着。万岁爷有时候也跟了来，也就在台阶底下站站，不进去。里头那块碑，上的字，我们不认得。', clipId: 'dlg-fangwaiguan-1' }
        ]
      },
      {
        kicker: '这一页的两件事 · 都不是题',
        lines: [
          '正对面隔着五孔石桥是五竹亭。一个人在殿里礼拜的时候，陪她来的人，就在桥那头；档案没写谁在那儿等过，也没写等了多久，就那么一行字。这一页有两件事，都不是题。',
          '第一件，纹样：卡上六种纹样，墙上的花样见着一个，划一道，有几个算几个——档案上的数目和你数出来的多半对不上，两个数都记下来，不用纠哪个对。第二件，等候卡：正面印着台基和五竹亭的位置，背面是空的，等过谁，自己写，写完自己收着。'
        ],
        dialogues: [
          { speaker: '当差的人', text: '墙上的花样，看见一个，划一道，有几个算几个，不用凑数。还有那张背面空白的，等过谁，你自己写。写完收着，这张不用给谁看。', clipId: 'dlg-fangwaiguan-2' }
        ]
      },
      {
        kicker: '道具 · 纹样对照卡 / 等候卡',
        prop: true,
        lines: [
          '纹样对照卡：六种纹样——番花、卷草、贝壳、莲花、缠枝、几何回纹，现场划记。卡背＝散页残片·纹样卡。',
          '等候卡：背面空白，一行浅字——你在外面等过谁？不上传、不进留言池，写完自己收着。'
        ]
      }
    ],
    motif: '这一站没有对读，也没解开什么。她每次来，他陪着来，然后站在门外。',
    next: '/plate21/module/pages/s3-comic/s3-comic',
    nextLabel: '收好夹页 · 前往海晏堂'
  },
  xushuilou: {
    no: 'S·D',
    title: '顺路 · 蓄水楼',
    audioStation: 't-xushuilou',
    narrClip: 'narr-waypoint-xushuilou',
    intro: '走到这儿，海晏堂留下的问题还在：喷泉没有电泵，水从哪儿来？绕到它后面，是一座土台子，工字形，很高，答案就在这台子上。这一页攒了三个声音，各说各的。',
    beats: [
      {
        kicker: '三声 · 水怎么上去的',
        lines: [],
        dialogues: [
          { speaker: '亲历当差', text: '你们是来问水的吧，一拨一拨的，都问这个。水提上去，靠水车。水车，人踩，一班八个，换着来。我踩过，腿到现在还记得。', clipId: 'dlg-xushuilou-1' },
          { speaker: '当地老人', text: '不是不是，不是人踩。我小时候听老的们讲：毛驴。黑灯瞎火的，驴眼睛上蒙块布，就那么转圈拉，拉到天亮。', clipId: 'dlg-xushuilou-2' },
          { speaker: '念册子的', text: '你们俩说的，都是听来的。工程册子上写的是骡。几匹，一匹一天几斗料，草几束，都记着数。白纸黑字。', clipId: 'dlg-xushuilou-3' },
          { speaker: '亲历当差', text: '我踩过！', clipId: 'dlg-xushuilou-4' },
          { speaker: '当地老人', text: '你踩的是别处的车。', clipId: 'dlg-xushuilou-5' },
          { speaker: '念册子的', text: '册子上，是骡。', clipId: 'dlg-xushuilou-6' }
        ],
        stageNote: '停两秒。谁也不再说了。',
        dialogues2: [
          { speaker: '亲历当差', text: '水是上去了，这个不作假。怎么上去的，各说各的，谁也说不服谁。', clipId: 'dlg-xushuilou-7' },
          { speaker: '念册子的', text: '吵完了？那我也念一页。这楼叫蓄水楼，楼顶的大池子叫锡海，池底四壁铺锡板，防渗，蓄满一回，一百六十多立方米。蓄满了，水靠自身的落差压进铜管，送到各处喷口，不用任何机器推。这些数，册子上一笔一笔都记着。就水怎么上去，没个准数。', clipId: 'dlg-xushuilou-8' }
        ]
      },
      {
        kicker: '现场 · 比高',
        lines: [
          '一百六十多立方米——数字先搁在这儿，站到台子底下，再回头想它。',
          '站到台子底下，仰头看，得摞几个你，才够得着池沿。不提交、不判分。',
          '水得提到这个高度，一天十二个时辰，提上去，喷下来，再提上去，中间不能停。这笔账，站到底下好算。'
        ]
      },
      {
        kicker: '道具 · 五段咬合卡',
        prop: true,
        confirm: true,
        lines: [
          '这一页还配了五段卡，凹凸咬合，只有一种顺序能接上，把水走过的路拼出来。',
          '提示一：从最低的地方开始想。',
          '提示二：到了楼顶之后呢？喷出去的水又去了哪儿？',
          '顺序：水道 → 汲水池 → 水车 → 锡海 → 铜管喷口。拼到最后接回第一段。不是线，是圈。自校验，不拍照。',
          '散页残片·水循环圈（不进结局必需拼图），收进档案夹。'
        ]
      },
      {
        kicker: '收尾 · 空栏',
        lines: [
          '拼到最后一段，接回了第一段：不是一条线，是个圈——同一批水，喷出去，落回池子，流进水道，再被提上来，一天要走很多遍。'
        ],
        quotes: [
          '档案页边注：三页纸，三种说法，年代不一，谁也没说服谁。其中一栏是空的。整理这份档案的人，什么都没写。'
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
      '石头还在，土台还在，据说地下的铜管也还在；没了的，是让水上去的那个办法，连记录都对不上。在台子底下坐一会儿，不用给自己下结论。'
    ],
    motif: '连它当年怎么转的，我们都不确定了。',
    next: '/plate21/module/pages/dashuifa/dashuifa',
    nextLabel: '收好夹页 · 前往大水法'
  },
  guanshuifa: {
    no: 'S·F',
    title: '顺路 · 观水法',
    audioStation: 't-guanshuifa',
    narrClip: 'narr-waypoint-guanshuifa',
    intro: '大水法对面，坐南朝北一座平台，上面设过宝座。皇帝当年就在这儿看喷泉：喷泉在南，宝座在北，中间隔着水。档案里记着，乾隆五十八年的英国使团、六十年的荷兰使臣，都被安排在这儿瞻仰过水法。写的是「曾安排」，没写死谁坐过、坐没坐上那张椅子。这一页的人声，话不多。',
    beats: [
      {
        kicker: '现场 · 看',
        lines: [],
        dialogues: [
          { speaker: '乾隆', text: '坐这儿。水，在那边。远人来，领他们看的，就是这个。', clipId: 'dlg-guanshuifa-1', note: '历史人物 · 台词为艺术演绎' }
        ],
        stageNote: '停。',
        dialogues2: [
          { speaker: '乾隆', text: '水法，不过工巧之一端。……中国之大，何奇不有。', clipId: 'dlg-guanshuifa-2', note: '末句引乾隆泽兰堂原注 · 台词为艺术演绎' }
        ]
      },
      {
        kicker: '收尾 · 谁对着谁',
        lines: [
          '入口抄的那半句，原主人在这一页。看看宝座和喷泉，谁对着谁。',
          '不出题，无道具，不设对读。看完就走。'
        ]
      }
    ],
    motif: '喷泉在南，宝座在北，中间隔着水。',
    next: '/plate21/module/pages/s4-timeline/s4-timeline',
    nextLabel: '收好夹页 · 前往雨果雕像'
  },
  xianfahua: {
    no: 'S·E',
    title: '顺路 · 线法画',
    audioStation: 't-xianfahua',
    narrClip: 'narr-waypoint-xianfahua',
    intro: '再往东，是几排砖墙的基址，一层层往里收，越往里越窄，中间一条笔直的通道；要不是档案上画着，这里只像几道普通的矮墙。这一页的人声，是当年挂画的画师。',
    beats: [
      {
        kicker: '现场 · 看',
        lines: [],
        dialogues: [
          { speaker: '画师', text: '站我站的这个地方，方河西岸，往东看。这一片叫线法画：一排墙，挂一排画，画的是西洋景，雪山，街市，望不到头。这法子是西洋的透视，平的墙，从这头往里看，就看出了远近，一条走得进去的街。', clipId: 'dlg-xianfahua-1' }
        ]
      },
      {
        kicker: '道具 · 透视框＋雪山线稿',
        prop: true,
        lines: [
          '墙现在没有了，方河清整过，种了荷；画不在了，纸上还有一张——这一页配了透视框和一张雪山线稿。'
        ],
        dialogues: [
          { speaker: '画师', text: '现在墙空着，画也没了，就剩纸上这一张。你把那张雪山垫到框后头，举起来，对准最里那道墙。眼睛凑到框上，从这头往里看。', clipId: 'dlg-xianfahua-2' }
        ]
      },
      {
        kicker: '收尾 · 放下纸',
        lines: [
          '纸上的雪山落在墙的位置上，合起来的那一下，那片街市确实在那儿；放下纸，又没有了。',
          '对上就是对上了。卡背＝散页残片·雪山（不进结局必需拼图），收进档案夹。'
        ],
        dialogues: [
          { speaker: '画师', text: '收好。别折。', clipId: 'dlg-xianfahua-3' }
        ]
      }
    ],
    motif: '放下纸，又没有了。',
    next: '/plate21/module/pages/s4-timeline/s4-timeline',
    nextLabel: '收好夹页 · 前往雨果雕像'
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
    this.setData({
      site: site,
      confirmed: false,
      revealLines: [],
      narrSrc: site.narrClip ? audioSrc.clip(site.narrClip) : '',
      bgmSrc: site.bgmFile ? audioSrc.bgm(site.bgmFile) : ''
    })
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
