'use strict'
// 内容与导航分离。原页面正文保留，修改此表不重写谜题。
const tasks = require('./tasks').tasks
const NODES = [
  ['prologue', '序章', 's1', '打开考察档案', '信封', '先读信，再查看附件。'],
  [
    's1-decode',
    '西洋楼入口',
    's1',
    '拼合信封上的地名',
    '信封与信纸',
    '核对信封折口与信纸的对应位置。'
  ],
  [
    's2-purpose',
    '黄花阵 · 用途',
    's2',
    '先观察，再选择是否挑战',
    '迷宫记录卡',
    '查看现场或资料中的空间布局。'
  ],
  ['s2-name', '黄花阵 · 名称', 's2', '阅读名称线索', '资料卡', '可以查阅资料，再继续。'],
  [
    's2-blend',
    '黄花阵 · 观察',
    's2',
    '记录你看见的细节',
    '相机或记录纸',
    '现场看不清可稍后体验，不必强行寻找。'
  ],
  ['s2-pattern', '黄花阵 · 纹样', 's2', '比较纹样', '纹样卡', '先比较形状，再查看提示。'],
  [
    's3-hour',
    '海晏堂 · 水与时间',
    's3',
    '观察报时的对应关系',
    '时辰转盘',
    '比较时间与生肖的关系。'
  ],
  ['s3-zodiac', '海晏堂 · 兽首', 's3', '查阅兽首资料', '资料卡', '动态信息可在资料页核对。'],
  ['s3-water', '海晏堂 · 水显', 's3', '按道具说明操作', '水显卡', '没有道具时可跳过或稍后体验。'],
  ['s4-timeline', '雨果 · 时间轴', 's4', '整理事件先后', '时间轴资料', '从最早的事件开始比较。'],
  [
    's4-password',
    '档案密码',
    's4',
    '可尝试密码，也可直接继续',
    '已收集的日期卡',
    '日期卡仍保留；答题不是进入结尾的条件。'
  ],
  ['finale', '终章', 'finale', '阅读结尾并落款', '考察档案', '可以随时另存一份自己的记录。'],
  ['report', '考察报告', 'finale', '保存或回看成果', '考察记录', '没有照片也可以使用私人记录页。']
].map((row) => ({
  id: row[0],
  title: row[1],
  station: row[2],
  action: row[3],
  prop: row[4],
  hints: tasks[row[0]] ? tasks[row[0]].hints : [row[5], '可以先记录，再继续体验。'],
  feedback: tasks[row[0]] ? tasks[row[0]].feedback : '',
  variants: {}
}))
const MODES = [
  { id: 'family', title: '亲子同行' },
  { id: 'teen', title: '青少年' },
  { id: 'adult', title: '成人' }
]
const ROUTES = {
  prologue: 'prologue',
  's1-decode': 's1-decode',
  's2-purpose': 's2-quiz',
  's2-name': 's2-reveal',
  's2-blend': 's2-blend',
  's2-pattern': 's2-pattern',
  's3-hour': 's3-comic',
  's3-zodiac': 's3-zodiac',
  's3-water': 's3-water',
  's4-timeline': 's4-timeline',
  's4-password': 's4-password',
  finale: 'finale',
  report: 'report'
}
const EXTRA_NODES=[['xieqiqu','谐奇趣'],['yangquelong','养雀笼'],['fangwaiguan','方外观'],['xushuilou','蓄水楼'],['xianfahua','线法画'],['dashuifa','大水法']].map(r=>({id:'t-'+r[0],title:'顺路 · '+r[1],station:'t-'+r[0],action:'按原页面引导，自由停留或继续',prop:'按页面道具说明；无道具仍可继续',hints:['先阅读本页基础介绍。','可使用继续按钮返回路线，不需完成全部观察。'],variants:{},optional:true}))
const EXTRA_ROUTES={}
EXTRA_NODES.forEach(n=>{const site=n.id.slice(2);EXTRA_ROUTES[n.id]=site==='dashuifa'?'/plate21/module/pages/dashuifa/dashuifa':'/plate21/module/pages/waypoint/waypoint?site='+site})
function node(id, mode) {
  const n = NODES.concat(EXTRA_NODES).find((x) => x.id === id)
  return n ? Object.assign({}, n, n.variants[mode] || {}, { common: !n.variants[mode] }) : null
}
function route(id) {
  if(EXTRA_ROUTES[id])return EXTRA_ROUTES[id]
  const p = ROUTES[id]
  return p ? '/plate21/module/pages/' + p + '/' + p : ''
}
function fromRoute(path) {
  const p = String(path || '')
    .split('?')[0]
    .split('/')
    .pop()
  return NODES.find((n) => ROUTES[n.id] === p) || null
}
function next(id) {
  if(EXTRA_ROUTES[id])return NODES.find(n=>n.id==="s4-timeline")
  const i = NODES.findIndex((n) => n.id === id)
  return NODES[Math.min(i + 1, NODES.length - 1)]
}
module.exports = { EXTRA_NODES, EXTRA_ROUTES, NODES, MODES, node, route, fromRoute, next }
