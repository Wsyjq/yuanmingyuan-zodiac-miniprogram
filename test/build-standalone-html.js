// 生成自包含 HTML 画廊（图片压缩为 600px jpeg q72 内嵌 base64）
const fs = require('fs')
const path = require('path')
const Jimp = require('jimp')

const dir = path.join(__dirname, 'shots-h5')
const pages = [
  ['00-host-index','宿主首页·模块入口'],['01-cover','P00 封面'],['01b-cover-restart','P00 重新考察确认'],['02-prologue','P01 序章'],
  ['02b-prologue-envelope','P01 序章·任务单'],['03-s1-decode','P02 信封破译'],
  ['04-transit','P03 站间过渡'],['05-s2-quiz','P04 黄花阵选择'],['06-s2-reveal','P05 名字由来'],
  ['07-s2-blend','P06 四图现场考察'],['07b-s2-blend-record','P06 四图考察卡'],
  ['08-s2-pattern','P07 纹样观察'],['08b-s2-pattern-route','P07 手绘路线交接'],['09-s3-comic','P08 时辰漫画'],['09b-s3-comic-handoff','P08 取出转盘'],
  ['10-s3-zodiac','P09 七纹样转盘'],['10b-s3-zodiac-history','P09 兽首史料卡'],['10c-s3-zodiac-handoff','P09 转盘至水显纸交接'],
  ['11-s3-water','P10 水显纸'],['11b-s3-water-handoff','P10 水显纸收尾'],['12-s4-timeline','P11 时间轴'],['13-s4-password','P12 日期密码'],['13b-s4-password-open','P12 日期锁开启'],
  ['14-finale','P13 反转揭示'],['15-report','P14 考察报告'],['15b-report-player-photos','P14 玩家四图报告'],['16-ending','P15 结尾'],
  ['17-handbook','P16 考察手册'],['17b-handbook-player-photos','P16 手册四图考察卡']
];

(async () => {
  const items = []
  for (const [id, name] of pages) {
    const img = await Jimp.read(path.join(dir, id + '.png'))
    if (img.bitmap.width > 600) img.resize(600, Jimp.AUTO)
    const buf = await img.quality(72).getBufferAsync(Jimp.MIME_JPEG)
    items.push({ id, name, b64: buf.toString('base64') })
  }
  const cards = items.map(i =>
    `<figure><img src="data:image/jpeg;base64,${i.b64}" loading="lazy"><figcaption><b>${i.id.slice(3)}</b>${i.name}</figcaption></figure>`
  ).join('\n')
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>西洋楼铜版图·第二十一图 · 全页预览</title><style>body{margin:0;background:#2b2620;color:#d8cdb8;font-family:"PingFang SC","Microsoft YaHei",sans-serif}header{padding:24px 32px 6px}h1{font-size:18px;margin:0 0 4px;font-weight:600}header p{margin:0;font-size:12px;opacity:.6}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;padding:20px 32px 48px}figure{margin:0}figure img{width:100%;display:block;border:1px solid #4a4234;border-radius:5px}figcaption{padding:6px 2px 0;font-size:12px;letter-spacing:1px}figcaption b{color:#c8a86a;font-weight:600;margin-right:6px}</style></head><body><header><h1>《西洋楼铜版图·第二十一图》· 18 条路由 / 29 个状态</h1><p>谜题级断点 · 实体道具交接 · 玩家四图报告与手册 · 自包含文件双击即开</p></header><div class="grid">${cards}</div></body></html>`
  const out = path.join(dir, '西洋楼铜版图-全页预览.html')
  fs.writeFileSync(out, html)
  console.log('OK:', out)
  console.log('大小:', Math.round(fs.statSync(out).size / 1024) + 'KB')
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
