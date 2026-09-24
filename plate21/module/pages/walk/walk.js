'use strict'
const entry = require('../../utils/game-entry')
const session = require('../../store/session')
const engine = require('../../flow/engine')
const pages = require('../../flow/pages')
const screen = require('../../flow/screen')
const play = require('../../play/index')
const cue = require('../../audio/cue')
const progress = require('../../progress/build')
const cards = require('../../utils/sl-cards')
const settings = require('../../utils/audio-settings')
const audioBus = require('../../utils/audio-bus')
const audioSrc = require('../../utils/audio-src')
const nfc = require('../../capabilities/nfc/listen')
const nfcLaunch = require('../../capabilities/nfc/launch')
const photos = require('../../utils/photo-records')
const dates = require('../../utils/session-date')
const clock = require('../../play/water-clock')
const bridge = require('../../host/bridge')
const resources = require('../../host/resources')
const glossary = require('../../flow/glossary')
const navigation = require('../../host/navigation')
const navModel = require('../../capabilities/map/nav-model')
const HINTS = {
  'quiz-direction': '对照地图上长春园与西洋楼的位置，找出它所在的方位。',
  'quiz-envelope': '把信封封口处与信背面的半个字拼在一起，从左到右读。',
  'quiz-lantern': '想一想，迷宫中央的亭子与游乐活动有什么关系？',
  'quiz-pattern': '观察转折相接、可以连续延伸的墙面纹样，再与四张图比较。',
  'quiz-height': '喷泉的水压与蓄水位置的高度差有关。',
  'place-animals': '看铜版图：一组在中央，一组围绕中央，另一组位于池的两端。'
}
const STATUS = { draft: '草稿', private: '仅自己可见', unavailable: '公开服务尚未接入，私人稿已保留', failed: '提交未确认，可重试', submitted: '已收到投稿，等待处理', published: '已公开', rejected: '未获公开', withdrawn: '已撤回' }
function clone(value) { return JSON.parse(JSON.stringify(value)) }
function ds(e, key) { return e.currentTarget.dataset[key] }
function fmt(at) { return dates.formatArchiveDate(dates.dateKeyFromTimestamp(at)) }
function errorText(err) { return err && (err.message || err.errMsg) || '操作未完成，请重试' }
Page({
  data: { loading: true, busy: false, error: '', pageVisible: true, screen: {}, ui: {}, rows: [], records: [],
    narrClips: [], voiceEnabled: false, drawer: '', card: null, drawerScrollTop: 0, cardAnchor: '', cardImageFailed: false, waterClockState: {}, clockPlaying: false,
    soundSrc: nfc.SOUND, relayItems: [], relayState: 'idle', contributions: [], archives: [], scrollTop: 0, navX: 0, navY: 0, locating: false, location: null, locationError: '' },
  async onLoad(query) {
    const window = wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : { windowWidth: 375, windowHeight: 667 })
    this._window = window
    this.setData({ navX: Math.max(8, window.windowWidth - 66), navY: Math.max(80, window.windowHeight - 180) })
    this.query = query || {}; this.sessionId = this.query.sessionId || ''; this.ui = {}; this._active = true
    this._settings = (value) => { if (this._active) this.setData({ voiceEnabled: value.voice }) }
    settings.subscribe(this._settings)
    await this.load()
  },
  async load() {
    this.setData({ loading: true, error: '' })
    try {
      await entry.init(this.query)
      if (this.sessionId && !session.getArchive(this.sessionId)) throw new Error('找不到这份已完成作品')
      let current = this.snapshot()
      if (this.query.entry === 'letter') {
        const state = await session.getLetterState(this.sessionId)
        if (!state.available) throw new Error('来信将在完成考察后的下一个北京时间自然日开放')
        if (current.run.resumePageId === 'FN4') await session.openLetter(this.sessionId)
        else await session.resume(this.sessionId)
      } else await session.resume(this.sessionId)
      current = this.snapshot()
      if (nfcLaunch.parse(this.query)) {
        if (engine.canEnter(current.run, 'X1')) await session.navigate('X1', { sessionId: this.sessionId })
        else this.setData({ notice: '已识别谐奇趣贴片。请从当前进度继续；到谐奇趣后可直接听音乐。' })
      }
      this.restore()
      this.setData({ loading: false })
    } catch (err) { this.setData({ loading: false, error: errorText(err) }) }
  },
  snapshot() { return this.sessionId ? session.getArchive(this.sessionId) : session.getSnapshot() },
  restore() {
    const snap = this.snapshot()
    if (!snap) return
    this.run = snap.run
    this.ui = clone(this.run.uiByPage[this.run.pageId] || {})
    if (this.run.pageId === 'HY1') this.ui.waterClock = clock.createState(this.ui.waterClock)
    this.setData({ scrollTop: this.ui.scrollTop || 0, error: '' })
    this.render()
    if (wx.pageScrollTo) wx.pageScrollTo({ scrollTop: this.data.playId === 'quiz-hour' ? (this.ui.scrollTop || 0) : 0, duration: 0 })
    if (this.run.pageId === 'LT6') this.loadRelay()
  },
  render() {
    const snap = this.snapshot()
    if (!snap || !this._active) return
    this.run = snap.run
    const page = pages.byId[this.run.pageId]
    const model = (screen.buildScreen || screen.screen)(this.run, Object.assign({}, this.ui, {
      relay: { status: this.data.relayState, records: this.data.relayItems, viewed: this.ui.relayViewed, submitStatus: this.ui.submitStatus }, records: snap.records, contributions: snap.contributions
    }))
    model.portrait = resources.resolve(model.portrait, 'asset'); model.teacher = resources.resolve(model.teacher, 'asset')
    model.figures.forEach((item, i) => { item.src = resources.resolve(item.src, 'asset'); item.label = '图样' + (i + 1) })
    model.spots.forEach((item) => { item.src = resources.resolve(item.src, 'asset') })
    if (model.board) { model.board.pieces.forEach((p) => { p.text = p.label + (p.placed ? ' · 已放下' : '') }); model.board.slots.forEach((s) => { s.text = s.label + (s.piece ? ' · ' + s.piece : '') }) }
    const field = snap.records.filter((r) => r.purpose === 'field')
    const view = progress.buildProgress(this.run)
    const unlockedCards = []
    Object.keys(this.run.visited).forEach((id) => {
      require('../../flow/glossary').termsFor(id).forEach((term) => {
        if (!unlockedCards.some((x) => x.key === term.key)) unlockedCards.push({ key: term.key, label: (cards.get(term.key) || {}).title || term.label })
      })
    })
    this.setData({ letterScene: page.kind === 'letter' && !(this.ui.letterSceneDone && ['LT6', 'LT7'].includes(page.id)),
      letterSceneImage: resources.resolve('/assets/fig/letter-teacher.jpg', 'asset'), screen: model, pageId: page.id, playId: page.playId, ui: clone(this.ui),
      scriptAppendix: this.run.completedAt ? require('../../flow/script-content').appendix : [],
      completed: !!this.run.completedAt, review: engine.isReview(this.run),
      rows: view.rows.map((r) => Object.assign({}, r, { openPageId: view.openPageId(r.id) })),
      records: field, photoCount: field.filter((r) => r.kind === 'photo').length,
      narrClips: cue.clipsFor(page, Object.assign({}, this.run, { uiByPage: Object.assign({}, this.run.uiByPage, { [page.id]: this.ui }) })),
      voiceEnabled: settings.get().voice, soundSrc: resources.resolve(nfc.SOUND, 'audio'), waterClockState: this.ui.waterClock || {},
      clockPlaying: !!(this.ui.waterClock && this.ui.waterClock.playing),
      narrative: model.lines.map(line => glossary.segments(line, glossary.inlineTermsFor(page.id, unlockedCards))),
      routeRows: view.rows.filter(r => navModel.listSites().some(s => s.id === r.id)).map(r => Object.assign({}, r, { openPageId: r.current ? view.resumePageId : view.openPageId(r.id) })),
      routeCurrent: (view.rows.find(r => r.current) || {}).title || '考察尚未开始',
      historyCards: unlockedCards, hasHint: !!HINTS[page.playId], hint: this.ui.hint ? HINTS[page.playId] : '',
      contributions: snap.contributions.map((c) => Object.assign({}, c, { label: STATUS[c.status] || c.status })),
      archives: session.getArchives().map((a) => ({ id: a.sessionId, name: a.run.name, date: fmt(a.run.completedAt) })),
      syncState: snap.sync && snap.sync.status || 'local', isDemo: bridge.getConfig().mode === 'demo'
    })
    this.syncNfc()
  },
  async persist() {
    if (!this.run) return
    const pageId = this.run.pageId
    const patch = clone(this.ui)
    if (session.saveDraft) return session.saveDraft(pageId, patch, this.sessionId)
    const current = this.snapshot()
    return session.saveRun(Object.assign({}, current.run, { uiByPage: Object.assign({}, current.run.uiByPage, { [pageId]: patch }) }), this.sessionId)
  },
  draft(patch, redraw) {
    Object.assign(this.ui, patch)
    if (redraw !== false) this.render()
    return this.persist().catch((err) => { if (this._active) this.setData({ error: '记录未保存：' + errorText(err) }) })
  },
  async action(fn) {
    if (this.data.busy) return
    this.setData({ busy: true, error: '' })
    try { await this.persist(); await fn(); this.restore() }
    catch (err) { this.setData({ error: errorText(err) }) }
    finally { if (this._active) this.setData({ busy: false }) }
  },
  onShow() { this._active = true; this.setData({ pageVisible: true }); if (this.run) this.restore() },
  onHide() { this.setData({ pageVisible: false }); audioBus.pauseAll(); this.stopNfc(); if (this.run) this.persist().catch(() => {}) },
  onUnload() { clearTimeout(this._scrollTimer); this.onHide(); this._active = false; settings.unsubscribe(this._settings) },
  onPageScroll(e) { if (this.data.playId === 'quiz-hour') this.onScroll({ detail: e }) },
  onScroll(e) { this.ui.scrollTop = Math.max(0, Number(e.detail.scrollTop) || 0); clearTimeout(this._scrollTimer); this._scrollTimer = setTimeout(() => this.persist().catch(() => {}), 250) },
  onInput(e) { this.draft({ [ds(e, 'key')]: e.detail.value, again: false }, false) },
  onChoice(e) { if (!this.data.review) this.draft({ choice: ds(e, 'id'), optionId: ds(e, 'id'), again: false }) },
  onSpot(e) { this.draft({ spot: ds(e, 'id') }) },
  onHint() { this.draft({ hint: true }); session.viewHint(this.data.playId, 1) },
  onArrived() { this.draft({ arrived: true }) },
  onVoice(e) { settings.set('voice', !!e.detail.value) },
  onMuteAll() { settings.set('voice', false); audioBus.pauseAll(); this.setData({ pageVisible: false }); wx.nextTick(() => this.setData({ pageVisible: true })) },
  onLetterProgress(e) { this.draft({ letterCursor: e.detail.index }, false) },
  onLetterComplete() {
    if (['LT6', 'LT7'].includes(this.data.pageId)) this.draft({ letterSceneDone: true })
    else this.onPrimary()
  },
  onPrimary() {
    this.action(async () => {
      const page = pages.byId[this.run.pageId]
      if (this.data.review) {
        if (page.next && engine.canEnter(this.run, page.next)) await session.navigate(page.next, { sessionId: this.sessionId })
        else await session.resume(this.sessionId)
        return
      }
      if (page.kind === 'sign') {
        if (!this.run.completedAt) { await session.sign(this.ui.name); return }
        this.onReport(); return
      }
      let assisted = !!this.ui.hint
      if (page.playId) {
        if (page.playId === 'prop-flip' && !this.ui.flipped) { await this.draft({ flipped: true }); return }
        let answer = { optionId: this.ui.optionId || this.ui.choice, value: this.ui.text, played: this.ui.heard,
          confirmed: page.playId === 'prop-flip' ? this.ui.flipped : this.ui.confirmed,
          waterClock: this.ui.waterClock }
        if (page.playId === 'photo-pavilion') {
          if (!this.ui.arrived) { await this.draft({ again: true, feedback: '到达中心亭后，请先确认到达。' }); return }
          const records = this.snapshot().records.filter((r) => r.purpose === 'field' && (r.siteId === 'maze' || !r.siteId))
          answer.count = records.filter((r) => r.kind === 'photo' || r.kind === 'text' && r.text.trim()).length
          if (!records.some((r) => r.kind === 'photo')) assisted = true
        }
        if (page.playId === 'place-animals') {
          const p = this.ui.placed || {}; answer = { deer: p.deer === 'center', dogs: p.dogs === 'ring', beasts: p.beasts === 'ends' }
        }
        if (play.submit(page.playId, answer).status !== 'solved') {
          await this.draft({ again: true, feedback: '还没有完成这一项。可以再试一次、查看提示，或选择跳过。' }); return
        }
      }
      if (page.id === 'LT6' && this.data.relayItems.length) { this.ui.relayViewed = true; await this.persist() }
      if (page.id === 'LT7' && (this.ui.relayText || this.ui.relayPath)) await this.saveRelayDraft('private')
      await session.completePage(page.id, { sessionId: this.sessionId, assisted })
      if (page.id === 'LT8') this.onReport()
    })
  },
  onSkip() { this.action(() => session.skipPage(this.run.pageId, { sessionId: this.sessionId })) },
  onResume() { this.action(() => session.resume(this.sessionId)) },
  onBack() {
    this.action(async () => {
      const index = pages.list.findIndex((p) => p.id === this.run.pageId)
      for (let i = index - 1; i >= 0; i--) {
        if (engine.canEnter(this.run, pages.list[i].id)) { await session.navigate(pages.list[i].id, { sessionId: this.sessionId }); return }
      }
      await this.exit()
    })
  },
  onOpenPage(e) { const id = ds(e, 'page'); if (!id) return; this.setData({ drawer: '' }); this.action(() => session.navigate(id, { sessionId: this.sessionId })) },
  onDrawer(e) { this.setData({ drawer: ds(e, 'name') || '', card: null, drawerScrollTop: 0, cardAnchor: '' }); audioBus.pauseAll() },
  onCloseDrawer() { this.setData({ drawer: '', card: null }) },
  noop() {},
  onOpenCard(e) {
    const key = ds(e, 'key'); const card = cards.get ? cards.get(key) : cards.SL_CARDS[key]
    if (!card || !this.data.historyCards.some(item => item.key === key)) return
    audioBus.pauseAll()
    this.setData({ drawer: 'history', drawerScrollTop: 0, cardAnchor: '', cardImageFailed: false,
      card: Object.assign({}, card, { key, image: resources.resolve(card.image, 'asset'), layers: card.layers.slice(), years: card.years || [] }) })
  },
  onCardLevel(e) {
    const level = Number(ds(e, 'level'))
    if (!this.data.card || !Number.isInteger(level) || level < 0 || level >= this.data.card.layers.length) return
    const key = this.data.card.key
    this.setData({ cardAnchor: '' })
    wx.nextTick(() => { if (this._active && this.data.card && this.data.card.key === key) this.setData({ cardAnchor: 'history-layer-' + level }) })
  },
  onDrawerScroll(e) { this.setData({ drawerScrollTop: Math.max(0, Number(e.detail.scrollTop) || 0) }) },
  onHistoryList() { this.setData({ card: null, cardAnchor: '', drawerScrollTop: 0 }) },
  onCardImageError() { this.setData({ cardImageFailed: true }) },
  onRetryCardImage() { this.setData({ cardImageFailed: false }) },
  onRoute() { this.setData({ drawer: 'route', card: null }); audioBus.pauseAll() },
  onNavStart(e) {
    const t = e.touches[0]; this._drag = { x: t.clientX, y: t.clientY, left: this.data.navX, top: this.data.navY, moved: false }
  },
  onNavMove(e) {
    if (!this._drag) return
    const t = e.touches[0], d = this._drag, w = this._window
    const dx = t.clientX - d.x, dy = t.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 8) d.moved = true
    if (d.moved) this.setData({ navX: Math.max(8, Math.min(w.windowWidth - 66, d.left + dx)), navY: Math.max(60, Math.min(w.windowHeight - 130, d.top + dy)) })
  },
  onNavEnd() { if (this._drag && !this._drag.moved) this.onRoute(); this._drag = null },
  onNavCancel() { this._drag = null },
  async onLocate() {
    if (this.data.locating) return
    this.setData({ locating: true, locationError: '' })
    try { const location = await navigation.locate(); if (this._active) this.setData({ location }) }
    catch (err) { if (this._active) this.setData({ locationError: errorText(err) }) }
    finally { if (this._active) this.setData({ locating: false }) }
  },
  onPreview(e) { const src = ds(e, 'src'); if (src) wx.previewImage({ current: src, urls: [src] }) },
  onAddPhoto(e) {
    this.action(async () => { await photos.pickRecord({ purpose: 'field', siteId: this.run.pageId === 'H4' ? 'maze' : pages.byId[this.run.pageId].siteId, spot: this.ui.spot, text: '', id: e && ds(e, 'id') || undefined }, this.sessionId) })
  },
  onDeleteRecord(e) { this.action(() => session.deleteRecord(ds(e, 'id'), this.sessionId)) },
  onSaveNote() {
    this.action(async () => {
      if (!String(this.ui.note || '').trim()) throw new Error('请先写下观察记录')
      await session.saveRecord({ purpose: 'field', kind: 'text', siteId: 'maze', text: this.ui.note, status: 'private' }, this.sessionId)
      this.ui.note = ''; await this.persist()
    })
  },
  onConfirmDial(e) { this.draft({ confirmed: e.detail.value.length > 0 }) },
  onPiece(e) { if (!this.data.review) this.draft({ selectedPiece: ds(e, 'id') }) },
  onSlot(e) {
    if (!this.ui.selectedPiece || this.data.review) return
    const placed = Object.assign({}, this.ui.placed); const slot = ds(e, 'id')
    Object.keys(placed).forEach((key) => { if (placed[key] === slot) delete placed[key] })
    placed[this.ui.selectedPiece] = slot; this.draft({ placed, selectedPiece: '', again: false })
  },
  onFade(e) { this.draft({ fountainProgress: Number(e.detail.value) }) },
  onWaterClockChange(e) {
    this.ui.waterClock = e.detail.state
    // The child owns live playback; echoing its state into its property causes
    // reentrant observer updates in the native component renderer.
    if (this.data.clockPlaying !== !!e.detail.state.playing) this.setData({ clockPlaying: !!e.detail.state.playing })
    this.persist().catch((err) => this.setData({ error: errorText(err) }))
  },
  onWaterClockComplete(e) { this.onWaterClockChange(e) },
  syncNfc() {
    if (this.run.pageId !== 'X1' || !this.data.pageVisible) { this.stopNfc(); return }
    if (this._nfcStarting || this._nfc) return
    this._nfcStarting = true
    this._nfc = nfc.start({ onTag: () => { const player = this.selectComponent('#soundscape'); if (player && this.data.pageVisible) player.onReplay() },
      onStatus: (status) => this.setData({ nfcStatus: status === 'unsupported' ? '此设备未启用贴片读取，可直接听。' : '贴片未读到，可直接听。' }) })
    this._nfcStarting = false
  },
  stopNfc() { if (this._nfc) this._nfc.stop(); this._nfc = null },
  onHeard() { this.draft({ heard: true }) },
  onSoundError() { this.setData({ nfcStatus: '音乐暂时无法播放，可重试或跳过，不影响后续。' }) },
  async loadRelay() {
    this.setData({ relayState: 'loading' })
    const result = await session.listContributions({ sessionId: this.sessionId })
    if (!this._active) return
    this.setData({ relayState: result.status === 'available' ? result.items.length ? 'ready' : 'empty' : result.status, relayItems: result.items || [] })
    this.render()
  },
  onRelayKind(e) { if (!this.ui.relayRecordId) this.draft({ relayKind: ds(e, 'kind') }) },
  async saveRelayDraft(status) {
    const kind = this.ui.relayKind || 'text'
    if (kind === 'photo' && !this.ui.relayPath) throw new Error('请先选择一张照片')
    if (kind !== 'photo' && !String(this.ui.relayText || '').trim()) throw new Error('请先写下内容')
    const record = await session.saveRecord({ id: this.ui.relayRecordId || undefined, purpose: 'relay', kind,
      text: this.ui.relayText || '', filePath: this.ui.relayPath || '', status }, this.sessionId)
    this.ui.relayRecordId = record.id; this.ui.relaySaved = true; await this.persist(); return record
  },
  onRelayPhoto() {
    this.action(async () => {
      const record = await photos.pickRecord({ purpose: 'relay', text: this.ui.relayText || '', id: this.ui.relayRecordId || undefined }, this.sessionId)
      Object.assign(this.ui, { relayKind: 'photo', relayRecordId: record.id, relayPath: record.filePath, relaySaved: true }); await this.persist()
    })
  },
  onRelayConsent(e) { this.draft({ consent: e.detail.value.length > 0 }) },
  onSaveRelay() { this.action(async () => { await this.saveRelayDraft('private') }) },
  onSubmitRelay() {
    this.action(async () => {
      if (!this.ui.consent) throw new Error('请先选择是否同意公开；也可以仅私人保存')
      const record = await this.saveRelayDraft('private')
      const result = await session.submitContribution(record.id, { consent: true, sessionId: this.sessionId })
      this.ui.submitStatus = result.status; await this.persist()
    })
  },
  onRefreshContribution(e) { this.action(() => session.getContribution(ds(e, 'id'), this.sessionId)) },
  onWithdraw(e) {
    this.action(async () => {
      const result = await session.withdrawContribution(ds(e, 'id'), this.sessionId)
      if (result.status !== 'withdrawn') throw new Error('尚未收到撤回回执，请重试')
    })
  },
  onNewRelay() { this.draft({ relayRecordId: '', relayText: '', relayPath: '', relayKind: 'text', relaySaved: false, consent: false, submitStatus: '' }) },
  onReport(e) {
    const id = e && e.currentTarget ? ds(e, 'id') : this.sessionId || this.snapshot().sessionId
    wx.navigateTo({ url: '/plate21/module/pages/report/report?sessionId=' + encodeURIComponent(id || this.snapshot().sessionId) })
  },
  onRestart() {
    wx.showModal({ title: '开始新的考察？', content: '已完成的作品会保留。当前未完成的考察将重新开始。', success: (res) => {
      if (res.confirm) this.action(async () => { await session.restart(); this.sessionId = ''; this.query = {}; this.setData({ drawer: '' }); wx.redirectTo({ url: '/plate21/module/pages/walk/walk' }) })
    } })
  },
  async exit() {
    const result = await session.exit('user')
    if (result.status === 'exited') return
    if (bridge.getConfig().mode === 'demo' && typeof getCurrentPages === 'function' && getCurrentPages().length > 1) wx.navigateBack()
    else this.setData({ notice: '考察已保存，可以从小程序返回按钮离开。' })
  },
  onExit() { this.action(() => this.exit()) }
})
