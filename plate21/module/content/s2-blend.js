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
      desc: '西式穹顶，压着中式八角飞檐。',
      detail: '亭子整体「西式穹顶 + 中式八角飞檐混搭结构」',
      guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-DOME.jpg'
    },
    {
      key: 'beast',
      no: '02',
      title: '檐角立兽',
      desc: '八个檐角上的小型立兽。',
      detail: '亭子八角飞檐的八个檐角位置，全部标注有小型立式装饰物；西方原版欧式凉亭檐角无任何立兽，纯光面檐口，证明这个构件是中式附加增设；',
      guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-BEAST.jpg'
    },
    {
      key: 'lotus',
      no: '03',
      title: '莲座宝瓶',
      desc: '莲座托着西洋宝瓶花苞。',
      detail: '版画里该构件基座为中式莲座（中式走兽标配莲花基座），上部花苞造型是西洋园林宝瓶花苞样式。',
      guideSrc: '/plate21/module/assets/img/IMG-RUNTIME-DETAIL-LOTUS.jpg'
    },
    {
      key: 'swan',
      no: '04',
      title: '双天鹅与蝙蝠',
      desc: '弧形基座上的双天鹅，胸腹藏着蝙蝠纹。',
      detail: '弧形基座浮雕：这一圈弧形壁面分为两种交替排布的浮雕版式，西式巴洛克基底，局部混入中式吉祥元素主体核心是对称双天鹅巴洛克纹样，中式本土化改造：清宫石匠在天鹅胸腹位置悄悄刻了简化蝙蝠纹路（藏在浮雕中心交汇处），把西方天鹅，叠加中式「蝙蝠寓意福气」的吉祥内涵',
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
