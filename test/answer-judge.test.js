'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')

const judge = require('../plate21/module/utils/answer-judge')

test('judge budget stays inside the mini-program token and char caps', () => {
  assert.equal(judge.MAX_INPUT_CHARS, 40)
  assert.equal(judge.MAX_FREEFORM_ATTEMPTS, 3)
  assert.equal(judge.MAX_COMPLETION_TOKENS, 32)
  assert.ok(judge.estimatePromptTokens() < 400)
  assert.match(judge.SYSTEM_PROMPT, /只输出 JSON/)
  assert.match(judge.SYSTEM_PROMPT, /禁止复述标准答案/)
})

test('validateInput enforces empty and 40-character limits', () => {
  assert.equal(judge.validateInput('').ok, false)
  assert.equal(judge.validateInput('   ').code, 'empty')
  const long = '黄'.repeat(41)
  assert.equal(judge.validateInput(long).code, 'too_long')
  assert.equal(judge.countChars(judge.clipInput(long)), 40)
  assert.equal(judge.validateInput('莲花灯').ok, true)
})

test('local verdict only passes complete lamp explanations', async () => {
  assert.equal(judge.localVerdict('s2-name', '莲花灯'), 'correct')
  assert.equal(judge.localVerdict('s2-name', '宫女举着彩绸莲花灯'), 'correct')
  assert.equal(judge.localVerdict('s2-name', '莲花'), 'wrong')
  assert.equal(judge.localVerdict('s2-name', '黄色墙'), 'wrong')
  assert.equal(judge.localVerdict('s2-name', '不是莲花灯'), 'wrong')

  const hit = await judge.judge({ puzzleId: 's2-name', text: '荷花灯' })
  assert.equal(hit.verdict, 'correct')
  assert.equal(hit.source, 'local')

  const miss = await judge.judge({ puzzleId: 's2-name', text: '菊花' })
  assert.equal(miss.verdict, 'wrong')
  assert.equal(miss.hint, '请重新回答')
})

test('parseJudgePayload accepts compact JSON and OpenAI envelopes', () => {
  assert.equal(judge.parseJudgePayload({ v: 'Y' }), 'correct')
  assert.equal(judge.parseJudgePayload({ v: 'N' }), 'wrong')
  assert.equal(judge.parseJudgePayload('{"v":"Y"}'), 'correct')
  assert.equal(judge.parseJudgePayload({
    choices: [{ message: { content: '```json\n{"v":"Y"}\n```' } }]
  }), 'correct')
  assert.equal(judge.parseJudgePayload({ verdict: 'wrong' }), 'wrong')
  assert.equal(judge.parseJudgePayload(null), 'wrong')
})

test('each miss has a hint and the third miss reveals the gold answer', () => {
  assert.equal(judge.shouldRevealAnswer(2), false)
  assert.equal(judge.shouldRevealAnswer(3), true)
  assert.match(judge.hintForAttempt(1), /请重新回答/)
  assert.match(judge.hintForAttempt(1), /宫女手里举着什么/)
  assert.match(judge.hintForAttempt(2), /黄绸扎的/)
  assert.equal(judge.hintForAttempt(3), judge.GOLD_ANSWER)
  assert.match(judge.GOLD_ANSWER, /黄色彩绸扎成的莲花灯/)
})

test('remote judge sends a 32-token payload and falls back locally on failure', async () => {
  const calls = []
  global.wx = {
    getStorageSync(key) {
      return key === 'plate21_judge_endpoint' ? 'https://example.test/judge' : ''
    },
    request(opts) {
      calls.push(opts)
      if (opts.fail) opts.fail({ errMsg: 'request:fail' })
    }
  }
  try {
    const result = await judge.judge({ puzzleId: 's2-name', text: '莲花灯' })
    assert.equal(result.verdict, 'correct')
    assert.equal(result.source, 'local-fallback')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].data.max_tokens, 32)
    assert.equal(calls[0].data.temperature, 0)
    assert.match(calls[0].data.messages[0].content, /只输出 JSON/)
    assert.match(calls[0].data.messages[1].content, /莲花灯/)
  } finally {
    delete global.wx
  }
})
