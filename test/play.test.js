'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const { PLAY_IDS } = require('../plate21/module/flow/contract')
const play = require('../plate21/module/play')

const SPEC = fs.readFileSync(path.join(__dirname, '../docs/飞书分页接入方案.md'), 'utf8')
const FEISHU = fs.readFileSync(path.join(__dirname, '../docs/feishu-import/第廿一图_v3-rev5614.md'), 'utf8')

function lanternOptions() {
  const found = []
  const lines = FEISHU.split(/\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^[A-D]\.\s+(.+)$/.exec(lines[i].replace(/\s+$/, ''))
    if (match) found.push(match[1].trim())
  }
  return found
}

const CASES = [
  {
    id: 'quiz-direction',
    propPrompt: '打开地图再做方位题',
    fields: [{ name: 'value', type: 'choice', options: ['西北', '东南', '西南', '东北'] }],
    solved: { value: '东北' },
    wrong: { value: '西北' },
    choice: true
  },
  {
    id: 'listen-nfc',
    propPrompt: '提示用音乐贴片',
    fields: [{ name: 'played', type: 'boolean' }],
    solved: { played: true },
    wrong: { played: false }
  },
  {
    id: 'quiz-envelope',
    propPrompt: '提示：信封的封口处和信的背面都有一半的字，拼接起来看一下！',
    fields: [{ name: 'value', type: 'text' }],
    solved: { value: '黄花阵' },
    wrong: { value: '谐奇趣' }
  },
  {
    id: 'quiz-lantern',
    propPrompt: '',
    fields: [{ name: 'value', type: 'choice', options: lanternOptions() }],
    solved: { value: '中秋迷宫灯会' },
    wrong: { value: '作为军事防御工事，用于迷惑和阻挡入侵的敌人。' },
    choice: true
  },
  {
    id: 'prop-flip',
    propPrompt: '提示翻黄花阵图',
    fields: [{ name: 'confirmed', type: 'boolean' }],
    solved: { confirmed: true },
    wrong: { confirmed: false }
  },
  {
    id: 'photo-pavilion',
    propPrompt: '',
    fields: [{ name: 'count', type: 'number' }],
    solved: { count: 1 },
    wrong: { count: 0 }
  },
  {
    id: 'quiz-pattern',
    propPrompt: '选出看到的花纹',
    fields: [{ name: 'value', type: 'choice' }],
    solved: { value: '万字纹' },
    wrong: { value: '贝壳饰' },
    choice: true
  },
  {
    id: 'quiz-hour',
    propPrompt: '',
    fields: [
      { name: 'hour14', type: 'text' },
      { name: 'noon', type: 'text' }
    ],
    solved: { hour14: '羊', noon: '马' },
    wrong: { hour14: '牛', noon: '马' },
    choice: true
  },
  {
    id: 'prop-dial',
    propPrompt: '提示使用转盘',
    fields: [{ name: 'confirmed', type: 'boolean' }],
    solved: { confirmed: true },
    wrong: { confirmed: false }
  },
  {
    id: 'quiz-height',
    propPrompt: '提示看特刊',
    fields: [{ name: 'value', type: 'choice', options: ['高', '低'] }],
    solved: { value: '高' },
    wrong: { value: '低' },
    choice: true
  },
  {
    id: 'place-animals',
    propPrompt: '提示对照《大水法南面》',
    fields: [
      { name: 'deer', type: 'boolean' },
      { name: 'dogs', type: 'boolean' },
      { name: 'beasts', type: 'boolean' }
    ],
    solved: { deer: true, dogs: true, beasts: true },
    wrong: { deer: true, dogs: true, beasts: false }
  }
]

function assertStatus(result, status) {
  assert.deepEqual(result, { status: status })
}

test('eleven play ids all start without pages or pictures', function () {
  assert.equal(PLAY_IDS.length, 11)
  assert.deepEqual(Object.keys(play).sort(), ['start', 'submit'])
  const seen = CASES.map(function (item) { return item.id })
  assert.deepEqual(seen, PLAY_IDS)
  for (let i = 0; i < CASES.length; i += 1) {
    const item = CASES[i]
    const started = play.start(item.id)
    assert.deepEqual(Object.keys(started).sort(), ['fields', 'playId', 'propPrompt'])
    assert.equal(started.playId, item.id)
    assert.equal(started.propPrompt, item.propPrompt)
    assert.deepEqual(started.fields, item.fields)
    if (item.propPrompt) assert.equal(SPEC.includes(item.propPrompt), true, item.id)
    const packed = JSON.stringify(started)
    assert.equal(/\.(jpg|jpeg|png|webp|gif)|https?:\/\/|redirect|skipTo/i.test(packed), false, item.id)
    assert.equal(packed.includes('"correct"') || packed.includes('"answer"'), false, item.id)
  }
})

for (let i = 0; i < CASES.length; i += 1) {
  const item = CASES[i]
  test(item.id + ' solved', function () {
    assertStatus(play.submit(item.id, item.solved), 'solved')
  })
  test(item.id + ' skipped', function () {
    const action = Object.assign({ skip: true }, item.solved)
    assertStatus(play.submit(item.id, action), 'skipped')
  })
  if (item.choice || item.wrong) {
    test(item.id + ' again hides the answer', function () {
      assertStatus(play.submit(item.id, item.wrong), 'again')
    })
  }
}

test('envelope ignores whitespace only', function () {
  const values = ['黄花阵', ' 黄花阵', '黄花阵 ', '黄 花 阵', '黄\n花\n阵', '黄\u3000花阵']
  for (let i = 0; i < values.length; i += 1) {
    assertStatus(play.submit('quiz-envelope', { value: values[i] }), 'solved')
  }
  assertStatus(play.submit('quiz-envelope', { value: '黄花阵。' }), 'again')
  assertStatus(play.submit('quiz-envelope', { value: '黄花' }), 'again')
})

test('lantern accepts the maze-lantern option and any value containing 灯会', function () {
  const options = lanternOptions()
  assert.equal(options.length, 4)
  assert.equal(options[2].includes('灯会'), true)
  assertStatus(play.submit('quiz-lantern', { value: options[2] }), 'solved')
  assertStatus(play.submit('quiz-lantern', { value: '灯会' }), 'solved')
  assertStatus(play.submit('quiz-lantern', { value: '中秋迷宫' }), 'again')
  assertStatus(play.submit('quiz-lantern', { value: 'C' }), 'again')
})

test('pattern answer is 万字纹 not the older 万字回纹 label', function () {
  assertStatus(play.submit('quiz-pattern', { value: '万字回纹' }), 'again')
  assert.equal(JSON.stringify(play.start('quiz-pattern')).includes('万字纹'), false)
  assert.equal(JSON.stringify(play.start('quiz-envelope')).includes('黄花阵'), false)
})

test('hour needs both the sheep at 14:00 and the horse at noon', function () {
  assertStatus(play.submit('quiz-hour', { hour14: '羊', noon: '牛' }), 'again')
  assertStatus(play.submit('quiz-hour', { hour14: '马', noon: '马' }), 'again')
  assertStatus(play.submit('quiz-hour', { hour14: '羊' }), 'again')
  assert.equal(JSON.stringify(play.start('quiz-hour')).includes('羊'), false)
})

test('photo counts a real number of shots and animals need all three groups', function () {
  assertStatus(play.submit('photo-pavilion', { count: 4 }), 'solved')
  assertStatus(play.submit('photo-pavilion', { count: true }), 'again')
  assertStatus(play.submit('place-animals', { deer: true, dogs: true }), 'again')
})

test('skip is only boolean true and beats a correct answer', function () {
  assertStatus(play.submit('quiz-direction', { skip: 'true', value: '东北' }), 'solved')
  assertStatus(play.submit('quiz-direction', { skip: 1, value: '西北' }), 'again')
  assertStatus(play.submit('quiz-height', null), 'again')
})

test('unknown play id is rejected', function () {
  assert.throws(function () { play.start('not-a-play') })
  assert.throws(function () { play.submit('not-a-play', { skip: true }) })
})

test('start copies fields so callers cannot change the next call', function () {
  const first = play.start('quiz-direction')
  first.fields[0].options.push('北')
  first.propPrompt = '画一张地图'
  const second = play.start('quiz-direction')
  assert.deepEqual(second.fields[0].options, ['西北', '东南', '西南', '东北'])
  assert.equal(second.propPrompt, '打开地图再做方位题')
})
