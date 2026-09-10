const progressFlow = require('../store/progress-flow')
const experience = require('./experience')
function now() {
  return Date.now()
}
function clone(v) {
  return JSON.parse(JSON.stringify(v))
}
function applyCommand(current, command) {
  let extension
  try {
    extension = experience.apply(current, command, now())
  } catch (e) {
    e.code = 'INVALID_COMMAND'
    return Promise.reject(e)
  }
  let next = extension || clone(current)
  let changed = true

  function applyCheckpoint(checkpoint) {
    if (!checkpoint) return
    const normalized = progressFlow.normalizeCheckpoint(checkpoint)
    if (!normalized) throw new Error('未知 checkpoint: ' + checkpoint)
    if (next.checkpoint !== normalized) {
      next.checkpoint = normalized
      if (next.visitCheckpoint) next.visitCheckpoint = normalized
      changed = true
    }
  }

  function applyStation(station, record) {
    if (!station) return
    next.stations = next.stations || {}
    next.records = next.records || []
    const index = next.records.findIndex(function (item) {
      return item.station === station
    })
    if (!next.stations[station]) {
      next.stations[station] = true
      changed = true
    }
    if (index < 0 && record) {
      next.records.push(record)
      changed = true
    }
  }

  if (extension) {
    // Extension commands never synthesize legacy answers, cards, or station completion.
  } else if (command.type === 'complete_station') {
    changed = false
    applyStation(command.station, command.record)
    applyCheckpoint(command.checkpoint)
  } else if (command.type === 'complete_finale') {
    next.finale = true
  } else if (command.type === 'sign') {
    next.name = command.name
  } else if (command.type === 'set_flag') {
    next.flags = next.flags || {}
    next.flags[command.key] = command.value
  } else if (command.type === 'collect_card') {
    next.cards = next.cards || {}
    const card = command.card
    if (next.cards[card.cardId]) {
      changed = false
    } else {
      next.cards[card.cardId] = card
    }
  } else if (command.type === 'complete_puzzle') {
    if (!progressFlow.isValidPuzzle(command.puzzleId)) {
      return Promise.reject(new Error('未知 puzzleId: ' + command.puzzleId))
    }
    changed = false
    next.puzzles = next.puzzles || {}
    if (!next.puzzles[command.puzzleId]) {
      next.puzzles[command.puzzleId] = {
        completedAt: command.completedAt || now(),
        payload: clone(command.payload || {})
      }
      changed = true
    }
    if (command.card) {
      next.cards = next.cards || {}
      if (!next.cards[command.card.cardId]) {
        next.cards[command.card.cardId] = clone(command.card)
        changed = true
      }
    }
    applyStation(command.station, command.record)
    applyCheckpoint(command.checkpoint)
  } else if (command.type === 'set_checkpoint') {
    const checkpoint = progressFlow.normalizeCheckpoint(command.checkpoint)
    if (!checkpoint) return Promise.reject(new Error('未知 checkpoint: ' + command.checkpoint))
    if (next.checkpoint === checkpoint) changed = false
    else {
      next.checkpoint = checkpoint
      if (next.visitCheckpoint) next.visitCheckpoint = checkpoint
    }
  } else if (command.type === 'migrate_snapshot') {
    next = clone(command.snapshot)
    next.sessionId = current.sessionId
  } else {
    return Promise.reject(new Error('未知 SessionCommand: ' + command.type))
  }

  if (!changed) return Promise.resolve(current)
  next.revision = current.revision + 1
  next.updatedAt = now()
  return Promise.resolve(next)
}

module.exports = { applyCommand }
