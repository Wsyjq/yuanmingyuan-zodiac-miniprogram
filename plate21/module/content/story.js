'use strict'
// Editable content only. See docs/v3-content-authoring.md.
module.exports = {
  "schemaVersion": 1,
  "revision": "v3-20260925",
  "entryId": "P1",
  "nodes": [
    {
      "id": "P1",
      "kind": "read",
      "siteId": "",
      "lines": [
        "从历史系毕业以后，我在博物馆做了两年研究助理。大多数时候，都是在图书馆整理馆藏档案、核对图录还有补录那些没人愿意细看的编号和出处。前几天，我整理到一批圆明园档案，顺手翻开了《西洋楼铜版图》的著录条目。",
        "《西洋楼铜板图》绘制于乾隆四十六年至五十一年（1781–1786），全套共二十幅，记录了当时西洋楼主要建筑与水法景观的面貌。",
        "但吸引我的是，档案里还夹着一张小纸片，上面写了一行小字：\"闻有第二十一图，未见。\"字迹潦草，像是随手记下的传闻。之前做助理时偶尔我也曾想过，是否会有更多的画作目前没有被记录下来呢。这引起了我的兴趣。"
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
      "props": []
    },
    {
      "id": "P2",
      "kind": "read",
      "siteId": "",
      "lines": [
        "我拿着那张卡片去问老师，想确认他以前有没有听说过《西洋楼铜版图》还存在“第二十一幅”。他接过卡片，看了好一会儿，又翻到背面确认了一遍，神情明显有些疑惑。老师说，十几年前这批圆明园档案就是他亲手整理的，可他完全不记得见过这张卡片。我试着猜，会不会只是当年夹在别的材料里，被漏了过去。老师没有马上回答，只是又看了一遍那行字。见他也说不出原因，我只能先把这件事记在心里，重新把视线落回档案上。"
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
      "props": []
    },
    {
      "id": "P3",
      "kind": "read",
      "siteId": "",
      "lines": [
        "我继续翻阅那份残缺的档案，突然在附件夹中发现了一份尚未整理完成的考察资料。牛皮纸已经发黄，右上角贴着一张很普通的白色标签：",
        "西洋楼现场考察资料未完成",
        "里面有一封信、一张手绘路线图、几张空白记录页，以及几件用于现场记录的工具。",
        "这下就更奇怪了。一两张纸片可以是遗漏，可这样完整的一套考察资料，为什么一直没有被发现？",
        "我拆开档案袋，里面还有一本旧日记，其中写着：",
        "“寻廿一图。旧闻有迹，余尝往寻；所得未尽，留俟后人。——丙午年于西洋楼”",
        "丙午年？？",
        "西洋楼的始建时间是 1747 年，而今年恰恰又是丙午年，那么，在西洋楼建成之后的丙午年有：",
        "这之后的丙午年有 1786、1846、1906、1966 和 2026 这 5 个年份。",
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
      "propTitle": "整理随身档案"
    },
    {
      "id": "E1",
      "kind": "puzzle",
      "siteId": "gate",
      "lines": [
        "来到了西洋楼入口，我从背包里面取出档案袋，还有那份地图，决定按照上面手绘的路线图走。"
      ],
      "interaction": {
        "title": "互动玩法｜玩法内容",
        "lines": [
          "我打开了地图，从上面可以看出来西洋楼的地理位置。西洋楼在圆明三园中的长春园x部"
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
      ]
    },
    {
      "id": "E2",
      "kind": "read",
      "siteId": "gate",
      "lines": [
        "西洋楼沿着长春园的北界东西展开。虽然叫“楼”，但它不是一栋楼，而是一组楼殿、喷泉和庭园的总称。谐奇趣、方外观、大水法……今天我将一一踏足，去找寻第二十一幅图的线索。",
        "档案袋里还有几张西洋楼的铜版画，或许我在现场中能对应起来这几幅铜版画对应的建筑名字，以及现在长什么样。"
      ],
      "interaction": {
        "title": "互动揭晓｜地图辨位",
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
      ]
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
        "title": "互动玩法｜音画内容（程序设计参考）",
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
        "如此悠扬动耳的音乐，真不愧“谐奇趣”三字之名。",
        "下一站要到哪里去呢？我一时没有了头绪。"
      ],
      "interaction": {
        "title": "互动玩法｜下一站去哪",
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
      ]
    },
    {
      "id": "X3",
      "kind": "read",
      "siteId": "xieqiqu",
      "lines": [
        "原来线索在这里上！下一站的去处很明确了：黄花阵。"
      ],
      "interaction": {
        "title": "互动揭晓｜下一站去哪",
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
      "props": []
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
        "到了黄花阵的入口处，眼前景观让我有些震惊——一个皇家宫苑中竟有一座迷宫！可是皇家宫苑中为什么会有一座迷宫呢？"
      ],
      "interaction": {
        "title": "互动玩法｜迷宫的修建目的",
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
      "props": []
    },
    {
      "id": "H2",
      "kind": "read",
      "siteId": "maze",
      "lines": [
        "原来，这个黄花阵是皇帝用来观赏宫女在迷宫路径中奔跑嬉戏的。好嘛，这下不出门就有游乐场了！可是这又和“黄花”有什么关系呢？"
      ],
      "interaction": {
        "title": "互动揭晓｜迷宫的修建目的",
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
      "props": []
    },
    {
      "id": "H3",
      "kind": "puzzle",
      "siteId": "maze",
      "lines": [
        "这迷宫看上去很难走？我也要试试看，也许黄花阵的中央，还有什么我值得考察的东西呢。"
      ],
      "interaction": {
        "title": "互动玩法｜黄花阵名字的由来",
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
      ]
    },
    {
      "id": "H4",
      "kind": "puzzle",
      "siteId": "maze",
      "lines": [
        "终于到了中心亭了，融合了中西审美，好别致的亭子！"
      ],
      "interaction": {
        "title": "互动玩法｜中西结合的观察",
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
        "原来这些花纹也有这般讲究！我记得从黄花阵迷宫入口这一路走来，我看到了好多花纹"
      ],
      "interaction": {
        "title": "互动玩法｜黄花阵花纹观察",
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
      ]
    },
    {
      "id": "H6",
      "kind": "read",
      "siteId": "maze",
      "lines": [
        "这些墙上的花纹是万字纹，“卐字不到头”“万寿无疆”，好寓意啊！虽说墙体和亭子都并不是乾隆年间留下的原墙的，但却让“万寿无疆”的吉祥寓意和皇家游乐的场景得以重现。",
        "走出迷宫，我又翻开那册铜版图。刚才那座中心亭已经让我第一次意识到，所谓“西洋楼”，并不完全是西洋的，而是中西结合的集大成者。而下一幅图更奇怪——方外观。西式的两层楼体上，压着中国式重檐屋顶，建筑里还出现了阿拉伯文字。我要亲自去看看。"
      ],
      "interaction": {
        "title": "互动揭晓｜黄花阵花纹观察",
        "lines": [
          "给出 4 种花纹的图样，让用户选出看到的花纹（万字纹）"
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
      "props": []
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
        "可是西式楼体、中式屋顶、阿拉伯文碑刻，为什么会同时出现在一座建筑里？"
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
      "next": "F2",
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
      ]
    },
    {
      "id": "F2",
      "kind": "read",
      "siteId": "fangwaiguan",
      "lines": [
        "方外观的对面便是“五竹亭”",
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
      "props": []
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
        "海晏堂，名字取自“河清海晏”一词，寓意天下太平。池周分布十二兽首铜像代表十二时辰，依次喷水构成报时系统。十二兽首分别代表不同时辰？这是怎么实现的呢？"
      ],
      "interaction": {
        "title": "互动玩法｜海晏堂的十二生肖水力钟",
        "lines": [
          "观看小程序不同时辰喷水示意，回答14时对应由哪个兽首喷水，并推测正午时候由哪个兽首喷水"
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
      "props": []
    },
    {
      "id": "HY2",
      "kind": "read",
      "siteId": "haiyantang",
      "lines": [
        "昔日竟然如此壮观，可如今却只剩下断壁残垣。这些兽首流离失所，有七尊归来了，但还有五尊不知所踪。"
      ],
      "interaction": {
        "title": "互动揭晓｜十二生肖水力钟",
        "lines": [
          "答案确认后，画面里的十二生肖一个接一个亮起，到了正午，十二道水流同时喷出。"
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
      "props": []
    },
    {
      "id": "HY3",
      "kind": "puzzle",
      "siteId": "haiyantang",
      "lines": [
        "十二生肖的精妙设计，让不同的兽首都可以准确运转报时，可这些水从哪里来，又靠什么力量喷出去？",
        "我低头看地图。海晏堂北面还有一处蓄水楼。如果这是一套完整的水法系统，答案或许不在喷泉前，而在它背后。"
      ],
      "interaction": {
        "title": "互动玩法｜转盘花纹匹配",
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
      ]
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
        "原来喷泉的水，靠的就是这座蓄水楼。",
        "这里是海晏堂北面的高台蓄水，不是谐奇趣西北那座。刚才在海晏堂看见兽首喷水，水源在这里。",
        "可是为什么能把水提高呢？特刊里似乎有线索"
      ],
      "interaction": {
        "title": "互动玩法｜水法的物理原理",
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
      ]
    },
    {
      "id": "XS2",
      "kind": "read",
      "siteId": "xushuilou",
      "lines": [
        "原来所谓“水法”，并不是凭空出现的奇观。先把水送到高处，再利用高度差获得水压，眼前那些看似华丽的喷泉背后，其实是一整套工程系统。",
        "而档案里规模最大的一处水法，还在前面。我收起特刊，沿路向东，前往大水法。"
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
      "props": []
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
        "和海晏堂相比，这里的遗迹看起来更直观一些。高大的石构还留在原地，但只看现在的样子，还是很难想象它当年到底是什么样的。在小学课文中圆明园的插图，也就是这里的实拍图。",
        "我翻了翻档案，正好找到了一幅《大水法南面》的铜版图。",
        "图中的石构轮廓和眼前能够对得上。",
        "但真正吸引我注意的，反而是前面的喷水池。",
        "不过水池中间怎么还有一只鹿？周围那些动物又是在做什么？"
      ],
      "interaction": {
        "title": "互动玩法｜大水法",
        "lines": [
          "请将《西洋楼铜版图·大水法南面》的铜版画和眼前遗址进行对照，复原档案中残存的部分。",
          "档案中缺少了三组重要构件，请根据铜版图，把它们放回原本的位置："
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
      ]
    },
    {
      "id": "DS2",
      "kind": "read",
      "siteId": "dashuifa",
      "lines": [
        "原来这些动物并不是随便摆在喷泉里的装饰。鹿站在中间，猎狗围在周围，水流一喷起来，周围十只铜猎狗同时向鹿喷水，组成“猎狗逐鹿”的场景。而对面的观水法，正是皇帝当年观赏喷泉的地方。",
        "画面里的猎狗、铜鹿和水流终于全部归位。",
        "我抬起头，想再和眼前的遗址对照一次。",
        "可这一回，我突然不知道该从哪里开始对照了。",
        "铜鹿不在了，猎狗不在了，喷水塔也不在了。刚刚还完整存在于屏幕里的景象，现实中只剩下石构的轮廓。"
      ],
      "interaction": {
        "title": "互动揭晓｜大水法构件归位",
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
      "props": []
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
        "同样愤怒的还有面前的这位法国作家——雨果。",
        "1861年，圆明园被焚毁后的第二年，雨果在法国写下《致巴特勒上尉的信》，公开谴责英法联军对圆明园的劫掠和焚毁。奇怪的是，他从来没有来过这里。如今，他的雕像就立在西洋楼遗址旁，静静地凝视着那断壁残垣。"
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
      "props": []
    },
    {
      "id": "FN1",
      "kind": "read",
      "siteId": "",
      "lines": [
        "至此，西洋楼遗址已经快走完了，可是，第二十一幅画到底在哪呢？",
        "屏幕暗了一下，然后亮起，一幅画面缓缓浮现。密集交错的线条构成明暗，锐利的刻痕描绘着建筑轮廓，仿佛一幅真正的《西洋楼铜版图》。",
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
        "屏幕中缓缓出来了一封信：如果你看到这里，说明你已经走完了这条路。你一定很好奇，那幅传闻中的第二十一幅版画，究竟在哪里。其实，它从未被藏在某个地方。因为它从来不是一幅等待被发现的旧画。它是一幅等待被后来者完成的“新画”。",
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
        "几秒后，一份新的档案生成。",
        "考察记录生成完成《西洋楼铜版图·第二十一图》"
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
