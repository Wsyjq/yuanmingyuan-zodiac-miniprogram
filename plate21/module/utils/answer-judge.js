'use strict'

/**
 * 黄花阵名字由来等开放作答的判题入口。
 * 页面只认这一层返回值，不直接打外网、不把密钥写进包。
 *
 * 预算（控制小程序侧 token / 字数）：
 * - 玩家输入 ≤ 40 字（按 Unicode 码点）
 * - 自由作答 3 次：每次给提示，第三次揭晓标准答案
 * - 远程补全 max_tokens = 32，超时 8s
 * 远程：wx.storage 或本机 gitignore 的 judge-secrets.js。
 * 远程失败降级本地分类器，不把判题卡死。
 */

const answers = require('./puzzle-answers')

const MAX_INPUT_CHARS = 40
const MAX_FREEFORM_ATTEMPTS = 3
const MAX_COMPLETION_TOKENS = 32
const REQUEST_TIMEOUT_MS = 8000
const WRONG_HINT = '请重新回答'
const DEFAULT_MODEL = 'MiniMax-M3'

const SYSTEM_PROMPT = [
  '你是圆明园西洋楼黄花阵考察的判题器。只判断玩家一句话是否说中了这座迷宫名字的由来。',
  '标准答案：由于宫女们手持黄色彩绸扎成的莲花灯，所以这个迷宫也得名黄花阵。',
  '判对（v=Y）：提到莲花灯、荷花灯或花灯，或说到黄绸/彩绸扎成的灯。只答「莲花灯」也算对。允许口语、同义、语序不同。',
  '判错（v=N）：只说宫女/中秋/迷宫/黄色墙壁/菊花/琉璃，或否定灯与黄绸，或明显跑题。',
  '禁止解释、禁止复述标准答案、禁止给下一步提示。只输出 JSON：{"v":"Y"} 或 {"v":"N"}。'
].join('')

const GOLD_ANSWER = '由于宫女们手持黄色彩绸扎成的莲花灯，所以这个迷宫也得名黄花阵。'

const FREEFORM_HINTS = [
  '请重新回答。再对照图看一眼——宫女手里举着什么？',
  '请重新回答。那盏灯是黄绸扎的，像一朵花。'
]

function countChars(text) {
  return Array.from(String(text || '')).length
}

function clipInput(text) {
  return Array.from(String(text || '')).slice(0, MAX_INPUT_CHARS).join('')
}

function validateInput(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return { ok: false, code: 'empty', hint: '先说一句你的猜法' }
  if (countChars(trimmed) > MAX_INPUT_CHARS) {
    return { ok: false, code: 'too_long', hint: '请压到' + MAX_INPUT_CHARS + '字以内' }
  }
  return { ok: true, text: trimmed, code: 'ok' }
}

function localVerdict(puzzleId, text) {
  if (puzzleId !== 's2-name') return 'wrong'
  return answers.classifyHuanghuaName(text) === 'correct' ? 'correct' : 'wrong'
}

function stripFence(raw) {
  let text = String(raw || '').trim()
  if (text.indexOf('```') === 0) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  return text.trim()
}

function parseJudgePayload(raw) {
  if (raw == null) return 'wrong'
  if (typeof raw === 'string') {
    const text = stripFence(raw)
    try {
      return parseJudgePayload(JSON.parse(text))
    } catch (err) {
      if (/^\s*Y\s*$/i.test(text) || /"v"\s*:\s*"Y"/i.test(text)) return 'correct'
      return 'wrong'
    }
  }
  if (typeof raw !== 'object') return 'wrong'
  if (raw.choices && raw.choices[0] && raw.choices[0].message) {
    return parseJudgePayload(raw.choices[0].message.content)
  }
  const mark = raw.v || raw.verdict || raw.result
  if (mark === 'Y' || mark === 'y' || mark === 'correct' || mark === true) return 'correct'
  if (mark === 'N' || mark === 'n' || mark === 'wrong' || mark === false) return 'wrong'
  return 'wrong'
}

function estimatePromptTokens() {
  // 中文约 1.5 token/字；英文约 0.25。只用来守预算，不参与计费。
  const text = SYSTEM_PROMPT
  let cjk = 0
  let other = 0
  for (const ch of Array.from(text)) {
    if (/[\u3400-\u9FFF]/.test(ch)) cjk += 1
    else other += 1
  }
  return Math.ceil(cjk * 1.5 + other * 0.25)
}

function readJudgeConfig() {
  let endpoint = ''
  let token = ''
  let model = DEFAULT_MODEL
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      endpoint = String(wx.getStorageSync('plate21_judge_endpoint') || '').trim()
      token = String(wx.getStorageSync('plate21_judge_token') || '').trim()
      const storedModel = String(wx.getStorageSync('plate21_judge_model') || '').trim()
      if (storedModel) model = storedModel
    }
  } catch (err) { /* 无 storage 时继续 */ }
  if (typeof wx !== 'undefined' && (!endpoint || !token)) {
    try {
      const secrets = require('./judge-secrets')
      if (!endpoint) endpoint = String(secrets.endpoint || '').trim()
      if (!token) token = String(secrets.token || '').trim()
      if (secrets.model) model = String(secrets.model).trim()
    } catch (err) { /* 无本机密钥文件 */ }
  }
  return { endpoint: endpoint, token: token, model: model || DEFAULT_MODEL }
}

function callRemoteJudge(puzzleId, text, config) {
  return new Promise(function (resolve, reject) {
    if (typeof wx === 'undefined' || !wx.request) {
      reject(new Error('no_request'))
      return
    }
    const header = { 'content-type': 'application/json' }
    if (config.token) header.Authorization = 'Bearer ' + config.token
    let settled = false
    const timer = setTimeout(function () {
      if (settled) return
      settled = true
      reject(new Error('timeout'))
    }, REQUEST_TIMEOUT_MS)
    wx.request({
      url: config.endpoint,
      method: 'POST',
      timeout: REQUEST_TIMEOUT_MS,
      header: header,
      data: {
        model: config.model || DEFAULT_MODEL,
        temperature: 0,
        max_tokens: MAX_COMPLETION_TOKENS,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        thinking: { type: 'disabled' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: '题目：黄花阵名字由来。玩家回答：' + text }
        ],
        puzzleId: puzzleId
      },
      success: function (res) {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const status = res && res.statusCode
        if (status && status >= 400) {
          reject(new Error('http_' + status))
          return
        }
        resolve(parseJudgePayload(res && res.data))
      },
      fail: function (err) {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(err || new Error('request_failed'))
      }
    })
  })
}

function packResult(verdict, source, text, extra) {
  const correct = verdict === 'correct'
  return Object.assign({
    ok: true,
    verdict: correct ? 'correct' : 'wrong',
    hint: correct ? '' : WRONG_HINT,
    source: source,
    text: text
  }, extra || {})
}

function judge(input) {
  const puzzleId = (input && input.puzzleId) || 's2-name'
  const check = validateInput(input && input.text)
  if (!check.ok) {
    return Promise.resolve({
      ok: false,
      verdict: 'invalid',
      hint: check.hint,
      source: 'validate',
      code: check.code,
      text: ''
    })
  }
  const text = check.text
  const config = readJudgeConfig()
  if (!config.endpoint) {
    return Promise.resolve(packResult(localVerdict(puzzleId, text), 'local', text))
  }
  return callRemoteJudge(puzzleId, text, config).then(function (verdict) {
    return packResult(verdict, 'api', text)
  }).catch(function () {
    return packResult(localVerdict(puzzleId, text), 'local-fallback', text)
  })
}

function hintForAttempt(attempts) {
  const n = Math.max(1, Number(attempts) || 1)
  if (n >= MAX_FREEFORM_ATTEMPTS) return GOLD_ANSWER
  return FREEFORM_HINTS[Math.min(n, FREEFORM_HINTS.length) - 1]
}

function shouldRevealAnswer(attempts) {
  return Number(attempts) >= MAX_FREEFORM_ATTEMPTS
}

module.exports = {
  MAX_INPUT_CHARS: MAX_INPUT_CHARS,
  MAX_FREEFORM_ATTEMPTS: MAX_FREEFORM_ATTEMPTS,
  MAX_COMPLETION_TOKENS: MAX_COMPLETION_TOKENS,
  REQUEST_TIMEOUT_MS: REQUEST_TIMEOUT_MS,
  WRONG_HINT: WRONG_HINT,
  GOLD_ANSWER: GOLD_ANSWER,
  FREEFORM_HINTS: FREEFORM_HINTS,
  SYSTEM_PROMPT: SYSTEM_PROMPT,
  countChars: countChars,
  clipInput: clipInput,
  validateInput: validateInput,
  localVerdict: localVerdict,
  parseJudgePayload: parseJudgePayload,
  estimatePromptTokens: estimatePromptTokens,
  hintForAttempt: hintForAttempt,
  shouldRevealAnswer: shouldRevealAnswer,
  judge: judge
}
