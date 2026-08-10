const assert = require('node:assert/strict')
const test = require('node:test')

const answers = require('../plate21/module/utils/puzzle-answers')

test('Huanghua name accepts complete equivalent explanations', () => {
  const values = [
    '莲花灯',
    '荷花灯',
    '宫女举着彩绸莲花灯',
    '用黄色彩绸扎成的花灯',
    '因为宫女手持黄色丝绸制成的莲花灯',
    '不是黄色墙，而是莲花灯得名'
  ]
  for (const value of values) {
    assert.equal(answers.classifyHuanghuaName(value), 'correct', value)
  }
})

test('Huanghua name distinguishes partial and wrong answers', () => {
  for (const value of ['莲花', '荷花', '彩绸', '黄色彩绸', '花灯']) {
    assert.equal(answers.classifyHuanghuaName(value), 'partial', value)
  }
  for (const value of ['', '宫女', '黄色墙', '菊花', '不是莲花灯', '并非彩绸做的花灯']) {
    assert.equal(answers.classifyHuanghuaName(value), 'wrong', value)
  }
})

test('zodiac parser accepts any order and duplicates but rejects missing or extra animals', () => {
  const correct = [
    '鼠、牛、虎、兔、马、猴、猪',
    '牛虎猴猪鼠兔马',
    '我得到的是马、兔、鼠、猪、猴、虎和牛',
    '鼠鼠牛虎兔马猴猪'
  ]
  for (const value of correct) {
    const parsed = answers.parseReturnedZodiac(value)
    assert.equal(parsed.correct, true, value)
    assert.deepEqual(parsed.missing, [])
    assert.deepEqual(parsed.extra, [])
  }

  const missing = answers.parseReturnedZodiac('鼠牛虎兔马猴')
  assert.equal(missing.correct, false)
  assert.deepEqual(missing.missing, ['猪'])

  const extra = answers.parseReturnedZodiac('鼠牛虎兔马猴猪龙')
  assert.equal(extra.correct, false)
  assert.deepEqual(extra.extra, ['龙'])
})

test('water answer accepts explicit horse-head equivalents only', () => {
  const correct = [
    '马',
    '马首',
    '马兽首',
    '马头兽首',
    '马首铜像',
    '生肖马',
    '答案是马',
    '纸上显示的是马首。',
    '我看到的是马头兽首'
  ]
  for (const value of correct) {
    assert.equal(answers.classifyWaterAnswer(value), 'correct', value)
  }
  for (const value of ['', '斑马', '木马', '马车', '不是马首', '马首旁边的建筑']) {
    assert.equal(answers.classifyWaterAnswer(value), 'wrong', value)
  }
})
