'use strict'

const engine = require('../plate21/module/flow/engine')
const pages = require('../plate21/module/flow/pages')
const play = require('../plate21/module/play')
const { screen } = require('../plate21/module/flow/screen')

function answers(page) {
  return {
    choice: page.playId === 'quiz-direction' ? '东北'
      : page.playId === 'quiz-lantern' ? '作为中秋节的皇家娱乐场所，举办“迷宫灯会”游戏。'
      : page.playId === 'quiz-pattern' ? '万字纹'
      : page.playId === 'quiz-height' ? '高'
      : '',
    text: '黄花阵',
    hour14: '羊',
    noon: '马',
    count: 1,
    deer: true,
    dogs: true,
    beasts: true,
    flipped: false
  }
}

function action(ui) {
  return {
    value: ui.choice || ui.text || '',
    played: true,
    confirmed: true,
    count: ui.count || 0,
    hour14: ui.hour14 || '',
    noon: ui.noon || '',
    deer: !!ui.deer,
    dogs: !!ui.dogs,
    beasts: !!ui.beasts
  }
}

function step(run, ui) {
  const page = pages.byId[run.pageId]
  const view = screen(run, ui)
  const issues = []
  if (!view.primary && page.next) issues.push('没有主按钮')
  if (page.kind === 'read' && view.lines.length === 0) issues.push('阅读页没有正文')
  if (page.kind === 'nav' && !view.nav) issues.push('导航页没有路线')
  if (page.kind === 'puzzle' && !view.showSkip) issues.push('谜题不能跳过')
  if (page.playId === 'quiz-direction' && view.choices.length !== 4) issues.push('方位选项不是4个')
  if (page.playId === 'quiz-pattern' && view.choices.length !== 4) issues.push('花纹选项不是4个')
  if (page.playId === 'place-animals' && view.toggles.length !== 3) issues.push('归位不是3个开关')
  const choiceInBody = view.choices.some(function (choice) {
    return view.lines.indexOf(choice.label) >= 0
  })
  if (choiceInBody) issues.push('选项同时出现在正文里')
  return { page, view, issues }
}

function advance(run, ui) {
  const page = pages.byId[run.pageId]
  if (page.playId === 'prop-flip' && !ui.flipped) {
    ui.flipped = true
    return run
  }
  if (page.playId) {
    const result = play.submit(page.playId, action(ui))
    if (result.status !== 'solved') {
      return { stuck: result.status }
    }
    const marked = Object.assign({}, run, {
      puzzles: Object.assign({}, run.puzzles, { [page.playId]: 'solved' })
    })
    return engine.enter(engine.complete(marked, page.id), engine.complete(marked, page.id).pageId)
  }
  if (!page.next) return { done: true }
  const next = engine.complete(run, page.id)
  return engine.enter(next, next.pageId)
}

function walk(label, run) {
  const seen = []
  const problems = []
  let guard = 0
  let ui = null
  let uiPage = ''
  while (run && run.pageId && guard < 60) {
    guard += 1
    if (uiPage !== run.pageId) {
      ui = answers(pages.byId[run.pageId])
      uiPage = run.pageId
    }
    const shot = step(run, ui)
    seen.push(run.pageId + (shot.issues.length ? ' !' + shot.issues.join('/') : ''))
    if (shot.issues.length) problems.push(run.pageId + ': ' + shot.issues.join('，'))
    const next = advance(run, ui)
    if (next && next.stuck) {
      problems.push(run.pageId + ': 提交结果是 ' + next.stuck)
      break
    }
    if (next && next.done) break
    if (next.pageId === run.pageId && !(pages.byId[run.pageId].playId === 'prop-flip' && ui.flipped)) {
      problems.push(run.pageId + ': 停在同一页')
      break
    }
    run = next
    if (pages.byId[run.pageId] && pages.byId[run.pageId].kind === 'sign') {
      seen.push(run.pageId)
      break
    }
  }
  console.log('\n' + label)
  console.log(seen.join(' → '))
  problems.forEach(function (item) { console.log('  问题 ' + item) })
  return problems
}

const happy = walk('走通', engine.enter(engine.createRun(), 'P1'))
let skipped = engine.enter(engine.createRun(), 'P1')
skipped = engine.enter(engine.skip(skipped, 'P1'), engine.skip(skipped, 'P1').pageId)
const skipProblems = []
;['E1', 'X1', 'X2', 'H1', 'H3', 'H4', 'H5', 'HY1', 'HY3', 'XS1', 'DS1'].forEach(function (id) {
  const page = pages.byId[id]
  const run = { pageId: id, sites: {}, puzzles: {} }
  const view = screenOf(run)
  if (!view.showSkip) skipProblems.push(id + ' 没有跳过')
})
function screenOf(run) {
  const { screen } = require('../plate21/module/flow/screen')
  return screen(run, {})
}
console.log('\n跳过序章后', skipped.pageId)
if (skipProblems.length) console.log('跳过按钮', skipProblems.join('，'))
process.exit(happy.length || skipProblems.length ? 1 : 0)
