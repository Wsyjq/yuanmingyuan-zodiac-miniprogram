/**
 * 把 lucide-static 的线条 SVG 渲染成 96x96 透明底 PNG，供小程序 <image> 使用。
 * 运行：node tools/render-icons.js   （依赖装在 test/node_modules）
 * 输出：plate21/module/assets/img/icons/ic-<lucide名>-<色名>.png
 */
const fs = require('fs')
const path = require('path')
const { Resvg } = require('../test/node_modules/@resvg/resvg-js')

const ICONS_DIR = path.join(__dirname, '../test/node_modules/lucide-static/icons')
const OUT_DIR = path.join(__dirname, '../plate21/module/assets/img/icons')

const COLORS = {
  ink: '#453526',
  paper: '#EFEAE0',
  brass: '#A98F5F',
  patina: '#4A6B64',
  cinnabar: '#A63A2E',
  ink60: '#8B7A64',
}

// [lucide 图标名, 色名]
const JOBS = [
  ['arrow-left', 'ink'],       // 返回钮 nav-back
  ['backpack', 'ink'],         // 道具包入口
  ['notebook-pen', 'ink'],     // 考察手册入口
  ['download', 'ink'],         // 保存相册
  ['camera', 'ink'],           // 拍照/快门
  ['x', 'ink60'],              // 关闭
  ['scroll', 'ink'],           // 道具·隐语对照表
  ['id-card', 'ink'],          // 道具·工牌拓本卡
  ['brick-wall', 'ink'],       // 道具·砖纹卡
  ['file', 'ink'],             // 道具·薄白纸
  ['pencil', 'ink'],           // 道具·2B铅笔
  ['notebook', 'ink'],         // 道具·考察手册
  ['hand', 'brass'],           // 任务条·取出/动手
  ['eye', 'brass'],            // 任务条·观察
  ['camera', 'brass'],         // 任务条·拍照
  ['arrow-left-right', 'brass'], // 任务条·对比
  ['lightbulb', 'brass'],      // 提示
  ['map-pin', 'brass'],        // 站点定位
  ['check', 'patina'],         // 完成勾选
  ['stamp', 'cinnabar'],       // 印章(辅助)
  ['play', 'ink'],             // 播放
  ['skip-forward', 'ink60'],   // 跳过
  ['chevron-down', 'ink60'],   // 下拉提示
  ['clock', 'brass'],          // 时辰/时间
  ['lock', 'ink60'],           // 未解锁锁
]

fs.mkdirSync(OUT_DIR, { recursive: true })

let ok = 0
for (const [name, colorName] of JOBS) {
  const svgPath = path.join(ICONS_DIR, `${name}.svg`)
  if (!fs.existsSync(svgPath)) {
    console.error(`MISS ${name}`)
    continue
  }
  const color = COLORS[colorName]
  // 增强：加粗 stroke（2→2.4），营造铜版画羽毛笔手绘笔触感
  // 保留 Lucide 的清晰几何（round linecap/linejoin 已自带），避免 AI 生成小图标的糊化问题
  const svg = fs.readFileSync(svgPath, 'utf8')
    .replace(/currentColor/g, color)
    .replace(/stroke-width="2"/g, 'stroke-width="2.4"')
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 96 },
    background: 'rgba(0,0,0,0)',
  })
  const png = resvg.render().asPng()
  const out = path.join(OUT_DIR, `ic-${name}-${colorName}.png`)
  fs.writeFileSync(out, png)
  ok++
  console.log(`OK  ic-${name}-${colorName}.png  ${(png.length / 1024).toFixed(1)}KB`)
}
console.log(`\n${ok}/${JOBS.length} icons rendered -> ${OUT_DIR}`)
