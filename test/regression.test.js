const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

function loadPage(relativePath, wx) {
  const file = require.resolve('../' + relativePath)
  delete require.cache[file]
  global.wx = wx || {}
  let config
  global.Page = (value) => { config = value }
  require(file)
  delete global.Page
  return config
}

function pageInstance(config, data) {
  const instance = Object.assign({}, config, { data: Object.assign({}, config.data, data) })
  instance.setData = (updates) => Object.assign(instance.data, updates)
  return instance
}

function loadComponent(relativePath) {
  const file = require.resolve('../' + relativePath)
  delete require.cache[file]
  let config
  global.Component = (value) => { config = value }
  require(file)
  delete global.Component
  return config
}

function componentInstance(config, properties) {
  const defaults = {}
  for (const [name, definition] of Object.entries(config.properties || {})) {
    defaults[name] = definition && Object.prototype.hasOwnProperty.call(definition, 'value')
      ? definition.value
      : undefined
  }
  const events = []
  const instance = {
    data: Object.assign({}, config.data, defaults, properties),
    setData(updates) { Object.assign(this.data, updates) },
    triggerEvent(name) { events.push(name) }
  }
  instance.properties = instance.data
  for (const [name, method] of Object.entries(config.methods || {})) {
    instance[name] = (...args) => method.apply(instance, args)
  }
  const attached = config.lifetimes && config.lifetimes.attached
  const detached = config.lifetimes && config.lifetimes.detached
  if (attached) attached.call(instance)
  return { instance, events, detach: () => detached && detached.call(instance) }
}

test('report draws the approved AI plate before the signature and metadata', async () => {
  const config = loadPage('plate21/module/pages/report/report.js')
  const instance = pageInstance(config, {
    name: '测试者',
    today: '2026 年 8 月 8 日',
    editionLabel: '第 21 版'
  })
  const calls = []
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop === 'fillText') return (text) => calls.push('text:' + text)
      if (prop === 'drawImage') return () => calls.push('image')
      if (prop === 'setLineDash') return () => {}
      if (['save', 'restore', 'translate', 'scale', 'beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'stroke', 'arc', 'closePath'].includes(prop)) return () => {}
      if (prop === 'fillRect' || prop === 'strokeRect') return () => {}
      return target[prop]
    },
    set(target, prop, value) {
      target[prop] = value
      return true
    }
  })
  const canvas = {
    createImage() {
      const image = {}
      Object.defineProperty(image, 'src', {
        set() {
          Promise.resolve().then(() => image.onload())
        }
      })
      return image
    }
  }

  await instance.drawReport(ctx, canvas)
  const plateIndex = calls.indexOf('image')
  const signatureIndex = calls.indexOf('text:测试者')
  assert.notEqual(plateIndex, -1)
  assert.notEqual(signatureIndex, -1)
  assert.ok(plateIndex < signatureIndex)
})

test('report decodes field photos one at a time', async () => {
  const config = loadPage('plate21/module/pages/report/report.js')
  const instance = pageInstance(config, {
    fieldPhotos: ['dome', 'beast', 'lotus', 'swan'].map((key, index) => ({
      key,
      no: String(index + 1).padStart(2, '0'),
      title: key,
      photoPath: '/saved/' + key + '.jpg'
    }))
  })
  let activeDecodes = 0
  let peakDecodes = 0
  let drawnPhotos = 0
  const noops = new Set(['save', 'restore', 'translate', 'scale', 'beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'stroke', 'arc', 'closePath', 'fillRect', 'strokeRect', 'fillText', 'setLineDash'])
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop === 'drawImage') return () => { drawnPhotos += 1 }
      if (noops.has(prop)) return () => {}
      return target[prop]
    },
    set(target, prop, value) { target[prop] = value; return true }
  })
  const canvas = {
    createImage() {
      const image = { width: 1600, height: 1200 }
      Object.defineProperty(image, 'src', {
        set() {
          activeDecodes += 1
          peakDecodes = Math.max(peakDecodes, activeDecodes)
          Promise.resolve().then(() => {
            activeDecodes -= 1
            image.onload()
          })
        }
      })
      return image
    }
  }

  await instance.drawReport(ctx, canvas)
  assert.equal(peakDecodes, 1)
  assert.equal(drawnPhotos, 5)
})

test('ending returns directly to the host page', () => {
  const calls = []
  const config = loadPage('plate21/module/pages/ending/ending.js', {
    reLaunch(options) {
      calls.push(options.url)
    },
    navigateBack() {
      calls.push('navigateBack')
    }
  })
  const instance = pageInstance(config)
  instance.emitExit = () => {}

  instance.onBack()
  assert.deepEqual(calls, ['/pages/index/index'])
})

test('novel view reveals each leaf and turns it like a paper page', () => {
  const config = loadComponent('plate21/module/components/novel-view/novel-view.js')
  const { instance, events, detach } = componentInstance(config, {
    title: '序章',
    // 密度化分页：短叙述 + 引文打包同页，长段独立成页
    paragraphs: [
      { text: '甲'.repeat(60) },
      { text: '乙'.repeat(3), quote: true },
      { text: '丙'.repeat(150) }
    ],
    finishText: '继续'
  })

  assert.equal(instance.data.pageCount, 2)
  assert.equal(instance.data.pageIndex, 0)
  assert.equal(instance.data.currentPage.length, 2)
  assert.equal(instance.data.currentPage[0].text, '甲'.repeat(60))
  assert.equal(instance.data.currentPage[1].quote, true)
  assert.equal(instance.data.leadIndex, 0)
  assert.equal(instance.data.typing, true)

  instance.onPaperTap()
  assert.equal(instance.data.typing, false)
  assert.equal(instance.data.showAll, true)

  instance.onPaperTap()
  assert.equal(instance.data.turning, true)
  assert.equal(instance.data.turnDirection, 'next')
  assert.equal(instance.data.pageIndex, 1)
  assert.equal(instance.data.turnPage.length, 2)

  instance._finishTurn()
  assert.equal(instance.data.currentPage.length, 1)
  assert.equal(instance.data.currentPage[0].text, '丙'.repeat(150))
  assert.equal(instance.data.typing, true)

  instance.onPaperTap()
  instance.onPaperTap()
  instance.onPaperTap()
  assert.deepEqual(events, ['finish'])
  detach()

  const componentRoot = path.resolve(__dirname, '..', 'plate21', 'module', 'components', 'novel-view', 'novel-view')
  const template = fs.readFileSync(componentRoot + '.wxml', 'utf8')
  const styles = fs.readFileSync(componentRoot + '.wxss', 'utf8')
  assert.match(template, /reveal-copy/)
  assert.doesNotMatch(template, /wx:for="\{\{currentChars\}\}"/)
  assert.match(styles, /@keyframes copy-reveal/)
  assert.match(styles, /perspective/)
  assert.match(styles, /rotateY/)
})

test('novel view immediately exposes text and turns directly with reduced motion', () => {
  global.wx = { getSystemSetting: () => ({ reduceMotionEnabled: true }) }
  const config = loadComponent('plate21/module/components/novel-view/novel-view.js')
  const { instance, detach } = componentInstance(config, {
    paragraphs: [{ text: '甲'.repeat(160) }, { text: '乙'.repeat(160) }],
    hapticFeedback: false
  })

  assert.equal(instance.data.typing, false)
  assert.equal(instance.data.showAll, true)
  instance.onNext()
  assert.equal(instance.data.pageIndex, 1)
  assert.equal(instance.data.turning, false)
  assert.equal(instance.data.showAll, true)
  detach()
  delete global.wx
})

test('novel view locks horizontal intent and gives two-stage page haptics', () => {
  const pulses = []
  global.wx = {
    vibrateShort(options) { pulses.push(options.type) }
  }
  const config = loadComponent('plate21/module/components/novel-view/novel-view.js')
  const { instance, detach } = componentInstance(config, {
    paragraphs: [{ text: '甲'.repeat(160) }, { text: '乙'.repeat(160) }]
  })
  instance._finishTyping()

  instance.onTouchStart({ touches: [{ clientX: 180, clientY: 240 }] })
  instance.onTouchMove({ touches: [{ clientX: 184, clientY: 300 }] })
  assert.equal(instance.data.dragging, false)
  instance.onTouchEnd({ changedTouches: [{ clientX: 184, clientY: 300 }] })
  assert.equal(instance.data.pageIndex, 0)

  instance.onTouchStart({ touches: [{ clientX: 300, clientY: 240 }] })
  instance.onTouchMove({ touches: [{ clientX: 240, clientY: 244 }] })
  assert.equal(instance.data.dragging, true)
  assert.equal(instance.data.gestureArmed, true)
  assert.equal(instance.data.gestureDirection, 'next')
  assert.match(instance.data.dragStyle, /rotateY/)
  assert.match(instance.data.curlStyle, /width:/)
  instance.onTouchEnd({ changedTouches: [{ clientX: 240, clientY: 244 }] })
  assert.equal(instance.data.turning, true)
  assert.deepEqual(pulses, ['light'])

  instance._finishTurn()
  assert.deepEqual(pulses, ['light', 'light'])
  detach()
  delete global.wx
})

test('novel view accepts a short intentional flick without making slow drags too sensitive', () => {
  const config = loadComponent('plate21/module/components/novel-view/novel-view.js')
  const { instance, detach } = componentInstance(config, {
    paragraphs: [{ text: '甲'.repeat(160) }, { text: '乙'.repeat(160) }],
    hapticFeedback: false
  })
  instance._finishTyping()
  instance.onTouchStart({ touches: [{ clientX: 280, clientY: 220 }] })
  instance._gestureStart.time = Date.now() - 300
  instance.onTouchMove({ touches: [{ clientX: 258, clientY: 222 }] })
  instance.onTouchEnd({ changedTouches: [{ clientX: 258, clientY: 222 }] })
  assert.equal(instance.data.turning, false)
  assert.equal(instance.data.pageIndex, 0)

  instance.onTouchStart({ touches: [{ clientX: 280, clientY: 220 }] })
  instance._gestureStart.time = Date.now() - 35
  instance.onTouchMove({ touches: [{ clientX: 258, clientY: 222 }] })
  assert.equal(instance.data.gestureArmed, false)
  instance.onTouchEnd({ changedTouches: [{ clientX: 258, clientY: 222 }] })
  assert.equal(instance.data.turning, true)
  assert.equal(instance.data.pageIndex, 1)
  detach()
})

test('history card custom action ignores duplicate taps', () => {
  const config = loadComponent('plate21/module/components/history-card/history-card.js')
  const { instance, events, detach } = componentInstance(config, {
    visible: true,
    btnText: '继续'
  })

  instance.onBtn()
  instance.onBtn()

  assert.deepEqual(events, ['next'])
  assert.equal(instance.data.closing, true)
  detach()
})
