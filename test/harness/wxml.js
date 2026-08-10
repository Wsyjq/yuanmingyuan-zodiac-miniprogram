/**
 * WXML → HTML：解析 + 渲染（纯字符串，无 DOM 依赖）
 * 支持：view/text/image/scroll-view/canvas/camera/movable-area/movable-view/block/slot/button/input
 *       wx:if / wx:elif / wx:else、wx:for（item/index 变量）、{{}} 插值、
 *       class/style 绑定、hidden、bind:* 剥离、组件递归与匿名 slot
 */
'use strict'

// ---------------- 解析 ----------------

/**
 * 解析 WXML 为 AST：
 * { type:'element', tag, attrs:Map(name->string|null), children:[] } | { type:'text', value }
 * null 属性值 = 裸写属性（如 <nav-back custom />）
 */
function parse(src) {
  let i = 0
  const n = src.length

  function parseNodes(endTag) {
    const nodes = []
    while (i < n) {
      const lt = src.indexOf('<', i)
      if (lt === -1) {
        if (i < n) nodes.push({ type: 'text', value: src.slice(i) })
        i = n
        break
      }
      if (lt > i) nodes.push({ type: 'text', value: src.slice(i, lt) })
      // 注释
      if (src.startsWith('<!--', lt)) {
        const end = src.indexOf('-->', lt + 4)
        i = end === -1 ? n : end + 3
        continue
      }
      // 闭合标签
      if (src.startsWith('</', lt)) {
        const end = src.indexOf('>', lt + 2)
        const name = src.slice(lt + 2, end).trim()
        i = end + 1
        return { nodes, closed: name }
      }
      // 文本里的孤立 '<'（如 {{index < typedCount}}）：后面不是标签起始字符就当普通文本
      const nc = src[lt + 1]
      if (!nc || !/[a-zA-Z!]/.test(nc)) {
        nodes.push({ type: 'text', value: '<' })
        i = lt + 1
        continue
      }
      i = lt
      nodes.push(parseElement())
    }
    return { nodes, closed: null }
  }

  function parseElement() {
    // i 指向 '<'
    i++
    let tag = ''
    while (i < n && /[\w-]/.test(src[i])) tag += src[i++]
    const attrs = new Map()
    const children = []
    while (i < n) {
      // 跳过空白
      while (i < n && /\s/.test(src[i])) i++
      if (src.startsWith('/>', i)) { i += 2; return { type: 'element', tag, attrs, children } }
      if (src[i] === '>') { i++; break }
      // 属性名
      let name = ''
      while (i < n && !/[\s=/>]/.test(src[i])) name += src[i++]
      while (i < n && /\s/.test(src[i])) i++
      if (src[i] === '=') {
        i++
        while (i < n && /\s/.test(src[i])) i++
        const q = src[i]
        if (q === '"' || q === "'") {
          const end = src.indexOf(q, i + 1)
          attrs.set(name, src.slice(i + 1, end === -1 ? n : end))
          i = end === -1 ? n : end + 1
        } else {
          let v = ''
          while (i < n && !/[\s>]/.test(src[i])) v += src[i++]
          attrs.set(name, v)
        }
      } else if (name) {
        attrs.set(name, null) // 裸写属性
      }
    }
    // 子节点
    const sub = parseNodes(tag)
    children.push(...sub.nodes)
    return { type: 'element', tag, attrs, children }
  }

  return parseNodes(null).nodes
}

// ---------------- 表达式求值 ----------------

function evalExpr(expr, scope) {
  try {
    // eslint-disable-next-line no-new-func
    return Function('scope', 'with(scope){return (' + expr + ')}')(scope)
  } catch (e) {
    return undefined
  }
}

function truthy(v) { return !!v }

/** 指令属性（wx:if / wx:for / hidden…）：剥掉 {{ }} 后求值 */
function evalDirective(raw, scope) {
  if (raw == null) return undefined
  const m = /^\{\{([\s\S]*)\}\}$/.exec(raw.trim())
  return evalExpr(m ? m[1] : raw, scope)
}

function toText(v) {
  if (v === undefined || v === null) return ''
  if (v === true) return 'true'
  if (v === false) return 'false'
  return String(v)
}

/** 属性/文本内插值：替换所有 {{expr}} */
function interp(str, scope) {
  if (str == null || str.indexOf('{{') === -1) return str == null ? '' : str
  return str.replace(/\{\{([\s\S]*?)\}\}/g, (m, expr) => toText(evalExpr(expr, scope)))
}

/** 整个属性值恰为一个 {{expr}} 时返回原始值（用于组件 props 绑定） */
function interpRaw(str, scope) {
  if (str == null) return null
  const m = /^\{\{([\s\S]*?)\}\}$/.exec(str.trim())
  if (m) return evalExpr(m[1], scope)
  return interp(str, scope)
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** inline style 里的 rpx → vw（750rpx = 100vw），用于多视口布局审计。 */
function rpx2px(s) {
  return String(s).replace(/(-?\d*\.?\d+)rpx\b/g, (m, num) => {
    const value = Math.round((parseFloat(num) / 7.5) * 1000000) / 1000000
    return value + 'vw'
  })
}

// ---------------- 渲染 ----------------

const TAG_MAP = {
  view: 'div',
  text: 'span',
  button: 'button',
  input: 'input',
  'scroll-view': 'div',
  'movable-area': 'div',
  'movable-view': 'div'
}

// 透传到 HTML 的普通属性白名单
const KEEP_ATTRS = new Set(['id', 'class', 'style', 'src', 'type', 'placeholder', 'value', 'alt'])

/**
 * 渲染子节点列表（处理 wx:if / wx:elif / wx:else 链）
 * ctx: { scope, components:Map<tag,compDef>, renderComponent(tag,attrs,children,scope), slots }
 */
function renderChildren(children, ctx) {
  let out = ''
  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.type === 'text') { out += escapeHtml(interp(node.value, ctx.scope)); continue }
    if (node.attrs.has('wx:if')) {
      let rendered = false
      if (truthy(evalDirective(node.attrs.get('wx:if'), ctx.scope))) {
        out += renderElement(node, ctx); rendered = true
      }
      let j = i + 1
      while (j < children.length) {
        const sib = children[j]
        // elif/else 链允许跨越纯空白文本节点
        if (sib.type === 'text') {
          if (/^\s*$/.test(sib.value)) { j++; continue }
          break
        }
        const isElif = sib.attrs.has('wx:elif')
        const isElse = sib.attrs.has('wx:else')
        if (!isElif && !isElse) break
        if (!rendered && (isElse || truthy(evalDirective(sib.attrs.get('wx:elif'), ctx.scope)))) {
          out += renderElement(sib, ctx); rendered = true
        }
        j++
      }
      i = j - 1
      continue
    }
    // 孤立的 elif/else（理论上已被链吃掉）：跳过
    if (node.attrs.has('wx:elif') || node.attrs.has('wx:else')) continue
    out += renderElement(node, ctx)
  }
  return out
}

function renderElement(node, ctx) {
  // wx:for
  if (node.attrs.has('wx:for')) {
    const list = evalDirective(node.attrs.get('wx:for'), ctx.scope)
    if (!Array.isArray(list)) return ''
    const itemVar = node.attrs.get('wx:for-item') || 'item'
    const indexVar = node.attrs.get('wx:for-index') || 'index'
    const clone = { type: node.type, tag: node.tag, attrs: new Map(node.attrs), children: node.children }
    clone.attrs.delete('wx:for')
    let out = ''
    list.forEach((item, idx) => {
      const scope = Object.assign(Object.create(null), ctx.scope)
      scope[itemVar] = item
      scope[indexVar] = idx
      out += renderElement(clone, Object.assign({}, ctx, { scope }))
    })
    return out
  }

  const tag = node.tag

  if (tag === 'block') return renderChildren(node.children, ctx)
  if (tag === 'slot') {
    return ctx.slots && ctx.slots.length
      ? renderChildren(ctx.slots, Object.assign({}, ctx, { slots: null }))
      : ''
  }
  // 自定义组件
  if (ctx.components && ctx.components.has(tag)) {
    return ctx.renderComponent(tag, node.attrs, node.children, ctx.scope)
  }

  // ---- 属性收集 ----
  let cls = ''
  let style = ''
  const others = []
  let hidden = false
  for (const [name, raw] of node.attrs) {
    if (name.startsWith('wx:') || name.startsWith('bind') || name.startsWith('catch') ||
        name.startsWith('mut-bind') || name.startsWith('data-')) continue
    if (name === 'hidden') { hidden = raw === null ? true : truthy(evalDirective(raw, ctx.scope)); continue }
    if (!KEEP_ATTRS.has(name)) continue
    if (name === 'src') continue // image 分支单独处理
    const v = interp(raw, ctx.scope)
    if (name === 'class') cls = v
    else if (name === 'style') style = v
    else others.push([name, v])
  }
  style = rpx2px(style)
  if (hidden) style += (style ? ';' : '') + 'display:none'

  function openTag(htmlTag, extraClass, extraStyle, extraAttrs) {
    const c = [extraClass, cls].filter(Boolean).join(' ')
    const s = [extraStyle, style].filter(Boolean).join(';')
    let a = c ? ` class="${escapeHtml(c)}"` : ''
    a += s ? ` style="${escapeHtml(s)}"` : ''
    for (const [k, v] of others) a += ` ${k}="${escapeHtml(v)}"`
    if (extraAttrs) a += extraAttrs
    return `<${htmlTag}${a}>`
  }

  // ---- 各标签 ----
  if (tag === 'image') {
    let src = interp(node.attrs.get('src'), ctx.scope)
    if (src && !src.startsWith('/') && !/^https?:/.test(src)) src = '/' + src
    const mode = node.attrs.get('mode') || 'scaleToFill'
    let fit = ''
    if (mode === 'aspectFit') fit = 'object-fit:contain'
    else if (mode === 'aspectFill') fit = 'object-fit:cover'
    return openTag('img', '__img', fit, ` src="${escapeHtml(src)}"`)
  }
  if (tag === 'canvas') {
    return openTag('div', '__canvas-ph', '', '') + 'canvas</div>'
  }
  if (tag === 'camera') {
    return openTag('div', '__camera-ph', '', '') + 'camera</div>'
  }
  if (tag === 'input') {
    const ph = interp(node.attrs.get('placeholder'), ctx.scope)
    const val = interp(node.attrs.get('value'), ctx.scope)
    return openTag('input', '', '', ` placeholder="${escapeHtml(ph)}" value="${escapeHtml(val)}" readonly`)
  }
  if (tag === 'scroll-view') {
    const inner = renderChildren(node.children, ctx)
    return openTag('div', '__scroll', 'overflow:auto') + inner + '</div>'
  }

  const htmlTag = TAG_MAP[tag]
  if (htmlTag) {
    const inner = htmlTag === 'input' ? '' : renderChildren(node.children, ctx)
    return openTag(htmlTag, '') + inner + `</${htmlTag}>`
  }

  // 未知标签：虚线占位
  return openTag('div', '__unknown-ph', '', '') + escapeHtml(tag) + renderChildren(node.children, ctx) + '</div>'
}

module.exports = { parse, renderChildren, evalExpr, interp, interpRaw, escapeHtml, rpx2px }
