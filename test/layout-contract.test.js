'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const ROOT = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

test('every production page uses the shared responsive shell', () => {
  const app = JSON.parse(read('app.json'))
  const routes = (app.pages || []).slice()
  for (const subpackage of app.subpackages || []) {
    for (const page of subpackage.pages || []) routes.push(subpackage.root + '/' + page)
  }
  for (const route of routes) {
    assert.match(read(route + '.wxml'), /class="[^"]*page-shell/, route + ' must use page-shell')
  }
  const appStyles = read('app.wxss')
  assert.match(appStyles, /--binder-width:\s*32rpx/)
  assert.match(appStyles, /--safe-bottom:\s*env\(safe-area-inset-bottom\)/)
})

test('story pages lock to one screen instead of page-level scrolling', () => {
  const reader = read('plate21/module/components/novel-view/novel-view.wxss')
  const shell = read('app.wxss')
  assert.match(reader, /overflow:\s*hidden/)
  assert.match(reader, /env\(safe-area-inset-bottom\)/)
  assert.match(shell, /\.page-shell\s*\{[^}]*overflow:\s*hidden/s)
  assert.match(read('plate21/module/pages/prologue/prologue.json'), /"disableScroll": true/)
})

test('novel pages use one natural-flow text block while turning', () => {
  const template = read('plate21/module/components/novel-view/novel-view.wxml')
  const styles = read('plate21/module/components/novel-view/novel-view.wxss')
  const harness = read('test/harness/render.js')
  assert.doesNotMatch(template, /wx:for="\{\{currentChars\}\}"/)
  assert.doesNotMatch(styles, /\.type-char\s*\{[^}]*width:\s*1em/s)
  assert.match(template, /class="reveal-copy/)
  assert.match(styles, /\.page-body\s*\{[^}]*width:\s*calc\(100%\s*-\s*80rpx\)/s)
  assert.match(styles, /\.page-body\s*\{[^}]*right:\s*auto/s)
  assert.match(styles, /\.reveal-copy\s*\{[^}]*display:\s*block/s)
  assert.match(styles, /\.narrative-copy\s*\{[^}]*box-sizing:\s*border-box/s)
  assert.match(styles, /word-break:\s*break-all/)
  assert.match(harness, /\.__scroll\s*\{\s*width:\s*100%/)
})

test('finale stretches the novel host across its centered flex stage', () => {
  const template = read('plate21/module/pages/finale/finale.wxml')
  const styles = read('plate21/module/pages/finale/finale.wxss')
  assert.match(template, /<novel-view[\s\S]*class="finale-novel-host"/)
  assert.match(styles, /\.finale-novel-host\s*\{[^}]*align-self:\s*stretch/s)
  assert.match(styles, /\.finale-novel-host\s*\{[^}]*width:\s*100%/s)
  assert.match(styles, /\.finale-novel-host\s*\{[^}]*min-width:\s*0/s)
})

test('quiz, pattern and comic expose non-color interaction cues', () => {
  const quiz = read('plate21/module/pages/s2-quiz/s2-quiz.wxml')
  assert.match(quiz, /data-key="\{\{item.key\}\}"/)
  assert.match(quiz, /disabled="\{\{!selected \|\| solved\}\}"/)
  assert.doesNotMatch(quiz, /先不猜/)

  const patternTemplate = read('plate21/module/pages/s2-pattern/s2-pattern.wxml')
  const patternStyles = read('plate21/module/pages/s2-pattern/s2-pattern.wxss')
  assert.match(patternTemplate, /aria-pressed=/)
  assert.equal((patternStyles.match(/\.grid\s*\{/g) || []).length, 1)
  assert.equal((patternStyles.match(/\.cell\s*\{/g) || []).length, 1)
  assert.match(patternStyles, /grid-template-columns:\s*repeat\(2/)

  const comic = read('plate21/module/pages/s3-comic/s3-comic.wxml')
  assert.match(comic, /IMG-RUNTIME-COMIC\.jpg/)
  assert.match(comic, /第 \{\{index \+ 1\}\} 格/)
  assert.match(read('plate21/module/pages/s3-comic/s3-comic.wxss'), /\.comic-captions\s*\{[\s\S]*grid-template-columns:\s*repeat\(2/)
})

test('timeline and finale animations stay off the JS frame loop', () => {
  const timeline = read('plate21/module/pages/s4-timeline/s4-timeline.js')
  const finale = read('plate21/module/pages/finale/finale.js')
  assert.doesNotMatch(timeline, /utils\/anime|onUpdate|AREA_TOP|snapBack/)
  assert.doesNotMatch(finale, /utils\/anime|onUpdate|veils|freshVeils/)
  assert.match(read('plate21/module/pages/s4-timeline/s4-timeline.wxss'), /@keyframes timeline-gold/)
  assert.match(read('plate21/module/pages/finale/finale.wxss'), /\.reveal-curtain\.is-open/)
})

test('final artwork geometry is shared by all three views', () => {
  for (const page of ['finale', 'report', 'handbook']) {
    assert.match(read('plate21/module/pages/' + page + '/' + page + '.wxss'), /@import "\.\.\/\.\.\/styles\/report-artwork\.wxss"/)
    assert.match(read('plate21/module/pages/' + page + '/' + page + '.wxml'), /report-artwork/)
    assert.match(read('plate21/module/pages/' + page + '/' + page + '.wxml'), /IMG-RUNTIME-PLATE\.jpg/)
  }
})

test('local recognition explicitly reports unavailable', async () => {
  const adapter = require('../plate21/module/adapters/local-adapter')
  const result = await adapter.recognizeScene({})
  assert.equal(result.available, false)
  assert.equal(result.pass, false)
  assert.equal(result.confidence, 0)
})
