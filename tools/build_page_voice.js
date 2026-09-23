#!/usr/bin/env node
/**
 * 按当前页面可视屏抽出旁白 clip，写回 tools/voice_manifest.json 的 narr-*。
 * 一屏一条；novel-view 按 buildPages 分页。dlg-* / guide-* 不动。
 *
 * 用法（仓库根）：node tools/build_page_voice.js
 */
'use strict'

const fs = require('fs')
const path = require('path')
const novelPages = require('../plate21/module/utils/novel-pages')
const CONTENT = require('../plate21/module/content')

const ROOT = path.resolve(__dirname, '..')
const MANIFEST = path.join(ROOT, 'tools', 'voice_manifest.json')
const PAGES = path.join(ROOT, 'plate21', 'module', 'pages')

function read(rel) {
  return fs.readFileSync(path.join(PAGES, rel), 'utf8')
}

function extractArrayBody(src, key) {
  const re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[:=]\\s*\\[')
  const m = re.exec(src)
  if (!m) return ''
  let i = m.index + m[0].length
  let depth = 1
  const start = i
  while (i < src.length && depth) {
    const ch = src[i]
    if (ch === '[') depth++
    else if (ch === ']') depth--
    i++
  }
  return src.slice(start, i - 1)
}

function parseParagraphItems(src, key) {
  const body = extractArrayBody(src, key)
  const items = []
  const objRe = /\{([^{}]*)\}/g
  let m
  while ((m = objRe.exec(body))) {
    const block = m[1]
    const textM = block.match(/text:\s*'((?:\\'|[^'])*)'/)
    const capM = block.match(/caption:\s*'((?:\\'|[^'])*)'/)
    const imgM = block.match(/image:\s*'((?:\\'|[^'])*)'/)
    const quote = /quote:\s*true/.test(block)
    const packM = block.match(/pack:\s*(\d+)/)
    const item = {}
    if (textM) item.text = textM[1].replace(/\\'/g, "'")
    if (capM) item.caption = capM[1].replace(/\\'/g, "'")
    if (imgM) item.image = imgM[1]
    if (quote) item.quote = true
    if (packM) item.pack = Number(packM[1])
    if (item.text || item.image) items.push(item)
  }
  return items
}

function parseStrArray(src, key) {
  const body = extractArrayBody(src, key)
  if (!body) return []
  return [...body.matchAll(/'((?:\\'|[^'])*)'/g)].map((m) => m[1].replace(/\\'/g, "'"))
}

function parseConstStr(src, key) {
  const m = src.match(new RegExp('(?:const|let)\\s+' + key + '\\s*=\\s*\'((?:\\\\\'|[^\'])*)\''))
  return m ? m[1].replace(/\\'/g, "'") : ''
}

function wxmlTexts(page, classRe) {
  let s = read(page + '/' + page + '.wxml')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  const texts = []
  const re = /<view[^>]*class="([^"]*)"[^>]*>([^<]*)<\/view>/g
  let m
  while ((m = re.exec(s))) {
    if (new RegExp(classRe).test(m[1])) {
      const t = m[2].trim()
      if (t && t.indexOf('{{') < 0) texts.push(t)
    }
  }
  return texts
}

function joinSpeak(parts) {
  return parts.filter(Boolean).join('')
}

function pageTextFromItems(items) {
  return joinSpeak(items.map((it) => {
    if (it.image) return it.caption || ''
    return it.text || ''
  }))
}

function clip(id, text, note) {
  const parts = Array.isArray(text) ? text.filter(Boolean) : [text]
  const flat = parts.map((t) => String(t).trim()).filter(Boolean)
  if (!flat.length) return null
  return {
    id: id,
    cast: 'narrator',
    speaker: '旁白',
    page: note || id,
    text: flat.length === 1 ? flat[0] : flat
  }
}

function waypointField(src, site, field) {
  const re = new RegExp('\\n  ' + site + ': \\{[\\s\\S]*?\\n  \\}')
  const seg = src.match(re)
  if (!seg) return ''
  const m = seg[0].match(new RegExp(field + ':\\s*\'((?:\\\\\'|[^\'])*)\''))
  return m ? m[1].replace(/\\'/g, "'") : ''
}

function waypointFollowup(src, site) {
  const re = new RegExp('\\n  ' + site + ': \\{[\\s\\S]*?\\n  \\}')
  const seg = src.match(re)
  if (!seg) return []
  const fm = seg[0].match(/followup:\s*\[([\s\S]*?)\]/)
  if (!fm) return []
  const fromT = [...fm[1].matchAll(/t:\s*'((?:\\'|[^'])*)'/g)].map((x) => x[1].replace(/\\'/g, "'"))
  if (fromT.length) return fromT
  return [...fm[1].matchAll(/'((?:\\'|[^'])*)'/g)].map((x) => x[1].replace(/\\'/g, "'"))
}

function waypointBeats(src, site) {
  const re = new RegExp('\\n  ' + site + ': \\{[\\s\\S]*?\\n  \\}')
  const seg = src.match(re)
  if (!seg) return []
  const body = seg[0]
  const scored = /scored:\s*true/.test(body)
  const beats = []
  const beatRe = /\{\s*[\s\S]*?kicker:\s*'((?:\\'|[^'])*)'[\s\S]*?lines:\s*\[([\s\S]*?)\]/g
  let m
  while ((m = beatRe.exec(body))) {
    const lines = [...m[2].matchAll(/'((?:\\'|[^'])*)'/g)].map((x) => x[1].replace(/\\'/g, "'"))
    beats.push({ kicker: m[1], lines: lines })
  }
  const motifM = body.match(/motif:\s*'((?:\\'|[^'])*)'/)
  return { scored: scored, intro: waypointField(src, site, 'intro'), beats: beats, motif: motifM ? motifM[1].replace(/\\'/g, "'") : '' }
}

function buildClips() {
  const clips = []
  const add = (id, text, note) => {
    const c = clip(id, text, note)
    if (c) clips.push(c)
  }

  // 已外置页的文案从 content 注册表直接取（不再正则解析页面源码）
  const prologueItems = CONTENT.prologue.paragraphs
  const prologuePages = novelPages.buildPages(prologueItems)
  prologuePages.forEach((page, i) => {
    add('narr-prologue-p' + String(i + 1).padStart(2, '0'), pageTextFromItems(page), 'prologue sheet ' + (i + 1))
  })
  add('narr-prologue-handover', '里面有一封信、一张手绘路线图、几张空白记录页，以及几件用于现场记录的工具。', 'prologue handover')

  add('narr-s1-arrive', '来到了西洋楼入口，我从背包里面取出档案袋，还有那份地图，决定按照上面手绘的路线图走。', 's1 arrive')
  add('narr-s1-decode-solved', [
    '西洋楼沿着长春园的北界东西展开。虽然叫“楼”，但它不是一栋楼，而是一组楼殿、喷泉和庭园的总称。谐奇趣、方外观、大水法……今天我将一一踏足，去找寻第二十一幅图的线索。',
    '档案袋里还有几张西洋楼的铜版画，或许我在现场中能对应起来这几幅铜版画对应的建筑名字，以及现在长什么样。'
  ], 's1 solved')

  const wp = read('waypoint/waypoint.js')
  ;['xieqiqu', 'fangwaiguan', 'xushuilou'].forEach((site) => {
    add('narr-waypoint-' + site, waypointField(wp, site, 'intro'), site + ' intro')
    add('narr-waypoint-' + site + '-followup', waypointFollowup(wp, site), site + ' followup')
  })
  ;['yangquelong', 'guanshuifa', 'xianfahua'].forEach((site) => {
    const info = waypointBeats(wp, site)
    add('narr-waypoint-' + site, info.intro, site + ' intro')
    info.beats.forEach((b, i) => {
      add('narr-waypoint-' + site + '-b' + (i + 1), b.lines, site + ' beat ' + (i + 1))
    })
    add('narr-waypoint-' + site + '-end', info.motif, site + ' end')
  })

  add('narr-s2-quiz', CONTENT['s2-quiz'].introParts.map((p) => p.t).join(''), 's2-quiz')
  add('narr-s2-quiz-followup', '原来，这个黄花阵是皇帝用来观赏宫女在迷宫路径中奔跑嬉戏的。好嘛，这下不出门就有游乐场了！可是这又和“黄花”有什么关系呢？', 's2-quiz followup')

  add('narr-s2-reveal', '可是这又和“黄花”有什么关系呢？', 's2-reveal')
  add('narr-s2-reveal-followup', [
    '由于宫女们手持黄色彩绸扎成的莲花灯，所以这个迷宫也得名黄花阵。',
    '这迷宫看上去很难走？我也要试试看，也许黄花阵的中央，还有什么我值得考察的东西呢。'
  ], 's2-reveal followup')

  add('narr-s2-blend', wxmlTexts('s2-blend', 'lead kaiti'), 's2-blend')

  const patFinale = CONTENT['s2-pattern'].finale
  add('narr-s2-pattern', CONTENT['s2-pattern'].lead, 's2-pattern')
  // 收尾段文案全部来自 content（含 wallParts 拼句）；顺序与历史 manifest 一致
  add('narr-s2-pattern-finale', [
    patFinale.reveal,
    CONTENT['s2-pattern'].wallParts.map((p) => p.t).join(''),
    patFinale.closing
  ], 's2-pattern finale')

  add('narr-s3-comic', '海晏堂，名字取自“河清海晏”一词，寓意天下太平。池周分布十二兽首铜像代表十二时辰，依次喷水构成报时系统。十二兽首分别代表不同时辰？这是怎么实现的呢？', 's3-comic')
  add('narr-s3-comic-followup', [
    '答案确认后，画面里的十二生肖一个接一个亮起，到了正午，十二道水流同时喷出。',
    '昔日竟然如此壮观，可如今却只剩下断壁残垣。这些兽首流离失所，有七尊归来了，但还有五尊不知所踪。'
  ], 's3-comic followup')

  add('narr-s3-zodiac', '使用DJ-转盘，根据花纹匹配寻找信息', 's3-zodiac')
  add('narr-s3-water', wxmlTexts('s3-water', 'lead kaiti'), 's3-water')

  add('narr-dashuifa-hunt', [
    '顺着档案上的路线继续往前，大水法遗址逐渐出现在眼前。和海晏堂相比，这里的遗迹看起来更直观一些。高大的石构还留在原地，但只看现在的样子，还是很难想象它当年到底是什么样的。在小学课文中圆明园的插图，也就是这里的实拍图。',
    '我翻了翻档案，正好找到了一幅《大水法南面》的铜版图。图中的石构轮廓和眼前能够对得上。但真正吸引我注意的，反而是前面的喷水池。不过水池中间怎么还有一只鹿？周围那些动物又是在做什么？'
  ], 'dashuifa hunt')
  add('narr-dashuifa-after', [
    '原来这些动物并不是随便摆在喷泉里的装饰。鹿站在中间，猎狗围在周围，水流一喷起来，周围十只铜猎狗同时向鹿喷水，组成“猎狗逐鹿”的场景。而对面的观水法，正是皇帝当年观赏喷泉的地方。',
    '都没了，一场火过后，这些都没了……'
  ], 'dashuifa after')

  add('narr-s4-timeline', '同样愤怒的还有面前的这位法国作家——雨果。1861年，圆明园被焚毁后的第二年，雨果在法国写下《致巴特勒上尉的信》，公开谴责英法联军对圆明园的劫掠和焚毁。奇怪的是，他从来没有来过这里。如今，他的雕像就立在西洋楼遗址旁，静静地凝视着那断壁残垣。', 's4-timeline')

  add('narr-s4-password', wxmlTexts('s4-password', 'lead kaiti'), 's4-password')

  const finaleJs = read('finale/finale.js')
  const finaleItems = parseParagraphItems(finaleJs, 'NOVEL_PARAGRAPHS')
  const finalePages = novelPages.buildPages(finaleItems)
  finalePages.forEach((page, i) => {
    add('narr-finale-p' + String(i + 1).padStart(2, '0'), pageTextFromItems(page), 'finale sheet ' + (i + 1))
  })

  return clips
}

function main() {
  const clips = buildClips()
  const man = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  const kept = man.clips.filter((c) => !String(c.id).startsWith('narr-'))
  man.clips = kept.concat(clips)
  man._meta = man._meta || {}
  man._meta.narr_split = 'per-screen v3 ' + new Date().toISOString().slice(0, 10)
  man._meta.source_of_truth = 'plate21/module/content（已外置页：prologue/s2 四页）+ plate21/module/pages（其余页当前上屏文案）；一屏一条 narr-*'
  fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 2) + '\n')
  console.log('narr clips: ' + clips.length)
  clips.forEach((c) => {
    const t = Array.isArray(c.text) ? c.text.join('') : c.text
    console.log((c.id + '                    ').slice(0, 36) + String(t.length).padStart(4) + '  ' + t.slice(0, 42).replace(/\s+/g, ' '))
  })
}

main()
