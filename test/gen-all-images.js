// AI 大图一键批生成：node test/gen-all-images.js [--retry] [--only IMG-F06]
// 需先设置环境变量：GPN_KEY=<你的 key>
//
// 流程：对每个素材 → 调 GPUNexus 文生图（doubao-seedream-5-0-260128）→ 保存原图到 test/gen-raw/
//       → jimp 缩放到「设计目标尺寸」转 jpg(q83) → 落到 plate21/module/assets/img/
// 失败自动重 roll 最多 2 次；--retry 强制重生成本地已存在的；--only 只跑指定编号。
// 提示词与尺寸来源：docs/开发进度与AI素材指南.md 第二部分 + docs/素材需求清单.md
'use strict'

const fs = require('fs')
const path = require('path')
const Jimp = require('jimp')

const KEY = process.env.GPN_KEY
if (!KEY) {
  console.error('请先设置 GPN_KEY 环境变量：export GPN_KEY=<key>（Windows: set GPN_KEY=<key>）')
  process.exit(1)
}

const ROOT = path.resolve(__dirname, '..')
const RAW_DIR = path.join(__dirname, 'gen-raw')
const OUT_DIR = path.join(ROOT, 'plate21', 'module', 'assets', 'img')
const MODEL = process.env.GPN_IMG_MODEL || 'doubao-seedream-5-0-260128'
const GEN_SIZE = process.env.GPN_IMG_SIZE || '1920x2560' // 默认竖图；单条可覆盖
const MAX_RETRY = 2

fs.mkdirSync(RAW_DIR, { recursive: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

// 素材清单：id / 提示词 / 生成尺寸 / 设计目标尺寸(用于后处理缩放) / 是否方图
// 生成尺寸下限 3,686,400 像素：竖 1920x2560 / 横 2560x1920 / 方 1920x1920
const JOBS = [
  // —— 优先级最高：终版主图 ——
  { id: 'IMG-F06', orient: 'v', prompt: '18世纪欧洲铜版画蚀刻风格插画：一幅完整的皇家园林铜版画——大水法喷泉盛景，十二尊兽首人身铜像扇形环绕水池同时喷水，水柱冲天，背景是远瀛观高台石柱与层层拱券雕花，画面上方为横批留白区，四周万字不断纹边框，构图庄严对称，密集交叉排线构成明暗，单色暖褐墨线稿印在米白旧纸上，古典制图学精确感，竖构图，无文字无水印无彩色', design: { w: 1080, h: 1440 } },

  // —— 序章剧情插图 ——
  { id: 'IMG-P01', orient: 'h', prompt: '18世纪欧洲铜版画蚀刻风格插画：老式档案室木桌俯视，桌上摊开一册铜版画图录、几张著录卡片、一把放大镜和一支毛笔，暖黄台灯照明，密集交叉排线构成明暗，单色暖褐墨线稿印在米白旧纸上，古典制图学精确感，横构图，无文字无水印无彩色', design: { w: 1200, h: 900 } },
  { id: 'IMG-P02', orient: 'v', prompt: '18世纪欧洲铜版画蚀刻风格插画：一张民国时期的档案著录卡片平铺特写，卡片有格线分栏和一枚边角印章，格内留白，密集交叉排线，单色暖褐墨线稿印在米白旧纸上，竖构图，无文字无水印无彩色', design: { w: 900, h: 1200 } },

  // —— 地图 ——
  { id: 'IMG-M01', orient: 'h', prompt: '18世纪欧洲铜版画蚀刻风格插画：皇家园林西洋楼景区手绘导览地图，俯视视角，一条主径串联五处地标：景区入口、绿篱迷宫、喷泉废墟、高台石柱、雕像小广场，点缀水系与树丛，角落一枚罗盘玫瑰装饰，密集交叉排线，单色暖褐墨线稿印在米白旧纸上，古典地图学风格，横构图，无文字无水印无彩色', design: { w: 1340, h: 960 } },

  // —— S1 铭文破译（只生成无字底版，文字后期程序叠加）——
  { id: 'IMG-S1A', orient: 'v', prompt: '18世纪欧洲铜版画蚀刻风格插画：一块残破的清代铜匠腰牌的宣纸拓片，长方形铜牌边缘残缺磨损，表面有锤揲刻痕肌理，中央留出矩形空白铭文区，朱砂色拓印质感，印在米白旧纸上，竖构图，无文字无水印', design: { w: 900, h: 1200 } },
  { id: 'IMG-S1B', orient: 'v', prompt: '18世纪欧洲铜版画蚀刻风格插画：一张泛黄的对照表卡纸，细密格线分成十余横行，每行左右两栏留白，纸边磨损，单色暖褐墨线稿印在米白旧纸上，竖构图，无文字无水印无彩色', design: { w: 900, h: 1200 } },

  // —— S2 黄花阵 ——
  { id: 'IMG-S2A', orient: 'h', prompt: '18世纪欧洲铜版画蚀刻风格插画：欧式迷宫花园俯瞰，环形绿篱迷阵层层环绕，中心一座中式六角凉亭，小径曲折分明，四周散落石雕残件，密集交叉排线构成明暗，单色暖褐墨线稿印在米白旧纸上，横构图，无文字无水印无彩色', design: { w: 1200, h: 900 } },
  { id: 'IMG-S2B', orient: 'v', prompt: '18世纪欧洲铜版画蚀刻风格插画：一位清代宫女手举莲花灯沿迷宫小径奔跑，全身侧面动态，衣袂飘起，灯笼透出极淡的暖黄色光晕，密集交叉排线构成明暗，单色暖褐墨线稿印在米白旧纸上，竖构图，无文字无水印', design: { w: 900, h: 1200 } },
  { id: 'IMG-S2C', orient: 'sq', prompt: '中国传统万字不断纹（卍字不到头）连续图案，单线白描，线条均匀锐利，四方连续可无缝平铺，单色暖褐墨线条，纯白底，无文字无水印无彩色', design: { w: 600, h: 600 } },

  // —— S3 时辰/构件 ——
  { id: 'IMG-S3A', orient: 'v', prompt: '18世纪欧洲铜版画蚀刻风格四格连环画，竖向四格等分、格线清晰：第一格子夜鼠首铜像喷泉吐水，第二格黎明牛首铜像吐水，第三格空置的喷泉兽首基座与将亮的天色，第四格正午十二尊兽首铜像同时喷水盛况，密集交叉排线，单色暖褐墨线稿印在米白旧纸上，竖构图，无文字无水印无彩色', design: { w: 900, h: 1200 } },
  { id: 'IMG-S3C', orient: 'h', prompt: '18世纪欧洲铜版画蚀刻风格插画：圆明园大水法喷泉建筑立面完整复原图，严格对称构图，中央大型拱券门洞，两侧石柱与壁龛，巴洛克卷草与贝壳雕饰，壁龛内有猎犬逐鹿浮雕，下方喷泉水池，密集交叉排线构成明暗，单色暖褐墨线稿印在米白旧纸上，横构图，无文字无水印无彩色', design: { w: 1340, h: 960 } },

  // —— S4 远瀛观 ——
  { id: 'IMG-S4A', orient: 'v', prompt: '18世纪欧洲铜版画蚀刻风格插画：一根断裂的汉白玉巴洛克石柱孤立于荒草中，柱身满雕卷草纹样，中段有一小块纹样剥失的空白，柱头残缺，背景极简，密集交叉排线，单色暖褐墨线稿印在米白旧纸上，竖构图，无文字无水印无彩色', design: { w: 900, h: 1200 } },

  // —— S5 雨果雕像 ——
  { id: 'IMG-S5A', orient: 'h', prompt: '18世纪欧洲铜版画蚀刻风格插画：一尊法国文豪的青铜半身雕像立在花岗岩方座上，置于树荫下的小广场，树影婆娑，底座正面留白（铭文后期叠加），密集交叉排线，单色暖褐墨线稿印在米白旧纸上，横构图，无文字无水印无彩色', design: { w: 1200, h: 900 } },

  // —— V 相机取景轮廓（极简单线）——
  { id: 'IMG-V01', orient: 'v', prompt: '18世纪欧洲铜版画蚀刻风格：圆明园大水法残垣正立面，极简单线轮廓，只有建筑外轮廓与主要拱洞结构线，无排线无阴影，单色暖褐墨细线，米白底，竖构图，无文字无水印无彩色', design: { w: 900, h: 1200 } },
  { id: 'IMG-V02', orient: 'v', prompt: '18世纪欧洲铜版画蚀刻风格：远瀛观高台石柱群，两三根带柱头的高大石柱，极简单线轮廓，只有建筑外轮廓与主要结构线，无排线无阴影，单色暖褐墨细线，米白底，竖构图，无文字无水印无彩色', design: { w: 900, h: 1200 } },
]

// 六构件 D1~D6：同一模板改主体句
const S3D_SUBJECTS = [
  '①断裂的主石柱残段',
  '②卷草浮雕饰件',
  '③兽首喷泉口构件',
  '④巴洛克壁龛残件',
  '⑤猎犬逐鹿浮雕石块',
  '⑥基座缠枝花纹石',
]
S3D_SUBJECTS.forEach((sub, i) => {
  const n = i + 1
  JOBS.push({
    id: `IMG-S3D${n}`,
    orient: 'sq',
    prompt: `18世纪欧洲铜版画蚀刻风格插画：一块独立的巴洛克石雕建筑构件特写——${sub}，置于素纸之上，带轻微投影，密集交叉排线，单色暖褐墨线稿，米白旧纸底，方构图，无文字无水印无彩色`,
    design: { w: 480, h: 480 },
  })
})

// 部首碎片 S3E：六个偏旁
const S3E_RADICALS = ['氵', '亡', '口', '月', '女', '凡']
S3E_RADICALS.forEach((rad, i) => {
  const n = i + 1
  JOBS.push({
    id: `IMG-S3E${n}`,
    orient: 'sq',
    prompt: `18世纪欧洲铜版画蚀刻风格插画：一块不规则石刻碎片，断面粗糙，石面刻着一个汉字偏旁「${rad}」，刻痕深峻，密集交叉排线，单色暖褐墨线稿，米白旧纸底，方构图，除该汉字外无其他文字无水印`,
    design: { w: 480, h: 480 },
  })
})

// 纹样四母题 S4B1~B4
const S4B_MOTIFS = ['①扇贝形', '②莨苕涡卷形', '③花篮形', '④几何菱花形']
S4B_MOTIFS.forEach((mot, i) => {
  const n = i + 1
  JOBS.push({
    id: `IMG-S4B${n}`,
    orient: 'sq',
    prompt: `18世纪欧洲铜版画蚀刻风格插画：一枚巴洛克石雕装饰母题特写——${mot}，对称饱满，密集交叉排线，单色暖褐墨线稿，米白旧纸底，方构图，无文字无水印无彩色`,
    design: { w: 480, h: 480 },
  })
})

// 方向 → 生成尺寸
function genSizeFor(orient) {
  if (orient === 'h') return '2560x1920'
  if (orient === 'sq') return '1920x1920'
  return '1920x2560' // v
}

async function generateOne(job, attempt) {
  const size = genSizeFor(job.orient)
  const body = { model: MODEL, prompt: job.prompt, size, response_format: 'b64_json' }
  const resp = await fetch('https://api.gpunexus.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await resp.text()
  let data
  try { data = JSON.parse(text) } catch (e) {
    throw new Error(`HTTP ${resp.status} 非JSON: ${text.slice(0, 200)}`)
  }
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 300)}`)
  const item = data.data && data.data[0]
  if (!item) throw new Error('无 data: ' + JSON.stringify(data).slice(0, 200))
  const rawPath = path.join(RAW_DIR, `${job.id}.png`)
  if (item.b64_json) {
    fs.writeFileSync(rawPath, Buffer.from(item.b64_json, 'base64'))
  } else if (item.url) {
    const img = await fetch(item.url)
    fs.writeFileSync(rawPath, Buffer.from(await img.arrayBuffer()))
  } else {
    throw new Error('未知返回格式: ' + JSON.stringify(item).slice(0, 200))
  }
  return rawPath
}

async function postProcess(job, rawPath) {
  const img = await Jimp.read(rawPath)
  const { w, h } = job.design
  img.cover(w, h)
  const outPath = path.join(OUT_DIR, `${job.id}.jpg`)
  await img.quality(83).writeAsync(outPath)
  return outPath
}

async function runJob(job, force) {
  const finalPath = path.join(OUT_DIR, `${job.id}.jpg`)
  if (fs.existsSync(finalPath) && !force) {
    console.log(`  ✓ ${job.id} 已存在，跳过（--retry 强制重生成）`)
    return { id: job.id, status: 'skip' }
  }
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      process.stdout.write(`  → ${job.id} 生成中（第 ${attempt + 1} 次，尺寸 ${genSizeFor(job.orient)}）…`)
      const rawPath = await generateOne(job, attempt)
      const outPath = await postProcess(job, rawPath)
      console.log(` OK → ${path.relative(ROOT, outPath)} (${fs.statSync(outPath).size} bytes)`)
      return { id: job.id, status: 'ok' }
    } catch (e) {
      console.log(` 失败: ${e.message}`)
      if (attempt === MAX_RETRY) return { id: job.id, status: 'fail', err: e.message }
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
}

async function main() {
  const argv = process.argv.slice(2)
  const force = argv.includes('--retry')
  const onlyIdx = argv.indexOf('--only')
  let jobs = JOBS
  if (onlyIdx !== -1 && argv[onlyIdx + 1]) {
    const ids = argv[onlyIdx + 1].split(',').map((s) => s.trim().toUpperCase())
    jobs = JOBS.filter((j) => ids.includes(j.id))
    if (!jobs.length) {
      console.error(`未找到匹配素材：${argv[onlyIdx + 1]}`)
      console.error('可用编号：' + JOBS.map((j) => j.id).join(', '))
      process.exit(1)
    }
  }

  console.log(`\n=== AI 大图批生成 ===`)
  console.log(`素材数：${jobs.length}（共 ${JOBS.length} 个可选）`)
  console.log(`模型：${MODEL}`)
  console.log(`输出：${path.relative(ROOT, OUT_DIR)}/<ID>.jpg`)
  console.log(`原图存档：${path.relative(ROOT, RAW_DIR)}/<ID>.png\n`)

  const results = []
  for (const job of jobs) {
    results.push(await runJob(job, force))
  }

  console.log(`\n=== 汇总 ===`)
  const ok = results.filter((r) => r.status === 'ok').length
  const skip = results.filter((r) => r.status === 'skip').length
  const fail = results.filter((r) => r.status === 'fail')
  console.log(`成功 ${ok} · 跳过 ${skip} · 失败 ${fail.length}`)
  if (fail.length) {
    console.log('失败清单：')
    fail.forEach((r) => console.log(`  ✗ ${r.id}: ${r.err}`))
    process.exit(1)
  }
  console.log('\n下一步：生成完成后，把页面里的占位图引用替换为对应 IMG-xxx.jpg 路径，再跑 node test/harness/render.js 截图验证。')
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
