'use strict'

// 黄花阵 · 现场考察卡（举线稿对照，拍下中西混作细节；找到一处即算，四处更厚）。
// 单点维护：改剧情只改这里；页面逻辑在 pages/s2-blend/s2-blend.js。
module.exports = {
  puzzleId: 's2-blend',
  clips: { main: 'narr-s2-blend' },
  points: [
    {
      key: 'dome',
      no: '01',
      title: '穹顶与飞檐',
      desc: '同时纳入西式穹顶与中式八角飞檐。',
      guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-DOME.jpg'
    },
    {
      key: 'beast',
      no: '02',
      title: '檐角立兽',
      desc: '拍清飞檐角部的小型立式装饰。',
      guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-BEAST.jpg'
    },
    {
      key: 'lotus',
      no: '03',
      title: '莲座宝瓶',
      desc: '记录中式莲座与西洋宝瓶花苞的组合。',
      guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-LOTUS.jpg'
    },
    {
      key: 'swan',
      no: '04',
      title: '双天鹅蝙蝠纹',
      desc: '对准弧形基座，记录双天鹅与蝙蝠纹细节。',
      guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-SWAN.jpg'
    }
  ],
  historyLines: [
    '西学东渐后的皇家审美转译。',
    '西洋楼黄花阵中心亭，西式穹顶与中式八角飞檐并存；',
    '檐角立兽、莲座宝瓶、双天鹅间暗藏的蝙蝠纹——',
    '西方形制与中式吉祥寓意的叠加，是清宫石匠的本土化改造。'
  ],
  next: { url: '/plate21/module/pages/s2-pattern/s2-pattern', checkpoint: 's2-pattern' }
}
