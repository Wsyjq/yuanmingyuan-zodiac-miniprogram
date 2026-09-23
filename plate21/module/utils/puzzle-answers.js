'use strict'

const ALL_ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const RETURNED_ZODIAC = ['鼠', '牛', '虎', '兔', '马', '猴', '猪']

function normalizeText(value) {
  let text = String(value || '').trim()
  try {
    if (text.normalize) text = text.normalize('NFKC')
  } catch (error) { /* 旧基础库无 normalize 时继续 */ }
  return text
    .toLowerCase()
    .replace(/[\s,，、。.!！?？;；:："“”'‘’（）()\[\]【】]/g, '')
}

function classifyHuanghuaName(value) {
  const text = normalizeText(value)
  if (!text) return 'wrong'

  const negatedCore = /(?:不是|并非|不叫|并不是)(?:因为|由|用)?(?:黄色|黄)?(?:彩绸|丝绸|绸缎|莲花灯|荷花灯|莲花|荷花|花灯)/
  if (negatedCore.test(text)) return 'wrong'

  const lotusLamp = /(?:莲花|荷花)(?:形)?(?:的)?(?:花)?灯/
  const silkFlowerLamp = /(?:黄色|黄)?(?:彩绸|丝绸|绸缎).{0,8}(?:扎|做|制|编).{0,8}(?:莲花|荷花|花灯|灯)/
  if (lotusLamp.test(text) || silkFlowerLamp.test(text)) return 'correct'

  return /莲花|荷花|彩绸|丝绸|绸缎|花灯/.test(text) ? 'partial' : 'wrong'
}

function parseReturnedZodiac(value) {
  const text = normalizeText(value)
  const selected = ALL_ZODIAC.filter(function (name) { return text.includes(name) })
  const missing = RETURNED_ZODIAC.filter(function (name) { return !selected.includes(name) })
  const extra = selected.filter(function (name) { return !RETURNED_ZODIAC.includes(name) })
  return {
    selected: selected.filter(function (name) { return RETURNED_ZODIAC.includes(name) }),
    missing: missing,
    extra: extra,
    correct: missing.length === 0 && extra.length === 0
  }
}

function stripAnswerWrapper(value) {
  let text = value
  const prefixes = [
    '水显纸显示的是', '水显纸显示', '纸上显示的是', '纸上显示',
    '我看到的是', '我看见的是', '我看到', '我看见',
    '我的答案是', '答案是', '应该是', '这是', '就是', '是'
  ]
  let changed = true
  while (changed) {
    changed = false
    for (const prefix of prefixes) {
      if (!text.startsWith(prefix)) continue
      text = text.slice(prefix.length)
      changed = true
      break
    }
  }
  return text
}

function classifyWaterAnswer(value) {
  const text = normalizeText(value)
  if (!text || /(?:不是|并非|不叫|并不是)(?:马|马首|马头兽首)/.test(text)) return 'wrong'
  const answer = stripAnswerWrapper(text)
  const accepted = new Set(['马', '马首', '马兽首', '马头', '马头兽首', '马首兽首', '马首铜像', '生肖马'])
  return accepted.has(answer) ? 'correct' : 'wrong'
}

module.exports = {
  ALL_ZODIAC,
  RETURNED_ZODIAC,
  normalizeText,
  classifyHuanghuaName,
  parseReturnedZodiac,
  classifyWaterAnswer
}
