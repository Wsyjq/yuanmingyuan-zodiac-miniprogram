'use strict'

// 黄花阵 · 花纹观察（飞书 v3 rev4379 §黄花阵）。给出 4 种花纹图样，选出看到的花纹（万字纹）。
// 单点维护：改剧情只改这里；页面逻辑在 pages/s2-pattern/s2-pattern.js。
// 卡片角落数字：6（年4=6）。
module.exports = {
  puzzleId: 's2-pattern',
  correctKey: 'wanzi',
  cardNumber: 6, // 缺省卡角数字；实际以 session.getCardDigit 为准
  clips: {
    main: 'narr-s2-pattern',
    finale: 'narr-s2-pattern-finale'
  },
  // 四种候选纹样使用项目方确认可商用的 AI 图片衍生文件。
  patterns: [
    { key: 'wanzi', name: '万字回纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-WANZI.jpg', desc: '回转连绵，万字不断', correct: true },
    { key: 'beike', name: '贝壳饰', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SHELL.jpg', desc: '扇形放射，卷叶环绕', correct: false },
    { key: 'juanco', name: '卷草饰', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SCROLL.jpg', desc: '卷曲枝条彼此对称', correct: false },
    { key: 'hualan', name: '花篮饰', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-BASKET.jpg', desc: '花束盛于西式饰篮', correct: false }
  ],
  // 飞书原文：「原来这些花纹也有这般讲究！……我看到了好多花纹」
  lead: '原来这些花纹也有这般讲究！我记得从黄花阵迷宫入口这一路走来，我看到了好多花纹',
  actStrip: '四种花纹的图样里，选出你在墙上看到的那种',
  historyLines: [
    '迷宫墙体满砌万字回纹，回转连绵，又名万字不断纹。',
    '档案里这一页印了四种图样；这一路墙上反复出现的，只有其中一种。'
  ],
  // 轻推文案：认成另三种时不判错不锁，只推回去再比
  nudges: ['墙上反复出现的那种。', '回转连绵的那一种。'],
  revealNudge: '迷宫墙体刻满万字回纹，寓意福寿绵长。',
  // 收尾叙事（飞书 v3 rev4379 原文）
  finale: {
    reveal: '这些墙上的花纹是万字纹，“卐字不到头”“万寿无疆”，好寓意啊！',
    closing: '我按照地图继续走，下一站是方外观。'
  },
  // 「原墙」= SL-08 史料卡挂点（v3 rev 5614：墙体和亭子都不是原墙）
  wallParts: [
    { t: '虽说墙体和亭子都并不是乾隆年间留下的' },
    { t: '原墙', g: 'sl08' },
    { t: '的，但却让“万寿无疆”的吉祥寓意和皇家游乐的场景得以重现。' }
  ],
  next: { url: '/plate21/module/pages/transit/transit?leg=s2-fw', checkpoint: 'fw-three' }
}
