// 生成自包含 Markdown（图片压缩为 600px jpeg q72 内嵌 base64 data URI）
const fs = require('fs')
const path = require('path')
const Jimp = require('jimp')

const dir = path.join(__dirname, 'shots-h5')
const pages = [
  ['00-host-index','宿主首页·模块入口','小程序主入口，模块导航卡片式布局。点击「第二十一图」进入考察模块。'],
  ['01-cover','P00 封面','考察正式开场。历史铜版画扫描主视觉（授权待核验）+ 书名 + 朱砂方印 + 票根凭证 + 道具包入口。'],
  ['01b-cover-restart','P00 重新考察确认','明确列出会删除的谜题进度、日期卡、现场四图、署名与报告，确认后才重建会话。'],
  ['02-prologue','P01 序章','叙事开场：博物馆档案室发现「第二十一图」传闻。读毕后按指引拆开实体信封。'],
  ['02b-prologue-envelope','P01 序章·任务单','叙事读毕后的实体信封任务单，提供操作步骤、分级提示与完成入口。'],
  ['03-s1-decode','P02 信封破译','第一站谜题。观察实体信封上的两排半字，拼出第一站地点。'],
  ['04-transit','P03 站间过渡','站间路线推进图，AI 生成铜版风地图底 + 黄铜点位连线。'],
  ['05-s2-quiz','P04 黄花阵选择','第二站谜题。黄花阵历史铜版画扫描 + 中秋灯会选择题。'],
  ['06-s2-reveal','P05 名字由来','观察宫女莲花灯参考图，以文字回答黄花阵得名原因。'],
  ['07-s2-blend','P06 四图现场考察','四个真实拍摄槽，支持相机、相册补录、预览、重拍和未齐拦截。'],
  ['07b-s2-blend-record','P06 四图考察卡','四张玩家现场照片齐备后生成考察记录卡，再进入史料题。'],
  ['08-s2-pattern','P07 纹样观察','观察实体拓印与万字纹样，在小程序中完成结果核对。'],
  ['08b-s2-pattern-route','P07 手绘路线交接','万字纹只解释为福寿绵长；玩家展开手绘路线图确认海晏堂·大水法。'],
  ['09-s3-comic','P08 时辰漫画','海晏堂十二兽首按时辰喷水，四格漫画推理。'],
  ['09b-s3-comic-handoff','P08 取出转盘','漫画推理完成后明确取出实体七纹样转盘。'],
  ['10-s3-zodiac','P09 七纹样转盘','按任务单操作实体七纹样转盘，并填写观察到的生肖结果。'],
  ['10b-s3-zodiac-history','P09 兽首史料卡','转盘结果核对完成后展示海晏堂兽首史料卡。'],
  ['10c-s3-zodiac-handoff','P09 道具交接','收好七纹样转盘，取出并准备实体水显纸。'],
  ['11-s3-water','P10 水显纸','按指引操作实体水显纸，在小程序中填写并核对显影结果。'],
  ['11b-s3-water-handoff','P10 水显纸收尾','自然晾干并收好水显纸，由马首流失线索引向雨果抗议信。'],
  ['12-s4-timeline','P11 时间轴','1747 至今日横向时间轴，事件卡拖回对应年份。'],
  ['13-s4-password','P12 日期密码','汇总已收集的日期数字，输入八位日期密码打开终局。'],
  ['13b-s4-password-open','P12 日期锁开启','密码答对后保留可恢复的解锁结论，再进入第二十一图演出。'],
  ['14-finale','P13 反转揭示','演出高潮：铜版画逐层拼合，揭示第二十一图真相。'],
  ['15-report','P14 考察报告','考察归档：第二十一图、题跋落款、现场四图槽位与保存相册。'],
  ['15b-report-player-photos','P14 玩家四图报告','四张玩家现场照片进入页面报告与 Canvas 导出，不以参考图替代。'],
  ['16-ending','P15 结尾','VID-E01 离场视频区（AI 大水法夕照参考图作 poster）+ 三段结尾独白 + 完结卡。'],
  ['17-handbook','P16 考察手册','四站考察记录 + 四图考察卡 + 已收集史料卡 + 考察报告缩略位。'],
  ['17b-handbook-player-photos','P16 手册四图考察卡','手册展示四张玩家现场照片，点击可进入全屏预览。']
];

(async () => {
  const lines = []
  lines.push('# 《西洋楼铜版图·第二十一图》全页预览')
  lines.push('')
  lines.push('> **v1.3「旧纸档案手账」** · 历史铜版画扫描（授权待核验）+ 霞鹜文楷批注 + AI 遗址参考图')
  lines.push('> ')
  lines.push('> 原生微信小程序 · 18 条路由 · 29 个页面/关键状态 · 自包含文档（图片内嵌 base64）')
  lines.push('')
  lines.push('---')
  lines.push('')

  let totalSize = 0
  for (const [id, name, desc] of pages) {
    const img = await Jimp.read(path.join(dir, id + '.png'))
    if (img.bitmap.width > 600) img.resize(600, Jimp.AUTO)
    const buf = await img.quality(72).getBufferAsync(Jimp.MIME_JPEG)
    totalSize += buf.length
    const b64 = buf.toString('base64')
    lines.push(`## ${name}`)
    lines.push('')
    lines.push(`![${name}](data:image/jpeg;base64,${b64})`)
    lines.push('')
    lines.push(desc)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  const md = lines.join('\n')
  const out = path.join(dir, '西洋楼铜版图-全页预览.md')
  fs.writeFileSync(out, md)
  console.log('OK:', out)
  console.log('图片总大小:', Math.round(totalSize / 1024) + 'KB')
  console.log('MD 文件大小:', Math.round(fs.statSync(out).size / 1024) + 'KB')
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
