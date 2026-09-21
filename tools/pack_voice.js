/** 人声音频分包打包器（方案C，issue #0028）。
 *
 * 把 audio/v22/*.mp3（75 条，约 14MB）按站点顺序贪心分桶到若干 voice-<x> 分包目录，
 * 每个分包带一个占位页（subPackages 必须至少含一个 page），并生成
 * plate21/module/utils/voice-pkg-map.js（clipId -> 包内绝对路径）供 audio-src.js 查询。
 *
 * 用法（仓库根目录）：node tools/pack_voice.js [--max 3.4]
 * 幂等：重跑会先清掉旧的 voice-[a-z] 目录再重建。
 * 分桶限额留了 0.6MB 余量（平台上限 4MB/包，占位页极小）。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'audio', 'v22')
const MANIFEST = path.join(ROOT, 'tools', 'voice_manifest.json')
const MAP_OUT = path.join(ROOT, 'plate21', 'module', 'utils', 'voice-pkg-map.js')
const MAX_MB = parseFloat(process.argv.includes('--max') ? process.argv[process.argv.indexOf('--max') + 1] : '3.4')

// 站点分组键：粒度到「站内用途」，供显式包映射（预下载链按页挂、单页 ≤2MB）
function stationOf(id) {
  if (/^narr-prologue/.test(id)) return 'prologue'
  if (/^narr-s1/.test(id)) return 's1'
  if (/^dlg-huanghuazhen/.test(id)) return 's2-dlg'
  if (/^narr-s2/.test(id)) return 's2-narr'
  if (/^guide-s2/.test(id)) return 's2-guide'
  if (/^(dlg-haiyantang|narr-s3|guide-s3)/.test(id)) return 's3'
  if (/^(dlg-yugao|narr-s4|guide-s4)/.test(id)) return 's4'
  if (/^narr-finale/.test(id)) return 'finale'
  if (/^narr-dashuifa/.test(id)) return 'ds'
  const m = id.match(/(?:dlg|narr-waypoint|guide-t)-([a-z]+)(?:-followup|-end|-b\d+|-[0-9]+|-base|-deep)?$/)
  if (m) return 'wp-' + m[1]
  return 'misc'
}

// 显式站点→包映射（与 app.json preloadRule 按页挂的预载链一一对应）：
// a=序章+入口 | b=黄花阵台词+旁白 | c=黄花阵导览+终章旁白 | d=海晏堂全站
// e=雨果站全站 | f=谐奇趣 | g=养雀笼 | h=方外观 | i=蓄水楼 | j=观水法+线法画
// （散页站单独成包：preloadRule 按页挂且单页合计 ≤2MB，散页共用一个 waypoint
//   页面无法按 site 区分，只能靠 transit/dashuifa/handbook 等前置页分头预载）
// 约束：单包 ≤--max（平台分包上限 2048KB，留余量）；同页 preloadRule 合计 ≤2MB。
const PKG_LAYOUT = [
  { name: 'voice-a', stations: ['prologue', 's1'] },
  { name: 'voice-b', stations: ['s2-dlg', 's2-narr'] },
  { name: 'voice-c', stations: ['s2-guide', 'finale'] },
  { name: 'voice-d', stations: ['s3'] },
  { name: 'voice-e', stations: ['s4'] },
  { name: 'voice-f', stations: ['wp-xieqiqu'] },
  { name: 'voice-g', stations: ['wp-yangquelong', 'ds'] },
  { name: 'voice-h', stations: ['wp-fangwaiguan'] },
  { name: 'voice-i', stations: ['wp-xushuilou'] },
  { name: 'voice-j', stations: ['wp-guanshuifa', 'wp-xianfahua'] }
]

function placeholder(dir) {
  const p = path.join(dir, 'pages', 'hold')
  fs.mkdirSync(p, { recursive: true })
  fs.writeFileSync(path.join(p, 'hold.js'), "// 音频分包占位页：subPackages 必须含至少一个 page，永不导航到此。\nPage({})\n")
  fs.writeFileSync(path.join(p, 'hold.json'), '{\n  "usingComponents": {}\n}\n')
  fs.writeFileSync(path.join(p, 'hold.wxml'), '<view class="page page-shell"></view>\n')
  fs.writeFileSync(path.join(p, 'hold.wxss'), '/* 占位页无样式 */\n')
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  const ids = manifest.clips.map((c) => c.id)
  const files = ids.map((id) => {
    const p = path.join(SRC_DIR, id + '.mp3')
    if (!fs.existsSync(p)) throw new Error('缺少音频文件: ' + p + '（先跑 gen_voice.py）')
    return { id, p, size: fs.statSync(p).size }
  })

  // 清旧包
  for (const d of fs.readdirSync(ROOT)) {
    if (/^voice-[a-z]$/.test(d)) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true })
  }

  const limit = MAX_MB * 1024 * 1024
  // 按站点分组
  const groups = {}
  for (const f of files) {
    const g = stationOf(f.id)
    if (g === 'misc') throw new Error('未识别站点的 clip: ' + f.id + '（补 stationOf 规则）')
    ;(groups[g] = groups[g] || []).push(f)
  }
  const assigned = new Set(PKG_LAYOUT.reduce((s, p) => s.concat(p.stations), []))
  for (const g of Object.keys(groups)) {
    if (!assigned.has(g)) throw new Error('站点 ' + g + ' 未在 PKG_LAYOUT 分配（补映射）')
  }

  const map = {}
  for (const pkg of PKG_LAYOUT) {
    const dir = path.join(ROOT, pkg.name)
    fs.mkdirSync(dir, { recursive: true })
    placeholder(dir)
    let size = 0
    let count = 0
    for (const st of pkg.stations) {
      for (const f of groups[st] || []) {
        fs.copyFileSync(f.p, path.join(dir, f.id + '.mp3'))
        map[f.id] = '/' + pkg.name + '/' + f.id + '.mp3'
        size += f.size
        count++
      }
    }
    if (size > limit) throw new Error(pkg.name + ' 超过 ' + MAX_MB + 'MB 上限（' + (size / 1048576).toFixed(2) + 'MB），调整 PKG_LAYOUT')
    console.log(`${pkg.name}  ${(size / 1048576).toFixed(2)}MB  ${count} 条  [${pkg.stations.join('+')}]`)
  }

  const total = files.reduce((s, f) => s + f.size, 0)
  const header = `// 本文件由 tools/pack_voice.js 生成，勿手改。重跑生成器即可同步。\n// clipId -> 包内绝对路径（方案C：人声随包分发，BGM 仍走 AUDIO_BASE 流式）。\n`
  const body = 'module.exports = {\n' + Object.keys(map).map((k) => `  '${k}': '${map[k]}'`).join(',\n') + '\n}\n'
  fs.writeFileSync(MAP_OUT, header + body)
  console.log(`共 ${PKG_LAYOUT.length} 个分包，${files.length} 条，${(total / 1048576).toFixed(2)}MB；映射表 -> plate21/module/utils/voice-pkg-map.js`)
}

main()
