'use strict'

/**
 * L0 输入卫生：所有自由文本控件共用的纯函数工具（无小程序 API 依赖）。
 *
 * cleanLive  —— 输入过程中无损清理：去控制字符与不可见字符，不动空白、不改长度。
 * clampText  —— 保存/确认时完整规整：清理 + NFC + 空白规整 + 按码点上限，并报告是否超限。
 * count      —— 按 Unicode 码点计数（WXML maxlength 按 UTF-16 计数，emoji 占 2，不能作唯一依据）。
 *
 * 客户端限制是体验不是安全：服务端必须独立再校验长度与内容（见 docs/v3-input-and-moderation.md）。
 * 超限时由调用方显式提示并阻止保存，不做静默截断；存档层的 clamp 仅作非 UI 调用的兜底。
 */
const contract = require('../contracts/adapter-api')

const LIMITS = { name: 40, answer: 10, text: contract.BOARD_MESSAGE_MAX_LEN }
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g

function normalize(raw) {
  const text = raw == null ? '' : String(raw)
  try { return typeof text.normalize === 'function' ? text.normalize('NFC') : text }
  catch (err) { return text }
}

function cleanLive(raw, options) {
  const multiline = !!(options && options.multiline)
  let text = normalize(raw).replace(/\r\n?/g, multiline ? '\n' : '')
  if (!multiline) text = text.replace(/[\n\t]/g, '')
  return text.replace(CONTROL_CHARS, '').replace(INVISIBLE_CHARS, '')
}

function count(raw) { return Array.from(normalize(raw)).length }

function clampText(raw, options) {
  const opts = options || {}
  const multiline = opts.multiline !== false
  const max = Number.isFinite(opts.max) ? opts.max : LIMITS.text
  let text = cleanLive(raw, { multiline: multiline })
  if (multiline) text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()
  const chars = Array.from(text)
  const truncated = chars.length > max
  return { text: truncated ? chars.slice(0, max).join('') : text,
    length: Math.min(chars.length, max), truncated: truncated, empty: !text }
}

function sanitizeName(raw) { return clampText(raw, { max: LIMITS.name, multiline: false }).text }

function truncateNotice(label, max) {
  return String(label) + '最多 ' + max + ' 字，已超出上限，请删减后再试。'
}

// 客户端防抖动刷量：窗口内最多 max 次；真实限流仍须服务端独立执行。
function createRateGate(options) {
  const opts = options || {}
  const max = opts.max || 3
  const intervalMs = opts.intervalMs || 60000
  const attempts = []
  return function allow() {
    const stamp = Date.now()
    while (attempts.length && stamp - attempts[0] >= intervalMs) attempts.shift()
    if (attempts.length >= max) return false
    attempts.push(stamp)
    return true
  }
}

module.exports = { LIMITS, cleanLive, clampText, count, sanitizeName, truncateNotice, createRateGate }
