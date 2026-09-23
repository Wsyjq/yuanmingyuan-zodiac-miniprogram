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
    const item = {}
    if (textM) item.text = textM[1].replace(/\\'/g, "'")
    if (capM) item.caption = capM[1].replace(/\\'/g, "'")
    if (imgM) item.image = imgM[1]
    if (quote) item.quote = true
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
  add('narr-prologue-handover', [
    '这册档案跟着你走完全程。信先别拆——到了遗址门口再拆。',
    '路线：入口、谐奇趣、黄花阵、方外观、海晏堂、蓄水楼、大水法、雨果雕像。'
  ], 'prologue handover')

  const s1 = read('s1-decode/s1-decode.wxml')
  const s1Leads = wxmlTexts('s1-decode', 'lead kaiti|tear-note')
  add('narr-s1-decode-sealed', s1Leads[0], 's1 sealed')
  add('narr-s1-decode-reading', s1Leads[1], 's1 reading')
  add('narr-s1-decode-puzzle', s1Leads[2], 's1 puzzle')
  const solved = s1.match(/class="result-copy">([^<]+)</)
  if (solved) add('narr-s1-decode-solved', solved[1], 's1 solved')

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

  add('narr-s2-quiz', wxmlTexts('s2-quiz', 'novel-p').slice(0, 1), 's2-quiz')
  add('narr-s2-quiz-followup', wxmlTexts('s2-quiz', 'novel-p').slice(1), 's2-quiz followup')

  add('narr-s2-reveal', wxmlTexts('s2-reveal', 'lead kaiti'), 's2-reveal')
  add('narr-s2-reveal-followup', wxmlTexts('s2-reveal', 'kaiti|novel-p').slice(1), 's2-reveal followup')

  add('narr-s2-blend', wxmlTexts('s2-blend', 'lead kaiti'), 's2-blend')

  const patFinale = CONTENT['s2-pattern'].finale
  add('narr-s2-pattern', wxmlTexts('s2-pattern', 'lead kaiti'), 's2-pattern')
  // 收尾段文案全部来自 content（含 wallParts 拼句）；顺序与历史 manifest 一致
  add('narr-s2-pattern-finale', [
    ...patFinale.lead,
    patFinale.quote,
    patFinale.bridge,
    ...patFinale.tail,
    patFinale.voiceShift,
    CONTENT['s2-pattern'].wallParts.map((p) => p.t).join(''),
    patFinale.closing
  ], 's2-pattern finale')

  add('narr-s3-comic', wxmlTexts('s3-comic', 'novel-p').slice(0, 3).concat(
    [...read('s3-comic/s3-comic.wxml').matchAll(/class="paper-quote">([^<]+)</g)].map((x) => x[1].trim())
  ), 's3-comic')
  add('narr-s3-comic-followup', wxmlTexts('s3-comic', 'novel-p').slice(3), 's3-comic followup')

  add('narr-s3-zodiac', wxmlTexts('s3-zodiac', 'lead kaiti'), 's3-zodiac')
  add('narr-s3-water', wxmlTexts('s3-water', 'lead kaiti'), 's3-water')

  const dsf = read('dashuifa/dashuifa.wxml')
  const dsfQuotes = [...dsf.matchAll(/class="dsf-quote kaiti">([^<]+)</g)].map((x) => x[1].trim())
  add('narr-dashuifa-hunt', dsfQuotes.slice(0, 2), 'dashuifa hunt')
  add('narr-dashuifa-after', dsfQuotes.slice(2, 4), 'dashuifa after')
  add('narr-dashuifa-yuan', wxmlTexts('dashuifa', 'q-title serif'), 'dashuifa yuan')
  add('narr-dashuifa-followup', dsfQuotes.slice(4).concat(
    [...dsf.matchAll(/class="paper-quote">([^<]+)</g)].map((x) => x[1].trim())
  ), 'dashuifa followup')

  const tlJs = read('s4-timeline/s4-timeline.js')
  add('narr-s4-timeline', parseStrArray(tlJs, 'PARAGRAPHS'), 's4-timeline novel')
  add('narr-s4-timeline-mono', [
    ...parseStrArray(tlJs, 'MONOLOGUE_PARAGRAPHS'),
    '把信抽出来，站在像底下读。这封信本来就不是写给你的，把它读完。',
    parseConstStr(tlJs, 'OPEN_QUESTION'),
    '到这儿，八张写着数字的卡片到齐了，档案夹里的三张残片也都收在格子里，中间那块，还空着。'
  ], 's4-timeline monologue')

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
