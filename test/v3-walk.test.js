'use strict'

// Page JS integration: real flow/session/play services, small wx surface, no WXML dependency.
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const MODULE_ROOT = path.resolve(__dirname, '../plate21/module')
function copy(value) { return JSON.parse(JSON.stringify(value)) }
function event(data, value) { return { currentTarget: { dataset: data || {} }, detail: { value } } }
async function harness(options) {
  const opts = options || {}
  const storage = opts.storage || {}
  const calls = { routes: [], replays: 0, pauses: 0, discoveries: 0, stops: 0 }
  const discoveries = new Set()
  global.wx = {
    getStorageSync(key) { return storage[key] ? copy(storage[key]) : '' },
    setStorageSync(key, value) { storage[key] = copy(value) },
    navigateTo(input) { calls.routes.push(input.url); if (input.success) input.success({}) },
    navigateBack() { calls.routes.push('BACK') },
    showModal(input) { input.success({ confirm: true }) },
    nextTick(fn) { fn() },
    previewImage() {},
    saveFile(input) { input.success({ savedFilePath: '/saved/photo.jpg' }) },
    removeSavedFile(input) { input.success({}) },
    getNFCAdapter() {
      return {
        onDiscovered(fn) { discoveries.add(fn) },
        offDiscovered(fn) { discoveries.delete(fn) },
        startDiscovery() { calls.discoveries++ },
        stopDiscovery() { calls.stops++ }
      }
    }
  }
  const app = { plate21Host: Object.assign({ mode: 'demo' }, opts.config || {}) }
  global.getApp = () => app
  global.getCurrentPages = () => [page]
  for (const filename of Object.keys(require.cache)) if (filename.startsWith(MODULE_ROOT + path.sep)) delete require.cache[filename]
  let definition
  global.Page = config => { definition = config }
  require('../plate21/module/pages/walk/walk')
  const page = Object.assign({}, definition, {
    data: copy(definition.data),
    setData(patch) { Object.assign(this.data, copy(patch)) },
    selectComponent() { return { onReplay() { calls.replays++ } } }
  })
  const session = require('../plate21/module/store/session')
  const audioBus = require('../plate21/module/utils/audio-bus')
  const pause = audioBus.pauseAll
  audioBus.pauseAll = function () { calls.pauses++; return pause() }
  const action = page.action
  page.action = function (fn) { this.lastAction = action.call(this, fn); return this.lastAction }
  await page.onLoad(opts.query || {})
  async function settle() { await session.flush(); await Promise.resolve(); await Promise.resolve() }
  async function invoke(name, input) {
    const before = page.lastAction
    const result = page[name](input)
    if (result && typeof result.then === 'function') await result
    if (page.lastAction !== before) await page.lastAction
    await settle()
    return page
  }
  async function arrange(target) {
    for (let i = 0; session.getRun().pageId !== target && i < 60; i++) await session.completePage(session.getRun().pageId)
    assert.equal(session.getRun().pageId, target)
    page.restore(); await settle()
  }
  function tag(text) {
    const bytes = new Uint8Array([2, 101, 110].concat(Array.from(Buffer.from(text || 'xieqiqu'))))
    discoveries.forEach(fn => fn({ messages: [{ records: [{ payload: bytes }] }] }))
  }
  async function close() { page.onUnload(); clearTimeout(page._scrollTimer); await settle() }
  return { page, session, storage, calls, app, invoke, arrange, tag, settle, close }
}
async function finishClock(h) {
  const clock = require('../plate21/module/play/water-clock')
  let state = clock.reduce(clock.createState(), { type: 'static' })
  for (let i = 0; i < 3; i++) state = clock.reduce(state, { type: 'staticNext' })
  state = clock.reduce(state, { type: 'answer14', id: 'sheep' })
  state = clock.reduce(state, { type: 'predict', id: 'all' })
  state = clock.reduce(state, { type: 'confirm' })
  for (let i = 0; i < 3; i++) state = clock.reduce(state, { type: 'staticNext' })
  assert.equal(clock.isComplete(state), true)
  await h.invoke('onWaterClockComplete', { detail: { state } })
}
test('walk loads without a payment gate and a skipped route reaches a durable named completion', async () => {
  const h = await harness()
  assert.equal(h.page.data.error, '')
  assert.equal(h.page.data.pageId, 'P1')
  await h.invoke('onSkip')
  assert.equal(h.page.data.pageId, 'E1')
  await h.invoke('onSkip')
  await h.invoke('onPrimary')
  for (let i = 1; i <= 7; i++) {
    assert.equal(h.page.data.pageId, 'M' + i)
    await h.invoke('onSkip')
  }
  for (let i = 1; i <= 3; i++) await h.invoke('onPrimary')
  assert.equal(h.page.data.pageId, 'FN4')
  await h.invoke('onInput', event({ key: 'name' }, '跳过路线玩家'))
  await h.invoke('onPrimary')
  assert.ok(h.session.getRun().completedAt)
  assert.equal(h.session.getRun().name, '跳过路线玩家')
  assert.equal(h.session.getRun().puzzles['quiz-direction'], 'skipped')
  assert.ok(h.calls.routes.at(-1).startsWith('/plate21/module/pages/report/report?sessionId='))
  assert.equal(h.session.getArchives().length, 1)
  await h.close()
})
test('walk normal play requires correct answers, sound completion, field record, water-clock sequence and placement', async () => {
  const h = await harness()
  let guard = 0
  while (h.page.data.pageId !== 'FN4' && guard++ < 70) {
    const id = h.page.data.pageId
    if (id === 'E1') {
      await h.invoke('onChoice', event({ id: 'nw' }))
      for (let i = 0; i < 3; i++) await h.invoke('onPrimary')
      assert.equal(h.page.data.pageId, 'E1')
      assert.equal(h.session.getRun().puzzles['quiz-direction'], undefined)
      await h.invoke('onHint')
      await h.invoke('onChoice', event({ id: 'ne' }))
    }
    if (id === 'X1') {
      await h.invoke('onPrimary')
      assert.equal(h.page.data.pageId, 'X1')
      await h.invoke('onHeard')
    }
    if (id === 'X2') await h.invoke('onInput', event({ key: 'text' }, ' 黄 花 阵 '))
    if (id === 'H1') await h.invoke('onChoice', event({ id: 'lantern' }))
    if (id === 'H3' && !h.page.ui.flipped) { await h.invoke('onPrimary'); assert.equal(h.page.data.pageId, 'H3') }
    if (id === 'H4') {
      await h.invoke('onArrived')
      await h.invoke('onInput', event({ key: 'note' }, '看见中式飞檐和西式穹顶'))
      await h.invoke('onSaveNote')
      assert.equal(h.session.getSnapshot().records.length, 1)
    }
    if (id === 'H5') await h.invoke('onChoice', event({ id: 'wanzi' }))
    if (id === 'HY1') await finishClock(h)
    if (id === 'HY3') await h.invoke('onConfirmDial', event({}, ['confirmed']))
    if (id === 'XS1') await h.invoke('onChoice', event({ id: 'high' }))
    if (id === 'DS1') {
      for (const [piece, slot] of [['deer', 'center'], ['dogs', 'ring'], ['beasts', 'ends']]) {
        await h.invoke('onPiece', event({ id: piece })); await h.invoke('onSlot', event({ id: slot }))
      }
    }
    await h.invoke('onPrimary')
    assert.equal(h.page.data.error, '', id)
  }
  assert.equal(h.page.data.pageId, 'FN4')
  assert.equal(h.session.getRun().puzzles['quiz-direction'], 'assisted')
  assert.equal(h.session.getRun().puzzles['photo-pavilion'], 'assisted')
  assert.equal(h.session.getRun().puzzles['listen-nfc'], 'solved')
  assert.equal(h.session.getRun().puzzles['quiz-hour'], 'solved')
  assert.equal(h.session.getRun().puzzles['place-animals'], 'solved')
  await h.close()
})
test('walk review and reload preserve the current frontier plus answer and scroll drafts', async () => {
  let h = await harness()
  await h.arrange('X2')
  await h.invoke('onInput', event({ key: 'text' }, '黄花'))
  h.page.onScroll({ detail: { scrollTop: 321 } })
  await h.page.persist()
  await h.invoke('onOpenPage', event({ page: 'P2' }))
  assert.equal(h.page.data.review, true)
  await h.invoke('onPrimary')
  assert.equal(h.page.data.pageId, 'P3')
  assert.equal(h.session.getRun().resumePageId, 'X2')
  const storage = h.storage
  await h.close()
  h = await harness({ storage })
  assert.equal(h.page.data.pageId, 'X2')
  assert.equal(h.page.ui.text, '黄花')
  assert.equal(h.page.data.scrollTop, 321)
  await h.invoke('onOpenPage', event({ page: 'FN4' }))
  assert.equal(h.page.data.pageId, 'X2')
  assert.match(h.page.data.error, /尚未解锁/)
  await h.close()
})
test('NFC launch cannot unlock a future node; an actual tag only starts sound and cannot claim it was heard', async () => {
  let h = await harness({ query: { from: 'nfc', prop: 'dj06' } })
  assert.equal(h.page.data.pageId, 'P1')
  assert.ok(h.page.data.notice)
  await h.arrange('X1')
  assert.equal(h.calls.discoveries, 1)
  h.tag('not-our-tag')
  assert.equal(h.calls.replays, 0)
  h.tag()
  assert.equal(h.calls.replays, 1)
  assert.equal(h.page.ui.heard, undefined)
  assert.equal(h.session.getRun().puzzles['listen-nfc'], undefined)
  await h.invoke('onSoundError')
  await h.invoke('onPrimary')
  assert.equal(h.page.data.pageId, 'X1')
  await h.invoke('onSkip')
  assert.equal(h.page.data.pageId, 'X2')
  assert.equal(h.session.getRun().puzzles['listen-nfc'], 'skipped')
  assert.ok(h.calls.stops > 0)
  await h.close()
})
test('narration stays opt-in, page hide pauses audio and NFC without marking a puzzle solved', async () => {
  const h = await harness()
  assert.equal(h.page.data.voiceEnabled, false)
  assert.ok(Array.isArray(h.page.data.narrClips))
  await h.invoke('onVoice', event({}, true))
  assert.equal(h.page.data.voiceEnabled, true)
  await h.arrange('X1')
  await h.invoke('onHide')
  assert.equal(h.page.data.pageVisible, false)
  assert.ok(h.calls.pauses > 0)
  assert.ok(h.calls.stops > 0)
  assert.equal(h.session.getRun().puzzles['listen-nfc'], undefined)
  await h.close()
})
test('unavailable public relay stays empty instead of presenting seed text or fake submissions', async () => {
  let clock = Date.UTC(2026, 8, 24)
  const h = await harness({ config: { now: () => clock } })
  await h.arrange('FN4'); await h.session.sign('考察者')
  clock += 86400000
  await h.session.openLetter()
  await h.arrange('LT6')
  await h.page.loadRelay()
  assert.equal(h.page.data.relayState, 'unavailable')
  assert.deepEqual(h.page.data.relayItems, [])
  assert.equal(h.page.data.screen.relay.hasRecord, false)
  await h.invoke('onPrimary')
  await h.invoke('onInput', event({ key: 'relayText' }, '给下一位'))
  await h.invoke('onRelayConsent', event({}, ['yes']))
  await h.invoke('onSubmitRelay')
  assert.equal(h.page.ui.submitStatus, 'unavailable')
  assert.equal(h.session.getSnapshot().contributions[0].status, 'unavailable')
  assert.equal(h.session.getSnapshot().records[0].text, '给下一位')
  await h.close()
})
test('published relay alone activates read narration, and edited private text is saved before continuing', async () => {
  let clock = Date.UTC(2026, 8, 24)
  const h = await harness({ config: { now: () => clock, host: { async listContributions() {
    return { items: [ { id: 'wrong-protocol', status: 'approved', kind: 'text', text: '不可显示' },
      { id: 'real', status: 'published', kind: 'text', text: '经真实审核的游客记录' } ] }
  } } } })
  await h.arrange('FN4'); await h.session.sign('甲'); clock += 86400000
  await h.session.openLetter(); await h.arrange('LT6'); await h.page.loadRelay()
  assert.equal(h.page.data.relayState, 'ready')
  assert.equal(h.page.data.relayItems.length, 1)
  assert.equal(h.page.data.screen.relay.hasRecord, true)
  await h.invoke('onPrimary')
  assert.equal(h.page.data.pageId, 'LT7')
  assert.equal(h.page.data.screen.relay.viewed, true)
  await h.invoke('onInput', event({ key: 'relayText' }, '第一稿'))
  await h.invoke('onSaveRelay')
  await h.invoke('onInput', event({ key: 'relayText' }, '修改后正文'))
  await h.invoke('onPrimary')
  assert.equal(h.page.data.pageId, 'LT8')
  assert.equal(h.session.getSnapshot().records[0].text, '修改后正文')
  await h.close()
})
test('same-process official account change reinitializes the module at a new isolated identity', async () => {
  let currentUser = 'alice'
  const config = { mode: 'host', identityVersion: 1, host: { async getContext() { return { userId: currentUser } } } }
  const h = await harness({ config })
  await h.invoke('onPrimary')
  assert.equal(h.session.getRun().pageId, 'P2')
  currentUser = 'bob'; h.app.plate21Host.identityVersion = 2
  await h.page.load()
  assert.equal(h.session.getSnapshot().userId, 'bob')
  assert.equal(h.page.data.pageId, 'P1')
  await h.close()
})

 test('water-clock live events persist without feeding state back into the child observer', async () => {
  const h = await harness()
  await h.arrange('HY1')
  const initial = copy(h.page.data.waterClockState)
  const state = Object.assign({}, initial, { time: 8, playing: true })
  await h.invoke('onWaterClockChange', { detail: { state } })
  assert.deepEqual(h.page.data.waterClockState, initial)
  assert.equal(h.page.data.clockPlaying, true)
  assert.equal(h.session.getRun().uiByPage.HY1.waterClock.time, 8)
  await h.close()
})
