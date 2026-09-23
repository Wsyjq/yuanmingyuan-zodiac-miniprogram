'use strict'

// content —— 剧情文案注册表（单点维护）。
// 优化剧情：只改本目录下对应站点的文件，页面逻辑（pages/）与样式不动。
// 页面直接 require 自己的内容文件；工具链（tools/build_page_voice.js 等）走本注册表。
// 已外置：prologue、s2-quiz、s2-reveal、s2-blend、s2-pattern（试点）。
// 未外置页面的文案仍在各自页面文件里，后续按同格式迁移。
module.exports = {
  prologue: require('./prologue'),
  's2-quiz': require('./s2-quiz'),
  's2-reveal': require('./s2-reveal'),
  's2-blend': require('./s2-blend'),
  's2-pattern': require('./s2-pattern')
}
