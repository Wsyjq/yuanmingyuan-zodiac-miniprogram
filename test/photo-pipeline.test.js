'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const pipeline = require('../plate21/module/utils/photo-pipeline')

test('photo dimensions are bounded without changing aspect ratio', () => {
  assert.deepEqual(pipeline.fitWithin(4000, 2000, 1280), {
    width: 1280,
    height: 640,
    scaled: true
  })
  assert.deepEqual(pipeline.fitWithin(900, 1200, 1280), {
    width: 900,
    height: 1200,
    scaled: false
  })
})

test('oversized photos are normalized through an offscreen canvas', async () => {
  const drawCalls = []
  let canvasOptions = null
  const api = {
    getImageInfo(options) {
      options.success({ width: 4000, height: 2000, orientation: 'right' })
    },
    createOffscreenCanvas(options) {
      canvasOptions = options
      return {
        width: options.width,
        height: options.height,
        getContext() {
          return {
            clearRect() {},
            drawImage(image, x, y, width, height) { drawCalls.push([x, y, width, height]) }
          }
        },
        createImage() {
          const image = {}
          Object.defineProperty(image, 'src', {
            set() { Promise.resolve().then(() => image.onload()) }
          })
          return image
        }
      }
    },
    canvasToTempFilePath(options) {
      options.success({ tempFilePath: '/tmp/normalized.jpg' })
    },
    getFileInfo(options) {
      options.success({ size: 480 * 1024 })
    }
  }

  const result = await pipeline.normalizePhoto('/tmp/original.jpg', {
    api,
    fileSize: 4 * 1024 * 1024
  })

  assert.equal(canvasOptions.width, 1280)
  assert.equal(canvasOptions.height, 640)
  assert.deepEqual(drawCalls, [[0, 0, 1280, 640]])
  assert.equal(result.path, '/tmp/normalized.jpg')
  assert.equal(result.strategy, 'offscreen-canvas')
  assert.equal(result.bounded, true)
})

test('normalization reports and uses the compression fallback', async () => {
  const fallbacks = []
  const api = {
    getImageInfo(options) { options.success({ width: 2400, height: 1600 }) },
    compressImage(options) { options.success({ tempFilePath: '/tmp/compressed.jpg' }) },
    getFileInfo(options) { options.success({ size: 700 * 1024 }) }
  }
  const result = await pipeline.normalizePhoto('/tmp/original.jpg', {
    api,
    fileSize: 2 * 1024 * 1024,
    onFallback(reason) { fallbacks.push(reason) }
  })

  assert.deepEqual(fallbacks, ['offscreen_canvas_failed'])
  assert.equal(result.path, '/tmp/compressed.jpg')
  assert.equal(result.strategy, 'compress-image')
  assert.equal(result.bounded, false)
})

test('normalized output above the hard budget gets one smaller retry', async () => {
  let infoCalls = 0
  const fallbacks = []
  const api = {
    getImageInfo(options) { options.success({ width: 3000, height: 2000 }) },
    createOffscreenCanvas(options) {
      return {
        getContext() { return { clearRect() {}, drawImage() {} } },
        createImage() {
          const image = {}
          Object.defineProperty(image, 'src', { set() { Promise.resolve().then(() => image.onload()) } })
          return image
        },
        width: options.width,
        height: options.height
      }
    },
    canvasToTempFilePath(options) { options.success({ tempFilePath: '/tmp/first-pass.jpg' }) },
    compressImage(options) { options.success({ tempFilePath: '/tmp/budget-pass.jpg' }) },
    getFileInfo(options) {
      infoCalls += 1
      options.success({ size: infoCalls === 1 ? 1.4 * 1024 * 1024 : 500 * 1024 })
    }
  }
  const result = await pipeline.normalizePhoto('/tmp/original.jpg', {
    api,
    fileSize: 5 * 1024 * 1024,
    onFallback(reason) { fallbacks.push(reason) }
  })

  assert.equal(result.path, '/tmp/budget-pass.jpg')
  assert.equal(result.withinBudget, true)
  assert.match(result.strategy, /budget/)
  assert.deepEqual(fallbacks, ['photo_budget_retry'])
})
