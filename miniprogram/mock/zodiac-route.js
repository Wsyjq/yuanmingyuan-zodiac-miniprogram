const zodiacOrder = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

const route = {
  routeId: 'zodiac-return',
  title: '归途 · 十二兽首寻迹',
  subtitle: '沿圆明园遗址寻找七枚完整印记、一枚追索印记，并在终局拼回十二格。',
  version: '20260714-miniprogram-p1',
  estimatedDuration: '60-90 分钟',
  themeText: '残垣无声，勿忘国耻。归途未竟，我们仍在路上。',
  stages: [
    {
      stageId: 'p1',
      order: 1,
      place: '大水法',
      title: '残垣复原',
      gameType: 'dashuifa',
      intro: '很多人第一眼记住的是残柱。但它完整时，是一套精密的喷泉水法。先把它拼回原来的样子。',
      task: '点击空位相邻残片滑动，用华容道方式复原大水法盛时景观。',
      quote: '牛首，2000 年回归。残垣不是故事的起点，完整的水法才是。',
      mark: { zodiac: '牛', status: 'returned', label: '完整印记' },
      location: { latitude: 40.01283, longitude: 116.30558, radius: 80 },
      gameConfig: {
        initial: [0, 2, 4, 1, 6, 3, 7, 5, 8],
        target: [1, 2, 3, 4, 5, 6, 7, 8, 0],
        fragments: [
          { title: '西洋楼影', detail: '远景轮廓', motif: '拱' },
          { title: '残柱列阵', detail: '石柱位置', motif: '柱' },
          { title: '水法主线', detail: '喷泉中轴', motif: '水' },
          { title: '观水台阶', detail: '前景地面', motif: '阶' },
          { title: '兽首水钟', detail: '十二时辰', motif: '时' },
          { title: '铜像回望', detail: '归途线索', motif: '首' },
          { title: '石纹细节', detail: '残件纹样', motif: '纹' },
          { title: '水池暗渠', detail: '出水方向', motif: '渠' }
        ],
        blueprintRows: [
          { label: '建筑轮廓', clue: '从拱券、柱列到中央水线' },
          { label: '观水动线', clue: '由台阶进入报时水钟，再看铜像' },
          { label: '遗址证据', clue: '纹样、暗渠与最终印记' }
        ]
      }
    },
    {
      stageId: 'p2',
      order: 2,
      place: '仙人呈露台',
      title: '接雨露',
      gameType: 'rain',
      intro: '承露不只是接住水滴，也是在接住对丰年、安宁和长久的愿望。',
      task: '移动承露托盘接住金色雨露，保持连击累计 300 分，避开碎石。',
      quote: '猴首，2000 年回归。看见水的流动，也要看见工匠让水动起来的方法。',
      mark: { zodiac: '猴', status: 'returned', label: '完整印记' },
      location: { latitude: 40.01238, longitude: 116.3062, radius: 80 },
      gameConfig: {
        targetScore: 300,
        basePoints: 50,
        badChance: 0.28,
        windShiftChance: 0.38,
        baseFallDuration: 1500,
        minFallDuration: 850
      }
    },
    {
      stageId: 'p3',
      order: 3,
      place: '途中信封',
      title: '信封中的下一站',
      gameType: 'envelope',
      intro: '很多线索都是残的，一半在纸上，一半在现场。补上这三个字，就知道下一站该往哪里走。',
      task: '把候选上半字块覆盖到信封露出的下半残字，拼出三个完整汉字。',
      quote: '虎首，2000 年回归。顺着这封信，回到兽首原本的位置。',
      mark: { zodiac: '虎', status: 'returned', label: '完整印记' },
      location: { latitude: 40.01198, longitude: 116.30675, radius: 80 },
      gameConfig: {
        answer: '海晏堂',
        lowerHalves: [
          { char: '海', label: '第一字下半' },
          { char: '晏', label: '第二字下半' },
          { char: '堂', label: '第三字下半' }
        ],
        pieces: [
          { id: 'upper-yan', char: '晏', code: 'A', targetIndex: 1 },
          { id: 'upper-dian', char: '殿', code: 'B', targetIndex: -1 },
          { id: 'upper-hai', char: '海', code: 'C', targetIndex: 0 },
          { id: 'upper-tang', char: '堂', code: 'D', targetIndex: 2 },
          { id: 'upper-que', char: '阙', code: 'E', targetIndex: -1 },
          { id: 'upper-yan-decoy', char: '宴', code: 'F', targetIndex: -1 }
        ],
        hint: '信封中只露出三个字的下半部分。比较笔画接口，从六枚上半字块中依次找出正确组合。'
      }
    },
    {
      stageId: 'p4',
      order: 4,
      place: '海晏堂',
      title: '十二兽首报时',
      gameType: 'clock',
      intro: '十二生肖对应十二地支，也对应一天中的十二个时辰。兽首原本是一座水力钟。',
      task: '完成十二兽首、十二地支与十二时辰的全部匹配。',
      quote: '猪首，2003 年回归。它让更多人再次看见兽首不只是拍卖新闻，也是历史见证。',
      mark: { zodiac: '猪', status: 'returned', label: '完整印记' },
      location: { latitude: 40.01175, longitude: 116.30721, radius: 80 },
      gameConfig: {
        answer: { 鼠: '子', 牛: '丑', 虎: '寅', 兔: '卯', 龙: '辰', 蛇: '巳', 马: '午', 羊: '未', 猴: '申', 鸡: '酉', 狗: '戌', 猪: '亥' },
        heads: [
          { label: '鼠', clue: '夜半第一声' },
          { label: '牛', clue: '黎明将耕' },
          { label: '虎', clue: '山林初醒' },
          { label: '兔', clue: '晨光入园' },
          { label: '龙', clue: '朝食将毕' },
          { label: '蛇', clue: '日近中天' },
          { label: '马', clue: '正午当值' },
          { label: '羊', clue: '午后食草' },
          { label: '猴', clue: '夕照初斜' },
          { label: '鸡', clue: '日落归巢' },
          { label: '狗', clue: '入夜守门' },
          { label: '猪', clue: '夜深安眠' }
        ],
        branches: [
          { label: '寅', time: '03:00-05:00' },
          { label: '子', time: '23:00-01:00' },
          { label: '卯', time: '05:00-07:00' },
          { label: '未', time: '13:00-15:00' },
          { label: '酉', time: '17:00-19:00' },
          { label: '辰', time: '07:00-09:00' },
          { label: '亥', time: '21:00-23:00' },
          { label: '午', time: '11:00-13:00' },
          { label: '丑', time: '01:00-03:00' },
          { label: '申', time: '15:00-17:00' },
          { label: '巳', time: '09:00-11:00' },
          { label: '戌', time: '19:00-21:00' }
        ]
      }
    },
    {
      stageId: 'p5',
      order: 5,
      place: '方外观',
      title: '三位密码',
      gameType: 'password',
      intro: '遗址不会自己开口，但它会留下数字。把目光落到眼前证据上。',
      task: '根据石柱、出水孔和硫酸纸线索，输入三位密码。',
      quote: '鼠首，2013 年与兔首一同回归。它们最终以无偿捐赠方式回家。',
      mark: { zodiac: '鼠', status: 'returned', label: '完整印记' },
      location: { latitude: 40.01128, longitude: 116.3075, radius: 80 },
      gameConfig: {
        password: '568',
        clues: [
          {
            id: 'vine',
            type: 'select',
            title: '石柱卷草纹',
            instruction: '找出柱身上重复出现的五枚同形卷草纹。',
            clue: '五枚同形卷草纹组成第一位数字。',
            digit: '5',
            options: [
              { label: '卷', kind: 'vine', target: true },
              { label: '枝', kind: 'branch', target: false },
              { label: '卷', kind: 'vine', target: true },
              { label: '叶', kind: 'leaf', target: false },
              { label: '卷', kind: 'vine', target: true },
              { label: '卷', kind: 'vine', target: true },
              { label: '涡', kind: 'swirl', target: false },
              { label: '卷', kind: 'vine', target: true }
            ]
          },
          {
            id: 'holes',
            type: 'select',
            title: '水池出水孔',
            instruction: '点亮仍能辨认的出水孔，裂损处不计。',
            clue: '六个完整出水孔组成第二位数字。',
            digit: '6',
            options: [
              { label: '', kind: 'hole', target: true },
              { label: '裂', kind: 'crack', target: false },
              { label: '', kind: 'hole', target: true },
              { label: '', kind: 'hole', target: true },
              { label: '裂', kind: 'crack', target: false },
              { label: '', kind: 'hole', target: true },
              { label: '', kind: 'hole', target: true },
              { label: '', kind: 'hole', target: true }
            ]
          },
          {
            id: 'overlay',
            type: 'rotate',
            title: '硫酸纸重合',
            instruction: '石刻底图保持固定；旋转半透明硫酸纸，让纸上的三个红色定位点与底图金点完全重合。',
            clue: '残图重合后露出第八格。',
            digit: '8',
            targetRotation: 270
          }
        ]
      }
    },
    {
      stageId: 'p6',
      order: 6,
      place: '盛时全景模型展',
      title: '沙盘寻踪',
      gameType: 'order',
      intro: '沙盘让片段暂时回到完整秩序中。兽首单独看是铜像，放回十二时辰里才是一套系统。',
      task: '把十二兽首全部放回子、丑、寅至亥的十二时辰位。',
      quote: '兔首，2013 年与鼠首一同回归。文物回家不只有回购一种路，也可以是主动归还。',
      mark: { zodiac: '兔', status: 'returned', label: '完整印记' },
      location: { latitude: 40.01086, longitude: 116.30795, radius: 80 },
      gameConfig: {
        answer: ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'],
        cards: ['龙', '牛', '鼠', '蛇', '虎', '兔', '狗', '马', '鸡', '猪', '猴', '羊'],
        branches: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'],
        hint: '依据十二地支顺序，把全部兽首放回对应时辰位。'
      }
    },
    {
      stageId: 'p7',
      order: 7,
      place: '黄花阵',
      title: '迷宫拼路',
      gameType: 'maze',
      intro: '迷宫里最难的不是走到中心，而是承认有些路现在还没有走通。',
      task: '旋转道路让小人走到中心亭，再按年份排好兽首回归时间线。',
      quote: '龙首，据公开资料和民间线索，有较明确线索，但尚未回归。',
      mark: { zodiac: '龙', status: 'tracking', label: '追索中印记' },
      location: { latitude: 40.01042, longitude: 116.30831, radius: 80 },
      gameConfig: {
        initial: [90, 180, 0, 270, 90, 180],
        target: [0, 0, 90, 180, 0, 0],
        modules: [
          { label: '西侧入口', shape: 'straight', gridOrder: 0 },
          { label: '北侧花墙', shape: 'straight', gridOrder: 1 },
          { label: '东北转角', shape: 'bend', gridOrder: 2 },
          { label: '东南转角', shape: 'bend', gridOrder: 5 },
          { label: '南侧花墙', shape: 'straight', gridOrder: 4 },
          { label: '中心亭门', shape: 'bend', gridOrder: 3 }
        ],
        timelineEvents: [
          { id: 'mouse-rabbit', year: '2013', label: '鼠首、兔首回归' },
          { id: 'ox-tiger-monkey', year: '2000', label: '牛首、虎首、猴首回归' },
          { id: 'horse', year: '2019', label: '马首回到圆明园' },
          { id: 'dragon', year: '至今', label: '龙首仍在追索' },
          { id: 'pig', year: '2003', label: '猪首回归' }
        ],
        timelineAnswer: ['ox-tiger-monkey', 'pig', 'mouse-rabbit', 'horse', 'dragon']
      }
    },
    {
      stageId: 'p8',
      order: 8,
      place: '正觉寺',
      title: '马首与终局时辰盘',
      gameType: 'final',
      intro: '马首是第七尊回归的兽首，也是现实中重要的圆明园锚点。归途已经发生，也仍未完成。',
      task: '确认马首归位，再依据生肖、地支与时辰关系，将八枚印记放入十二时辰盘。',
      quote: '马首，2019 年回归圆明园。它的归来不是句号，而是继续追索的理由。',
      mark: { zodiac: '马', status: 'returned', label: '完整印记' },
      location: { latitude: 40.00998, longitude: 116.30872, radius: 80 },
      gameConfig: {}
    }
  ],
  finalRule: {
    returned: ['牛', '猴', '虎', '猪', '鼠', '兔', '马'],
    tracking: ['龙'],
    missing: ['蛇', '羊', '鸡', '狗']
  }
};

const bootstrap = {
  route,
  zodiacOrder,
  skipRule: {
    givesMark: true,
    countsAsProgress: true
  },
  map: {
    center: { latitude: 40.0115, longitude: 116.3071 },
    markers: route.stages.map((stage) => ({
      stageId: stage.stageId,
      id: stage.order,
      title: stage.place,
      latitude: stage.location.latitude,
      longitude: stage.location.longitude,
      width: 28,
      height: 28,
      callout: {
        content: `${stage.order}. ${stage.place}`,
        display: 'BYCLICK',
        padding: 6,
        borderRadius: 6
      }
    })),
    polyline: [
      {
        points: route.stages.map((stage) => ({
          latitude: stage.location.latitude,
          longitude: stage.location.longitude
        })),
        color: '#658780',
        width: 4,
        dottedLine: true
      }
    ]
  }
};

module.exports = {
  bootstrap
};
