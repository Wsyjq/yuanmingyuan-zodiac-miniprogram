'use strict'

const MAX_EDGE = 1280
const TARGET_BYTES = 600 * 1024
const HARD_BYTES = 1024 * 1024
const JPEG_QUALITY = 0.8

function fitWithin(width, height, maxEdge) {
  const w = Math.max(0, Number(width) || 0)
  const h = Math.max(0, Number(height) || 0)
  const edge = Math.max(1, Number(maxEdge) || MAX_EDGE)
  if (!w || !h) return { width: 0, height: 0, scaled: false }
  const scale = Math.min(1, edge / Math.max(w, h))
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scaled: scale < 1
  }
}

function imageInfo(api, filePath) {
  if (!api || typeof api.getImageInfo !== 'function') return Promise.resolve(null)
  return new Promise(function (resolve) {
    api.getImageInfo({
      src: filePath,
      success: resolve,
      fail: function () { resolve(null) }
    })
  })
}

function fileSize(api, filePath, knownSize) {
  const known = Number(knownSize)
  if (known > 0) return Promise.resolve(known)
  if (api && typeof api.getFileSystemManager === 'function') {
    try {
      const manager = api.getFileSystemManager()
      if (manager && typeof manager.statSync === 'function') {
        const stat = manager.statSync(filePath)
        if (stat && Number(stat.size) >= 0) return Promise.resolve(Number(stat.size))
      }
    } catch (error) { /* 尝试回退异步接口。 */ }
  }
  if (!api || typeof api.getFileInfo !== 'function') return Promise.resolve(0)
  return new Promise(function (resolve) {
    api.getFileInfo({
      filePath: filePath,
      success: function (result) { resolve(Number(result && result.size) || 0) },
      fail: function () { resolve(0) }
    })
  })
}

function loadCanvasImage(canvas, filePath) {
  return new Promise(function (resolve, reject) {
    const image = canvas.createImage()
    image.onload = function () { resolve(image) }
    image.onerror = function (error) { reject(error || new Error('image_decode_failed')) }
    image.src = filePath
  })
}

function exportCanvas(api, canvas, dimensions) {
  return new Promise(function (resolve, reject) {
    api.canvasToTempFilePath({
      canvas: canvas,
      fileType: 'jpg',
      quality: JPEG_QUALITY,
      destWidth: dimensions.width,
      destHeight: dimensions.height,
      success: function (result) {
        if (result && result.tempFilePath) resolve(result.tempFilePath)
        else reject(new Error('empty_canvas_export'))
      },
      fail: reject
    })
  })
}

function resizeWithCanvas(api, filePath, dimensions) {
  if (!api || typeof api.createOffscreenCanvas !== 'function' || typeof api.canvasToTempFilePath !== 'function') {
    return Promise.reject(new Error('offscreen_canvas_unavailable'))
  }
  let canvas
  try {
    canvas = api.createOffscreenCanvas({ type: '2d', width: dimensions.width, height: dimensions.height })
  } catch (error) {
    return Promise.reject(error)
  }
  if (!canvas || typeof canvas.getContext !== 'function' || typeof canvas.createImage !== 'function') {
    return Promise.reject(new Error('offscreen_canvas_unavailable'))
  }
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const context = canvas.getContext('2d')
  if (!context || typeof context.drawImage !== 'function') return Promise.reject(new Error('offscreen_context_unavailable'))
  return loadCanvasImage(canvas, filePath).then(function (image) {
    context.clearRect(0, 0, dimensions.width, dimensions.height)
    // Canvas 解码会应用相机 EXIF 方向，导出的 JPEG 因而不再依赖方向元数据。
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height)
    return exportCanvas(api, canvas, dimensions)
  })
}

function compressWithApi(api, filePath, quality) {
  if (!api || typeof api.compressImage !== 'function') return Promise.reject(new Error('compress_image_unavailable'))
  return new Promise(function (resolve, reject) {
    api.compressImage({
      src: filePath,
      quality: Number(quality) || Math.round(JPEG_QUALITY * 100),
      success: function (result) {
        if (result && result.tempFilePath) resolve(result.tempFilePath)
        else reject(new Error('empty_compress_result'))
      },
      fail: reject
    })
  })
}

function finalizeOutput(api, outputPath, details, onFallback) {
  return fileSize(api, outputPath).then(function (outputBytes) {
    const result = Object.assign({}, details, {
      path: outputPath,
      bytes: outputBytes,
      withinBudget: !outputBytes || outputBytes <= HARD_BYTES
    })
    if (result.withinBudget || !api || typeof api.compressImage !== 'function') return result
    onFallback('photo_budget_retry')
    return compressWithApi(api, outputPath, 65).then(function (budgetPath) {
      return fileSize(api, budgetPath).then(function (budgetBytes) {
        return Object.assign({}, result, {
          path: budgetPath,
          bytes: budgetBytes,
          withinBudget: !budgetBytes || budgetBytes <= HARD_BYTES,
          strategy: result.strategy + '+budget'
        })
      })
    }).catch(function () { return result })
  })
}

function normalizePhoto(filePath, options) {
  const opts = options || {}
  const api = opts.api || (typeof wx !== 'undefined' ? wx : null)
  const onFallback = typeof opts.onFallback === 'function' ? opts.onFallback : function () {}
  const maxEdge = Number(opts.maxEdge) || MAX_EDGE
  if (!filePath) return Promise.reject(new Error('photo_path_required'))

  return Promise.all([
    imageInfo(api, filePath),
    fileSize(api, filePath, opts.fileSize)
  ]).then(function (values) {
    const info = values[0] || {}
    const bytes = values[1]
    const dimensions = fitWithin(info.width, info.height, maxEdge)
    const needsResize = dimensions.scaled
    const needsCompression = bytes > TARGET_BYTES
    if (!needsResize && !needsCompression) {
      return {
        path: filePath,
        width: dimensions.width,
        height: dimensions.height,
        bytes: bytes,
        normalized: false,
        bounded: !dimensions.width || Math.max(dimensions.width, dimensions.height) <= maxEdge,
        strategy: 'reuse',
        withinBudget: !bytes || bytes <= HARD_BYTES
      }
    }

    if (dimensions.width && dimensions.height) {
      return resizeWithCanvas(api, filePath, dimensions).then(function (outputPath) {
        return finalizeOutput(api, outputPath, {
          width: dimensions.width,
          height: dimensions.height,
          normalized: true,
          bounded: true,
          strategy: 'offscreen-canvas'
        }, onFallback)
      }).catch(function () {
        onFallback('offscreen_canvas_failed')
        return compressWithApi(api, filePath).then(function (outputPath) {
          return finalizeOutput(api, outputPath, {
            width: Number(info.width) || 0,
            height: Number(info.height) || 0,
            normalized: true,
            bounded: !needsResize,
            strategy: 'compress-image'
          }, onFallback)
        })
      })
    }

    onFallback('image_info_unavailable')
    return compressWithApi(api, filePath).then(function (outputPath) {
      return finalizeOutput(api, outputPath, {
        width: 0,
        height: 0,
        normalized: true,
        bounded: false,
        strategy: 'compress-image'
      }, onFallback)
    })
  }).catch(function (error) {
    onFallback(error && error.message || 'photo_normalize_failed')
    return {
      path: filePath,
      width: 0,
      height: 0,
      bytes: Number(opts.fileSize) || 0,
      normalized: false,
      bounded: false,
      strategy: 'source-fallback',
      withinBudget: !Number(opts.fileSize) || Number(opts.fileSize) <= HARD_BYTES
    }
  })
}

module.exports = {
  MAX_EDGE: MAX_EDGE,
  TARGET_BYTES: TARGET_BYTES,
  HARD_BYTES: HARD_BYTES,
  JPEG_QUALITY: JPEG_QUALITY,
  fitWithin: fitWithin,
  normalizePhoto: normalizePhoto
}
