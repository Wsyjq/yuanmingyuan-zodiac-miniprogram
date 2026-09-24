'use strict'
// Editable content only. See docs/v3-content-authoring.md.
module.exports = {
  "schemaVersion": 1,
  "revision": "v3-20260925-latest-docx",
  "entryId": "P1",
  "nodes": [
    {
      "id": "P1",
      "kind": "read",
      "siteId": "",
      "lines": [
        "从历史系毕业以后，我在博物馆做了两年研究助理。我的工作没什么传奇色彩，基本上都是在图书馆整理档案、核对图录、补录编号还有查出处……不过有意思的是，前几天我整理一批圆明园档案时，翻到了《西洋楼铜版图》的著录条目。",
        "《西洋楼铜板图》绘制于乾隆四十六年至五十一年（1781–1786），全套共二十幅，记录了当时西洋楼主要建筑与水法景观的面貌。",
        "可就在把档案放回去的时候，一张小纸片从夹页里掉了出来，上面写了一行小字：\"闻有第二十一图，未见。\"字迹潦草，像是随手记下的传闻。我愣了几秒。第二十一图？我重新核了一遍目录，还是二十幅啊？其实之前做助理时我偶尔也想过，会不会还有尚未被记录下来的画作。可当这个猜想真的有可能被印证时，我还是有些意外。想了想，我决定先去问问老师。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "序章",
      "narrId": "narr-p1",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "P2",
      "skipTo": "E1",
      "presentation": null,
      "relayLines": [],
      "title": "第二十一图的传闻",
      "terms": [
        {
          "key": "sl01",
          "label": "西洋楼铜版图",
          "aliases": [
            "西洋楼铜板图",
            "西洋楼铜版画"
          ]
        }
      ],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "P2",
      "kind": "read",
      "siteId": "",
      "lines": [
        "我拿着那张卡片去找他。他接过去看了好久，又翻到背面，神情明显有些疑惑。老师说，十几年前这批圆明园档案就是他亲手整理的，可他完全不记得见过这张卡片。我猜，会不会只是当年夹在别的材料里，被漏了过去？老师没有马上回答，只是又看了一遍那行字，说既然夹在这里，就别急着扔。我把纸片收了回来。",
        "本来只是一张来路不明的小纸条。但现在，我有点想知道——到底是谁写下了这句话？"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-p2",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "P3",
      "skipTo": "E1",
      "presentation": null,
      "relayLines": [],
      "title": "向老师求证",
      "terms": [],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "P3",
      "kind": "read",
      "siteId": "",
      "lines": [
        "我继续翻阅那份档案，突然在附件夹中发现了一个发黄的牛皮纸档案袋，右上角贴着一张很普通的白色标签：",
        "西洋楼现场考察资料未完成",
        "里面有一封信、一张手绘路线图、几张空白记录页，以及几件用于现场记录的工具。",
        "这下就更奇怪了。一两张纸片可以是遗漏，可这样完整的一套考察资料，为什么一直没有被发现？",
        "拆开档案袋，里面还有一本旧日记，其中写着：",
        "“寻廿一图。旧闻有迹，余尝往寻；所得未尽，留俟后人。——丙午年于西洋楼”",
        "丙午年？？",
        "西洋楼的始建时间是 1747 年，而今年恰恰又是丙午年，那么，在西洋楼建成之后的丙午年有：",
        "1786、1846、1906、1966 和 2026 这 5 个年份。",
        "没有署名，没有具体日期，这份档案愈发引起了我的兴趣。他到底又发现了什么东西呢？我决定带着这份档案前往现场，为这个传言寻找一个答案。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-p3",
      "image": "",
      "propPrompt": "打开档案袋、读日记",
      "playId": "",
      "revealOf": "",
      "next": "E1",
      "skipTo": "E1",
      "presentation": null,
      "relayLines": [],
      "title": "未完成的考察资料",
      "terms": [
        {
          "key": "sl00",
          "label": "丙午"
        }
      ],
      "props": [
        "archive"
      ],
      "propTitle": "整理随身档案",
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "E1",
      "kind": "puzzle",
      "siteId": "gate",
      "lines": [
        "来到了西洋楼入口，我从背包里面取出档案袋，还有那份地图，上面只画出了西洋楼区域的大致轮廓，几个位置做了标记，但有些地名已经模糊了。"
      ],
      "interaction": {
        "title": "辨认方向",
        "lines": [
          "我打开了地图，先确认自己的位置。从上面可以看出来西洋楼的地理位置。西洋楼在圆明三园中的长春园x部"
        ]
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "西洋楼入口",
      "narrId": "narr-e1",
      "image": "",
      "propPrompt": "打开地图再做方位题",
      "playId": "quiz-direction",
      "revealOf": "",
      "next": "E2",
      "skipTo": "E2",
      "presentation": null,
      "relayLines": [],
      "title": "从地图辨认方向",
      "terms": [],
      "props": [
        "map"
      ],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "E2",
      "kind": "read",
      "siteId": "gate",
      "lines": [
        "西洋楼沿着长春园的北界东西展开。虽然叫“楼”，但它不是一栋楼，而是一组楼殿、喷泉和庭园的总称。谐奇趣、方外观、大水法……今天我会一一踏足，去找寻第二十一幅图的线索！",
        "档案袋里还有几张西洋楼的铜版画，或许我在现场中能对应起来这几幅铜版画对应的建筑名字，以及现在长什么样。",
        "地图西侧有一个清晰的标记。“先听声。”",
        "看来第一站已经有人替我选好了。"
      ],
      "interaction": {
        "title": "地图辨位",
        "lines": [
          "答案：d"
        ],
        "requires": "quiz-direction",
        "position": "before"
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-e2",
      "image": "",
      "propPrompt": "袋里有铜版",
      "playId": "",
      "revealOf": "",
      "next": "M1",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "走进西洋楼",
      "terms": [
        {
          "key": "sl02",
          "label": "西洋楼"
        },
        {
          "key": "sl05",
          "label": "长春园"
        }
      ],
      "props": [
        "prints"
      ],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "M1",
      "kind": "nav",
      "siteId": "xieqiqu",
      "lines": [],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "",
      "image": "整页导航图",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "X1",
      "skipTo": "M2",
      "presentation": null,
      "relayLines": [],
      "title": "",
      "terms": [],
      "props": []
    },
    {
      "id": "X1",
      "kind": "puzzle",
      "siteId": "xieqiqu",
      "lines": [
        "按照路线图走进入口，就来到了谐奇趣。我记得这是西洋楼景区建成的第一座欧式建筑，也是中国皇家园林史上首座西洋建筑。主楼前后都曾设有水法，这里还曾用于演奏中西音乐。怪不得叫“谐奇趣”，要是能听听当时的音乐就好了。"
      ],
      "interaction": {
        "title": "听见谐奇趣",
        "lines": [
          "喷泉声、少数民族音乐和西洋音乐。"
        ]
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "谐奇趣",
      "narrId": "narr-x1",
      "image": "",
      "propPrompt": "用音乐贴片",
      "playId": "listen-nfc",
      "revealOf": "",
      "next": "X2",
      "skipTo": "X2",
      "presentation": null,
      "relayLines": [],
      "title": "听见谐奇趣",
      "terms": [
        {
          "key": "sl03",
          "label": "谐奇趣"
        },
        {
          "key": "sl06",
          "label": "水法"
        }
      ],
      "props": [
        "music"
      ]
    },
    {
      "id": "X2",
      "kind": "puzzle",
      "siteId": "xieqiqu",
      "lines": [
        "如此悠扬动耳的音乐，真不愧“谐奇趣”三字之名。想不到这铜版图背后还隐藏着这么有趣的东西。不过这样看来，一幅画能记录的东西，似乎没有我想象中那么多。",
        "下一站要到哪里去呢？地图上的标记是模糊的，我一时没有了头绪。"
      ],
      "interaction": {
        "title": "下一站去哪",
        "lines": [
          "日记和信封会指引你第一站的方向",
          "信封的封口处和信的背面都有一半的字，拼接起来看一下！"
        ]
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-x2",
      "image": "",
      "propPrompt": "信封的封口处和信的背面都有一半的字，拼接起来看一下！",
      "playId": "quiz-envelope",
      "revealOf": "",
      "next": "X3",
      "skipTo": "M2",
      "presentation": null,
      "relayLines": [],
      "title": "寻找下一站",
      "terms": [],
      "props": [
        "envelope"
      ],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "X3",
      "kind": "read",
      "siteId": "xieqiqu",
      "lines": [
        "原来线索在这里！看来，下一步该往那里走了。"
      ],
      "interaction": {
        "title": "下一站去哪",
        "lines": [
          "黄花阵"
        ],
        "position": "before"
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-x3",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "quiz-envelope",
      "next": "M2",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "线索拼起来了",
      "terms": [],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "M2",
      "kind": "nav",
      "siteId": "maze",
      "lines": [],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "",
      "image": "整页导航图",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "H1",
      "skipTo": "M3",
      "presentation": null,
      "relayLines": [],
      "title": "",
      "terms": [],
      "props": []
    },
    {
      "id": "H1",
      "kind": "puzzle",
      "siteId": "maze",
      "lines": [
        "到了黄花阵的入口时，眼前景观让我有些震惊——这不是普通的园林道路，而是一个迷宫！可是皇家宫苑中为什么会有一座迷宫呢？"
      ],
      "interaction": {
        "title": "迷宫的修建目的",
        "lines": [
          "我不禁好奇，这迷宫的修建目的是"
        ]
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "黄花阵",
      "narrId": "narr-h1",
      "image": "",
      "propPrompt": "",
      "playId": "quiz-lantern",
      "revealOf": "",
      "next": "H2",
      "skipTo": "H3",
      "presentation": null,
      "relayLines": [],
      "title": "皇家宫苑中的迷宫",
      "terms": [
        {
          "key": "sl07",
          "label": "黄花阵"
        }
      ],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "H2",
      "kind": "read",
      "siteId": "maze",
      "lines": [
        "原来，这个黄花阵并不是为了防御，而是皇帝用来观赏宫女在迷宫路径中奔跑嬉戏的。这么一看，黄花阵倒更像是一座专门为节庆准备的皇家游乐场。不过，既然它本来是一座迷宫，为什么偏偏叫“黄花阵”？难道也和当时的游戏有关？"
      ],
      "interaction": {
        "title": "迷宫的修建目的",
        "lines": [
          "黄花阵的作用：每逢中秋之夜，皇帝会坐在阵中心的凉亭里，观赏宫女们在迷宫路径中奔跑嬉戏。最先到达中心的人会得到皇帝的赏赐。"
        ],
        "position": "before"
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-h2",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "quiz-lantern",
      "next": "H3",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "迷宫里的灯会",
      "terms": [],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "H3",
      "kind": "puzzle",
      "siteId": "maze",
      "lines": [
        "原来，“黄花”说的并不是迷宫里种着黄色的花。这么一想，“黄花阵”这个名字就很形象了。夜里的迷宫中，一盏盏黄色花灯在墙间移动，今天白天走进这里，很难完全想象当年的场景，但至少可以亲自试试这座迷宫究竟有多难走。也许黄花阵的中央，还有什么我值得考察的东西呢。"
      ],
      "interaction": {
        "title": "黄花阵名字的由来",
        "lines": [
          "翻面揭晓答案"
        ],
        "revealLines": [
          "黄花阵名字由来：由于宫女们手持黄色彩绸扎成的莲花灯，所以这个迷宫也得名黄花阵。"
        ]
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-h3",
      "image": "",
      "propPrompt": "翻黄花阵图",
      "playId": "prop-flip",
      "revealOf": "",
      "next": "H4",
      "skipTo": "H4",
      "presentation": null,
      "relayLines": [],
      "title": "黄花阵的名字",
      "terms": [],
      "props": [
        "maze"
      ],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "H4",
      "kind": "puzzle",
      "siteId": "maze",
      "lines": [
        "终于到了中心亭了，融合了中西审美，好别致的亭子！"
      ],
      "interaction": {
        "title": "中西结合的观察",
        "lines": [
          "你能找到这座亭子建筑风格中西结合的具体体现吗，找到后请拍照记录你的考察结果",
          "亭子整体「西式穹顶 + 中式八角飞檐混搭结构」",
          "亭子八角飞檐的八个檐角位置，全部标注有小型立式装饰物；西方原版欧式凉亭檐角无任何立兽，纯光面檐口，证明这个构件是中式附加增设；",
          "版画里该构件基座为中式莲座（中式走兽标配莲花基座），上部花苞造型是西洋园林宝瓶花苞样式。",
          "弧形基座浮雕：这一圈弧形壁面分为两种交替排布的浮雕版式，西式巴洛克基底，局部混入中式吉祥元素主体核心是对称双天鹅巴洛克纹样，中式本土化改造：清宫石匠在天鹅胸腹位置悄悄刻了简化蝙蝠纹路（藏在浮雕中心交汇处），把西方天鹅，叠加中式「蝙蝠寓意福气」的吉祥内涵"
        ]
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-h4",
      "image": "用户刚拍的照片",
      "propPrompt": "",
      "playId": "photo-pavilion",
      "revealOf": "",
      "next": "H5",
      "skipTo": "H5",
      "presentation": null,
      "relayLines": [],
      "title": "中心亭的观察记录",
      "terms": [],
      "props": []
    },
    {
      "id": "H5",
      "kind": "puzzle",
      "siteId": "maze",
      "lines": [
        "刚才一直在看屋顶和结构，现在才发现，真正有意思的还不只是建筑轮廓。檐角、基座、墙面这些不太起眼的位置，也藏着很多细节。我记得从黄花阵迷宫入口这一路走来，阵墙上似乎也反复出现过一种纹样。"
      ],
      "interaction": {
        "title": "黄花阵花纹观察",
        "lines": []
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-h5",
      "image": "四张浮雕照片",
      "propPrompt": "选出看到的花纹",
      "playId": "quiz-pattern",
      "revealOf": "",
      "next": "H6",
      "skipTo": "M3",
      "presentation": null,
      "relayLines": [],
      "title": "认出一路上的花纹",
      "terms": [],
      "props": [
        "patterns"
      ],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "H6",
      "kind": "read",
      "siteId": "maze",
      "lines": [
        "原来一路反复出现的是万字纹，“卐字不到头”“万寿无疆”，好寓意啊！虽说墙体和亭子都并不是乾隆年间留下的原墙的，但却让“万寿无疆”的吉祥寓意和皇家游乐的场景得以重现。",
        "走出迷宫，我又翻开那册铜版图。刚才那座中心亭已经让我第一次意识到，所谓“西洋楼”，并不完全是西洋的，而是中西结合的集大成者。而下一幅图更奇怪——方外观。西式的两层楼体上，压着中国式重檐屋顶，建筑里还出现了阿拉伯文字。我要亲自去看看。"
      ],
      "interaction": {
        "title": "黄花阵花纹观察",
        "lines": [
          "沿途看到的，是万字纹。"
        ],
        "position": "before"
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-h6",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "quiz-pattern",
      "next": "M3",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "花纹里的寓意",
      "terms": [
        {
          "key": "sl08",
          "label": "黄花阵复建",
          "aliases": [
            "黄花阵今墙",
            "墙体和亭子",
            "原墙"
          ]
        }
      ],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "M3",
      "kind": "nav",
      "siteId": "fangwaiguan",
      "lines": [],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "",
      "image": "整页导航图",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "F1",
      "skipTo": "M4",
      "presentation": null,
      "relayLines": [],
      "title": "",
      "terms": [],
      "props": []
    },
    {
      "id": "F1",
      "kind": "read",
      "siteId": "fangwaiguan",
      "lines": [
        "现在的方外观只剩下部分台基和石构，不过档案中的铜版图还保存着它原本的样子：两层西式楼体、半环形石阶，上面却盖着中国传统样式的重檐屋顶，内部曾设置阿拉伯文碑刻。",
        "可是西式楼体、中式屋顶、阿拉伯文碑刻，三种看起来完全不同的元素，为什么会同时出现在一座建筑里？",
        "答案，或许和住在这里的人有关。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "方外观",
      "narrId": "narr-f1",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "FQ1",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "方外观",
      "terms": [
        {
          "key": "sl09",
          "label": "方外观"
        }
      ],
      "props": [
        "prints"
      ],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "FQ1",
      "title": "方外观的人物线索",
      "kind": "puzzle",
      "siteId": "fangwaiguan",
      "lines": [],
      "interaction": {
        "title": "人物线索",
        "lines": [
          "方外观档案里还夹着三张人物线索卡，请找出与方外观真正有关的人。"
        ]
      },
      "playId": "quiz-fang-person",
      "next": "FQ2",
      "skipTo": "FQ2",
      "terms": [],
      "props": [],
      "narrId": "",
      "addedInRevision": "v3-20260925-latest-docx"
    },
    {
      "id": "FQ2",
      "title": "方外观的用途",
      "kind": "puzzle",
      "siteId": "fangwaiguan",
      "lines": [],
      "interaction": {
        "title": "建筑用途",
        "lines": [
          "根据现有史料，方外观更可能承担过哪一种用途？"
        ]
      },
      "playId": "quiz-fang-use",
      "next": "FR1",
      "skipTo": "F2",
      "terms": [],
      "props": [],
      "narrId": "",
      "addedInRevision": "v3-20260925-latest-docx"
    },
    {
      "id": "FR1",
      "title": "方外观里的生活",
      "kind": "read",
      "siteId": "fangwaiguan",
      "lines": [
        "容妃在圆明园居住时曾在方外观礼拜。建筑中的阿拉伯文碑刻，也因此不再只是“奇特装饰”，而与这里真实发生过的生活有关。"
      ],
      "interaction": null,
      "playId": "",
      "next": "F2",
      "skipTo": "",
      "terms": [
        {
          "key": "sl10",
          "label": "容妃"
        },
        {
          "key": "sl09",
          "label": "方外观"
        }
      ],
      "props": [],
      "narrId": "",
      "revealOf": "quiz-fang-use",
      "portrait": "/assets/fig/rongfei.jpg",
      "addedInRevision": "v3-20260925-latest-docx"
    },
    {
      "id": "F2",
      "kind": "read",
      "siteId": "fangwaiguan",
      "lines": [
        "原来，眼前这些看似有些“混搭”的建筑元素，并不是随意拼在一起的。它们背后，实际上对应着不同的文化背景和真实的使用需求。",
        "顺着铜版图继续看，会发现它和南侧的一组亭廊建筑几乎形成了对应关系——那就是五竹亭。",
        "这里，后来又留下了不少与乾隆、容妃有关的故事。哪些可以得到史料印证，哪些只是后来人的想象，如今已经很难一一分清。离开五竹亭时，我回头看了一眼。这里留下的故事很安静——一座礼拜的建筑，一组亭子，还有一些真假难辨的旧闻。",
        "真假难辨的旧闻？这第二十一幅铜版画或许也算是真假难辨的旧闻吧，到现在为止，我还没有任何收获。来不及多想了，我决定继续往东走。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-f2",
      "image": "容妃图，渐显",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "M4",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "五竹亭的旧闻",
      "terms": [
        {
          "key": "sl10",
          "label": "容妃"
        },
        {
          "key": "sl11",
          "label": "五竹亭"
        }
      ],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "M4",
      "kind": "nav",
      "siteId": "haiyantang",
      "lines": [],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "",
      "image": "整页导航图",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "HY1",
      "skipTo": "M5",
      "presentation": null,
      "relayLines": [],
      "title": "",
      "terms": [],
      "props": []
    },
    {
      "id": "HY1",
      "kind": "puzzle",
      "siteId": "haiyantang",
      "lines": [
        "海晏堂，名字取自“河清海晏”一词，寓意天下太平。可真正吸引我注意的，并不是它的名字，而是门前喷水池两侧整齐排列的十二尊兽首。它们代表十二时辰，依次喷水构成报时系统。让铜像报时，这种“高科技”的东西，在当时那个年代是怎么实现的呢？"
      ],
      "interaction": {
        "title": "海晏堂的十二生肖水力钟",
        "lines": [
          "看看不同时辰的水流。14时由哪个兽首喷水？正午又会怎样？"
        ]
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "海晏堂",
      "narrId": "narr-hy1",
      "image": "十二时辰喷水示意",
      "propPrompt": "",
      "playId": "quiz-hour",
      "revealOf": "",
      "next": "HY2",
      "skipTo": "HY3",
      "presentation": null,
      "relayLines": [],
      "title": "海晏堂的水力钟",
      "terms": [
        {
          "key": "sl12",
          "label": "海晏堂"
        }
      ],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "HY2",
      "kind": "read",
      "siteId": "haiyantang",
      "lines": [
        "可当复原画面慢慢淡下去，我再看向眼前的遗址，感觉完全不一样了。过去这里有十二尊兽首，有不断变化的水流，也有完整的海晏堂建筑。今天留下的，只剩下断壁残垣。那些兽首后来流散各处，有些已经回到国内，也还有一些仍未归来。"
      ],
      "interaction": {
        "title": "十二生肖水力钟",
        "lines": [
          "到了正午，十二道水流同时喷出。"
        ],
        "position": "before"
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-hy2",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "quiz-hour",
      "next": "HY3",
      "skipTo": "",
      "presentation": {
        "kind": "water-clock-finale"
      },
      "relayLines": [],
      "title": "十二兽首的水流",
      "terms": [],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "HY3",
      "kind": "puzzle",
      "siteId": "haiyantang",
      "lines": [
        "十二生肖的精妙设计，让不同的兽首都可以准确运转报时，可是这些喷泉没有现代水泵，那水到底是从哪里来的？又为什么能够从兽首口中喷出来？",
        "我翻开地图继续找，海晏堂北面还有一处蓄水楼。如果这是一套完整的水法系统，答案或许不在喷泉前，而在它背后。"
      ],
      "interaction": {
        "title": "转盘花纹匹配",
        "lines": [
          "使用转盘，根据花纹匹配寻找信息"
        ]
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-hy3",
      "image": "",
      "propPrompt": "使用转盘",
      "playId": "prop-dial",
      "revealOf": "",
      "next": "M5",
      "skipTo": "M5",
      "presentation": null,
      "relayLines": [],
      "title": "转盘里的信息",
      "terms": [],
      "props": [
        "dial"
      ],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "M5",
      "kind": "nav",
      "siteId": "xushuilou",
      "lines": [],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "",
      "image": "整页导航图",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "XS1",
      "skipTo": "M6",
      "presentation": null,
      "relayLines": [],
      "title": "",
      "terms": [],
      "props": []
    },
    {
      "id": "XS1",
      "kind": "puzzle",
      "siteId": "xushuilou",
      "lines": [
        "走近以后，答案已经很明显了。原来喷泉的水，靠的就是这座蓄水楼。",
        "眼前这处高台，就是海晏堂北面的蓄水设施，不是谐奇趣西北那座。刚才在海晏堂看见兽首喷水，水源在这里。",
        "可是为什么能把水提高呢？特刊里似乎有线索"
      ],
      "interaction": {
        "title": "水法的物理原理",
        "lines": [
          "蓄水楼为了方便供水，通常会建得比较"
        ]
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "蓄水楼",
      "narrId": "narr-xs1",
      "image": "",
      "propPrompt": "看特刊",
      "playId": "quiz-height",
      "revealOf": "",
      "next": "XS2",
      "skipTo": "M6",
      "presentation": null,
      "relayLines": [],
      "title": "蓄水楼的线索",
      "terms": [
        {
          "key": "sl13",
          "label": "蓄水楼"
        }
      ],
      "props": [
        "bulletin"
      ],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "XS2",
      "kind": "read",
      "siteId": "xushuilou",
      "lines": [
        "原来所谓“水法”，并不是凭空出现的奇观。先把水送到高处，再利用高度差获得水压，最终从更低处的喷嘴喷出。这样一来，海晏堂前那些看起来十分华丽的水法，背后其实依靠的是一整套完整的供水和蓄水系统。",
        "而档案里规模最大的一处水法，还在前面。如果海晏堂让我看懂了“水是怎么报时的”，那下一站，我更想看看——这些水法真正被做到极致时，究竟会是什么样子。我收起特刊，沿路向东，前往大水法。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-xs2",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "quiz-height",
      "next": "M6",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "水法背后的工程",
      "terms": [
        {
          "key": "sl04",
          "label": "水法"
        }
      ],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "M6",
      "kind": "nav",
      "siteId": "dashuifa",
      "lines": [],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "",
      "image": "整页导航图",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "DS1",
      "skipTo": "M7",
      "presentation": null,
      "relayLines": [],
      "title": "",
      "terms": [],
      "props": []
    },
    {
      "id": "DS1",
      "kind": "puzzle",
      "siteId": "dashuifa",
      "lines": [
        "顺着档案上的路线继续往前，大水法遗址逐渐出现在眼前。",
        "和海晏堂相比，这里的遗迹看起来更直观一些。高大的石龛依然立在原处，也是今天很多人最熟悉的圆明园遗址形象之一。但只看现在的样子，还是很难想象它当年到底是什么样的。在小学课文中圆明园的插图，也就是这里的实拍图。",
        "我翻了翻档案，正好找到了一幅《大水法南面》的铜版图。",
        "图中的石构轮廓和眼前能够对得上。",
        "但真正吸引我注意的，反而是前面的喷水池。水池中央，竟然站着一只鹿。而它周围，还围着一圈动物。这些东西为什么会出现在喷泉里？"
      ],
      "interaction": {
        "title": "大水法",
        "lines": [
          "请将《西洋楼铜版图·大水法南面》的铜版画和眼前遗址进行对照，复原档案中残存的部分。",
          "画中还缺少鹿与猎犬。请对照铜版图，将它们拖回水池中的位置。"
        ]
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "大水法",
      "narrId": "narr-ds1",
      "image": "",
      "propPrompt": "对照《大水法南面》",
      "playId": "place-animals",
      "revealOf": "",
      "next": "DS2",
      "skipTo": "M7",
      "presentation": null,
      "relayLines": [],
      "title": "对照铜版图复原水法",
      "terms": [
        {
          "key": "sl14",
          "label": "大水法"
        }
      ],
      "props": [
        "prints"
      ],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "DS2",
      "kind": "read",
      "siteId": "dashuifa",
      "lines": [
        "原来这些动物并不是随便摆在喷泉里的装饰。鹿站在中间，猎狗围在周围，水流一喷起来，周围十只铜猎狗同时向中央喷水，形成“猎狗逐鹿”的动态景象。原本静止在铜版图里的雕塑，一下子像活了起来。大水法对面的观水法，正是皇帝当年观赏喷泉的地方。如果站在那里向北望，眼前看到的，曾经就是这一整套正在运转的水法。",
        "猎狗、铜鹿与水流，都回到了画中的位置。",
        "我抬起头，想再和眼前的遗址对照一次。",
        "可这一回，我突然不知道该从哪里开始对照了。",
        "铜鹿不在了，猎狗不在了，喷水塔也不在了。几秒前还完整存在于屏幕里的景象，回到现实以后，只剩下眼前这些沉默的石构。我再次看向手里的铜版图。刚才一路上，我一直在借它想象西洋楼曾经的样子。可直到这一刻，我才真正意识到——铜版图记录下来的，是它曾经完整存在的时刻。而我现在看到的，是后来发生的一切留下的痕迹。",
        "这两幅“画”，并不属于同一个时间。"
      ],
      "interaction": {
        "title": "大水法构件归位",
        "lines": [
          "梅花鹿 → 喷水池中央十只猎狗 → 环绕梅花鹿两只大型卷尾铜兽 → 水池东西两端",
          "大水法中央原有一只铜制梅花鹿，鹿角喷水；周围十只铜猎狗同时向鹿喷水，组成“猎狗逐鹿”的场景，喷水池东西两端还设有大型卷尾铜兽。水流、雕塑和建筑共同组成了一整套动态景观。"
        ],
        "position": "before"
      },
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-ds2",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "place-animals",
      "next": "M7",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "重新看眼前的遗址",
      "terms": [
        {
          "key": "sl15",
          "label": "观水法"
        }
      ],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "M7",
      "kind": "nav",
      "siteId": "hugo",
      "lines": [],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "",
      "image": "整页导航图",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "HG1",
      "skipTo": "FN1",
      "presentation": null,
      "relayLines": [],
      "title": "",
      "terms": [],
      "props": []
    },
    {
      "id": "HG1",
      "kind": "read",
      "siteId": "hugo",
      "lines": [
        "旧图告诉我，这里曾经有什么。而眼前的遗址告诉我，它后来失去了什么。沿着道路继续向前，我看到一个并不属于清代的人——雨果。这是一位同样愤怒的法国作家。",
        "1860年，英法联军劫掠并焚毁圆明园。1861年，圆明园被焚毁后的第二年，雨果写下《致巴特勒上尉的信》，公开谴责英法联军对圆明园的劫掠和焚毁。他从来没有来过这里。但如今，他的雕像就立在西洋楼遗址旁，静静地凝视着那断壁残垣。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "雨果雕像",
      "narrId": "narr-hg1",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "FN1",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "雨果与那封信",
      "terms": [
        {
          "key": "sl17",
          "label": "雨果"
        }
      ],
      "props": [],
      "narrationPending": "最新稿正文已调整，待匹配录音"
    },
    {
      "id": "FN1",
      "kind": "read",
      "siteId": "",
      "lines": [
        "至此，西洋楼遗址已经快走完了，可是，第二十一幅画到底在哪呢？",
        "密集交错的线条构成明暗，锐利的刻痕描绘着建筑轮廓，仿佛一幅真正的《西洋楼铜版图》。",
        "画面中没有乾隆时期的宫苑盛景。",
        "而是记录着我一路走过的地方：黄花阵的中心亭、海晏堂残存的石座、大水法的断壁，以及雨果雕像前停留的身影……以及档案包和其中的文件。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "结局",
      "narrId": "narr-fn1",
      "image": "第二十一图",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "FN2",
      "skipTo": "",
      "presentation": {
        "kind": "engraving-reveal",
        "cue": "暗场后铜版风格画面渐显"
      },
      "relayLines": [],
      "title": "第廿一图浮现",
      "terms": [],
      "props": []
    },
    {
      "id": "FN2",
      "kind": "read",
      "siteId": "",
      "lines": [
        "这究竟是怎么回事？",
        "如果你看到这里，说明你已经走完了这条路。你一定很好奇，那幅传闻中的第二十一幅版画，究竟在哪里。其实，它从未被藏在某个地方。因为它从来不是一幅等待被发现的旧画。它是一幅等待被后来者完成的“新画”。",
        "西洋楼的二十幅版画，把西洋楼记录得完完整整，喷泉、石柱、兽首、琉璃瓦，样样俱全。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-fn2",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "FN3",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "一封留给后来者的信",
      "terms": [],
      "props": []
    },
    {
      "id": "FN3",
      "kind": "read",
      "siteId": "",
      "lines": [
        "可是，站在今天的遗址前，还有许多东西没有被画下来。那些断裂的石柱，那些被火焚烧后的痕迹，那些流散海外、等待归来的文物，还有无数后来的人，站在废墟前发出的叹息。所以，我留下了这个传闻。希望有一天，会有人因为这个问题，重新走进这片遗址，将那些未曾被记录的一一记下。",
        "每一个来到这里、认真看过它的人，都在画第21幅的第N个版本。",
        "它记录毁灭，也记录重生。",
        "记录失去，也记录被重新看见。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-fn3",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "FN4",
      "skipTo": "",
      "presentation": {
        "kind": "archive-reveal",
        "cue": "正文结束后显示作品预览"
      },
      "relayLines": [],
      "title": "今天的记录",
      "terms": [],
      "props": []
    },
    {
      "id": "FN4",
      "kind": "sign",
      "siteId": "",
      "lines": [
        "《西洋楼铜版图·第二十一图》",
        "写下署名，保存这次考察留下的记录。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [
        "《西洋楼铜版图·第二十一图》"
      ],
      "sectionTitle": "",
      "narrId": "",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "LT1",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "为考察记录署名",
      "terms": [],
      "props": []
    },
    {
      "id": "LT1",
      "dialogueGroups": [
        2
      ],
      "kind": "letter",
      "siteId": "",
      "lines": [
        "昨天，你已经走完了西洋楼。",
        "但昨天，还有一件事没有告诉你。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "彩蛋：离园之后",
      "narrId": "narr-lt1",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "LT2",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "那次考察之后",
      "terms": [],
      "props": []
    },
    {
      "id": "LT2",
      "dialogueGroups": [
        2,
        2,
        2
      ],
      "kind": "letter",
      "siteId": "",
      "lines": [
        "不错，这份档案，最初确实是我留下的。",
        "我那个学生是历史系出身，受惯了历史学的训练，碰见什么问题，总想着先翻文献、查目录、找出处。我一直想带他真正去现场走一趟——有些东西，坐在书桌前是看不出来的。只是那几年我身体已经不大好了，实在没办法陪着他从头走到尾。",
        "所以我想了个办法。",
        "我把年轻时在西洋楼考察时看过的、想过的东西重新整理出来，又故意添上了一些线索，做成这只档案袋。那张写着“闻有第二十一图，未见”的纸片，那本故作神秘的旧日记，还有一路上的地图、谜题和提示——都是我安排的。",
        "我知道他一定会上钩。",
        "果然，他带着这只档案袋去了西洋楼。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-lt2",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "LT3",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "是谁留下了档案",
      "terms": [],
      "props": []
    },
    {
      "id": "LT3",
      "dialogueGroups": [
        2,
        1,
        2
      ],
      "kind": "letter",
      "siteId": "",
      "lines": [
        "不过，有件事后来连我自己也没有想到。 后来，又有人拿着它走了一遍。",
        "再后来，又有了第三个人、第四个人……",
        "每个人寻找的都是同一幅“第二十一图”，走过的也是差不多的一条路，可最后留下来的东西却都不一样。有人记住了黄花阵的屋檐，有人一直在研究水法，有人在大水法前站了很久，也有人只留下了一张照片、一句话。",
        "所以你今天看到的这份档案，早就不只是我当年留给一个学生的考察题了。",
        "你只是许多“第二十一图探寻者”中的一位。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-lt3",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "LT4",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "后来者的记录",
      "terms": [],
      "props": []
    },
    {
      "id": "LT4",
      "dialogueGroups": [
        1,
        1,
        2
      ],
      "kind": "letter",
      "siteId": "",
      "lines": [
        "关于圆明园西洋楼，还有很多事情，我当年没来得及编进谜题里。既然你已经走到这里了，老夫再多絮叨几句。",
        "《西洋楼铜版画》共有二十幅，乾隆四十六年至五十一年由伊兰泰起稿、造办处在北京刻印。如今，在圆明园含经堂中仍可以看到这套铜版画；谐奇趣的翻尾石鱼，如今还能在北京大学未名湖西侧见到；观水法巴洛克石门的部分构件后来辗转到了颐和园；大水法的一对石鱼，也已经回到了圆明园。",
        "你今天走过的这些地方，并没有全部消失。",
        "有些东西留在原地，有些散落到了别处，有些留在旧画里，还有一些，只留在后来人的记录中。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-lt4",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "LT5",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "遗址之外的去处",
      "terms": [],
      "props": []
    },
    {
      "id": "LT5",
      "dialogueGroups": [
        3,
        4,
        3
      ],
      "kind": "letter",
      "siteId": "",
      "lines": [
        "至于这份档案——我其实只真正替第一个学生安排好了第一步。日记把他引到黄花阵以后，后面的路，我故意没有再替他写死。",
        "我能告诉他去哪里，却不能替他决定在那里看到什么。",
        "后来这份档案传到其他人手上，我也一直保留着这个规矩。",
        "对了。",
        "那本日记最后写着：",
        "“丙午年于西洋楼。”",
        "想必当年第一个拿到档案的傻小子，还真认真算过究竟是哪一个丙午年。",
        "1786？1846？1906？1966？",
        "都不是。 其实就是2026年。",
        "那本所谓的“旧日记”，也是我故意做旧的。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-lt5",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "LT6",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "丙午年的答案",
      "terms": [],
      "props": []
    },
    {
      "id": "LT6",
      "dialogueGroups": [
        2,
        2
      ],
      "kind": "letter",
      "siteId": "",
      "lines": [
        "不过，先别急着怪老夫骗你。",
        "因为这个骗局，后来慢慢变成了一件真的事情。",
        "第二十一幅旧铜版画从来没有存在过。",
        "可这么多年来，已经真的有许多人，为了寻找它来到这里，重新看了一遍西洋楼，又留下了一点属于自己的东西。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-lt6",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "LT7",
      "skipTo": "",
      "presentation": null,
      "relayLines": [
        "而且——",
        "上一位探寻“第二十一图”的人，也给你留下了一件东西。"
      ],
      "title": "一份接力记录",
      "terms": [],
      "props": []
    },
    {
      "id": "LT7",
      "dialogueGroups": [
        1
      ],
      "kind": "letter",
      "siteId": "",
      "lines": [
        "所以，我最后还想问你一个问题。你愿意为下一位来到这里的人，留下点什么吗？可以是一句话。可以是一张今天拍下的照片。也可以是一个你希望他到了现场以后，替你再看一眼的地方。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-lt7",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "LT8",
      "skipTo": "",
      "presentation": null,
      "relayLines": [
        "看完了吗？",
        "他当时也不知道，这些东西最后会被谁看到。",
        "就像现在的你，也不知道下一次打开这只档案袋的人是谁。"
      ],
      "title": "留下你的记录",
      "terms": [],
      "props": []
    },
    {
      "id": "LT8",
      "dialogueGroups": [
        2,
        4
      ],
      "kind": "letter",
      "siteId": "",
      "lines": [
        "你留下的内容，在经过审核之后，也许会出现在下一位探寻者收到的“次日回信”里。",
        "到那时候，你也会成为这份档案的一部分。",
        "至于“第二十一图”究竟在哪里——",
        "我想，你现在应该已经不需要老夫告诉你答案了。",
        "这份档案还会继续传下去。",
        "所以，还请替老夫保守这个关于第廿一图的秘密。"
      ],
      "interaction": null,
      "beforeLines": [],
      "answerLines": [],
      "signedLines": [],
      "sectionTitle": "",
      "narrId": "narr-lt8",
      "image": "",
      "propPrompt": "",
      "playId": "",
      "revealOf": "",
      "next": "",
      "skipTo": "",
      "presentation": null,
      "relayLines": [],
      "title": "收好这份档案",
      "terms": [],
      "props": []
    }
  ]
}
