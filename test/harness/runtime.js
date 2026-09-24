/**
 * 运行时：node:vm 求值页面/组件 JS（mock Page/Component/wx/getApp/require），
 * 驱动生命周期（onLoad/onShow/onReady、attached、property observers），
 * 最后把当前 data 用 wxml.js 渲染成 HTML。
 */
'use strict'

const fs = require('fs')
const path = require('path')
const vm = require('vm')
const wxml = require('./wxml')

const ROOT = path.resolve(__dirname, '..', '..')

const WIN_INFO = {
  statusBarHeight: 24,
  windowWidth: 375,
  windowHeight: 812,
  pixelRatio: 2,
  safeArea: { top: 24, bottom: 812, left: 0, right: 375 }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

function clone(v) {
  if (v === undefined) return undefined
  try { return JSON.parse(JSON.stringify(v)) } catch (e) { return v }
}

// ---------------- wx / 全局 mock ----------------

function makeWx(overrides) {
  const storage = {}
  function callOpts(opts, okRes) {
    if (!opts) return
    if (opts.success) { try { opts.success(okRes || {}) } catch (e) { /* 页面回调异常忽略 */ } }
    if (opts.complete) { try { opts.complete(okRes || {}) } catch (e) {} }
  }
  function selectorQuery() {
    const q = {
      _cb: null,
      select() { return q },
      selectAll() { return q },
      selectViewport() { return q },
      in() { return q },
      fields(opts, cb) { if (cb) q._cb = cb; return q },
      boundingClientRect(cb) { if (cb) q._cb = cb; return q },
      scrollOffset(cb) { if (cb) q._cb = cb; return q },
      node(cb) { if (cb) q._cb = cb; return q },
      exec(cb) { const f = cb || q._cb; if (f) { try { f([]) } catch (e) {} } return q }
    }
    return q
  }
  const api = {
    getWindowInfo: () => Object.assign({}, WIN_INFO),
    getSystemInfoSync: () => Object.assign({}, WIN_INFO),
    setStorageSync: (k, v) => { storage[k] = v },
    getStorageSync: (k) => (k in storage ? storage[k] : ''),
    removeStorageSync: (k) => { delete storage[k] },
    navigateTo: (o) => callOpts(o),
    redirectTo: (o) => callOpts(o),
    reLaunch: (o) => callOpts(o),
    navigateBack: (o) => callOpts(o),
    showToast: (o) => callOpts(o),
    showModal: (o) => callOpts(o, { confirm: true, cancel: false }),
    authorize: (o) => callOpts(o),
    chooseMedia: (o) => callOpts(o, {
      tempFiles: [{ tempFilePath: '/tmp/plate21-photo.jpg', size: 1024 }]
    }),
    saveFile: (o) => callOpts(o, { savedFilePath: o && o.tempFilePath ? o.tempFilePath.replace('/tmp/', '/saved/') : '/saved/plate21-photo.jpg' }),
    removeSavedFile: (o) => callOpts(o),
    previewImage: (o) => callOpts(o),
    openSetting: (o) => callOpts(o, { authSetting: { 'scope.camera': true } }),
    createSelectorQuery: selectorQuery,
    createCameraContext: () => ({ takePhoto: () => {}, startRecord: () => {}, stopRecord: () => {} }),
    createCanvasContext: () => new Proxy({}, { get: () => () => {} }),
    canvasToTempFilePath: (o) => { if (o && o.fail) try { o.fail({}) } catch (e) {} },
    saveImageToPhotosAlbum: (o) => callOpts(o),
    nextTick: (fn) => setTimeout(fn, 0),
    onCompassChange: () => {},
    stopAccelerometer: () => {}
  }
  return Object.assign(api, overrides || {})
}

// ---------------- setData 路径合并 ----------------

function setPath(obj, keyPath, value) {
  if (keyPath.indexOf('.') === -1 && keyPath.indexOf('[') === -1) {
    obj[keyPath] = value
    return
  }
  const tokens = []
  keyPath.replace(/([^.[\]]+)|\[(\d+)\]/g, (m, name, idx) => {
    tokens.push(idx !== undefined ? Number(idx) : name)
  })
  if (!tokens.length) return
  let cur = obj
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i]
    if (cur[t] === undefined || cur[t] === null) cur[t] = typeof tokens[i + 1] === 'number' ? [] : {}
    cur = cur[t]
  }
  cur[tokens[tokens.length - 1]] = value
}

// ---------------- vm 沙箱与自定义 require ----------------

function createContext(consoleSink, wxOverrides) {
  const tracked = { timeouts: new Set(), intervals: new Set() }
  const wx = makeWx(wxOverrides)
  const sandbox = {
    console: consoleSink,
    setTimeout: (fn, ms, ...args) => {
      const t = setTimeout(fn, ms, ...args)
      tracked.timeouts.add(t)
      return t
    },
    clearTimeout: (t) => { tracked.timeouts.delete(t); clearTimeout(t) },
    setInterval: (fn, ms, ...args) => {
      const t = setInterval(fn, ms, ...args)
      tracked.intervals.add(t)
      return t
    },
    clearInterval: (t) => { tracked.intervals.delete(t); clearInterval(t) },
    wx,
    getApp: () => ({ globalData: {} }),
    getCurrentPages: () => [],
    Page: (cfg) => { sandbox.__pageConfig = cfg },
    Component: (cfg) => { sandbox.__lastComponent = cfg },
    Behavior: (b) => b
  }
  const ctx = vm.createContext(sandbox)
  const moduleCache = new Map()

  function makeRequire(dir) {
    return function localRequire(spec) {
      if (!spec.startsWith('.')) throw new Error('harness require: 仅支持相对路径 ' + spec)
      let file = path.resolve(dir, spec)
      if (!fs.existsSync(file)) {
        if (fs.existsSync(file + '.js')) file += '.js'
        else throw new Error('harness require: 找不到 ' + file)
      }
      if (moduleCache.has(file)) return moduleCache.get(file).exports
      const src = fs.readFileSync(file, 'utf8')
      const module = { exports: {} }
      moduleCache.set(file, module)
      const fn = vm.runInContext(
        '(function(require, module, exports){\n' + src + '\n})',
        ctx,
        { filename: file }
      )
      fn(makeRequire(path.dirname(file)), module, module.exports)
      return module.exports
    }
  }

  function cancelAll() {
    tracked.timeouts.forEach(clearTimeout)
    tracked.intervals.forEach(clearInterval)
    tracked.timeouts.clear()
    tracked.intervals.clear()
  }

  return { ctx, sandbox, wx, makeRequire, cancelAll }
}

// ---------------- 实例 ----------------

function createInstance(config, isComponent, wxRef, registry) {
  const inst = { data: {} }
  ;(config.behaviors || []).forEach((b) => {
    if (!b) return
    if (b.data) Object.assign(inst.data, clone(b.data))
    const src = b.methods || {}
    Object.keys(src).forEach((key) => {
      if (typeof src[key] === 'function') {
        inst[key] = function (...args) { return src[key].apply(inst, args) }
      }
    })
  })
  Object.assign(inst.data, clone(config.data) || {})
  const methodSrc = isComponent ? (config.methods || {}) : config
  for (const key of Object.keys(methodSrc)) {
    if (key === 'data' || key === 'properties' || key === 'methods' || key === 'lifetimes' || key === 'observers' || key === 'behaviors') continue
    if (typeof methodSrc[key] === 'function') {
      inst[key] = function (...args) { return methodSrc[key].apply(inst, args) }
    } else if (!isComponent) {
      // 页面 config 上的普通字段（如 timers: []）也挂到实例上
      inst[key] = methodSrc[key]
    }
  }
  inst.setData = (updates, cb) => {
    if (updates) {
      for (const k of Object.keys(updates)) setPath(inst.data, k, updates[k])
    }
    if (typeof cb === 'function') cb()
  }
  inst.selectComponent = (sel) => registry[sel] || STUB_COMPONENT
  inst.selectAllComponents = () => []
  inst.createSelectorQuery = () => wxRef.createSelectorQuery()
  inst.triggerEvent = () => {}
  inst.getRelationNodes = () => []
  return inst
}

const STUB_COMPONENT = new Proxy({}, {
  get: (t, prop) => {
    if (prop === 'setData') return () => {}
    return () => {}
  }
})

// ---------------- 组件 ----------------

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { return {} }
}

function readWxml(file) {
  return readText(file).replace(/<include\s+src=["']([^"']+)["']\s*\/>/g, (_, src) => readWxml(path.resolve(path.dirname(file), src)))
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8') } catch (e) { return '' }
}

function resolveComponentPath(baseDir, configuredPath) {
  return configuredPath.startsWith('/')
    ? path.join(ROOT, configuredPath.slice(1))
    : path.resolve(baseDir, configuredPath)
}

/** 加载组件四件套 + 求值组件 js，返回 compDef（可递归其 usingComponents） */
function loadComponent(compPathNoExt, env, errors, cssCollector) {
  env.compCache = env.compCache || new Map()
  if (env.compCache.has(compPathNoExt)) return env.compCache.get(compPathNoExt)
  const jsFile = compPathNoExt + '.js'
  const json = readJson(compPathNoExt + '.json')
  const tpl = readWxml(compPathNoExt + '.wxml')
  const css = readText(compPathNoExt + '.wxss')
  if (css && !cssCollector.done.has(compPathNoExt)) {
    cssCollector.done.add(compPathNoExt)
    cssCollector.list.push(css)
  }
  let config = {}
  if (fs.existsSync(jsFile)) {
    env.sandbox.__lastComponent = null
    try {
      env.makeRequire(path.dirname(jsFile))( './' + path.basename(jsFile) )
    } catch (e) {
      errors.push('组件 js 求值失败 ' + jsFile + ': ' + (e && e.message))
    }
    config = env.sandbox.__lastComponent || {}
  }
  const compDef = {
    config,
    ast: wxml.parse(tpl),
    components: new Map()
  }
  env.compCache.set(compPathNoExt, compDef)
  const using = json.usingComponents || {}
  for (const [tag, rel] of Object.entries(using)) {
    const sub = resolveComponentPath(path.dirname(compPathNoExt), rel)
    compDef.components.set(tag, loadComponent(sub, env, errors, cssCollector))
  }
  return compDef
}

function normalizePropName(name) {
  return name.replace(/-([a-z])/g, (m, c) => c.toUpperCase())
}

function coerceProp(type, raw, bound) {
  if (raw === null) return type === Boolean ? true : '' // 裸写属性
  if (type === Boolean) {
    if (typeof bound === 'string') return bound !== '' && bound !== 'false'
    return !!bound
  }
  if (type === Number) return Number(bound)
  if (type === String) return bound == null ? '' : String(bound)
  return bound
}

/** 从页面 wxml 属性计算组件 props（{{}} 绑定在页面 scope 求值） */
function computeProps(config, attrs, scope) {
  const defs = config.properties || {}
  const byNorm = new Map()
  for (const [name] of attrs) byNorm.set(normalizePropName(name), name)
  const props = {}
  const observers = []
  for (const [propName, defRaw] of Object.entries(defs)) {
    const def = typeof defRaw === 'function' ? { type: defRaw } : defRaw
    const attrName = byNorm.get(propName)
    const provided = attrName !== undefined
    let val
    if (provided) {
      const raw = attrs.get(attrName)
      const bound = raw === null ? null : wxml.interpRaw(raw, scope)
      val = coerceProp(def.type, raw, bound)
    } else {
      val = clone(def.value)
    }
    props[propName] = val
    if (typeof def.observer === 'function') observers.push([def.observer, val])
  }
  return { props, observers }
}

function renderComponent(compDef, attrs, children, pageScope, env, registry, errors) {
  const config = compDef.config
  const inst = createInstance(config, true, env.wx, registry)
  const { props, observers } = computeProps(config, attrs, pageScope)
  Object.assign(inst.data, props)
  inst.properties = inst.data
  const id = attrs.get('id')
  if (id) registry['#' + wxml.interp(id, pageScope)] = inst
  // lifetimes.attached / attached
  const attached = (config.lifetimes && config.lifetimes.attached) || config.attached
  if (typeof attached === 'function') {
    try { attached.call(inst) } catch (e) { errors.push('组件 attached 异常: ' + (e && e.message)) }
  }
  // property observers 初次触发
  for (const [obs, val] of observers) {
    try { obs.call(inst, val, val) } catch (e) { errors.push('组件 observer 异常: ' + (e && e.message)) }
  }
  const ctx = {
    scope: inst.data,
    components: compDef.components,
    slots: children,
    renderComponent: (tag, a, ch, scope) =>
      renderComponent(compDef.components.get(tag), a, ch, scope, env, registry, errors)
  }
  return wxml.renderChildren(compDef.ast, ctx)
}

// ---------------- 页面渲染 ----------------

/**
 * @param {object} spec { route:'plate21/module/pages/cover/cover', query:{}, settleMs, drive }
 * @returns {Promise<{html, cssList, errors, warns, data}>}
 */
async function renderPage(spec) {
  const errors = []
  const warns = []
  const consoleSink = {
    log: () => {},
    info: () => {},
    warn: (...a) => { warns.push(a.map(String).join(' ')) },
    error: (...a) => { errors.push('[console.error] ' + a.map(String).join(' ')) }
  }
  const env = createContext(consoleSink, spec.wxOverrides)
  const registry = {}
  const cssCollector = { list: [], done: new Set() }

  const pageNoExt = path.join(ROOT, spec.route)
  const pageDir = path.dirname(pageNoExt)
  const pageJson = readJson(pageNoExt + '.json')
  const pageTpl = readWxml(pageNoExt + '.wxml')
  const pageCss = readText(pageNoExt + '.wxss')

  // 1. 求值页面 js
  const pageJs = pageNoExt + '.js'
  if (fs.existsSync(pageJs)) {
    try {
      env.makeRequire(pageDir)('./' + path.basename(pageJs))
    } catch (e) {
      errors.push('页面 js 求值失败: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e))
    }
  }
  const config = env.sandbox.__pageConfig || { data: {} }

  // 2. 页面实例 + 生命周期
  const inst = createInstance(config, false, env.wx, registry)
  try { if (inst.onLoad) inst.onLoad(spec.query || {}) } catch (e) { errors.push('onLoad: ' + (e && e.message)) }
  try { if (inst.onShow) inst.onShow() } catch (e) { errors.push('onShow: ' + (e && e.message)) }
  try { if (inst.onReady) inst.onReady() } catch (e) { errors.push('onReady: ' + (e && e.message)) }

  // 3. 等待 Promise 化的 session / 短定时器 settle
  await sleep(spec.settleMs === undefined ? 700 : spec.settleMs)
  if (spec.drive) {
    try { await spec.drive(inst, sleep) } catch (e) { errors.push('drive: ' + (e && e.message)) }
  }

  // 4. 组件表
  const components = new Map()
  const appJson = readJson(path.join(ROOT, 'app.json'))
  const using = Object.assign({}, appJson.usingComponents || {}, pageJson.usingComponents || {})
  for (const [tag, rel] of Object.entries(using)) {
    const compPath = resolveComponentPath(pageDir, rel)
    components.set(tag, loadComponent(compPath, env, errors, cssCollector))
  }

  // 5. 渲染
  let html = ''
  try {
    const ast = wxml.parse(pageTpl)
    html = wxml.renderChildren(ast, {
      scope: inst.data,
      components,
      slots: null,
      renderComponent: (tag, attrs, children, scope) =>
        renderComponent(components.get(tag), attrs, children, scope, env, registry, errors)
    })
  } catch (e) {
    errors.push('渲染异常: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e))
  }

  env.cancelAll()

  return {
    html,
    pageCss,
    compCssList: cssCollector.list,
    errors,
    warns,
    data: inst.data
  }
}

module.exports = { renderPage, ROOT, sleep }
