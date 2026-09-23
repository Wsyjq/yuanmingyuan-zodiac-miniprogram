'use strict'

// 黄花阵 · 名字由来（文字作答，answer-judge 判分）。
// 单点维护：改剧情只改这里；页面逻辑在 pages/s2-reveal/s2-reveal.js。
// 史料：宫女手持黄色彩绸扎成的莲花灯，迷宫因此得名黄花阵。卡片角落数字 0。
module.exports = {
  puzzleId: 's2-name',
  clips: { main: 'narr-s2-reveal', followup: 'narr-s2-reveal-followup' },
  historyLines: [
    '黄花阵名字由来：',
    '由于宫女们手持黄色彩绸扎成的莲花灯，',
    '所以这个迷宫也得名黄花阵。'
  ],
  next: { url: '/plate21/module/pages/s2-blend/s2-blend', checkpoint: 's2-blend' }
}
