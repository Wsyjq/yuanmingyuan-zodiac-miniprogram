'use strict'

const fs = require('fs')
const path = require('path')
const judge = require('../plate21/module/utils/answer-judge')

const envPath = path.join(__dirname, '..', '.env')
const env = {}
fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(function (line) {
  if (!line || line.charAt(0) === '#' || line.indexOf('=') < 0) return
  const i = line.indexOf('=')
  env[line.slice(0, i)] = line.slice(i + 1)
})

const key = env.MINIMAX_API_KEY
const url = 'https://api.minimax.cn/v1/chat/completions'

async function ask(text) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'MiniMax-M3',
      temperature: 0,
      max_tokens: 32,
      max_completion_tokens: 32,
      thinking: { type: 'disabled' },
      messages: [
        { role: 'system', content: judge.SYSTEM_PROMPT },
        { role: 'user', content: '题目：黄花阵名字由来。玩家回答：' + text }
      ]
    })
  })
  const data = await res.json()
  const content = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : JSON.stringify(data).slice(0, 200)
  const parsed = judge.parseJudgePayload(data)
  console.log([res.status, text, parsed, String(content).replace(/\s+/g, ' ')].join(' | '))
}

;(async function () {
  await ask('莲花灯')
  await ask('宫女举着黄绸扎的荷花灯')
  await ask('黄色墙')
  await ask('菊花')
})()
