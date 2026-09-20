'use strict'

/** 计分题共用：最多三次，第三次揭晓并视为过关（仍发卡）。 */
const MAX_ATTEMPTS = 3

function submit(input) {
  const attempts = Number(input && input.attempts) + 1
  const hints = (input && input.hints) || []
  if (input && input.ok) {
    return { attempts: attempts, solved: true, revealed: false, hint: '', lockCorrect: false }
  }
  if (attempts >= MAX_ATTEMPTS) {
    return {
      attempts: attempts,
      solved: true,
      revealed: true,
      hint: (input && input.revealText) || hints[2] || '',
      lockCorrect: true
    }
  }
  return {
    attempts: attempts,
    solved: false,
    revealed: false,
    hint: hints[attempts - 1] || '',
    lockCorrect: false
  }
}

function judgeMulti(selected, correct, opts) {
  const sel = Array.isArray(selected) ? selected : []
  const cor = Array.isArray(correct) ? correct : []
  const corSet = {}
  cor.forEach(function (k) { corSet[k] = true })
  let hit = 0
  let wrong = 0
  sel.forEach(function (k) {
    if (corSet[k]) hit += 1
    else wrong += 1
  })
  const all = hit === cor.length && wrong === 0 && sel.length === cor.length
  const minCorrect = opts && opts.minCorrect != null ? opts.minCorrect : 3
  const maxWrong = opts && opts.maxWrong != null ? opts.maxWrong : 1
  return all || (hit >= minCorrect && wrong <= maxWrong)
}

module.exports = {
  MAX_ATTEMPTS: MAX_ATTEMPTS,
  submit: submit,
  judgeMulti: judgeMulti
}
