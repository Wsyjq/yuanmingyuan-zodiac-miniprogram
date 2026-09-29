'use strict'
// Compare implemented WXSS numbers with Figma frame nodes.
// This checks declared sizes and colors. It does not render the mini program.
// Usage: node tools/compare-figma-ui.js
const fs = require('fs')
const path = require('path')
const os = require('os')
const root = path.join(__dirname, '..')
const cache = path.join(os.tmpdir(), 'opencode', 'figma-cache', '4x0FQff5l1vAbWt5kRpBym', '1_40208', 'nodes.json')
const data = JSON.parse(fs.readFileSync(cache, 'utf8'))
function find(node, id) {
  if (!node) return null
  if (node.id === id) return node
  for (const child of node.children || []) {
    const hit = find(child, id)
    if (hit) return hit
  }
  return null
}
function channel(v) { return Math.round((v || 0) * 255) }
function solid(paint) {
  if (!paint || paint.visible === false || paint.type !== 'SOLID' || !paint.color) return ''
  const c = paint.color
  const n = v => channel(v).toString(16).padStart(2, '0')
  const a = paint.opacity == null ? 1 : paint.opacity
  return '#' + n(c.r) + n(c.g) + n(c.b) + (a < 0.999 ? Math.round(a * 255).toString(16).padStart(2, '0') : '')
}
function firstFill(node) {
  return solid((node.fills || []).find(p => p.visible !== false && p.type === 'SOLID'))
}
function firstStroke(node) {
  return solid((node.strokes || []).find(p => p.visible !== false && p.type === 'SOLID'))
}
function rpx(px) { return Math.round(Number(px) * 750 / 393) }
const doc = data.nodes['1:40208'].document
function nodeBox(frame, node) {
  const b = node.absoluteBoundingBox || {}
  const o = frame.absoluteBoundingBox
  return { x: b.x - o.x, y: b.y - o.y, w: b.width, h: b.height }
}
function parseWxss(file) {
  const text = fs.readFileSync(path.join(root, file), 'utf8')
  const rules = []
  const re = /([^{}]+)\{([^{}]+)\}/g
  let match
  while ((match = re.exec(text))) {
    const decls = {}
    for (const part of match[2].split(';')) {
      const i = part.indexOf(':')
      if (i < 0) continue
      decls[part.slice(0, i).trim()] = part.slice(i + 1).trim().toLowerCase()
    }
    rules.push({ selector: match[1].trim(), decls })
  }
  return rules
}
function rule(rules, selector) {
  return rules.find(item => item.selector.split(',').map(part => part.trim()).includes(selector) || item.selector === selector)
}
const results = []
function check(frameName, label, ok, detail) {
  const status = ok === 'near' ? 'near' : (ok ? 'pass' : 'fail')
  results.push({ frameName, label, status, detail })
}
function expectDecl(frameName, rules, selector, prop, expected, label) {
  const found = rule(rules, selector)
  const actual = found && found.decls[prop] && found.decls[prop].replace(/\s*!important/g, '')
  const want = String(expected).toLowerCase()
  const wantNum = Number(String(want).replace('rpx', ''))
  const gotNum = actual && Number(String(actual).replace('rpx', ''))
  const near = prop !== 'border' && Number.isFinite(wantNum) && Number.isFinite(gotNum) && Math.abs(wantNum - gotNum) <= 1 && String(want).endsWith('rpx')
  check(frameName, label, actual === want ? true : (near ? 'near' : false), selector + ' ' + prop + ' 节点 ' + want + '，样式 ' + (actual || '缺失'))
}

const reading = find(doc, '18:124')
const walk = parseWxss('plate21/module/pages/walk/walk.wxss')
const title = find(reading, '18:431')
const kicker = find(reading, '18:433')
const card = find(reading, '18:432')
const body = find(reading, '18:435')
const seal = find(reading, '19:535')
const bloomTr = find(reading, '18:128')
const bloomBr = find(reading, '18:127')
const bar = find(reading, '18:130')
const hair = find(reading, '18:131')
const tr = nodeBox(reading, bloomTr)
const br = nodeBox(reading, bloomBr)
const cardBox = nodeBox(reading, card)
expectDecl('18:124 阅读', walk, '.bloom', 'background', firstFill(bloomTr), '光晕填色')
expectDecl('18:124 阅读', walk, '.bloom-tr', 'width', rpx(tr.w) + 'rpx', '左上光晕宽')
expectDecl('18:124 阅读', walk, '.bloom-tr', 'height', rpx(tr.h) + 'rpx', '左上光晕高')
expectDecl('18:124 阅读', walk, '.bloom-tr', 'left', rpx(tr.x) + 'rpx', '左上光晕 x')
expectDecl('18:124 阅读', walk, '.bloom-tr', 'top', rpx(tr.y) + 'rpx', '左上光晕 y')
expectDecl('18:124 阅读', walk, '.bloom-br', 'width', rpx(br.w) + 'rpx', '右下光晕宽')
expectDecl('18:124 阅读', walk, '.bloom-br', 'left', rpx(br.x) + 'rpx', '右下光晕 x')
expectDecl('18:124 阅读', walk, '.bloom-br', 'top', rpx(br.y) + 'rpx', '右下光晕 y')
expectDecl('18:124 阅读', walk, '.read-kicker', 'font-size', rpx(kicker.style.fontSize) + 'rpx', '眉标字号')
expectDecl('18:124 阅读', walk, '.read-kicker', 'font-weight', String(kicker.style.fontWeight), '眉标字重')
expectDecl('18:124 阅读', walk, '.read-kicker', 'color', firstFill(kicker), '眉标颜色')
expectDecl('18:124 阅读', walk, '.read-title', 'font-size', rpx(title.style.fontSize) + 'rpx', '标题字号')
expectDecl('18:124 阅读', walk, '.read-title', 'font-weight', String(title.style.fontWeight), '标题字重')
expectDecl('18:124 阅读', walk, '.read-title', 'line-height', rpx(title.style.lineHeightPx) + 'rpx', '标题行高')
expectDecl('18:124 阅读', walk, '.read-title', 'color', firstFill(title), '标题颜色')
expectDecl('18:124 阅读', walk, '.read-card', 'background', firstFill(card), '内容卡填色')
expectDecl('18:124 阅读', walk, '.read-card', 'border-radius', rpx(card.cornerRadius) + 'rpx', '内容卡圆角')
expectDecl('18:124 阅读', walk, '.read-card', 'margin', '0 ' + rpx(cardBox.x) + 'rpx', '内容卡左右边距')
expectDecl('18:124 阅读', walk, '.read-card .paragraph', 'font-size', rpx(body.style.fontSize) + 'rpx', '正文字号')
expectDecl('18:124 阅读', walk, '.read-card .paragraph', 'font-weight', String(body.style.fontWeight), '正文字重')
expectDecl('18:124 阅读', walk, '.read-card .paragraph', 'line-height', rpx(body.style.lineHeightPx) + 'rpx', '正文行高')
check('18:124 阅读', '样例红尺线不进共用页', !rule(walk, '.read-rule'), '节点 18:434 只压在阅读样例正文上，花纹帧另有一根；史料、来信、报告、入场没有')
expectDecl('18:124 阅读', walk, '.seal', 'border', rpx(seal.strokeWeight) + 'rpx solid ' + firstStroke(seal), '印章描边')
expectDecl('18:124 阅读', walk, '.page-head', 'margin', '0', '页眉铺满屏幕')
expectDecl('18:124 阅读', walk, '.toolbar', 'height', rpx(nodeBox(reading, bar).h) + 'rpx', '顶栏高')
expectDecl('18:124 阅读', walk, '.toolbar', 'background', firstFill(bar), '顶栏填色')
expectDecl('18:124 阅读', walk, '.toolbar', 'border-bottom', rpx(Math.max(1, Math.round(hair.absoluteBoundingBox.height))) + 'rpx solid ' + firstFill(hair), '顶栏底线')
const readCardRule = rule(walk, '.read-card')
check('18:124 阅读', '阅读卡没有描边', readCardRule && !readCardRule.decls.border, '节点 18:432 无描边，样式 ' + ((readCardRule && readCardRule.decls.border) || '无'))

const modal = find(doc, '19:642')
const modalCard = find(modal, '19:573')
const modalStroke = rpx(modalCard.strokeWeight)
expectDecl('19:642 史料', walk, '.history-detail', 'border', modalStroke + 'rpx solid ' + firstStroke(modalCard), '史料卡描边')
expectDecl('19:642 史料', walk, '.history-detail', 'border-radius', rpx(modalCard.cornerRadius) + 'rpx', '史料卡圆角')
check('19:642 史料', '页脚园名存在', fs.readFileSync(path.join(root, 'plate21/module/pages/walk/history-card.wxml'), 'utf8').includes('YUANMINGYUAN'), '节点文字 YUANMINGYUAN')
const historyBody = find(modal, '19:552')
const historyKicker = find(modal, '19:541')
if (historyBody) {
  expectDecl('19:642 史料', walk, '.history-detail .paragraph', 'font-size', rpx(historyBody.style.fontSize) + 'rpx', '史料正文字号')
  expectDecl('19:642 史料', walk, '.history-detail .paragraph', 'line-height', rpx(historyBody.style.lineHeightPx) + 'rpx', '史料正文行高')
}
if (historyKicker) {
  expectDecl('19:642 史料', walk, '.history-kicker', 'font-size', rpx(historyKicker.style.fontSize) + 'rpx', '史料栏目标签字号')
  expectDecl('19:642 史料', walk, '.history-kicker', 'color', firstFill(historyKicker), '史料栏目标签颜色')
}
const pattern = find(doc, '10:430')
const tile = find(pattern, '10:458')
expectDecl('10:430 花纹', walk, '.pattern', 'background', firstFill(tile), '磁贴填色')
expectDecl('10:430 花纹', walk, '.pattern', 'border-radius', rpx(8) + 'rpx', '磁贴圆角 8px')
const patternRule = rule(walk, '.pattern,.spot')
check('10:430 花纹', '磁贴无描边', patternRule && (patternRule.decls.border === '0' || !patternRule.decls.border), '样式 border=' + ((patternRule && patternRule.decls.border) || '缺失'))
expectDecl('10:430 花纹', walk, '.interaction-module', 'border', '2rpx solid #947864', '花纹卡 1px 描边')
expectDecl('10:430 花纹', walk, '.puzzle-kicker', 'font-size', rpx(12) + 'rpx', '卡内小标题 12px')

const report = parseWxss('plate21/module/pages/report/report.wxss')
const reportFrame = find(doc, '23:809')
const reportEyebrow = find(reportFrame, '23:810') || null
function findText(node, text) {
  if (node.type === 'TEXT' && node.characters === text) return node
  for (const child of node.children || []) {
    const hit = findText(child, text)
    if (hit) return hit
  }
  return null
}
const personal = findText(reportFrame, '个人考察档案')
const reportTitle = findText(reportFrame, '我的第二十一图')
if (personal) {
  expectDecl('23:809 报告', report, '.eyebrow', 'font-size', rpx(personal.style.fontSize) + 'rpx', '报告眉标字号')
  expectDecl('23:809 报告', report, '.eyebrow', 'color', firstFill(personal), '报告眉标颜色')
}
const seen = findText(reportFrame, '这一程的所见，留在这里。')
if (seen) {
  expectDecl('23:809 报告', report, '.report-subtitle', 'font-size', rpx(seen.style.fontSize) + 'rpx', '报告副题字号')
  expectDecl('23:809 报告', report, '.report-subtitle', 'color', firstFill(seen), '报告副题颜色')
}
if (reportTitle) {
  expectDecl('23:809 报告', report, '.report-bar-title', 'font-size', rpx(reportTitle.style.fontSize) + 'rpx', '报告标题字号')
  expectDecl('23:809 报告', report, '.report-bar-title', 'font-weight', String(reportTitle.style.fontWeight), '报告标题字重')
  expectDecl('23:809 报告', report, '.report-bar', 'background', '#d8bea0', '报告顶栏填色')
  expectDecl('23:809 报告', report, '.report-bar', 'height', rpx(63) + 'rpx', '报告顶栏高')
}

const entry = parseWxss('pages/index/index.wxss')
const entryFrame = find(doc, '1:40284')
const entryButton = find(entryFrame, '1:40289')
const entryBox = nodeBox(entryFrame, entryButton)
expectDecl('1:40284 入场', entry, '.entry-start', 'width', rpx(entryBox.w) + 'rpx', '入场按钮宽')
expectDecl('1:40284 入场', entry, '.entry-start', 'min-height', rpx(entryBox.h) + 'rpx', '入场按钮高')
expectDecl('1:40284 入场', entry, '.entry-start', 'border', rpx(entryButton.strokeWeight) + 'rpx solid ' + firstStroke(entryButton), '入场按钮外描边')
expectDecl('1:40284 入场', entry, '.entry-start', 'color', '#f5dead', '入场按钮字色')

const letter = parseWxss('plate21/module/components/letter-scene/letter-scene.wxss')
const letterFrame = find(doc, '18:377')
const teacher = findText(letterFrame, '老师')
const advance = findText(letterFrame, '点击继续 →') || findText(letterFrame, '点击继续  →')
if (teacher) {
  expectDecl('18:377 来信', letter, '.speaker', 'font-size', rpx(teacher.style.fontSize) + 'rpx', '来信人名字号')
  expectDecl('18:377 来信', letter, '.speaker', 'font-weight', String(teacher.style.fontWeight), '来信人名字重')
}
if (advance) {
  expectDecl('18:377 来信', letter, '.advance', 'font-size', rpx(advance.style.fontSize) + 'rpx', '点击继续字号')
  expectDecl('18:377 来信', letter, '.advance', 'color', firstFill(advance), '点击继续颜色')
}
const letterPicture = find(letterFrame, '18:530')
const letterBody = find(letterFrame, '18:534')
if (letterPicture) {
  const frameBottom = letterFrame.absoluteBoundingBox.y + letterFrame.absoluteBoundingBox.height
  const pictureBottom = letterPicture.absoluteBoundingBox.y + letterPicture.absoluteBoundingBox.height
  expectDecl('18:377 来信', letter, '.dialogue', 'min-height', rpx(frameBottom - pictureBottom) + 'rpx', '来信图下方纸面')
}
if (letterBody && advance) {
  const textGap = advance.absoluteBoundingBox.y - letterBody.absoluteBoundingBox.y
  expectDecl('18:377 来信', letter, '.dialogue-scroll', 'height', rpx(textGap) + 'rpx', '来信正文到继续的高度')
}

function countLayers(frame) {
  const tally = { checked: 0, vector: 0, text: 0, shape: 0 }
  function walk(node) {
    if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'REGULAR_POLYGON') tally.vector++
    else if (node.type === 'TEXT') tally.text++
    else if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') tally.shape++
    for (const child of node.children || []) walk(child)
  }
  walk(frame)
  return tally
}

let pass = 0
let nearCount = 0
let fail = 0
let current = ''
for (const item of results) {
  if (item.frameName !== current) {
    current = item.frameName
    console.log('\n' + current)
  }
  const tag = item.status === 'pass' ? 'PASS' : (item.status === 'near' ? 'NEAR' : 'FAIL')
  console.log(tag + '  ' + item.label + '  ' + item.detail)
  if (item.status === 'pass') pass++
  else if (item.status === 'near') nearCount++
  else fail++
}
console.log('\n数值对照 ' + pass + ' 通过 / ' + nearCount + ' 差 1rpx / ' + fail + ' 不一致 / 共 ' + results.length)
console.log('\n层覆盖（数值对照没有逐层量坐标，矢量不计入可落成的元素）')
for (const [id, name] of [['18:124', '阅读'], ['10:430', '花纹'], ['19:642', '史料'], ['18:377', '来信'], ['23:809', '报告'], ['1:40284', '入场']]) {
  const tally = countLayers(find(doc, id))
  console.log(name + ' ' + id + '  文字 ' + tally.text + '  形状 ' + tally.shape + '  矢量 ' + tally.vector)
}
console.log('\n脚本不渲染小程序，也不比较绝对坐标是否和画板逐像素重合。flow 布局即使字号相同，位置仍可能不同。')
process.exit(fail ? 1 : 0)
