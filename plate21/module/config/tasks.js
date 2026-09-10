'use strict'
// 现有题目口径原样保留；答案不等于新的史实核验结论。
const tasks = {
  's1-decode': {
    answer: '黄花阵',
    hints: ['先查看信封背面、折口和信纸边缘。', '让残缺笔画对应，拼出的地名是黄花阵。'],
    feedback: '信封中的地名已记录。'
  },
  's2-purpose': {
    answer: 'C',
    hints: [
      '这道题关注游乐活动，可先排除防御与藏书。',
      '对应现有题面的是“中秋皇家娱乐 · 迷宫灯会”。'
    ],
    feedback: '已记录迷宫用途的题目答案。'
  },
  's2-name': {
    answer: '莲花灯',
    hints: ['名称线索在灯的形状与材料里。', '当前题面可回答“黄色彩绸扎成的莲花灯”。'],
    feedback: '灯与名称的线索已记录。'
  },
  's2-blend': {
    answer: null,
    hints: [
      '打开原挑战可查看四个观察项目。',
      '四张照片是原题完成条件；不便拍摄可跳过，在私人记录中自由保存。'
    ],
    feedback: '四个观察项目已完成。'
  },
  's2-pattern': {
    answer: 'wanzi',
    hints: ['比较连续回转的形状，不必仅凭颜色判断。', '原题的选项名称是“万字回纹”。'],
    feedback: '纹样观察与路线记录已完成。'
  },
  's3-hour': {
    answer: {
      zodiac: '马',
      hour: '午时'
    },
    hints: ['按“子鼠、丑牛……”顺序对读时辰与生肖。', '两问分别选择“马”和“午时”。'],
    feedback: '水与时间的对应关系已记录。'
  },
  's3-zodiac': {
    answer: ['鼠', '牛', '虎', '兔', '马', '猴', '猪'],
    hints: [
      '按实体转盘或原页面资料核对七个生肖。',
      '当前题目答案为鼠、牛、虎、兔、马、猴、猪。状态性史实以后可在配置中更新。'
    ],
    feedback: '原题中的七个兽首已记录。'
  },
  's3-water': {
    answer: '马首',
    hints: ['查看水显纸显出的轮廓，再输入名称。', '当前道具题对应“马首”；没有道具时可以跳过。'],
    feedback: '水显结果已记录。'
  },
  's4-timeline': {
    answer: ['1747', '1760', '1860', '1861', '2010'],
    hints: ['先找到营建、毁坏与后人回应三个阶段。', '按当前题面：1747、1760、1860、1861、2010。'],
    feedback: '原题时间轴已记录。'
  },
  's4-password': {
    answer: null,
    hints: [
      '回看本次考察建档日，它不会随跨夜游玩改变。',
      '按原题输入建档日 YYYYMMDD；也可以直接跳过进入终章。'
    ],
    feedback: '日期密码已解开。'
  }
}
const s2_pattern_patterns = [
  {
    key: 'wanzi',
    name: '万字回纹',
    src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-WANZI.jpg',
    desc: '回转连绵，万字不断',
    correct: true
  },
  {
    key: 'beike',
    name: '贝壳饰',
    src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SHELL.jpg',
    desc: '扇形放射，卷叶环绕',
    correct: false
  },
  {
    key: 'juanco',
    name: '卷草饰',
    src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SCROLL.jpg',
    desc: '卷曲枝条彼此对称',
    correct: false
  },
  {
    key: 'hualan',
    name: '花篮饰',
    src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-BASKET.jpg',
    desc: '花束盛于西式饰篮',
    correct: false
  }
]
const s4_timeline_slots = [
  { label: '1747' },
  { label: '1760' },
  { label: '1860' },
  { label: '1861' },
  { label: '2010' }
]
const s4_timeline_cards = [
  { id: 'c2010', title: '雨果雕像落成', sub: '中法文化交流纪念', target: 4 },
  { id: 'c1860', title: '英法联军火烧圆明园', sub: '一场劫火留下废墟', target: 2 },
  { id: 'c1747', title: '西洋楼开始建造', sub: '营造由此开始', target: 0 },
  { id: 'c1861', title: '雨果致巴特勒上尉的信', sub: '公开谴责这场掠夺', target: 3 },
  { id: 'c1760', title: '早期核心景观基本形成', sub: '远瀛观等景观仍有增建', target: 1 }
]
module.exports = { tasks, s2_pattern_patterns, s4_timeline_slots, s4_timeline_cards }
