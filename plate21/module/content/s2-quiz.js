'use strict'

// 黄花阵 · 修建目的（四选一）。飞书 v3 原文选项。三次揭晓仍发卡。
// 单点维护：改剧情只改这里；页面逻辑在 pages/s2-quiz/s2-quiz.js，
// 答题流程由 utils/quiz-host.js 公共行为承载（同型页面复用同一行为）。
module.exports = {
  puzzleId: 's2-purpose',
  correct: 'C',
  cardNumber: 2, // 缺省卡角数字；实际以 session.getCardDigit 为准
  clips: { main: 'narr-s2-quiz', followup: 'narr-s2-quiz-followup' },
  options: [
    { key: 'A', text: '作为军事防御工事，用于迷惑和阻挡入侵的敌人。' },
    { key: 'B', text: '作为皇家藏书楼，利用复杂路径保护珍贵书籍。' },
    { key: 'C', text: '作为中秋节的皇家娱乐场所，举办“迷宫灯会”游戏。' },
    { key: 'D', text: '作为皇子们的秘密议事厅，以防外人窃听。' }
  ],
  hints: [
    '再看看这座阵夜里会不会亮起来。',
    '中秋之夜，有人提着灯往中心亭跑。'
  ],
  reveal: '每逢中秋之夜，皇帝会坐在阵中心的凉亭里，观赏宫女们在迷宫路径中奔跑嬉戏。最先到达中心的人会得到皇帝的赏赐。',
  // 「黄花阵」= SL-07 史料卡挂点（v3 rev 3346：四道题之前只说是迷宫）
  introParts: [
    { t: '到了' },
    { t: '黄花阵', g: 'sl07' },
    { t: '的入口处，眼前景观让我有些震惊——一个皇家宫苑中竟有一座迷宫！可是皇家宫苑中为什么会有一座迷宫呢？' }
  ],
  historyLines: [
    '黄花阵的作用：每逢中秋之夜，皇帝会坐在阵中心的凉亭里，观赏宫女们在迷宫路径中奔跑嬉戏。最先到达中心的人会得到皇帝的赏赐。'
  ],
  next: { url: '/plate21/module/pages/s2-reveal/s2-reveal', checkpoint: 's2-name' }
}
