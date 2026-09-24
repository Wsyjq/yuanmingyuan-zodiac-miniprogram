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
    { key: 'wanzi', name: '万字纹', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-WANZI.jpg', desc: '卐字不到头，万寿无疆', correct: true },
    { key: 'beike', name: '贝壳饰', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SHELL.jpg', desc: '扇形放射，卷叶环绕', correct: false },
    { key: 'juanco', name: '卷草饰', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-SCROLL.jpg', desc: '卷曲枝条彼此对称', correct: false },
    { key: 'hualan', name: '花篮饰', src: '/plate21/module/assets/img/IMG-RUNTIME-PATTERN-BASKET.jpg', desc: '花束盛于西式饰篮', correct: false }
  ],
  // 飞书原文：「原来这些花纹也有这般讲究！……我看到了好多花纹」
  lead: '原来这些花纹也有这般讲究！我记得从黄花阵迷宫入口这一路走来，我看到了好多花纹',
  actStrip: '这一路墙上反复出现的，是下面哪一种？',
  historyLines: [
    '这些墙上的花纹是万字纹，“卐字不到头”“万寿无疆”，好寓意啊！虽说墙体和亭子都并不是乾隆年间留下的原墙的，但却让“万寿无疆”的吉祥寓意和皇家游乐的场景得以重现。'
  ],
  // 轻推文案：认成另三种时不判错不锁，只推回去再比
  nudges: ['墙上反复出现的那种。', '回转连绵的那一种。'],
  revealNudge: '墙上反复出现的是万字纹。',
  // 收尾叙事（飞书 v3 rev4379 原文）
  finale: {
    reveal: '这些墙上的花纹是万字纹，“卐字不到头”“万寿无疆”，好寓意啊！虽说墙体和亭子都并不是乾隆年间留下的原墙的，但却让“万寿无疆”的吉祥寓意和皇家游乐的场景得以重现。',
    closing: '走出迷宫，我又翻开那册铜版图。刚才那座中心亭已经让我第一次意识到，所谓“西洋楼”，并不完全是西洋的，而是中西结合的集大成者。而下一幅图更奇怪——方外观。西式的两层楼体上，压着中国式重檐屋顶，建筑里还出现了阿拉伯文字。我要亲自去看看。'
  },
  // 「原墙」= SL-08 史料卡挂点（v3 rev 5614：墙体和亭子都不是原墙）
  wallParts: [
    { t: '虽说墙体和亭子都并不是乾隆年间留下的' },
    { t: '原墙', g: 'sl08' },
    { t: '的，但却让“万寿无疆”的吉祥寓意和皇家游乐的场景得以重现。' }
  ],
  next: { url: '/plate21/module/pages/transit/transit?leg=s2-fw', checkpoint: 'fw-three' }
}
